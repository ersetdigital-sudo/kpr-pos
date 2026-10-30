"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ALL_ROLES, type Role } from "@/constants/roles";
import {
  createEmployee,
  updateEmployee,
} from "@/features/karyawan/data/karyawan-repository";
import type { EmployeeRow } from "@/features/karyawan/types";
import type { Branch } from "@/lib/store/types";

interface EmployeeFormDrawerProps {
  open: boolean;
  employee: EmployeeRow | null;
  branches: readonly Branch[];
  onClose: () => void;
}

export function EmployeeFormDrawer({
  open,
  employee,
  branches,
  onClose,
}: EmployeeFormDrawerProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(employee?.name ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [role, setRole] = useState<Role>(employee?.role ?? "Cashier");
  const [branchId, setBranchId] = useState(
    employee?.branchId ?? branches[0]?.id ?? "",
  );
  const [error, setError] = useState("");

  const isEditing = employee !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const input = { name, phone, role, branchId };

      if (isEditing && employee) {
        updateEmployee(employee.id, input);
        showToast(`Data ${name.trim()} diperbarui`, "success");
      } else {
        createEmployee(input);
        showToast(`Karyawan ${name.trim()} ditambahkan`, "success");
      }
      onClose();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Karyawan gagal disimpan";
      setError(message);
      showToast(message, "error");
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Karyawan" : "Tambah Karyawan"}
      description={
        isEditing
          ? "Perubahan role langsung memengaruhi menu yang bisa dibuka."
          : "Karyawan baru langsung bisa dipilih di dropdown Masuk sebagai."
      }
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" type="submit" form="employee-form">
            {isEditing ? "Simpan Perubahan" : "Simpan Karyawan"}
          </Button>
        </>
      }
    >
      <form
        id="employee-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3.5"
      >
        <Field label="Nama lengkap" labelSize="sm">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Rani Puspita"
            autoFocus
          />
        </Field>

        <Field label="No. HP" labelSize="sm">
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0812-3456-7890"
            inputMode="tel"
          />
        </Field>

        <Field label="Role" labelSize="sm">
          <Select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {ALL_ROLES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Cabang" labelSize="sm">
          <Select
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </Field>

        {error ? (
          <p className="m-0 rounded-control bg-danger-soft px-3 py-2 text-label font-semibold text-danger-ink">
            {error}
          </p>
        ) : null}
      </form>
    </Drawer>
  );
}
