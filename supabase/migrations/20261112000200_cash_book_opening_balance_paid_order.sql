-- Pesanan Lunas yang punya transaction_id sudah terwakili transaksi kasirnya,
-- jadi saldo awal tidak boleh menambahkan nominalnya lagi. Aturan ini sama
-- dengan collectSalesFrom di lib/store/sales.ts.

create or replace function public.fn_cash_book_opening_balance(
  p_start_date date,
  p_start_at timestamptz,
  p_branch_id text
)
returns bigint
language sql stable security definer set search_path = ''
as $$
  select
    coalesce((
      select sum(amount) from public.cash_book_entries
      where type = 'masuk' and entry_date < p_start_date
        and (p_branch_id is null or branch_id = p_branch_id)
    ), 0)
    - coalesce((
      select sum(amount) from public.cash_book_entries
      where type = 'keluar' and entry_date < p_start_date
        and (p_branch_id is null or branch_id = p_branch_id)
    ), 0)
    + coalesce((
      select sum(total) from public.transactions
      where refunded_at is null and created_at < p_start_at
        and (p_branch_id is null or branch_id = p_branch_id)
    ), 0)
    + coalesce((
      select sum(total) from public.sales_orders
      where status = 'Lunas'
        and transaction_id is null
        and coalesce(paid_at, created_at) < p_start_at
        and (p_branch_id is null or branch_id = p_branch_id)
    ), 0);
$$;
revoke execute on function public.fn_cash_book_opening_balance(date, timestamptz, text) from public, anon, authenticated;
grant execute on function public.fn_cash_book_opening_balance(date, timestamptz, text) to service_role;
