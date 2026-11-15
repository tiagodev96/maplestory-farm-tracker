import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SessionForm } from "@/features/grind/components/session-form";
import {
  getSession,
  listCharacters,
  listKnownItems,
  listKnownMaps,
  listKnownMonsters,
  listSessionDrops,
} from "@/features/grind/queries";
import { getTimeZone } from "@/lib/request-preferences";

export const metadata: Metadata = { title: "Editar sessão" };

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [session, drops, characters, knownMonsters, knownMaps, knownItems, timeZone] =
    await Promise.all([
      getSession(id),
      listSessionDrops(id),
      listCharacters(),
      listKnownMonsters(),
      listKnownMaps(),
      listKnownItems(),
      getTimeZone(),
    ]);
  if (!session) notFound();

  return (
    <section className="card mx-auto max-w-xl">
      <h1 className="mb-4 text-lg font-bold">Editar sessão</h1>
      {/* Keyed by time zone: the datetime fields are uncontrolled and must not keep UTC defaults. */}
      <SessionForm
        key={timeZone}
        characters={characters}
        knownMonsters={knownMonsters}
        knownMaps={knownMaps}
        knownItems={knownItems}
        initialDrops={drops}
        timeZone={timeZone}
        values={session}
      />
    </section>
  );
}
