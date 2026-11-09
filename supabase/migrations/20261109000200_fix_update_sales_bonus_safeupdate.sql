-- Perbaikan fn_update_sales_bonus agar lolos ekstensi safeupdate.
-- Isi fungsi sama persis dengan versi aktif; hanya DELETE tier lama yang
-- diberi klausa WHERE (mencakup semua baris) karena safeupdate menolak
-- DELETE tanpa WHERE.

create or replace function public.fn_update_sales_bonus(p_type text, p_per_piece integer, p_percent numeric, p_tiers jsonb)
returns void
language plpgsql
set search_path = ''
as $function$
begin
  if p_type is null or p_type not in ('per_piece', 'percent', 'tiered') then
    raise exception 'Jenis bonus sales tidak dikenal';
  end if;
  if coalesce(p_per_piece, 0) < 0 then
    raise exception 'Bonus per pcs tidak boleh negatif';
  end if;
  if coalesce(p_percent, 0) < 0 or coalesce(p_percent, 0) > 100 then
    raise exception 'Persentase bonus harus antara 0 dan 100';
  end if;
  if p_type = 'per_piece' and coalesce(p_per_piece, 0) <= 0 then
    raise exception 'Bonus per pcs harus lebih dari 0';
  end if;
  if p_type = 'percent' and coalesce(p_percent, 0) <= 0 then
    raise exception 'Persentase bonus harus lebih dari 0';
  end if;
  if p_type = 'tiered' and jsonb_array_length(coalesce(p_tiers, '[]'::jsonb)) = 0 then
    raise exception 'Tambahkan minimal satu tingkat target';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) as tier(value)
    where coalesce((tier.value ->> 'minQuantity')::integer, 0) < 0
      or coalesce((tier.value ->> 'amountPerPiece')::integer, 0) <= 0
  ) then
    raise exception 'Target dan nominal bonus tidak valid';
  end if;

  if (
    select count(*) from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb))
  ) <> (
    select count(distinct (tier.value ->> 'minQuantity')::integer)
    from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) as tier(value)
  ) then
    raise exception 'Target pcs antar tingkat tidak boleh sama';
  end if;

  update public.settings set
    bonus_type = p_type,
    bonus_per_piece_amount = coalesce(p_per_piece, 0),
    bonus_percent_rate = coalesce(p_percent, 0),
    updated_at = now()
  where id = 1;

  if not found then raise exception 'Pengaturan belum siap. Muat ulang halaman.'; end if;

  delete from public.bonus_tiers where id is not null;

  insert into public.bonus_tiers (id, min_quantity, amount_per_piece)
  select
    public.gen_id('tier'),
    (tier.value ->> 'minQuantity')::integer,
    (tier.value ->> 'amountPerPiece')::integer
  from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) as tier(value)
  order by (tier.value ->> 'minQuantity')::integer desc;
end;
$function$;
