"use client";

import { Drawer } from "@/components/ui/Drawer";
import { KasbonForm } from "@/features/kasbon/components/KasbonForm";
import type { KasbonRow } from "@/features/kasbon/types";

interface KasbonFormDialogProps {
  open: boolean;
  branchName: string;
  activeKasbon: KasbonRow | null;
  today: string;
  onClose: () => void;
}

/** Drawer pengajuan: layar penuh di mobile, panel samping di desktop. */
export function KasbonFormDialog({
  open,
  branchName,
  activeKasbon,
  today,
  onClose,
}: KasbonFormDialogProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Ajukan kasbon"
      description={`Untuk cabang ${branchName}`}
      size="sm"
    >
      <KasbonForm
        activeKasbon={activeKasbon}
        today={today}
        onSaved={onClose}
      />
    </Drawer>
  );
}
