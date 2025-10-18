"use client";

import type { PropsWithChildren } from "react";
import { CartProvider } from "@/context/CartContext";

export function AppProviders({ children }: PropsWithChildren) {
  return <CartProvider>{children}</CartProvider>;
}
