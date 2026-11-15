import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/");

  return <main className="flex min-h-screen items-center justify-center p-4">{children}</main>;
}
