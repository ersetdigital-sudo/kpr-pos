"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDateTimeShort, formatRupiah } from "@/lib/format";
import type { Employee, SalesOrder } from "@/lib/store/types";

interface SalesOrderPickerModalProps {
  open: boolean;
  orders: readonly SalesOrder[];
  employees: readonly Employee[];
  branchName: string;
  onSelect: (order: SalesOrder) => void;
  onClose: () => void;
}

export function SalesOrderPickerModal({
  open,
  orders,
  employees,
  branchName,
  onSelect,
  onClose,
}: SalesOrderPickerModalProps) {
  const employeeById = new Map(
    employees.map((employee) => [employee.id, employee]),
  );
  const pending = orders.filter(
    (order) =>
      order.status === "Menunggu bayar" || order.status === "Belum sinkron",
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pesanan Sales"
      description={`Pesanan menunggu bayar · ${branchName}`}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      {pending.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Belum ada pesanan menunggu bayar
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            Pesanan baru dari sales akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-2.5 rounded-control border border-line bg-surface p-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-body font-bold text-ink">
                    {order.orderNumber} · {order.customerName}
                  </div>
                  <div className="text-meta text-ink-muted">
                    {formatDateTimeShort(order.createdAt)} ·{" "}
                    {employeeById.get(order.salesEmployeeId)?.name ?? "Sales"}
                    {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-body font-bold text-ink">
                    {formatRupiah(order.total)}
                  </div>
                  <div className="text-meta text-ink-muted">
                    {order.status}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1 rounded-control bg-canvas px-3 py-2">
                {order.items.map((item, index) => (
                  <div
                    key={`${order.id}-${item.productId}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 text-label"
                  >
                    <span className="text-ink">
                      {item.quantity} × {item.productName}
                      <span className="text-ink-muted">
                        {" "}
                        ({item.priceType === "wholesale" ? "grosir" : "ecer"})
                      </span>
                    </span>
                    <span className="text-ink-muted">
                      {formatRupiah(item.unitPrice * item.quantity)}
                      {item.discountAmount
                        ? ` · diskon ${formatRupiah(item.discountAmount)}`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>

              {order.note ? (
                <p className="m-0 text-label text-ink-muted">
                  Catatan sales: {order.note}
                </p>
              ) : null}

              <Button
                variant="primary"
                size="sm"
                className="self-end"
                onClick={() => onSelect(order)}
              >
                Proses ke Kasir
              </Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
