# FACS Website v20.18

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

- `/legal-ai`: Groq-powered basic legal reference.
- Floating FACS Assistant: the same controlled Groq retrieval plus the existing contact workflow.

Admin capability:

- `/admin/legal-knowledge`: create, review, version and approve the private legal knowledge base.
- Floating CMS assistant: authenticated, read-only OpenAI support using live CMS summaries without contact, applicant or client personal data.

The public AI may use only approved P1 documents and verified Legal Calendar
entries. Raw public questions and answers are not stored in the FACS AI audit
log; the log contains provider/model/status/source metadata only.

Operating model, deployment and rollback: `docs/FACS_AI_PLATFORM_V20.18.md`.

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
- AI platform: `supabase/migrations/v20.18-ai-platform.sql`

## Deployment

The production repository is deployed automatically by Vercel after changes are pushed to the `main` branch.
