import type { Metadata } from "next";
import { CreateCharacterForm } from "@/features/grind/components/create-character-form";
import { PublicLinkToggle } from "@/features/grind/components/public-link-toggle";
import { RenameCharacterForm } from "@/features/grind/components/rename-character-form";
import { listCharacters } from "@/features/grind/queries";

export const metadata: Metadata = { title: "Personagens" };

export default async function CharactersPage() {
  const characters = await listCharacters();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <section className="card space-y-4">
        <h1 className="section-title">Personagens</h1>
        {characters.length === 0 ? (
          <p className="text-sm text-muted">Você ainda não tem personagens.</p>
        ) : (
          <ul className="space-y-5">
            {characters.map((character) => (
              <li key={character.id} className="space-y-2">
                <RenameCharacterForm character={character} />
                <PublicLinkToggle character={character} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card space-y-4">
        <h2 className="section-title">Novo personagem</h2>
        <CreateCharacterForm />
      </section>
    </div>
  );
}
