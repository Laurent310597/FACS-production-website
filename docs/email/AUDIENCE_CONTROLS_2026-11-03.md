# Audience controls and justified email content

The Email & Audience page shows 10 contacts per page by default, with 5/10/20/50/100 options. Selection persists across pages and filters. Select-page only affects eligible contacts on that page. When contacts are selected, both the workflow confirmation and the list action open the selected-group preview, with the exact Bcc list. With no selection, the existing full-Audience workflow remains available. Individual envelope actions remain available.

Selected groups require the current content preview and internal test within 24 hours. The server checks all selected IDs, subscription status, address eligibility, and the preview's Bcc snapshot. Empty, stale, deleted, or opted-out selections fail as a whole. The SQL claim serializes requests by article, records the selected IDs and actual Bcc addresses, and deduplicates retries by request ID. It uses SECURITY INVOKER and is executable only by service_role; Audience only needs SELECT. Selected sends preserve the internal To/Cc and place customers only in Bcc. Failures never enter automatic full-Audience retries.

History defaults to today's summary in Vietnam time. Inclusive start/end date filters apply on the server using UTC bounds. Exact counts cover the whole range, including internal tests, rather than just a displayed page. Detail rows are collapsed initially and paginated when opened. Provider acceptance continues to be distinguished from recipient delivery.

Insights, HR and Contact email bodies use inline justified alignment, including configured receipt templates. Arial, bilingual content, signature layout, and article links are preserved. The Insights template version changes so earlier content reviews must be repeated.

Validation: 25 email checks, 7 handler scenarios with mocked Graph, 13 React DOM interaction checks, and SQL claim regression transactions against Preview. Type checks for all three email handlers, production build, and AR import regression pass. Browser preview infrastructure is unavailable in this session; DOM checks do not certify visual rendering in Outlook. No real email was sent by these checks.
