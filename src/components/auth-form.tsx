"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { SocialProvider } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";

type AuthMode = "login" | "register";

const SOCIAL_LABELS: Record<SocialProvider, string> = {
  discord: "Discord",
  google: "Google",
};

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  INVALID_EMAIL: "E-mail inválido.",
  USER_ALREADY_EXISTS: "Já existe uma conta com esse e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com esse e-mail.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
  PASSWORD_TOO_LONG: "A senha é longa demais.",
};

function describeError(code: string | undefined): string {
  return (code && ERROR_MESSAGES[code]) || "Não foi possível concluir. Tente de novo.";
}

export function AuthForm({
  mode,
  socialProviders,
}: {
  mode: AuthMode;
  socialProviders: SocialProvider[];
}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegistering = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();

    setIsSubmitting(true);
    setErrorMessage(null);
    const { error } = isRegistering
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });
    if (error) {
      setErrorMessage(describeError(error.code));
      setIsSubmitting(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function signInWith(provider: SocialProvider) {
    setErrorMessage(null);
    const { error } = await authClient.signIn.social({ provider, callbackURL: "/" });
    if (error) setErrorMessage(describeError(error.code));
  }

  return (
    <div className="card w-full max-w-sm">
      <h1 className="mb-1 text-xl font-bold">
        <span className="text-accent">Farm Tracker</span>
      </h1>
      <p className="mb-5 text-sm text-muted">
        {isRegistering ? "Crie sua conta para registrar seus grinds." : "Entre para continuar."}
      </p>

      <form onSubmit={submit} className="space-y-3">
        {isRegistering ? (
          <div>
            <label className="field-label" htmlFor="name">
              Nome
            </label>
            <input id="name" name="name" className="input" required maxLength={60} autoComplete="nickname" />
          </div>
        ) : null}
        <div>
          <label className="field-label" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label className="field-label" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            required
            minLength={8}
            autoComplete={isRegistering ? "new-password" : "current-password"}
          />
          {isRegistering ? <p className="hint">Pelo menos 8 caracteres.</p> : null}
        </div>

        {errorMessage ? (
          <p role="alert" className="text-sm text-bad">
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" className="btn btn-primary w-full py-3" disabled={isSubmitting}>
          {isRegistering ? "Criar conta" : "Entrar"}
        </button>
      </form>

      {socialProviders.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-line pt-4">
          {socialProviders.map((provider) => (
            <button
              key={provider}
              type="button"
              className="btn w-full"
              onClick={() => signInWith(provider)}
            >
              Continuar com {SOCIAL_LABELS[provider]}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-5 text-sm text-muted">
        {isRegistering ? "Já tem conta? " : "Ainda não tem conta? "}
        <Link className="text-accent hover:underline" href={isRegistering ? "/login" : "/register"}>
          {isRegistering ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </div>
  );
}
