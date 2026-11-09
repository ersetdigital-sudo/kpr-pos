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
import {
  createProduct,
  updateProduct,
  uploadProductPhoto,
} from "@/features/produk/data/produk-repository";
import type {
  ProductFormInput,
  ProductRow,
} from "@/features/produk/types";
import type { Category } from "@/lib/store/types";

interface ProductFormDrawerProps {
  open: boolean;
  product: ProductRow | null;
  categories: readonly Category[];
  onClose: () => void;
}

export function ProductFormDrawer({
  open,
  product,
  categories,
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
  const [imageKey, setImageKey] = useState(product?.imageKey ?? "");
  const [previewUrl, setPreviewUrl] = useState(product?.imageUrl ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = product !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const input: ProductFormInput = {
      name,
      sku,
      categoryId,
      costPrice,
      price,
      wholesalePrice,
      minStock: Number(minStock || 0),
      imageUrl: imageKey,
    };

    if (!name.trim()) return setError("Nama produk wajib diisi");
    if (!sku.trim()) return setError("SKU wajib diisi");
    if (!categoryId) return setError("Pilih kategori produk");
    if (!Number.isFinite(input.price) || input.price <= 0) {
      return setError("Harga jual harus lebih dari 0");
    }
    if (!Number.isFinite(input.costPrice) || input.costPrice < 0) {
      return setError("Harga modal tidak boleh negatif");
    }
    if (!Number.isFinite(input.wholesalePrice) || input.wholesalePrice < 0) {
      return setError("Harga grosir tidak boleh negatif");
    }
    if (!Number.isFinite(input.minStock) || input.minStock < 0) {
      return setError("Batas stok menipis tidak boleh negatif");
    }

    setSaving(true);

    try {
      if (isEditing && product) {
        await updateProduct(product.id, input);
        showToast(`Produk ${name.trim()} diperbarui`, "success");
      } else {
        await createProduct(input);
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
          ? "Perubahan harga dan SKU langsung dipakai di Kasir."
          : "Stok awal 0; tambahkan lewat tab Stok Masuk."
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
      <form
        id="product-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3.5"
      >
        <Field label="Nama produk" labelSize="sm">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Kemeja Batik"
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

          <Field label="Harga ecer (Rp)" labelSize="sm">
            <CurrencyInput
              value={price}
              onValueChange={setPrice}
              placeholder="0"
            />
          </Field>

          <Field label="Harga grosir (Rp)" labelSize="sm">
            <CurrencyInput
              value={wholesalePrice}
              onValueChange={setWholesalePrice}
              placeholder="0"
            />
          </Field>
        </div>

        <Field
          label="Batas stok menipis (pcs)"
          labelSize="sm"
        >
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
