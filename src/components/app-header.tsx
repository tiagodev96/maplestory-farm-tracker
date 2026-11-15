"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { setActiveCharacterAction } from "@/features/grind/actions";
import type { Character } from "@/features/grind/queries";
import { authClient } from "@/lib/auth-client";
import { isTypingInField } from "./keyboard";

const NAV_LINKS = [
  { href: "/", label: "Grind" },
  { href: "/history", label: "Histórico" },
  { href: "/stats", label: "Estatísticas" },
  { href: "/characters", label: "Personagens" },
  { href: "/settings", label: "Ajustes" },
];

function isCurrentSection(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

type AppHeaderProps = {
  userName: string;
  characters: Character[];
  activeCharacterId: string | null;
  hasActiveGrind: boolean;
};

export function AppHeader({
  userName,
  characters,
  activeCharacterId,
  hasActiveGrind,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSwitching, startSwitching] = useTransition();

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (isTypingInField(event) || event.repeat) return;
      if (event.key.toLowerCase() === "n") router.push("/history/new");
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [router]);

  async function signOut() {
    const { error } = await authClient.signOut();
    if (error) {
      window.alert("Não foi possível sair. Tente de novo.");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  const liveDot = hasActiveGrind ? (
    <span
      className="inline-block size-2 rounded-full bg-good motion-safe:animate-pulse"
      aria-label="grind em andamento"
    />
  ) : null;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 py-2.5 md:gap-5">
          <Link href="/" className="shrink-0 whitespace-nowrap text-lg font-bold tracking-wide text-accent">
            Farm Tracker
          </Link>

          <nav aria-label="Principal" className="hidden gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const isCurrent = isCurrentSection(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                    isCurrent
                      ? "bg-accent font-semibold text-accent-ink"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {link.label}
                  {link.href === "/" ? liveDot : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2 md:gap-3">
            {characters.length > 0 ? (
              <select
                aria-label="Filtrar por personagem"
                className="input w-auto min-w-0 max-w-[46vw] truncate py-1.5 text-sm md:max-w-none"
                value={activeCharacterId ?? ""}
                disabled={isSwitching}
                onChange={(event) => {
                  const characterId = event.target.value;
                  startSwitching(() => setActiveCharacterAction(characterId));
                }}
              >
                <option value="">Todos os personagens</option>
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            ) : null}
            <span className="hidden text-sm text-muted lg:inline">{userName}</span>
            <button type="button" className="btn btn-small shrink-0" onClick={signOut}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV_LINKS.map((link) => {
          const isCurrent = isCurrentSection(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent ? "page" : undefined}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1 border-t-2 px-1 py-3 text-[11px] ${
                isCurrent
                  ? "border-accent font-semibold text-accent"
                  : "border-transparent text-muted"
              }`}
            >
              <span className="truncate">{link.label}</span>
              {link.href === "/" ? liveDot : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
