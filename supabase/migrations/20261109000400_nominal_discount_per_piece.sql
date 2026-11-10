-- Diskon nominal dihitung per pcs (nilai x jumlah), sama seperti persen yang proporsional.

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
