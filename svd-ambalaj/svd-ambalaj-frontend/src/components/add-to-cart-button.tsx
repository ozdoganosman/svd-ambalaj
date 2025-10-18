"use client";

import { useTransition } from "react";
import { useCart } from "@/context/CartContext";

export type AddToCartButtonProps = {
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    bulkPricing?: { minQty: number; price: number }[];
  };
  quantity?: number;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

const variantClasses: Record<NonNullable<AddToCartButtonProps["variant"]>, string> = {
  primary:
    "inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600",
  secondary:
    "inline-flex items-center justify-center rounded-full border border-amber-500 px-5 py-2 text-sm font-semibold text-amber-600 transition hover:bg-amber-500 hover:text-white",
  ghost:
    "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:text-amber-600",
};

export function AddToCartButton({
  product,
  quantity = 1,
  variant = "primary",
  className = "",
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [isPending, startTransition] = useTransition();

  const handleAddToCart = () => {
    startTransition(() => {
      addItem(product, quantity);
    });
  };

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={isPending}
      className={`${variantClasses[variant]} ${className}`.trim()}
    >
      {isPending ? "Ekleniyor..." : "Sepete Ekle"}
    </button>
  );
}
