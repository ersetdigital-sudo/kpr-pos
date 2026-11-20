-- Alamat & telp tujuan per dokumen cetak.
-- Null = dokumen lama (pakai alamat pelanggan sebagai fallback);
-- string kosong = pengguna memang mengosongkan baris tersebut.
alter table public.print_documents
  add column if not exists recipient_address text;
alter table public.print_documents
  add column if not exists recipient_phone text;

create or replace function public.fn_print_document_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id,
    'docType', d.doc_type,
    'sourceType', d.source_type,
    'sourceId', d.source_id,
    'branchId', d.branch_id,
    'documentNumber', d.document_number,
    'docDate', to_char(d.doc_date, 'YYYY-MM-DD'),
    'driverName', d.driver_name,
    'vehicleNumber', d.vehicle_number,
    'note', d.note,
    'recipientAddress', d.recipient_address,
    'recipientPhone', d.recipient_phone,
    'createdById', d.created_by,
    'createdByName', d.created_by_name,
    'createdAt', to_char(d.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(d.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
  from public.print_documents d
  where d.id = p_id;
$$;
revoke execute on function public.fn_print_document_json(text)
  from public, anon, authenticated;
grant execute on function public.fn_print_document_json(text)
  to service_role;

create or replace function public.fn_ensure_print_document(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor record;
  v_doc_type text := lower(trim(coalesce(p_payload ->> 'docType', '')));
  v_source_type text := lower(trim(coalesce(p_payload ->> 'sourceType', '')));
  v_source_id text := nullif(trim(coalesce(p_payload ->> 'sourceId', '')), '');
  v_driver_name text := trim(coalesce(p_payload ->> 'driverName', ''));
  v_vehicle_number text := trim(coalesce(p_payload ->> 'vehicleNumber', ''));
  v_note text := trim(coalesce(p_payload ->> 'note', ''));
  v_recipient_address text := trim(coalesce(p_payload ->> 'recipientAddress', ''));
  v_recipient_phone text := trim(coalesce(p_payload ->> 'recipientPhone', ''));
  v_save_customer boolean := coalesce(
    (p_payload ->> 'saveCustomerToProfile')::boolean, false
  );
  v_customer_id text;
  v_order public.sales_orders%rowtype;
  v_transaction public.transactions%rowtype;
  v_doc public.print_documents%rowtype;
  v_day date;
  v_sequence integer;
  v_number text;
  v_prefix text;
  v_branch_id text;
  v_linked_invoice text;
begin
  select e.id, e.name, e.role, e.branch_id,
         rp.can_print_documents, rp.can_view_all_branches
  into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = (p_payload ->> 'actorId')
    and e.is_active = true;

  if v_actor.id is null then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;
  if coalesce(v_actor.can_print_documents, false) is not true then
    raise exception 'Anda tidak berwenang mencetak dokumen';
  end if;
  if v_source_id is null then
    raise exception 'Dokumen sumber tidak ditemukan';
  end if;
  if v_doc_type not in ('invoice', 'surat_jalan') then
    raise exception 'Jenis dokumen belum tersedia';
  end if;
  if v_source_type not in ('sales_order', 'transaction') then
    raise exception 'Jenis sumber dokumen tidak dikenal';
  end if;
  if v_source_type = 'transaction' and v_doc_type <> 'invoice' then
    raise exception 'Surat jalan hanya dibuat dari pesanan sales';
  end if;

  if v_source_type = 'sales_order' then
    select * into v_order from public.sales_orders where id = v_source_id;
    if not found then raise exception 'Pesanan tidak ditemukan'; end if;

    v_customer_id := v_order.customer_id;

    if v_actor.role = 'Sales' and v_order.sales_employee_id <> v_actor.id then
      raise exception 'Pesanan ini bukan milik Anda';
    end if;
    if coalesce(v_actor.can_view_all_branches, false) is not true
      and v_order.branch_id <> v_actor.branch_id then
      raise exception 'Cabang tidak sesuai akses Anda';
    end if;

    if v_doc_type = 'invoice' and v_order.status = 'Dibatalkan' then
      raise exception 'Pesanan dibatalkan tidak bisa dicetak invoice';
    end if;
    if v_doc_type = 'surat_jalan'
      and v_order.status in ('Menunggu bayar', 'Belum sinkron', 'Dibatalkan') then
      raise exception 'Surat jalan hanya untuk pesanan yang sudah diproses';
    end if;

    v_branch_id := v_order.branch_id;

    if v_doc_type = 'invoice' then
      v_day := (v_order.created_at at time zone 'Asia/Jakarta')::date;

      if v_order.transaction_id is not null then
        select invoice_number, (created_at at time zone 'Asia/Jakarta')::date
        into v_linked_invoice, v_day
        from public.transactions
        where id = v_order.transaction_id;
        v_number := v_linked_invoice;
      end if;
    else
      v_day := (coalesce(v_order.processed_at, v_order.created_at)
                at time zone 'Asia/Jakarta')::date;
    end if;
  else
    select * into v_transaction from public.transactions where id = v_source_id;
    if not found then raise exception 'Transaksi tidak ditemukan'; end if;

    if v_transaction.refunded_at is not null then
      raise exception 'Transaksi yang sudah direfund tidak bisa dicetak invoice';
    end if;
    if coalesce(v_actor.can_view_all_branches, false) is not true
      and v_transaction.branch_id <> v_actor.branch_id then
      raise exception 'Cabang tidak sesuai akses Anda';
    end if;

    select customer_id into v_customer_id
    from public.sales_orders
    where transaction_id = v_transaction.id
      and customer_id is not null
    limit 1;

    v_branch_id := v_transaction.branch_id;
    v_day := (v_transaction.created_at at time zone 'Asia/Jakarta')::date;
    v_number := v_transaction.invoice_number;
  end if;

  perform pg_advisory_xact_lock(
    hashtext('print-document:' || v_doc_type || ':' || v_source_type || ':' || v_source_id)
  );

  select * into v_doc from public.print_documents
  where doc_type = v_doc_type
    and source_type = v_source_type
    and source_id = v_source_id;

  if found then
    update public.print_documents set
      recipient_address = case
        when p_payload ? 'recipientAddress' then v_recipient_address
        else recipient_address end,
      recipient_phone = case
        when p_payload ? 'recipientPhone' then v_recipient_phone
        else recipient_phone end,
      driver_name = case
        when v_doc_type = 'surat_jalan' and p_payload ? 'driverName'
          then v_driver_name else driver_name end,
      vehicle_number = case
        when v_doc_type = 'surat_jalan' and p_payload ? 'vehicleNumber'
          then v_vehicle_number else vehicle_number end,
      note = case
        when v_doc_type = 'surat_jalan' and p_payload ? 'note'
          then v_note else note end,
      updated_at = now()
    where id = v_doc.id
    returning * into v_doc;

    if v_save_customer and v_customer_id is not null then
      update public.customers set
        address = case
          when trim(address) = '' and v_recipient_address <> ''
            then v_recipient_address else address end,
        phone = case
          when trim(phone) = '' and v_recipient_phone <> ''
            then v_recipient_phone else phone end,
        updated_at = now()
      where id = v_customer_id;
    end if;

    return public.fn_print_document_json(v_doc.id);
  end if;

  if v_number is null then
    v_prefix := case v_doc_type
      when 'invoice' then 'INV'
      when 'surat_jalan' then 'SJ'
      else 'FP'
    end;

    if v_doc_type = 'invoice' then
      insert into public.invoice_counters (day, last_sequence)
      values (v_day, 1)
      on conflict (day) do update
        set last_sequence = public.invoice_counters.last_sequence + 1
      returning last_sequence into v_sequence;
    else
      insert into public.document_counters (doc_type, day, last_sequence)
      values (v_doc_type, v_day, 1)
      on conflict (doc_type, day) do update
        set last_sequence = public.document_counters.last_sequence + 1
      returning last_sequence into v_sequence;
    end if;

    v_number := v_prefix || '-' || to_char(v_day, 'YYMMDD') || '-'
      || lpad(v_sequence::text, 3, '0');
  end if;

  insert into public.print_documents (
    id, doc_type, source_type, source_id, branch_id, document_number,
    doc_date, driver_name, vehicle_number, note,
    recipient_address, recipient_phone, created_by, created_by_name
  ) values (
    public.gen_id('doc'), v_doc_type, v_source_type, v_source_id, v_branch_id,
    v_number, v_day,
    case when v_doc_type = 'surat_jalan' then v_driver_name else '' end,
    case when v_doc_type = 'surat_jalan' then v_vehicle_number else '' end,
    case when v_doc_type = 'surat_jalan' then v_note else '' end,
    case when p_payload ? 'recipientAddress' then v_recipient_address else null end,
    case when p_payload ? 'recipientPhone' then v_recipient_phone else null end,
    v_actor.id, v_actor.name
  )
  returning * into v_doc;

  if v_save_customer and v_customer_id is not null then
    update public.customers set
      address = case
        when trim(address) = '' and v_recipient_address <> ''
          then v_recipient_address else address end,
      phone = case
        when trim(phone) = '' and v_recipient_phone <> ''
          then v_recipient_phone else phone end,
      updated_at = now()
    where id = v_customer_id;
  end if;

  return public.fn_print_document_json(v_doc.id);
end;
$$;
revoke execute on function public.fn_ensure_print_document(jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_ensure_print_document(jsonb)
  to service_role;
