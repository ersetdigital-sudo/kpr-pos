-- RPC satuan/stok/penjualan dijalankan sebagai security definer dan tetap
-- hanya dapat dieksekusi service_role. search_path setiap fungsi sudah ''.
alter function public.fn_create_product_with_units(
  text, text, text, integer, integer, text, integer, integer, text,
  text, numeric, numeric, jsonb
) security definer;

alter function public.fn_update_product_with_units(
  text, text, text, text, integer, integer, text, integer, integer,
  text, numeric, numeric, jsonb
) security definer;

alter function public.fn_import_products(text, text, jsonb)
  security definer;
alter function public.fn_add_stock_in(text, date, text, text, jsonb)
  security definer;
alter function public.fn_submit_opname(text, date, text, text, jsonb)
  security definer;
alter function public.fn_transfer_stock(text, text, date, text, text, jsonb)
  security definer;

alter function public.fn_create_sales_order(jsonb) security definer;
alter function public.fn_create_transaction(jsonb) security definer;
alter function public.fn_save_cart_draft(jsonb) security definer;
alter function public.fn_update_sales_order_status(text, text, text)
  security definer;
alter function public.fn_process_sales_order_credit(jsonb) security definer;
alter function public.fn_cancel_sales_order_credit(text, text, text)
  security definer;
alter function public.fn_refund_transaction_core(text, text, text, boolean)
  security definer;
alter function public.fn_delete_sales_order_safe(text, text) security definer;
alter function public.fn_delete_transaction_safe(text, text) security definer;
