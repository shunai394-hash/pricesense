import type { Metadata } from "next";
import { SalesAppShell } from "@/components/sales/SalesAppShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SalesAppShell>{children}</SalesAppShell>;
}
