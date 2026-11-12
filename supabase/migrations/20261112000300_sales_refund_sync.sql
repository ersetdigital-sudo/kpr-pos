-- Sinkron dua arah: refund transaksi kasir <-> pembatalan pesanan sales.
-- Stok hanya dikembalikan sekali, apa pun arah pemicunya. Pesanan Lunas yang
-- dibayar lewat Kasir dihitung dari transaksinya (lihat collectSalesFrom).

-- Inti refund: satu tempat untuk jejak refund, dengan pilihan apakah stok
-- dikembalikan. Dipakai refund biasa (stok kembali) dan pembatalan pesanan
-- (stok sudah ditangani pembatalan, jadi tidak dikembalikan lagi).
create or replace function public.fn_refund_transaction_core(
  p_transaction_id text,
  p_user_id text,
  p_reason text,
  p_restore_stock boolean
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_transaction public.transactions%rowtype;
  v_employee public.employees%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_item record;
  v_order_already_returned boolean := false;
begin
  select * into v_employee from public.employees
  where id = p_user_id and is_active = true;

  if not found then raise exception 'Sesi pengguna tidak ditemukan'; end if;
  if length(v_reason) < 3 then raise exception 'Alasan refund minimal 3 karakter'; end if;

  select * into v_transaction from public.transactions
  where id = p_transaction_id for update;

  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  -- Pengaman idempotent: refund tidak bisa terjadi dua kali.
  if v_transaction.refunded_at is not null then
    raise exception 'Transaksi ini sudah direfund';
  end if;

  -- Pesanan terkait yang sudah dibatalkan lebih dulu sudah mengembalikan stok.
  select exists (
    select 1 from public.sales_orders
    where transaction_id = p_transaction_id
      and status = 'Dibatalkan'
      and stock_applied = false
  ) into v_order_already_returned;

  if p_restore_stock and not v_order_already_returned then
    for v_item in
      select product_id, quantity from public.transaction_items
      where transaction_id = p_transaction_id and product_id is not null
    loop
      insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
      values (v_transaction.branch_id, v_item.product_id, v_item.quantity, 5)
      on conflict (branch_id, product_id) do update
        set quantity = public.stock_levels.quantity + excluded.quantity;
    end loop;
  end if;

  update public.transactions set
    refunded_at = now(),
    refunded_by_id = v_employee.id,
    refunded_by_name = v_employee.name,
    refund_reason = v_reason,
    refund_amount = v_transaction.total
  where id = p_transaction_id;

  return public.fn_sales_transaction_json(p_transaction_id);
end;
$$;
revoke execute on function public.fn_refund_transaction_core(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.fn_refund_transaction_core(text, text, text, boolean) to service_role;

-- Refund biasa: stok kembali, lalu pesanan terkait ikut dibatalkan.
create or replace function public.fn_refund_transaction(
  p_transaction_id text,
  p_user_id text,
  p_reason text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_result jsonb;
  v_employee public.employees%rowtype;
  v_order record;
begin
  v_result := public.fn_refund_transaction_core(
    p_transaction_id, p_user_id, p_reason, true
  );

  select * into v_employee from public.employees where id = p_user_id;

  select id, order_number, branch_id into v_order
  from public.sales_orders
  where transaction_id = p_transaction_id and status <> 'Dibatalkan'
  order by created_at
  limit 1
  for update;

  if v_order.id is not null then
    -- Stok sudah dikembalikan refund di atas; pembatalan ini tidak menyentuh
    -- stok lagi supaya tidak kembali dua kali.
    update public.sales_orders set
      status = 'Dibatalkan',
      stock_applied = false,
      paid_at = null
    where id = v_order.id;

    insert into public.activity_logs (
      id, at, user_id, user_name, role, branch_id, action, detail
    ) values (
      public.gen_id('log'), now(), v_employee.id, v_employee.name,
      v_employee.role, v_order.branch_id, 'Membatalkan',
      'Pesanan ' || v_order.order_number
        || ' dibatalkan otomatis karena transaksi terkait direfund (sinkronisasi)'
    );
  end if;

  return v_result;
end;
$$;
revoke execute on function public.fn_refund_transaction(text, text, text) from public, anon, authenticated;
grant execute on function public.fn_refund_transaction(text, text, text) to service_role;

-- Ubah status pesanan: pembatalan pesanan Lunas ikut me-refund transaksinya.
create or replace function public.fn_update_sales_order_status(
  p_order_id text,
  p_status text,
  p_user_id text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_order public.sales_orders%rowtype;
  v_employee public.employees%rowtype;
  v_item record;
  v_stock integer;
  v_paid_at timestamptz;
  v_stock_applied boolean;
  v_transaction_refunded boolean := false;
begin
  select * into v_employee from public.employees
  where id = p_user_id and is_active = true;

  if not found then raise exception 'Sesi pengguna tidak ditemukan'; end if;

  select * into v_order from public.sales_orders
  where id = p_order_id for update;

  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if v_order.status = p_status then return public.fn_sales_order_json(p_order_id); end if;

  if not (
    (v_order.status = 'Belum sinkron' and p_status in ('Menunggu bayar', 'Dibatalkan'))
    or (v_order.status = 'Menunggu bayar' and p_status in ('Lunas', 'Dibatalkan'))
    or (v_order.status = 'Lunas' and p_status = 'Dibatalkan')
  ) then
    raise exception 'Status % tidak bisa diubah menjadi %', v_order.status, p_status;
  end if;

  if v_order.transaction_id is not null then
    select (refunded_at is not null) into v_transaction_refunded
    from public.transactions
    where id = v_order.transaction_id;

    v_transaction_refunded := coalesce(v_transaction_refunded, false);
  end if;

  v_paid_at := v_order.paid_at;
  v_stock_applied := v_order.stock_applied;

  if p_status = 'Lunas' and v_order.stock_applied = false then
    for v_item in
      select product_id, product_name, quantity
      from public.sales_order_items
      where order_id = p_order_id and product_id is not null
    loop
      select quantity into v_stock
      from public.stock_levels
      where branch_id = v_order.branch_id and product_id = v_item.product_id
      for update;

      v_stock := coalesce(v_stock, 0);

      if v_stock < v_item.quantity then
        raise exception 'Stok % tersisa % pcs', v_item.product_name, v_stock;
      end if;

      update public.stock_levels
      set quantity = quantity - v_item.quantity
      where branch_id = v_order.branch_id and product_id = v_item.product_id;
    end loop;

    v_stock_applied := true;
    v_paid_at := now();
  elsif v_order.stock_applied = true and p_status <> 'Lunas' then
    -- Stok yang sudah dikembalikan refund transaksi tidak dikembalikan lagi.
    if not v_transaction_refunded then
      for v_item in
        select product_id, quantity
        from public.sales_order_items
        where order_id = p_order_id and product_id is not null
      loop
        insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
        values (v_order.branch_id, v_item.product_id, v_item.quantity, 5)
        on conflict (branch_id, product_id) do update
          set quantity = public.stock_levels.quantity + excluded.quantity;
      end loop;
    end if;

    v_stock_applied := false;
    v_paid_at := null;
  end if;

  update public.sales_orders set
    status = p_status,
    stock_applied = v_stock_applied,
    paid_at = v_paid_at
  where id = p_order_id;

  -- Stok sudah ditangani di atas, jadi refund di sini tidak mengembalikan stok.
  if p_status = 'Dibatalkan'
    and v_order.transaction_id is not null
    and not v_transaction_refunded
  then
    perform public.fn_refund_transaction_core(
      v_order.transaction_id,
      p_user_id,
      'Pesanan ' || v_order.order_number || ' dibatalkan',
      false
    );

    insert into public.activity_logs (
      id, at, user_id, user_name, role, branch_id, action, detail
    ) values (
      public.gen_id('log'), now(), v_employee.id, v_employee.name,
      v_employee.role, v_order.branch_id, 'Refund',
      'Transaksi pesanan ' || v_order.order_number
        || ' direfund otomatis karena pesanan dibatalkan (sinkronisasi)'
    );
  end if;

  return public.fn_sales_order_json(p_order_id);
end;
$$;
revoke execute on function public.fn_update_sales_order_status(text, text, text) from public, anon, authenticated;
grant execute on function public.fn_update_sales_order_status(text, text, text) to service_role;

-- Backfill data lama: selaraskan status pasangan pesanan-transaksi tanpa
-- mengubah stok dan tanpa menghapus data. Aman dijalankan berulang.
update public.sales_orders o set
  status = 'Dibatalkan',
  stock_applied = false,
  paid_at = null
where o.status = 'Lunas'
  and o.id is not null
  and o.transaction_id is not null
  and exists (
    select 1 from public.transactions t
    where t.id = o.transaction_id and t.refunded_at is not null
  );

update public.transactions t set
  refunded_at = now(),
  refunded_by_name = 'Sistem (sinkronisasi)',
  refund_reason = 'Sinkronisasi data: pesanan terkait sudah dibatalkan',
  refund_amount = t.total
where t.refunded_at is null
  and t.id is not null
  and exists (
    select 1 from public.sales_orders o
    where o.transaction_id = t.id and o.status = 'Dibatalkan'
  );
