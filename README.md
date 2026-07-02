# FACS Website v20.4

> Baseline mới nhất: 9 dịch vụ + Careers CMS + Insights CMS hẹn giờ đăng bài. Bản v20.4 bổ sung tác giả/slug song ngữ và tối ưu bố cục Admin.

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
