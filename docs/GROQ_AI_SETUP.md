# FACS AI setup (v20.19)

GROQ powers Legal Calendar preparation and allowlisted web search for the public popup and FACS Advisory AI at `/legal-ai`.
OpenAI powers the private authenticated CMS assistant using only the URL/file library curated at `/admin/cms-knowledge`. API keys stay in
Supabase Edge Function Secrets and are never sent to the browser. A separate
OpenAI key may optionally be configured as a Legal Calendar fallback; the CMS
key is never reused automatically for that purpose.

## Model

- Provider: GroqCloud
- Default model: `openai/gpt-oss-120b`
- Override secret: `GROQ_LEGAL_CALENDAR_MODEL`
- Public web-search model: `GROQ_PUBLIC_SEARCH_MODEL` (default: `groq/compound`)
- Public answer model: `GROQ_PUBLIC_ANSWER_MODEL` (default: `openai/gpt-oss-120b`)
- Private CMS assistant: `OPENAI_API_KEY`
- CMS model override: `OPENAI_CMS_ASSISTANT_MODEL` (default `gpt-5.6-sol`)
- Optional Legal Calendar fallback: `OPENAI_LEGAL_CALENDAR_API_KEY`

## Enable

1. Create a GroqCloud project and API key.
2. In GroqCloud Data Controls, enable Zero Data Retention for inference.
3. Set the server-side secret without putting the key in Git or Vercel:

   ```powershell
   npx supabase@latest secrets set GROQ_API_KEY="YOUR_GROQ_KEY"
   ```

4. Set the OpenAI API key separately if the private CMS assistant is required.
   A ChatGPT Plus subscription does not supply API usage or an API key.

   ```powershell
   npx supabase@latest secrets set OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
   ```

5. Apply the additive v20.19 database migration:

   ```powershell
   npx supabase@latest db push
   ```

6. Deploy the AI functions:

   ```powershell
   npx supabase@latest functions deploy legal-calendar-sync
   ```

   ```powershell
   npx supabase@latest functions deploy legal-ai-assistant
   ```

   ```powershell
   npx supabase@latest functions deploy cms-assistant
   ```

   ```powershell
   npx supabase@latest functions deploy cms-knowledge-ingest
   ```

7. In `/admin/public-ai-sources`, review the P1/P2 domain registry. Keep only
   reputable, citation-enabled domains active.
8. In `/admin/cms-knowledge`, add an HTTPS URL or upload a supported file, then
   use the private retrieval test before asking the CMS assistant.

## Operating controls

- The free plan is rate-limited and is not an uptime commitment.
- Public GROQ uses web search and a separate structured answer pass. Review the
  current Compound/search pricing and rate limits before production use.
- AI output is always a draft. It must not be treated as a legal source or
  published without human verification.
- Never submit client files, personal data, credentials, or confidential legal
  advice through this workflow.
- The public assistant does not use OpenAI as an automatic fallback. This avoids
  silently changing the provider and cost model.
- The public and private libraries have no cross-provider fallback.
- The Legal Calendar also remains Groq-only unless a separate
  `OPENAI_LEGAL_CALENDAR_API_KEY` is deliberately configured.
- The CMS assistant is read-only. It can summarize, review and draft, but cannot
  publish, update, delete or send data.
- Enable Zero Data Retention in Groq. Review OpenAI project data controls and use
  `store: false`, as implemented by the CMS Edge Function.
