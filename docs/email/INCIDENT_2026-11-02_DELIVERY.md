# Insights individual-send permission and delivery-status incident — 02 November 2026

Individual sends failed before any mail-provider submission because the recipient lookup used SELECT FOR SHARE. PostgreSQL requires UPDATE privilege for row-locking SELECT; production correctly grants service_role only SELECT on the Audience table. Preview also granted UPDATE, so its original tests did not reproduce production permissions.

The fix removes the unnecessary Audience row lock. The article claim still locks the article row and atomically snapshots recipients and records an idempotent request. SECURITY INVOKER and existing table/function privileges remain unchanged. No UPDATE permission or SECURITY DEFINER is introduced.

The SQL regression now revokes Audience UPDATE inside its rolled-back Preview transaction and asserts the server has SELECT but no column UPDATE permission. The old function reproduces the permission error under that profile; the corrected function passes the complete claim/finalize/retry/opt-out suite.

Delivery investigation independently confirmed an earlier bulk message exists in the sender mailbox with the expected Bcc count and recipient-specific non-delivery reports. Recipient identities, message IDs and diagnostic contents are private and are not stored in this repository. A provider acceptance and a Sent Items copy do not prove delivery to every recipient.

The CMS now labels successful API submissions as “Đã chuyển Microsoft 365” and explains that per-recipient delivery requires NDR/Message Trace verification. Existing database status values and historical logs are retained. No customer status changes or automatic resends are performed during this fix.

Sources: https://www.postgresql.org/docs/17/sql-select.html ; https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0
