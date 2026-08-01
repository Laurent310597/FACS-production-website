# FACS AI Platform v20.19 — Split Knowledge Architecture

## Decision

Public GROQ and the private ChatGPT CMS assistant use separate source systems.
There is no cross-library fallback.

| Surface | Provider | Permitted knowledge |
| --- | --- | --- |
| `/legal-ai` and public popup | GROQ | Real-time web search restricted to active domains in `public_ai_source_registry`; fixed FACS service copy for FACS-service questions |
| CMS assistant | OpenAI | Relevant excerpts from `cms_knowledge_documents` / `cms_knowledge_chunks`, curated by an authenticated administrator, plus non-content CMS operational metadata |

## Public GROQ flow

1. The server loads active, citation-enabled domains from `public_ai_source_registry`.
2. `groq/compound` performs real-time web search with `search_settings.include_domains`; only the `web_search` Compound tool is enabled.
3. The server discards every result whose HTTPS hostname is not on the registry.
4. Results are labelled:
   - P1 / `official`: official government or issuing-authority material;
   - P2 / `reputable_legal_database`: reputable secondary databases, including Thư Viện Pháp Luật and LuatVietnam;
   - P2 / `professional_reference`: other administrator-approved professional sources.
5. `openai/gpt-oss-120b` on GROQ prepares strict structured output from the filtered source pack and uses source codes `[W1]`, `[W2]`, etc.
6. The server withholds an answer that cites an unknown source or provides no approved citation.
7. A definitive current obligation, deadline, rate or legal effect requires a relevant P1 official source. P2 sources may explain and cross-check but are not issuing authorities.

Official GROQ documentation confirms that Compound web search supports automatic citations and `search_settings.include_domains`: <https://console.groq.com/docs/web-search>.

Admin route: `/admin/public-ai-sources`.

## Private CMS library flow

Admin route: `/admin/cms-knowledge`.

Supported inputs:

- HTTPS URL;
- PDF with a text layer;
- DOCX;
- TXT / Markdown / CSV / HTML / JSON;
- maximum file size: 15 MB.

Files are stored in the private `cms-private-library` Supabase Storage bucket.
The `cms-knowledge-ingest` Edge Function authorizes the CMS user, validates URL
and file limits, extracts text, creates bounded chunks and activates the
document only after indexing succeeds. A scanned PDF without a text layer must
be OCR-processed before upload.

The CMS assistant searches `search_cms_knowledge()` for the administrator's
question. Only relevant excerpts are sent to OpenAI with `store: false`.
Source-grounded statements must cite `[D1]`, `[D2]`, etc. The assistant remains
read-only and cannot edit, publish, delete or send CMS data.

## Isolation and privacy controls

- Public GROQ cannot query `cms_knowledge_documents`, `cms_knowledge_chunks` or the private Storage bucket.
- The OpenAI CMS assistant does not call web search and does not use the GROQ domain registry as knowledge.
- Applicant names, CVs, inquiry messages, email addresses, phone numbers, client files and other PII are not included in the CMS operational context.
- URL/file content is treated as untrusted data; embedded instructions cannot override system rules.
- URL ingestion accepts HTTPS only, blocks literal/private/local addresses and revalidates redirects.
- The Storage bucket is private; uploads are scoped to the authenticated user's folder.
- Archiving removes a document from retrieval without hard-deleting its audit trail or original file.

## Database and Edge Functions

Migration:

```text
20260801190000_v20_19_split_ai_libraries.sql
```

New tables:

- `public_ai_source_registry`
- `cms_knowledge_documents`
- `cms_knowledge_chunks`

New RPC:

- `search_cms_knowledge(text, integer)`

Changed/new Edge Functions:

- `legal-ai-assistant` — public allowlisted web search and answer synthesis;
- `cms-assistant` — private-library retrieval only;
- `cms-knowledge-ingest` — authenticated URL/file extraction and indexing.

The v20.18 `legal_ai_documents` tables are retained for audit and rollback but
are no longer queried by the v20.19 public or private assistant.

## Server secrets and model overrides

Required:

```text
GROQ_API_KEY
OPENAI_API_KEY
```

Optional:

```text
GROQ_PUBLIC_SEARCH_MODEL=groq/compound
GROQ_PUBLIC_ANSWER_MODEL=openai/gpt-oss-120b
OPENAI_CMS_ASSISTANT_MODEL=gpt-5.6-sol
FACS_AI_ALLOWED_ORIGINS=https://facs.vn,https://www.facs.vn,<exact-preview-origin>
```

`GROQ_PUBLIC_LEGAL_MODEL` remains a backward-compatible answer-model fallback.
It does not control the web-search model.

## Preview deployment order

Run only after reviewing the migration and confirming the correct Supabase
project. Do not deploy directly from `main`.

```powershell
npx supabase@latest db push
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

## QA gate

- Public source registry contains both P1 official and P2 reputable sources.
- GROQ returns only HTTPS citations whose domains are active in the registry.
- A no-source question is refused; an outside-domain result is discarded.
- A P2-only result is not presented as a definitive legal conclusion.
- FACS-service questions still work when GROQ is unavailable.
- URL and PDF/DOCX/text uploads become `active` and appear in retrieval tests.
- Archived/error private documents are not retrieved.
- CMS assistant cites private sources and does not claim public web access.
- Private file links require a short-lived signed URL.
- Existing Legal Calendar, Insights, Careers, Contact, Privacy and Terms routes remain operational.
- `npm run lint`, `npm run build` and Deno checks pass.

## Rollback

Frontend and functions can be rolled back to v20.18.1. The migration is
additive and does not modify or delete v20.18 data. To stop one provider without
rollback, disable its key or do not deploy its updated function. Do not drop the
private library tables or Storage bucket while files or audit evidence remain.
