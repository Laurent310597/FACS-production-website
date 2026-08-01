# FACS AI setup (v20.18)

Groq powers Legal Calendar preparation, the public popup and FACS Advisory AI at `/legal-ai`.
OpenAI powers the private authenticated CMS assistant. API keys stay in
Supabase Edge Function Secrets and are never sent to the browser. A separate
OpenAI key may optionally be configured as a Legal Calendar fallback; the CMS
key is never reused automatically for that purpose.

## Model

- Provider: GroqCloud
- Default model: `openai/gpt-oss-120b`
- Override secret: `GROQ_LEGAL_CALENDAR_MODEL`
- Public Legal AI override: `GROQ_PUBLIC_LEGAL_MODEL`
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

5. Apply the additive database migration:

   ```powershell
   npx supabase@latest db push
   ```

6. Deploy the AI functions:

   ```powershell
   npx supabase@latest functions deploy legal-calendar-sync
   npx supabase@latest functions deploy legal-ai-assistant
   npx supabase@latest functions deploy cms-assistant
   ```

7. In `/admin/legal-knowledge`, add a P1 source, verify its document number,
   authority, official HTTPS URL, effective dates and exact citation text, then
   approve it. Use the retrieval test before testing the public assistant.

## Operating controls

- The free plan is rate-limited and is not an uptime commitment.
- The function caps Groq source payloads to stay within the current free-plan
  token allowance. Longer source material remains available for manual review.
- AI output is always a draft. It must not be treated as a legal source or
  published without human verification.
- Never submit client files, personal data, credentials, or confidential legal
  advice through this workflow.
- The public assistant does not use OpenAI as an automatic fallback. This avoids
  silently changing the provider and cost model.
- The Legal Calendar also remains Groq-only unless a separate
  `OPENAI_LEGAL_CALENDAR_API_KEY` is deliberately configured.
- The CMS assistant is read-only. It can summarize, review and draft, but cannot
  publish, update, delete or send data.
- Enable Zero Data Retention in Groq. Review OpenAI project data controls and use
  `store: false`, as implemented by the CMS Edge Function.
