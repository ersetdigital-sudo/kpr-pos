-- PPN dan ongkir pada penjualan (Kasir & Pesanan Sales).
-- Aditif dan idempotent: semua kolom baru punya default sehingga data lama
-- dianggap tanpa PPN, ambil di toko, dan nominalnya tidak bergeser.
--
-- Aturan hitung (disamakan dengan lib/store/charges.ts):
--   dasar PPN = subtotal barang setelah semua diskon (tanpa ongkir)
--   PPN       = round(dasar x tarif / 100), hanya bila tax_enabled
--   total     = dasar + PPN + ongkir
-- Total dari klien tidak pernah dipakai; server menghitung ulang dari item.

-- ===== Kolom baru =====
alter table public.settings
  add column if not exists tax_rate numeric(5,2) not null default 11;

alter table public.transactions
  add column if not exists tax_enabled boolean not null default false;
alter table public.transactions
  add column if not exists tax_rate numeric(5,2) not null default 0;
alter table public.transactions
  add column if not exists tax_amount integer not null default 0;
alter table public.transactions
  add column if not exists shipping_method text not null default 'pickup';
alter table public.transactions
  add column if not exists shipping_cost integer not null default 0;

alter table public.sales_orders
  add column if not exists tax_enabled boolean not null default false;
alter table public.sales_orders
  add column if not exists tax_rate numeric(5,2) not null default 0;
alter table public.sales_orders
  add column if not exists tax_amount integer not null default 0;
alter table public.sales_orders
  add column if not exists shipping_method text not null default 'pickup';
alter table public.sales_orders
  add column if not exists shipping_cost integer not null default 0;

-- ===== Constraint (dijaga agar migration aman diulang) =====
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_shipping_method_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_shipping_method_check
      check (shipping_method in ('pickup', 'paid', 'free'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_tax_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_tax_check
      check (tax_rate >= 0 and tax_rate <= 100 and tax_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_orders_shipping_method_check'
      and conrelid = 'public.sales_orders'::regclass
  ) then
    alter table public.sales_orders
      add constraint sales_orders_shipping_method_check
      check (shipping_method in ('pickup', 'paid', 'free'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_orders_tax_check'
      and conrelid = 'public.sales_orders'::regclass
  ) then
    alter table public.sales_orders
      add constraint sales_orders_tax_check
      check (tax_rate >= 0 and tax_rate <= 100 and tax_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'settings_tax_rate_check'
      and conrelid = 'public.settings'::regclass
  ) then
    alter table public.settings
      add constraint settings_tax_rate_check
      check (tax_rate >= 0 and tax_rate <= 100);
  end if;
end;
$$;

-- ===== JSON transaksi =====
create or replace function public.fn_sales_transaction_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'invoiceNumber', t.invoice_number,
    'branchId', t.branch_id,
    'cashierId', t.cashier_id,
    'salesEmployeeId', t.sales_employee_id,
    'subtotal', t.subtotal,
    'discount', jsonb_build_object(
      'type', t.discount_type,
      'value', t.discount_value,
      'amount', t.discount_amount
    ),
    'total', t.total,
    'taxEnabled', t.tax_enabled,
    'taxRate', t.tax_rate,
    'taxAmount', t.tax_amount,
    'shippingMethod', t.shipping_method,
    'shippingCost', t.shipping_cost,
    'payment', jsonb_build_object(
      'method', t.payment_method,
      'cashReceived', t.cash_received,
      'change', t.change_amount,
      'bankAccountId', t.bank_account_id
    ),
    'createdAt', to_char(t.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', i.product_id,
        'productName', i.product_name,
        'unitPrice', i.unit_price,
        'unitCost', i.unit_cost,
        'quantity', i.quantity,
        'lineTotal', i.line_total,
        'priceType', i.price_type,
        'discountType', i.discount_type,
        'discountValue', i.discount_value,
        'discountAmount', i.discount_amount
      ) order by i.id)
      from public.transaction_items i
      where i.transaction_id = t.id
    ), '[]'::jsonb),
    'refund', case
      when t.refunded_at is null then null
      else jsonb_build_object(
        'at', to_char(t.refunded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'byId', coalesce(t.refunded_by_id, ''),
        'byName', coalesce(t.refunded_by_name, ''),
        'reason', coalesce(t.refund_reason, ''),
        'amount', coalesce(t.refund_amount, 0)
      )
    end
  )
  from public.transactions t
  where t.id = p_id;
$$;

-- ===== JSON pesanan sales =====
create or replace function public.fn_sales_order_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'orderNumber', o.order_number,
    'customerName', o.customer_name,
    'customerPhone', o.customer_phone,
    'branchId', o.branch_id,
    'salesEmployeeId', o.sales_employee_id,
    'total', o.total,
    'taxEnabled', o.tax_enabled,
    'taxRate', o.tax_rate,
    'taxAmount', o.tax_amount,
    'shippingMethod', o.shipping_method,
    'shippingCost', o.shipping_cost,
    'status', o.status,
    'paidAt', case
      when o.paid_at is null then null
      else to_char(o.paid_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    end,
    'stockApplied', o.stock_applied,
    'transactionId', o.transaction_id,
    'note', o.note,
    'createdAt', to_char(o.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', i.product_id,
        'productName', i.product_name,
        'unitPrice', i.unit_price,
        'unitCost', i.unit_cost,
        'quantity', i.quantity,
        'priceType', i.price_type,
        'discountType', i.discount_type,
        'discountValue', i.discount_value,
        'discountAmount', i.discount_amount
      ) order by i.id)
      from public.sales_order_items i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.sales_orders o
  where o.id = p_id;
$$;

-- ===== Pengaturan tarif PPN default =====
create or replace function public.fn_update_tax_rate(p_rate numeric)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_rate numeric(5,2);
begin
  if p_rate is null or p_rate < 0 or p_rate > 100 then
    raise exception 'Tarif PPN harus antara 0 dan 100';
  end if;

  v_rate := round(p_rate, 2);

  update public.settings set
    tax_rate = v_rate,
    updated_at = now()
  where id = 1;

  if not found then raise exception 'Pengaturan belum siap. Muat ulang halaman.'; end if;
end;
$$;
revoke execute on function public.fn_update_tax_rate(numeric) from public, anon, authenticated;
grant execute on function public.fn_update_tax_rate(numeric) to service_role;

-- ===== Pesanan sales: PPN + ongkir =====
create or replace function public.fn_create_sales_order(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_branch_id text := p_payload ->> 'branchId';
  v_sales_id text := p_payload ->> 'salesEmployeeId';
  v_order_id text := public.gen_id('so');
  v_order_number text;
  v_customer_name text := trim(coalesce(p_payload ->> 'customerName', ''));
  v_customer_phone text := trim(coalesce(p_payload ->> 'customerPhone', ''));
  v_note text := trim(coalesce(p_payload ->> 'note', ''));
  v_goods_total integer := 0;
  v_tax_enabled boolean := coalesce((p_payload ->> 'taxEnabled')::boolean, false);
  v_tax_rate numeric(5,2) := greatest(
    0,
    least(100, coalesce((p_payload ->> 'taxRate')::numeric, 0))
  );
  v_tax_amount integer := 0;
  v_shipping_method text := coalesce(p_payload ->> 'shippingMethod', '');
  v_shipping_cost integer := 0;
  v_total integer := 0;
  v_item record;
  v_product record;
  v_price_type text;
  v_discount_type text;
  v_discount_value integer;
  v_unit_price integer;
  v_gross integer;
  v_item_discount integer;
begin
  if length(v_customer_name) = 0 then raise exception 'Nama pelanggan wajib diisi'; end if;

  if v_branch_id is null or not exists (select 1 from public.branches where id = v_branch_id) then
    raise exception 'Cabang pesanan tidak ditemukan';
  end if;

  if v_sales_id is null or not exists (
    select 1 from public.employees
    where id = v_sales_id and role = 'Sales' and is_active = true
  ) then
    raise exception 'Pilih sales yang valid';
  end if;

  if jsonb_array_length(coalesce(p_payload -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'Tambahkan minimal satu produk';
  end if;

  if v_shipping_method not in ('pickup', 'paid', 'free') then
    raise exception 'Pilih metode pengiriman';
  end if;

  v_shipping_cost := case
    when v_shipping_method = 'paid'
      then greatest(coalesce((p_payload ->> 'shippingCost')::integer, 0), 0)
    else 0
  end;

  v_order_number := public.fn_next_sales_order_number();

  insert into public.sales_orders (
    id, order_number, customer_name, customer_phone, branch_id,
    sales_employee_id, total, status, stock_applied, note, created_at,
    tax_enabled, tax_rate, tax_amount, shipping_method, shipping_cost
  ) values (
    v_order_id, v_order_number, v_customer_name, v_customer_phone, v_branch_id,
    v_sales_id, 0, 'Menunggu bayar', false, v_note, now(),
    v_tax_enabled, v_tax_rate, 0, v_shipping_method, v_shipping_cost
  );

  for v_item in
    select
      item.value ->> 'productId' as product_id,
      sum(coalesce((item.value ->> 'quantity')::integer, 0))::integer as quantity,
      coalesce(nullif(item.value ->> 'priceType', ''), 'retail') as price_type,
      coalesce(nullif(item.value ->> 'discountType', ''), 'nominal') as discount_type,
      greatest(coalesce((item.value ->> 'discountValue')::integer, 0), 0) as discount_value
    from jsonb_array_elements(coalesce(p_payload -> 'items', '[]'::jsonb)) as item(value)
    group by 1, 3, 4, 5
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah produk tidak valid';
    end if;

    v_price_type := v_item.price_type;
    v_discount_type := v_item.discount_type;
    v_discount_value := v_item.discount_value;

    if v_price_type not in ('retail', 'wholesale') then
      raise exception 'Jenis harga tidak valid';
    end if;
    if v_discount_type not in ('nominal', 'percent') then
      raise exception 'Tipe diskon tidak valid';
    end if;

    select name, price, wholesale_price, cost_price into v_product
    from public.products where id = v_item.product_id and is_active = true;

    if not found then raise exception 'Ada produk yang tidak tersedia'; end if;

    v_unit_price := case
      when v_price_type = 'wholesale' and v_product.wholesale_price > 0
        then v_product.wholesale_price
      else v_product.price
    end;

    v_gross := v_unit_price * v_item.quantity;
    v_item_discount := case
      when v_discount_type = 'percent' then least(
        v_gross,
        round(v_gross * least(100, v_discount_value) / 100.0)::integer
      )
      else least(v_gross, v_discount_value * v_item.quantity)
    end;

    insert into public.sales_order_items (
      id, order_id, product_id, product_name,
      unit_price, unit_cost, quantity,
      price_type, discount_type, discount_value, discount_amount
    ) values (
      public.gen_id('soi'), v_order_id, v_item.product_id, v_product.name,
      v_unit_price, v_product.cost_price, v_item.quantity,
      v_price_type, v_discount_type, v_discount_value, v_item_discount
    );

    v_goods_total := v_goods_total + (v_gross - v_item_discount);
  end loop;

  if v_goods_total <= 0 then raise exception 'Jumlah produk harus lebih dari 0'; end if;

  -- Ongkir tidak dikenai PPN; dasar PPN hanya barang setelah diskon.
  v_tax_amount := case
    when v_tax_enabled then round(v_goods_total * v_tax_rate / 100.0)::integer
    else 0
  end;
  v_total := v_goods_total + v_tax_amount + v_shipping_cost;

  update public.sales_orders set
    total = v_total,
    tax_amount = v_tax_amount,
    shipping_cost = v_shipping_cost
  where id = v_order_id;

  return public.fn_sales_order_json(v_order_id);
end;
$$;

-- ===== Transaksi kasir: PPN + ongkir, pesanan ikut tersinkron =====
create or replace function public.fn_create_transaction(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_branch_id text := p_payload ->> 'branchId';
  v_cashier_id text := p_payload ->> 'cashierId';
  v_sales_id text := nullif(p_payload ->> 'salesEmployeeId', '');
  v_sales_order_id text := nullif(p_payload ->> 'salesOrderId', '');
  v_transaction_id text := public.gen_id('trx');
  v_invoice_number text;
  v_method text := p_payload ->> 'paymentMethod';
  v_cash_received integer := nullif(p_payload ->> 'cashReceived', '')::integer;
  v_bank_account_id text := nullif(p_payload ->> 'bankAccountId', '');
  v_change integer;
  v_subtotal integer := 0;
  v_discount_amount integer := 0;
  v_goods_total integer := 0;
  v_tax_enabled boolean := coalesce((p_payload ->> 'taxEnabled')::boolean, false);
  v_tax_rate numeric(5,2) := greatest(
    0,
    least(100, coalesce((p_payload ->> 'taxRate')::numeric, 0))
  );
  v_tax_amount integer := 0;
  v_shipping_method text := coalesce(p_payload ->> 'shippingMethod', '');
  v_shipping_cost integer := 0;
  v_total integer := 0;
  v_item record;
  v_product record;
  v_order public.sales_orders%rowtype;
  v_order_item record;
  v_order_item_found boolean;
  v_price_type text;
  v_discount_type text;
  v_discount_value integer;
  v_unit_price integer;
  v_gross integer;
  v_item_discount integer;
  v_stock integer;
  v_enabled_methods text[];
begin
  if v_branch_id is null or not exists (select 1 from public.branches where id = v_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;

  if v_cashier_id is null or not exists (
    select 1 from public.employees where id = v_cashier_id and is_active = true
  ) then
    raise exception 'Kasir tidak ditemukan';
  end if;

  if v_sales_id is not null and not exists (
    select 1 from public.employees
    where id = v_sales_id and role = 'Sales' and is_active = true
  ) then
    raise exception 'Sales tidak ditemukan';
  end if;

  if v_method not in ('Cash', 'QRIS', 'Transfer') then
    raise exception 'Metode pembayaran tidak valid';
  end if;

  select enabled_payment_methods into v_enabled_methods
  from public.settings where id = 1;

  if not found then raise exception 'Pengaturan pembayaran belum siap'; end if;
  if not v_method = any(v_enabled_methods) then
    raise exception 'Metode pembayaran sedang tidak aktif';
  end if;

  if jsonb_array_length(coalesce(p_payload -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'Keranjang masih kosong';
  end if;

  if v_shipping_method not in ('pickup', 'paid', 'free') then
    raise exception 'Pilih metode pengiriman';
  end if;

  v_shipping_cost := case
    when v_shipping_method = 'paid'
      then greatest(coalesce((p_payload ->> 'shippingCost')::integer, 0), 0)
    else 0
  end;

  if v_sales_order_id is not null then
    select * into v_order from public.sales_orders
    where id = v_sales_order_id for update;

    if not found then raise exception 'Pesanan tidak ditemukan'; end if;
    if v_order.branch_id <> v_branch_id then
      raise exception 'Cabang pesanan tidak sesuai';
    end if;
    if v_order.status in ('Lunas', 'Dibatalkan') then
      raise exception 'Pesanan sudah tidak bisa dibayar';
    end if;

    v_sales_id := coalesce(v_sales_id, v_order.sales_employee_id);
  end if;

  v_invoice_number := public.fn_next_invoice_number();

  insert into public.transactions (
    id, invoice_number, branch_id, cashier_id, sales_employee_id,
    subtotal, discount_type, discount_value, discount_amount, total,
    payment_method, cash_received, change_amount, bank_account_id, created_at,
    tax_enabled, tax_rate, tax_amount, shipping_method, shipping_cost
  ) values (
    v_transaction_id, v_invoice_number, v_branch_id, v_cashier_id,
    v_sales_id,
    0, 'nominal', 0, 0, 0,
    v_method, null, null, null, now(),
    v_tax_enabled, v_tax_rate, 0, v_shipping_method, v_shipping_cost
  );

  for v_item in
    select
      item.value ->> 'productId' as product_id,
      sum(coalesce((item.value ->> 'quantity')::integer, 0))::integer as quantity,
      coalesce(nullif(item.value ->> 'priceType', ''), 'retail') as price_type,
      coalesce(nullif(item.value ->> 'discountType', ''), 'nominal') as discount_type,
      greatest(coalesce((item.value ->> 'discountValue')::integer, 0), 0) as discount_value
    from jsonb_array_elements(coalesce(p_payload -> 'items', '[]'::jsonb)) as item(value)
    group by 1, 3, 4, 5
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah produk tidak valid';
    end if;

    v_price_type := v_item.price_type;
    v_discount_type := v_item.discount_type;
    v_discount_value := v_item.discount_value;

    if v_price_type not in ('retail', 'wholesale') then
      raise exception 'Jenis harga tidak valid';
    end if;
    if v_discount_type not in ('nominal', 'percent') then
      raise exception 'Tipe diskon tidak valid';
    end if;

    select name, price, wholesale_price, cost_price, is_active into v_product
    from public.products where id = v_item.product_id;

    if not found or v_product.is_active is not true then
      raise exception 'Ada produk yang sudah tidak tersedia';
    end if;

    -- Pesanan sales memakai harga & diskon yang sudah disepakati saat order.
    v_order_item_found := false;
    if v_sales_order_id is not null then
      select unit_price, price_type, discount_type, discount_value
      into v_order_item
      from public.sales_order_items
      where order_id = v_sales_order_id and product_id = v_item.product_id
      limit 1;

      v_order_item_found := found;
    end if;

    if v_order_item_found then
      v_unit_price := v_order_item.unit_price;
      v_price_type := v_order_item.price_type;
      v_discount_type := v_order_item.discount_type;
      v_discount_value := v_order_item.discount_value;
    else
      v_unit_price := case
        when v_price_type = 'wholesale' and v_product.wholesale_price > 0
          then v_product.wholesale_price
        else v_product.price
      end;
    end if;

    select quantity into v_stock
    from public.stock_levels
    where branch_id = v_branch_id and product_id = v_item.product_id
    for update;

    v_stock := coalesce(v_stock, 0);

    if v_stock < v_item.quantity then
      raise exception 'Stok % tersisa % pcs', v_product.name, v_stock;
    end if;

    v_gross := v_unit_price * v_item.quantity;
    v_item_discount := case
      when v_discount_type = 'percent' then least(
        v_gross,
        round(v_gross * least(100, v_discount_value) / 100.0)::integer
      )
      else least(v_gross, v_discount_value * v_item.quantity)
    end;

    insert into public.transaction_items (
      id, transaction_id, product_id, product_name,
      unit_price, unit_cost, quantity, line_total,
      price_type, discount_type, discount_value, discount_amount
    ) values (
      public.gen_id('tri'), v_transaction_id, v_item.product_id, v_product.name,
      v_unit_price, v_product.cost_price, v_item.quantity,
      v_gross - v_item_discount,
      v_price_type, v_discount_type, v_discount_value, v_item_discount
    );

    update public.stock_levels
    set quantity = quantity - v_item.quantity
    where branch_id = v_branch_id and product_id = v_item.product_id;

    v_subtotal := v_subtotal + v_gross;
    v_discount_amount := v_discount_amount + v_item_discount;
  end loop;

  if v_subtotal <= 0 then raise exception 'Keranjang masih kosong'; end if;

  v_goods_total := greatest(0, v_subtotal - v_discount_amount);

  -- Ongkir tidak dikenai PPN; dasar PPN hanya barang setelah diskon.
  v_tax_amount := case
    when v_tax_enabled then round(v_goods_total * v_tax_rate / 100.0)::integer
    else 0
  end;
  v_total := v_goods_total + v_tax_amount + v_shipping_cost;

  if v_method = 'Cash' then
    if v_cash_received is null or v_cash_received < v_total then
      raise exception 'Uang diterima kurang dari total';
    end if;
    v_change := v_cash_received - v_total;
  elsif v_method = 'Transfer' then
    if v_bank_account_id is null or not exists (
      select 1 from public.bank_accounts where id = v_bank_account_id
    ) then
      raise exception 'Rekening transfer belum dipilih';
    end if;
    v_cash_received := null;
    v_change := null;
  else
    v_cash_received := null;
    v_change := null;
    v_bank_account_id := null;
  end if;

  update public.transactions set
    subtotal = v_subtotal,
    discount_type = 'nominal',
    discount_value = v_discount_amount,
    discount_amount = v_discount_amount,
    tax_amount = v_tax_amount,
    shipping_cost = v_shipping_cost,
    total = v_total,
    cash_received = v_cash_received,
    change_amount = v_change,
    bank_account_id = v_bank_account_id
  where id = v_transaction_id;

  if v_sales_order_id is not null then
    -- Nilai final transaksi menjadi nilai final pesanan (termasuk penyesuaian
    -- ongkir/PPN oleh kasir saat pembayaran).
    update public.sales_orders set
      status = 'Lunas',
      stock_applied = true,
      paid_at = now(),
      transaction_id = v_transaction_id,
      tax_enabled = v_tax_enabled,
      tax_rate = v_tax_rate,
      tax_amount = v_tax_amount,
      shipping_method = v_shipping_method,
      shipping_cost = v_shipping_cost,
      total = v_total
    where id = v_sales_order_id;
  end if;

  return public.fn_sales_transaction_json(v_transaction_id);
end;
$$;

-- ===== Hak akses: hanya server/service role =====
revoke execute on function public.fn_create_transaction(jsonb) from public, anon, authenticated;
revoke execute on function public.fn_create_sales_order(jsonb) from public, anon, authenticated;
grant execute on function public.fn_create_transaction(jsonb) to service_role;
grant execute on function public.fn_create_sales_order(jsonb) to service_role;
