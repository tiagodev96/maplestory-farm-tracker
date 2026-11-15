import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { enabledSocialProviders } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return <AuthForm mode="login" socialProviders={enabledSocialProviders()} />;
}
