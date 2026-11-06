-- Index foreign key yang belum punya index.
-- Aman dijalankan berulang: semua memakai create index if not exists.

create index if not exists idx_cart_draft_items_product_id
  on public.cart_draft_items (product_id);

create index if not exists idx_cart_drafts_sales_employee_id
  on public.cart_drafts (sales_employee_id);

create index if not exists idx_leave_requests_branch_id
  on public.leave_requests (branch_id);

create index if not exists idx_leave_requests_reviewed_by
  on public.leave_requests (reviewed_by);

create index if not exists idx_stock_in_items_product_id
  on public.stock_in_items (product_id);

create index if not exists idx_stock_ins_user_id
  on public.stock_ins (user_id);

create index if not exists idx_stock_opname_items_product_id
  on public.stock_opname_items (product_id);

create index if not exists idx_stock_opnames_user_id
  on public.stock_opnames (user_id);

create index if not exists idx_stock_transfer_items_product_id
  on public.stock_transfer_items (product_id);

create index if not exists idx_stock_transfers_user_id
  on public.stock_transfers (user_id);

create index if not exists idx_transactions_refunded_by_id
  on public.transactions (refunded_by_id);
