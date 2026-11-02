-- Semua role boleh memberi diskon; Owner tetap bisa mencabut lewat matriks role.
update public.role_permissions set can_apply_discount = true;
