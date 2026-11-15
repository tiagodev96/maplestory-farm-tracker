import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { enabledSocialProviders } from "@/lib/auth";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return <AuthForm mode="register" socialProviders={enabledSocialProviders()} />;
}
