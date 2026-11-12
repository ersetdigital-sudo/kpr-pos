"use client";

import { Drawer } from "@/components/ui/Drawer";
import { NewOrderForm } from "@/features/pesanan/components/NewOrderForm";
import type {
  OrderProductOption,
  SalesEmployeeOption,
} from "@/features/pesanan/types";

interface NewOrderDialogProps {
  open: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  productOptions: readonly OrderProductOption[];
  salesOptions: readonly SalesEmployeeOption[];
  defaultSalesId: string;
  canChooseSales: boolean;
  taxRate: number;
}

/**
 * Dialog input pesanan baru: panel samping di desktop, layar penuh di mobile.
 * Form, validasi, dan proses simpan tetap di `NewOrderForm`.
 */
export function NewOrderDialog({
  open,
  onClose,
  branchId,
  branchName,
  productOptions,
  salesOptions,
  defaultSalesId,
  canChooseSales,
  taxRate,
}: NewOrderDialogProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Pesanan baru"
      description={`Catat order untuk cabang ${branchName}`}
      size="md"
    >
      <NewOrderForm
        branchId={branchId}
        branchName={branchName}
        productOptions={productOptions}
        salesOptions={salesOptions}
        defaultSalesId={defaultSalesId}
        canChooseSales={canChooseSales}
        taxRate={taxRate}
        onSaved={onClose}
      />
    </Drawer>
  );
}
