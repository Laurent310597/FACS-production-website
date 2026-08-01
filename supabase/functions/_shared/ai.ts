export type AIMessage = {
  role: "user" | "assistant";
  content: string;
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
      prompt_cache_key: "facs-cms-assistant-v20.18",
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
