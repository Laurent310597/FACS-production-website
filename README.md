# FACS Website v20.6

> Nhánh `feature/ai-assistant-v20.6` được phát triển trực tiếp từ `main`
> tại commit `d2231f109a125777f088b270e18ce5114972b378` — bản production v20.5
> đã tích hợp Form Email Automation và Admin Submissions. V20.6 bổ sung AI
> Assistant & Contact Widget mà không loại bỏ các chức năng v20.5.

## Current baseline

- Repository: `Laurent310597/FACS-production-website`
- Production branch: `main`
- Verified production baseline: `d2231f109a125777f088b270e18ce5114972b378`
- V20.6 base/parent commit: `d2231f109a125777f088b270e18ce5114972b378`
- V20.6 core feature commit: `0b6731df9a2db0afb1be49db24b845d5e699bab2`
- Deployment: Vercel status `success` for the verified production baseline

## Included website capabilities

- 9 service pillars
- Careers CMS and recruitment publishing workflow
- Insights CMS with scheduled publishing and bilingual author/slug support
- Contact and Careers form email automation
- Admin applications, inquiries and email delivery management
- Supabase Authentication, Database, Storage and Edge Functions
- Bilingual Vietnamese/English public website
- AI Assistant & Contact Widget on the v20.6 feature branch

# FACS Website v20.2

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

## Deployment

The production repository is deployed automatically by Vercel after changes are pushed to the `main` branch.
