-- Fungsi bootstrap mengunggah cache localStorage ke cloud. Jalur ini sudah
-- dihapus dari aplikasi (Supabase satu-satunya sumber data), jadi fungsinya
-- tidak dipakai lagi dan aman di-drop.

drop function if exists public.fn_bootstrap_product_stock(jsonb);
drop function if exists public.fn_bootstrap_sales(jsonb);
drop function if exists public.fn_bootstrap_settings_branches(jsonb);
drop function if exists public.fn_bootstrap_attendance(jsonb);
drop function if exists public.fn_bootstrap_activity(jsonb);
