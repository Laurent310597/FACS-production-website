export type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GroqWebSearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number | null;
};

export function cleanAIText(value: unknown, maxLength: number) {
  return String(value || "")
    .replaceAll("\u0000", "")
    .trim()
    .slice(0, maxLength);
}

export function normalizeAIHistory(value: unknown, maxItems = 6): AIMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-maxItems)
    .map((item) => {
      const role = item?.role === "assistant"
        ? "assistant"
        : item?.role === "user"
        ? "user"
        : null;
      const content = cleanAIText(item?.content, 2_000);
      return role && content ? { role, content } : null;
    })
    .filter((item): item is AIMessage => Boolean(item));
}

export function readAIResponseText(payload: Record<string, unknown>) {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const choice = choices[0] as Record<string, unknown> | undefined;
  const message = choice?.message as Record<string, unknown> | undefined;
  if (typeof message?.content === "string") return message.content.trim();
  if (typeof payload.output_text === "string") return payload.output_text.trim();

  const output = Array.isArray(payload.output) ? payload.output : [];
  const fragments: string[] = [];
  for (const item of output as Array<Record<string, unknown>>) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content as Array<Record<string, unknown>>) {
      if (part.type === "output_text" && typeof part.text === "string") {
        fragments.push(part.text);
      }
    }
  }
  return fragments.join("\n").trim();
}

function providerError(payload: Record<string, unknown>, status: number) {
  const error = payload?.error as Record<string, unknown> | string | undefined;
  if (typeof error === "string") return cleanAIText(error, 500);
  if (error && typeof error.message === "string") return cleanAIText(error.message, 500);
  return `HTTP ${status}`;
}

export async function callGroqStructured(params: {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  history?: AIMessage[];
  schemaName: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        ...(params.history || []),
        { role: "user", content: params.prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: params.schemaName,
          strict: true,
          schema: params.schema,
        },
      },
      reasoning_effort: "medium",
      max_completion_tokens: params.maxTokens || 1_500,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Groq request failed: ${providerError(payload, response.status)}`);
  }

  const text = readAIResponseText(payload);
  if (!text) throw new Error("Groq returned an empty response.");
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Groq returned invalid structured output.");
  }
}

function webSearchResults(payload: Record<string, unknown>): GroqWebSearchResult[] {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const choice = choices[0] as Record<string, unknown> | undefined;
  const message = choice?.message as Record<string, unknown> | undefined;
  const executedTools = Array.isArray(message?.executed_tools) ? message.executed_tools : [];
  const rows: GroqWebSearchResult[] = [];

  for (const item of executedTools as Array<Record<string, unknown>>) {
    const rawSearchResults = item.search_results;
    const resultList = Array.isArray(rawSearchResults)
      ? rawSearchResults
      : rawSearchResults && typeof rawSearchResults === "object"
      ? (rawSearchResults as Record<string, unknown>).results
      : [];
    if (!Array.isArray(resultList)) continue;

    for (const raw of resultList as Array<Record<string, unknown>>) {
      const url = cleanAIText(raw.url || raw.link, 2_000);
      if (!url) continue;
      rows.push({
        title: cleanAIText(raw.title || raw.name, 300),
        url,
        content: cleanAIText(raw.content || raw.snippet || raw.description || raw.text, 6_000),
        score: typeof raw.score === "number" ? raw.score : null,
      });
    }
  }

  return rows;
}

export async function callGroqWebSearch(params: {
  apiKey: string;
  model: string;
  system: string;
  query: string;
  includeDomains: string[];
  maxTokens?: number;
}) {
  const approvedDomains = [...new Set(params.includeDomains
    .map((item) => item.trim().toLowerCase().replace(/^\*\./, ""))
    .filter((item) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?([.][a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(item)))];
  const includeDomains = approvedDomains.flatMap((domain) => [domain, `*.${domain}`]).slice(0, 60);
  if (!includeDomains.length) throw new Error("Groq web search has no approved domains.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.query },
      ],
      search_settings: {
        include_domains: includeDomains,
        country: "vietnam",
        include_images: false,
      },
      compound_custom: {
        tools: { enabled_tools: ["web_search"] },
      },
      citation_options: "enabled",
      reasoning_effort: "medium",
      max_completion_tokens: params.maxTokens || 1_500,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Groq web search failed: ${providerError(payload, response.status)}`);
  }

  return {
    text: readAIResponseText(payload),
    results: webSearchResults(payload),
    model: params.model,
  };
}

export async function callOpenAIText(params: {
  apiKey: string;
  model: string;
  instructions: string;
  prompt: string;
  history?: AIMessage[];
  safetyIdentifier: string;
}) {
  const input = [
    ...(params.history || []).map((item) => ({
      role: item.role,
      content: item.content,
    })),
    { role: "user", content: params.prompt },
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      store: false,
      instructions: params.instructions,
      input,
      reasoning: { effort: "medium" },
      max_output_tokens: 2_500,
      safety_identifier: params.safetyIdentifier,
      prompt_cache_key: "facs-cms-assistant-v20.19",
    }),
    signal: AbortSignal.timeout(45_000),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${providerError(payload, response.status)}`);
  }

  const text = readAIResponseText(payload);
  if (!text) throw new Error("OpenAI returned an empty response.");
  return text;
}
