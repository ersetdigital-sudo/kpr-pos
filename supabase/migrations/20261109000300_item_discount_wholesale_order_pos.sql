-- Diskon per item, harga ecer/grosir, dan pembayaran pesanan sales dari kasir.
-- Aditif: kolom baru punya default sehingga data lama tetap valid.

alter table public.products
  add column if not exists wholesale_price integer not null default 0;

alter table public.transaction_items
  add column if not exists price_type text not null default 'retail';
alter table public.transaction_items
  add column if not exists discount_type text not null default 'nominal';
alter table public.transaction_items
  add column if not exists discount_value integer not null default 0;
alter table public.transaction_items
  add column if not exists discount_amount integer not null default 0;

alter table public.sales_order_items
  add column if not exists price_type text not null default 'retail';
alter table public.sales_order_items
  add column if not exists discount_type text not null default 'nominal';
alter table public.sales_order_items
  add column if not exists discount_value integer not null default 0;
alter table public.sales_order_items
  add column if not exists discount_amount integer not null default 0;

alter table public.sales_orders
  add column if not exists transaction_id text
  references public.transactions(id) on delete set null;

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

-- ===== Produk: harga grosir =====
-- Overload baru (8 argumen). Versi lama 7 argumen dibiarkan agar deploy lama
-- tetap jalan sampai kode baru aktif.
create or replace function public.fn_create_product(
  p_name text,
  p_sku text,
  p_category_id text,
  p_cost_price integer,
  p_price integer,
  p_image_url text,
  p_min_stock integer,
  p_wholesale_price integer
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_id text;
  v_name text := trim(p_name);
  v_sku text := upper(trim(p_sku));
  v_wholesale_price integer := greatest(coalesce(p_wholesale_price, 0), 0);
begin
  if length(v_name) < 1 then raise exception 'Nama produk wajib diisi'; end if;
  if length(v_sku) < 1 then raise exception 'SKU wajib diisi'; end if;
  if p_cost_price < 0 then raise exception 'Harga modal tidak boleh negatif'; end if;
  if p_price <= 0 then raise exception 'Harga jual harus lebih dari 0'; end if;
  if v_wholesale_price < 0 then raise exception 'Harga grosir tidak boleh negatif'; end if;
  if p_min_stock < 0 then raise exception 'Batas stok tidak boleh negatif'; end if;
  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'Kategori tidak ditemukan';
  end if;
  if exists (select 1 from public.products where lower(sku) = lower(v_sku)) then
    raise exception 'SKU % sudah dipakai produk lain', v_sku;
  end if;

  v_id := public.gen_id('prod');

  insert into public.products (
    id, name, sku, category_id, cost_price, price, wholesale_price,
    image_url, is_active
  ) values (
    v_id, v_name, v_sku, p_category_id, p_cost_price, p_price,
    v_wholesale_price, nullif(trim(coalesce(p_image_url, '')), ''), true
  );

  insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
  select b.id, v_id, 0, p_min_stock from public.branches b;

  return v_id;
end;
$$;

create or replace function public.fn_update_product(
  p_id text,
  p_name text,
  p_sku text,
  p_category_id text,
  p_cost_price integer,
  p_price integer,
  p_image_url text,
  p_min_stock integer,
  p_wholesale_price integer
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_name text := trim(p_name);
  v_sku text := upper(trim(p_sku));
  v_wholesale_price integer := greatest(coalesce(p_wholesale_price, 0), 0);
begin
  if not exists (select 1 from public.products where id = p_id) then
    raise exception 'Produk tidak ditemukan';
  end if;
  if length(v_name) < 1 then raise exception 'Nama produk wajib diisi'; end if;
  if length(v_sku) < 1 then raise exception 'SKU wajib diisi'; end if;
  if p_cost_price < 0 then raise exception 'Harga modal tidak boleh negatif'; end if;
  if p_price <= 0 then raise exception 'Harga jual harus lebih dari 0'; end if;
  if v_wholesale_price < 0 then raise exception 'Harga grosir tidak boleh negatif'; end if;
  if p_min_stock < 0 then raise exception 'Batas stok tidak boleh negatif'; end if;
  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'Kategori tidak ditemukan';
  end if;
  if exists (
    select 1 from public.products
    where id <> p_id and lower(sku) = lower(v_sku)
  ) then
    raise exception 'SKU % sudah dipakai produk lain', v_sku;
  end if;

  update public.products set
    name = v_name,
    sku = v_sku,
    category_id = p_category_id,
    cost_price = p_cost_price,
    price = p_price,
    wholesale_price = v_wholesale_price,
    image_url = nullif(trim(coalesce(p_image_url, '')), '')
  where id = p_id;

  update public.stock_levels
  set min_stock = p_min_stock
  where product_id = p_id;
end;
$$;

revoke execute on function public.fn_create_product(
  text, text, text, integer, integer, text, integer, integer
) from public, anon, authenticated;
revoke execute on function public.fn_update_product(
  text, text, text, text, integer, integer, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.fn_create_product(
  text, text, text, integer, integer, text, integer, integer
) to service_role;
grant execute on function public.fn_update_product(
  text, text, text, text, integer, integer, text, integer, integer
) to service_role;

-- ===== Pesanan sales: harga & diskon per item =====
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

  v_order_number := public.fn_next_sales_order_number();

  insert into public.sales_orders (
    id, order_number, customer_name, customer_phone, branch_id,
    sales_employee_id, total, status, stock_applied, note, created_at
  ) values (
    v_order_id, v_order_number, v_customer_name, v_customer_phone, v_branch_id,
    v_sales_id, 0, 'Menunggu bayar', false, v_note, now()
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
      else least(v_gross, v_discount_value)
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

    v_total := v_total + (v_gross - v_item_discount);
  end loop;

  if v_total <= 0 then raise exception 'Jumlah produk harus lebih dari 0'; end if;

  update public.sales_orders set total = v_total where id = v_order_id;

  return public.fn_sales_order_json(v_order_id);
end;
$$;

-- ===== Transaksi kasir: harga & diskon per item + pesanan sales =====
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
    payment_method, cash_received, change_amount, bank_account_id, created_at
  ) values (
    v_transaction_id, v_invoice_number, v_branch_id, v_cashier_id,
    v_sales_id,
    0, 'nominal', 0, 0, 0,
    v_method, null, null, null, now()
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
      else least(v_gross, v_discount_value)
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

  v_total := greatest(0, v_subtotal - v_discount_amount);

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
    total = v_total,
    cash_received = v_cash_received,
    change_amount = v_change,
    bank_account_id = v_bank_account_id
  where id = v_transaction_id;

  if v_sales_order_id is not null then
    update public.sales_orders set
      status = 'Lunas',
      stock_applied = true,
      paid_at = now(),
      transaction_id = v_transaction_id
    where id = v_sales_order_id;
  end if;

  return public.fn_sales_transaction_json(v_transaction_id);
end;
$$;
