# FACS AI setup (Groq free plan)

The legal-calendar AI uses Groq first and OpenAI only when no Groq key is
configured. API keys stay in Supabase Edge Function Secrets and are never sent
to the browser.

## Model

- Provider: GroqCloud
- Default model: `openai/gpt-oss-120b`
- Override secret: `GROQ_LEGAL_CALENDAR_MODEL`
- OpenAI fallback: `OPENAI_API_KEY` and `OPENAI_LEGAL_CALENDAR_MODEL`

## Enable

1. Create a GroqCloud project and API key.
2. In GroqCloud Data Controls, enable Zero Data Retention for inference.
3. Set the server-side secret without putting the key in Git or Vercel:

   ```powershell
   npx supabase@latest secrets set GROQ_API_KEY="YOUR_GROQ_KEY"
   ```

4. Deploy the updated function:

   ```powershell
   npx supabase@latest functions deploy legal-calendar-sync
   ```

5. In the CMS Legal Calendar source page, run a short date-range scan and
   review every generated draft against its official source before publishing.

## Operating controls

- The free plan is rate-limited and is not an uptime commitment.
- The function caps Groq source payloads to stay within the current free-plan
  token allowance. Longer source material remains available for manual review.
- AI output is always a draft. It must not be treated as a legal source or
  published without human verification.
- Never submit client files, personal data, credentials, or confidential legal
  advice through this workflow.
- If Groq is unavailable, leave `OPENAI_API_KEY` configured for fallback or use
  the existing manual import process.
