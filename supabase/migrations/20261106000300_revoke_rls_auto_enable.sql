-- public.rls_auto_enable() adalah SECURITY DEFINER dan tidak dipanggil dari
-- aplikasi maupun role client. Cabut hak eksekusi dari PUBLIC, anon, dan
-- authenticated agar tidak bisa dipicu dari PostgREST.

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
