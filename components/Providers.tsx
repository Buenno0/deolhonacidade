"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme";

export default function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
