"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Drawer } from "@/components/ui/Drawer";
import { Field } from "@/components/ui/Field";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/format";
import {
  createProduct,
  updateProduct,
  uploadProductPhoto,
} from "@/features/produk/data/produk-repository";
import type {
  ProductFormInput,
  ProductRow,
  ProductUnitInput,
} from "@/features/produk/types";
import type { Category } from "@/lib/store/types";
import { UNIT_PRESETS } from "@/lib/units";

interface ProductFormDrawerProps {
  open: boolean;
  product: ProductRow | null;
  categories: readonly Category[];
  /** Cabang tempat produk baru dibuat/ditampilkan. */
  branchId: string;
  branchName: string;
  /** Satuan dasar tidak bisa diubah bila produk sudah punya stok/riwayat. */
  baseUnitLocked: boolean;
  /** False bila data satuan gagal dimuat; simpan tanpa mengubah satuan. */
  unitsLoaded: boolean;
  onClose: () => void;
}

interface UnitDraft extends ProductUnitInput {
  key: string;
}

const UNIT_PRESET_ID = "product-unit-presets";

function createUnitKey(): string {
  return `unit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseDecimal(value: string): number | null {
  const text = value.trim().replace(",", ".");
  if (!text) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function ProductFormDrawer({
  open,
  product,
  categories,
  branchId,
  branchName,
  baseUnitLocked,
  unitsLoaded,
  onClose,
}: ProductFormDrawerProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [categoryId, setCategoryId] = useState(
    product?.categoryId ?? categories[0]?.id ?? "",
  );
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? 0);
  const [price, setPrice] = useState(product?.price ?? 0);
  const [wholesalePrice, setWholesalePrice] = useState(
    product?.wholesalePrice ?? 0,
  );
  const [minStock, setMinStock] = useState(
    product ? String(product.minStock) : "5",
  );
  const [baseUnit, setBaseUnit] = useState(product?.baseUnit ?? "pcs");
  const [lengthM, setLengthM] = useState(
    product?.lengthM !== undefined ? String(product.lengthM) : "",
  );
  const [weightKg, setWeightKg] = useState(
    product?.weightKg !== undefined ? String(product.weightKg) : "",
  );
  const [units, setUnits] = useState<UnitDraft[]>(() =>
    (product?.units ?? []).map((unit) => ({
      key: unit.id,
      name: unit.name,
      content: unit.content,
      price: unit.price,
      wholesalePrice: unit.wholesalePrice,
    })),
  );
  const [imageKey, setImageKey] = useState(product?.imageKey ?? "");
  const [previewUrl, setPreviewUrl] = useState(product?.imageUrl ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = product !== null;
  const usesWholesale = wholesalePrice > 0;
  const unitsDataMissing = !unitsLoaded;

  function updateUnit(key: string, patch: Partial<ProductUnitInput>) {
    setUnits((current) =>
      current.map((unit) =>
        unit.key === key ? { ...unit, ...patch } : unit,
      ),
    );
  }

  function addUnit() {
    setUnits((current) => [
      ...current,
      {
        key: createUnitKey(),
        name: "",
        content: 2,
        price: 0,
        wholesalePrice: 0,
      },
    ]);
  }

  function removeUnit(key: string) {
    setUnits((current) => current.filter((unit) => unit.key !== key));
  }

  function validate(): ProductFormInput | null {
    const fail = (message: string): null => {
      setError(message);
      return null;
    };
    const finalBaseUnit = baseUnit.trim();

    if (!name.trim()) return fail("Nama produk wajib diisi");
    if (!sku.trim()) return fail("SKU wajib diisi");
    if (!categoryId) return fail("Pilih kategori produk");
    if (!finalBaseUnit) return fail("Satuan dasar wajib diisi");
    if (!Number.isFinite(price) || price <= 0) {
      return fail("Harga jual harus lebih dari 0");
    }
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      return fail("Harga modal tidak boleh negatif");
    }
    if (!Number.isFinite(wholesalePrice) || wholesalePrice < 0) {
      return fail("Harga grosir tidak boleh negatif");
    }

    const finalMinStock = Number(minStock || 0);
    if (!Number.isFinite(finalMinStock) || finalMinStock < 0) {
      return fail("Batas stok menipis tidak boleh negatif");
    }

    const parsedLength = parseDecimal(lengthM);
    if (
      parsedLength !== null &&
      (!Number.isFinite(parsedLength) || parsedLength <= 0)
    ) {
      return fail("Panjang harus berupa angka lebih dari 0");
    }

    const parsedWeight = parseDecimal(weightKg);
    if (
      parsedWeight !== null &&
      (!Number.isFinite(parsedWeight) || parsedWeight <= 0)
    ) {
      return fail("Berat harus berupa angka lebih dari 0");
    }

    const seenNames = new Set<string>([finalBaseUnit.toLowerCase()]);

    if (!unitsDataMissing) {
      for (const unit of units) {
        const unitName = unit.name.trim();

        if (!unitName) return fail("Nama satuan jual wajib diisi");
        if (seenNames.has(unitName.toLowerCase())) {
          return fail(`Nama satuan "${unitName}" duplikat`);
        }
        if (!Number.isInteger(unit.content) || unit.content < 2) {
          return fail(
            `Isi satuan "${unitName}" minimal 2 ${finalBaseUnit}`,
          );
        }
        if (!Number.isFinite(unit.price) || unit.price <= 0) {
          return fail(`Harga satuan "${unitName}" harus lebih dari 0`);
        }
        if (!Number.isFinite(unit.wholesalePrice) || unit.wholesalePrice < 0) {
          return fail(
            `Harga grosir satuan "${unitName}" tidak boleh negatif`,
          );
        }

        seenNames.add(unitName.toLowerCase());
      }
    }

    setError("");

    return {
      name,
      sku,
      categoryId,
      costPrice,
      price,
      wholesalePrice,
      minStock: finalMinStock,
      imageUrl: imageKey,
      baseUnit: finalBaseUnit,
      lengthM: parsedLength,
      weightKg: parsedWeight,
      units: unitsDataMissing
        ? null
        : units.map((unit) => ({
            name: unit.name.trim(),
            content: unit.content,
            price: unit.price,
            wholesalePrice: usesWholesale ? unit.wholesalePrice : 0,
          })),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const input = validate();
    if (!input) return;

    setSaving(true);

    try {
      if (isEditing && product) {
        await updateProduct(product.id, input);
        showToast(`Produk ${name.trim()} diperbarui`, "success");
      } else {
        await createProduct(input, branchId);
        showToast(`Produk ${name.trim()} ditambahkan`, "success");
      }
      onClose();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Produk gagal disimpan";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Produk" : "Tambah Produk"}
      description={
        isEditing
          ? "Perubahan harga, satuan, dan dimensi langsung dipakai di Kasir."
          : `Produk baru hanya tampil di ${branchName}. Stok awal 0; tambahkan lewat tab Stok Masuk.`
      }
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="product-form"
            disabled={saving}
          >
            {saving
              ? "Menyimpan…"
              : isEditing
                ? "Simpan Perubahan"
                : "Simpan Produk"}
          </Button>
        </>
      }
    >
      <datalist id={UNIT_PRESET_ID}>
        {UNIT_PRESETS.map((preset) => (
          <option key={preset} value={preset} />
        ))}
      </datalist>

      <form
        id="product-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3.5"
      >
        <Field label="Nama produk" labelSize="sm">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Herbel 10x20"
            autoFocus
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="SKU (unik)" labelSize="sm">
            <Input
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              placeholder="SKU-0009"
            />
          </Field>

          <Field label="Kategori" labelSize="sm">
            <Select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Harga modal (Rp)" labelSize="sm">
            <CurrencyInput
              value={costPrice}
              onValueChange={setCostPrice}
              placeholder="0"
            />
          </Field>

          <Field label={`Harga ecer / ${baseUnit.trim() || "satuan"}`} labelSize="sm">
            <CurrencyInput
              value={price}
              onValueChange={setPrice}
              placeholder="0"
            />
          </Field>

          <Field label={`Harga grosir / ${baseUnit.trim() || "satuan"}`} labelSize="sm">
            <CurrencyInput
              value={wholesalePrice}
              onValueChange={setWholesalePrice}
              placeholder="0"
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Satuan dasar" labelSize="sm">
            <Input
              list={UNIT_PRESET_ID}
              value={baseUnit}
              onChange={(event) => setBaseUnit(event.target.value)}
              placeholder="pcs"
              disabled={baseUnitLocked || unitsDataMissing || saving}
            />
          </Field>

          <Field label="Panjang / satuan dasar (m)" labelSize="sm">
            <Input
              type="number"
              min={0}
              step="0.001"
              inputMode="decimal"
              value={lengthM}
              onChange={(event) => setLengthM(event.target.value)}
              placeholder="Contoh: 12"
            />
          </Field>

          <Field label="Berat / satuan dasar (kg)" labelSize="sm">
            <Input
              type="number"
              min={0}
              step="0.001"
              inputMode="decimal"
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              placeholder="Contoh: 7.4"
            />
          </Field>
        </div>

        {baseUnitLocked ? (
          <p className="m-0 rounded-control border border-line bg-canvas px-3 py-2 text-meta text-ink-muted">
            Satuan dasar tidak bisa diubah karena produk sudah punya stok atau
            riwayat transaksi.
          </p>
        ) : null}

        {unitsDataMissing ? (
          <p className="m-0 rounded-control border border-line bg-canvas px-3 py-2 text-meta text-ink-muted">
            Data satuan gagal dimuat. Perubahan lain tetap bisa disimpan tanpa
            mengubah satuan yang sudah ada.
          </p>
        ) : (
        <div className="flex flex-col gap-2.5 rounded-control border border-line bg-canvas p-3">
          <div>
            <p className="m-0 text-label font-semibold text-ink">
              Satuan jual tambahan
            </p>
            <p className="mt-0.5 mb-0 text-meta text-ink-muted">
              Isi = jumlah {baseUnit.trim() || "satuan dasar"} per satuan.
              Kosongkan bila produk hanya dijual per {baseUnit.trim() || "satuan dasar"}.
            </p>
          </div>

          {units.length === 0 ? (
            <p className="m-0 text-meta text-ink-muted">
              Belum ada satuan tambahan.
            </p>
          ) : null}

          {units.map((unit) => (
            <div
              key={unit.key}
              className="grid gap-2 rounded-control border border-line bg-surface p-2.5 sm:grid-cols-12"
            >
              <div className="sm:col-span-4">
                <Field label="Nama satuan" labelSize="xs">
                  <Input
                    list={UNIT_PRESET_ID}
                    value={unit.name}
                    onChange={(event) =>
                      updateUnit(unit.key, { name: event.target.value })
                    }
                    placeholder="kubik"
                    className="h-[38px] text-label"
                    disabled={saving}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label={`Isi (${baseUnit.trim() || "dasar"})`} labelSize="xs">
                  <Input
                    type="number"
                    min={2}
                    step={1}
                    inputMode="numeric"
                    value={unit.content || ""}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      updateUnit(unit.key, {
                        content: Number.isFinite(next) ? next : 0,
                      });
                    }}
                    className="h-[38px] text-label"
                    disabled={saving}
                  />
                </Field>
              </div>

              <div className={usesWholesale ? "sm:col-span-2" : "sm:col-span-3"}>
                <Field label="Harga jual" labelSize="xs">
                  <CurrencyInput
                    value={unit.price}
                    onValueChange={(value) =>
                      updateUnit(unit.key, { price: value })
                    }
                    placeholder="0"
                    className="h-[38px] text-label"
                    disabled={saving}
                  />
                </Field>
              </div>

              {usesWholesale ? (
                <div className="sm:col-span-2">
                  <Field label="Harga grosir" labelSize="xs">
                    <CurrencyInput
                      value={unit.wholesalePrice}
                      onValueChange={(value) =>
                        updateUnit(unit.key, { wholesalePrice: value })
                      }
                      placeholder="0"
                      className="h-[38px] text-label"
                      disabled={saving}
                    />
                  </Field>
                </div>
              ) : null}

              <div className="flex items-end sm:col-span-2">
                <Button
                  variant="dangerOutline"
                  size="sm"
                  className="h-[38px] w-full px-2.5 text-meta"
                  onClick={() => removeUnit(unit.key)}
                  disabled={saving}
                >
                  Hapus
                </Button>
              </div>

              <p className="m-0 text-meta text-ink-muted sm:col-span-12">
                1 {unit.name.trim() || "satuan"} = {unit.content || 0}{" "}
                {baseUnit.trim() || "satuan dasar"} · modal ±{" "}
                {formatRupiah(costPrice * (unit.content || 0))}
              </p>
            </div>
          ))}

          <Button
            variant="dashed"
            size="md"
            className="self-start px-3 text-label"
            onClick={addUnit}
            disabled={saving}
          >
            + Tambah satuan
          </Button>
        </div>
        )}

        <Field label={`Batas stok menipis (${baseUnit.trim() || "satuan dasar"})`} labelSize="sm">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={minStock}
            onChange={(event) => setMinStock(event.target.value)}
            placeholder="5"
          />
        </Field>

        <ImageUploadField
          value={previewUrl}
          onChange={(next) => {
            setImageKey(next?.key ?? "");
            setPreviewUrl(next?.previewUrl ?? "");
          }}
          upload={(file) => uploadProductPhoto(file, product?.id)}
          disabled={saving}
        />

        {error ? (
          <p className="m-0 rounded-control bg-danger-soft px-3 py-2 text-label font-semibold text-danger-ink">
            {error}
          </p>
        ) : null}
      </form>
    </Drawer>
  );
}
