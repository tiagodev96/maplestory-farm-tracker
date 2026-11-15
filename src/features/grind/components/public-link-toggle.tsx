"use client";

import Link from "next/link";
import { useTransition } from "react";
import { togglePublicLinkAction } from "../actions";
import type { Character } from "../queries";

export function PublicLinkToggle({ character }: { character: Character }) {
  const [isUpdating, startUpdate] = useTransition();
  const publicPath = character.publicSlug ? `/c/${character.publicSlug}` : null;

  function toggle() {
    const isTurningOff = publicPath !== null;
    if (
      isTurningOff &&
      !window.confirm("Desativar o link público? Quem tiver o link deixa de ver a página.")
    ) {
      return;
    }
    startUpdate(() => togglePublicLinkAction(character.id));
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <button type="button" className="btn btn-small" disabled={isUpdating} onClick={toggle}>
        {publicPath ? "Desativar link público" : "Criar link público"}
      </button>
      {publicPath ? (
        <Link href={publicPath} className="text-accent hover:underline" target="_blank">
          Abrir página pública
        </Link>
      ) : (
        <span className="text-muted">Página somente leitura para mostrar a amigos.</span>
      )}
    </div>
  );
}
