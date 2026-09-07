# Supabase

Apply `supabase/migrations/202609070001_init.sql` to create the application and manual-billing schema, row-level security, job queue functions, order sequence, and administrator review transactions.

Customers can read only their own payment requests and subscriptions. Enabled payment instructions are readable by authenticated customers. Payment mutation, review, entitlement, credits, and audit data use trusted server operations.
