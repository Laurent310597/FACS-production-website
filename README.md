# FACS Website v20.19

> Baseline hiện tại: website song ngữ, CMS nội dung/tuyển dụng/email, Lịch pháp lý, bộ tiện ích và nền tảng AI có kiểm soát nguồn.

Production source for `facs.vn`.

## Stack

- React + Vite
- Tailwind CSS
- Supabase Authentication, Database and Storage
- Vercel deployment

## Insights CMS

Admin routes:

- `/admin/login`
- `/admin/posts`
- `/admin/posts/new`
- `/admin/posts/:id/edit`

Publication options:

- Save draft
- Schedule publication in Vietnam time (UTC+7)
- Publish immediately

Scheduled articles use `status = 'published'` with a future `published_at` timestamp. Supabase RLS prevents public access until the scheduled time arrives.

## Legal Calendar

Public route:

- `/legal-calendar`

Admin routes:

- `/admin/legal-calendar`
- `/admin/legal-calendar/new`
- `/admin/legal-calendar/:id/edit`
- `/admin/legal-sources`

The source monitor creates review candidates only. A deadline becomes public
only after an authenticated FACS administrator verifies it against a P1
official source and publishes it.

## FACS AI platform

Public routes and surfaces:

- `/legal-ai`: GROQ web search restricted to the approved public-source domain registry.
- Floating FACS Assistant: the same approved-source GROQ search plus the existing contact workflow.

Admin capability:

- `/admin/public-ai-sources`: manage P1 official and P2 reputable domains that public GROQ may search and cite.
- `/admin/cms-knowledge`: build the separate private ChatGPT CMS library from URLs and uploaded PDF/DOCX/TXT/MD/CSV/HTML/JSON files.
- Floating CMS assistant: authenticated, read-only OpenAI support using live CMS summaries and relevant excerpts from the private administrator-curated library, without contact, applicant or client personal data.

The two libraries are isolated. Public GROQ never receives CMS-library files or
excerpts. The CMS OpenAI assistant does not browse the public web or read the
public GROQ registry as a knowledge base. Raw public questions and answers are
not stored in the FACS AI audit log; the log contains technical metadata only.

Operating model, deployment and rollback: `docs/FACS_AI_PLATFORM_V20.19.md`.

## Local commands

```bash
npm ci
npm run dev
npm run lint
npm run build
```

## Supabase

- Fresh setup: `supabase/setup.sql`
- Upgrade from v20.1: `supabase/migrations/v20.2-scheduled-publishing.sql`
- Legal Calendar: `supabase/migrations/v20.6-legal-calendar.sql`
- AI platform baseline: `supabase/migrations/20260801160000_v20_18_ai_platform.sql`
- Split AI libraries: `supabase/migrations/20260801190000_v20_19_split_ai_libraries.sql`

## Deployment

The production repository is deployed automatically by Vercel after changes are pushed to the `main` branch.
