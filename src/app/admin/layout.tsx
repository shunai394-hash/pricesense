import type { Metadata } from "next";
import { AdminAppShell } from "@/components/AdminAppShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminAppShell>{children}</AdminAppShell>;
}
