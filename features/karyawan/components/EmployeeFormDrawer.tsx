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
  createEmployeeFromAccount,
  updateEmployee,
} from "@/features/karyawan/data/karyawan-repository";
import {
  inviteEmployeeAction,
  updateEmployeeAccountAction,
} from "@/features/karyawan/actions";
import {
  syncAppFromCloud,
  trackCloudWrite,
} from "@/features/sync/data/app-sync";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [role, setRole] = useState<Role>(employee?.role ?? "Cashier");
  const [branchId, setBranchId] = useState(
    employee?.branchId ?? branches[0]?.id ?? "",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const isEditing = employee !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const branch = branches.find((item) => item.id === branchId);
    if (!branch) {
      setError("Pilih cabang karyawan.");
      return;
    }

    setError("");
    setPending(true);

    try {
      if (isEditing && employee) {
        const result = await trackCloudWrite(() =>
          updateEmployeeAccountAction(employee.id, {
            name,
            phone,
            role,
            branch,
          }),
        );

        if (!result.ok) {
          setError(result.error);
          showToast(result.error, "error");
          return;
        }

        updateEmployee(employee.id, { name, phone, role, branchId });
        void syncAppFromCloud({ force: true }).catch(() => undefined);
        showToast(`Data ${name.trim()} diperbarui`, "success");
      } else {
        if (password.length < 8) {
          setError("Password minimal 8 karakter.");
          return;
        }

        const result = await trackCloudWrite(() =>
          inviteEmployeeAction({
            name,
            email,
            password,
            phone,
            role,
            branch,
          }),
        );

        if (!result.ok) {
          setError(result.error);
          showToast(result.error, "error");
          return;
        }

        try {
          createEmployeeFromAccount(result.employee);
        } catch {
          showToast(
            "Undangan terkirim, tetapi data lokal gagal disimpan.",
            "error",
          );
          onClose();
          return;
        }

        showToast(
          `Akun ${email.trim()} dibuat, berikan password ke karyawan`,
          "success",
        );
      }

      onClose();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Karyawan gagal disimpan";
      setError(message);
      showToast(message, "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Karyawan" : "Tambah Karyawan"}
      description={
        isEditing
          ? "Perubahan role dan cabang langsung memengaruhi akses akun."
          : "Akun langsung aktif. Berikan email dan password ini ke karyawan."
      }
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="employee-form"
            disabled={pending}
          >
            {pending
              ? "Memproses…"
              : isEditing
                ? "Simpan Perubahan"
                : "Buat Akun"}
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
            required
          />
        </Field>

        {!isEditing ? (
          <>
            <Field label="Email login" labelSize="sm">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@perusahaan.com"
                autoComplete="off"
                required
              />
            </Field>

            <Field label="Password awal (min. 8 karakter)" labelSize="sm">
              <div className="flex gap-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password untuk karyawan"
                  autoComplete="new-password"
                  className="min-w-0 flex-1"
                  required
                />
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                >
                  {showPassword ? "Sembunyi" : "Lihat"}
                </Button>
              </div>
            </Field>
          </>
        ) : null}

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
