-- Jika data satuan gagal dimuat di klien, form mengirim p_units = null.
-- Null berarti "jangan sentuh satuan yang sudah ada"; array kosong tetap
-- berarti pengguna memang menghapus semua satuan tambahan.
create or replace function private.save_product_units(
  p_product_id text,
  p_base_unit text,
  p_units jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_unit record;
  v_name text;
  v_base_unit text := trim(coalesce(p_base_unit, ''));
  v_existing_id text;
  v_seen_ids text[] := '{}';
  v_seen_names text[] := '{}';
begin
  if p_units is null then
    return;
  end if;

  if v_base_unit = '' then
    raise exception 'Satuan dasar wajib diisi';
  end if;
  if length(v_base_unit) > 40 then
    raise exception 'Nama satuan dasar maksimal 40 karakter';
  end if;

  if jsonb_typeof(p_units) <> 'array' then
    raise exception 'Data satuan jual tidak valid';
  end if;

  for v_unit in
    select * from jsonb_to_recordset(p_units) as x(
      name text, content integer, price integer, wholesale_price integer
    )
  loop
    v_name := trim(coalesce(v_unit.name, ''));

    if v_name = '' then
      raise exception 'Nama satuan jual wajib diisi';
    end if;
    if length(v_name) > 40 then
      raise exception 'Nama satuan jual maksimal 40 karakter';
    end if;
    if lower(v_name) = lower(v_base_unit) then
      raise exception 'Nama satuan jual tidak boleh sama dengan satuan dasar';
    end if;
    if lower(v_name) = any(v_seen_names) then
      raise exception 'Nama satuan jual % duplikat', v_name;
    end if;
    if v_unit.content is null or v_unit.content < 2 then
      raise exception 'Isi satuan % minimal 2 %', v_name, v_base_unit;
    end if;
    if v_unit.price is null or v_unit.price <= 0 then
      raise exception 'Harga satuan % harus lebih dari 0', v_name;
    end if;
    if coalesce(v_unit.wholesale_price, 0) < 0 then
      raise exception 'Harga grosir satuan % tidak boleh negatif', v_name;
    end if;

    v_seen_names := array_append(v_seen_names, lower(v_name));

    select u.id into v_existing_id
    from public.product_units u
    where u.product_id = p_product_id
      and lower(trim(u.name)) = lower(v_name);

    if v_existing_id is not null then
      update public.product_units set
        name = v_name,
        content = v_unit.content,
        price = v_unit.price,
        wholesale_price = coalesce(v_unit.wholesale_price, 0),
        updated_at = now()
      where id = v_existing_id;
    else
      insert into public.product_units (
        id, product_id, name, content, price, wholesale_price
      ) values (
        public.gen_id('unit'), p_product_id, v_name, v_unit.content,
        v_unit.price, coalesce(v_unit.wholesale_price, 0)
      )
      returning id into v_existing_id;
    end if;

    v_seen_ids := array_append(v_seen_ids, v_existing_id);
  end loop;

  delete from public.product_units
  where product_id = p_product_id
    and id <> all(v_seen_ids);
end;
$$;
revoke execute on function private.save_product_units(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function private.save_product_units(text, text, jsonb)
  to service_role;
