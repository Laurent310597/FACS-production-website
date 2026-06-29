FACS WEBSITE v20.2 - SCHEDULED PUBLISHING PATCH

1. Run Supabase migration first:
   supabase/migrations/v20.2-scheduled-publishing.sql
2. Copy all remaining patch files/folders into the local GitHub repository.
3. Replace matching files when Windows asks.
4. Commit: Add scheduled publishing for Insights
5. Push origin and wait for Vercel deployment to become Ready.

No new Vercel environment variable is required.
This package contains no password, secret key or live Supabase data.
