-- Perbaikan helper satuan: kolom produk harus di-qualify agar tidak bentrok
-- dengan nama kolom output RETURNS TABLE (wholesale_price/price).
create or replace function private.resolve_selling_unit(
  p_product_id text,
  p_unit_id text
)
returns table (
  id text,
  name text,
  content integer,
  retail_price integer,
  wholesale_price integer
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_product record;
begin
  select p.base_unit, p.price, p.wholesale_price
  into v_product
  from public.products p
  where p.id = p_product_id;

  if not found then
    raise exception 'Produk tidak ditemukan';
  end if;

  if nullif(trim(coalesce(p_unit_id, '')), '') is null then
    return query
      select null::text, v_product.base_unit, 1,
        v_product.price, coalesce(v_product.wholesale_price, 0);
    return;
  end if;

  return query
    select u.id, u.name, u.content, u.price, u.wholesale_price
    from public.product_units u
    where u.id = p_unit_id and u.product_id = p_product_id;

  if not found then
    raise exception 'Satuan produk tidak ditemukan';
  end if;
end;
$$;
revoke execute on function private.resolve_selling_unit(text, text)
  from public, anon, authenticated;
grant execute on function private.resolve_selling_unit(text, text)
  to service_role;
