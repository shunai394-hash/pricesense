import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAppShell } from "@/components/AdminAppShell";
import { getAuthUser } from "@/lib/server/supabase-auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  return <AdminAppShell>{children}</AdminAppShell>;
}
