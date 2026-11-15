"use client";

import { useState } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { LevelExpFields } from "@/components/level-exp-fields";
import { NumberInput } from "@/components/number-input";
import { useFormAction } from "@/components/use-form-action";
import { startGrindAction } from "../actions";
import type { Character } from "../queries";

export type LastSessionEnd = {
  monster: string;
  map: string;
  isParty: boolean;
  mesosEnd: number;
  levelEnd: number;
  expEnd: number;
};

type StartGrindFormProps = {
  characters: Character[];
  defaultCharacterId: string;
  lastSessionEndByCharacter: Record<string, LastSessionEnd>;
  knownMonsters: string[];
  knownMaps: string[];
};

export function StartGrindForm({
  characters,
  defaultCharacterId,
  lastSessionEndByCharacter,
  knownMonsters,
  knownMaps,
}: StartGrindFormProps) {
  const { state, isPending, onSubmit } = useFormAction(startGrindAction);
  const [characterId, setCharacterId] = useState(defaultCharacterId);
  const lastEnd = lastSessionEndByCharacter[characterId];

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h2 className="section-title">Novo grind</h2>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <div>
          <label className="field-label" htmlFor="characterId">
            Personagem
          </label>
          <select
            id="characterId"
            name="characterId"
            className="input"
            value={characterId}
            onChange={(event) => setCharacterId(event.target.value)}
          >
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm">
          <input
            key={characterId}
            type="checkbox"
            name="isParty"
            className="size-4 accent-accent"
            defaultChecked={lastEnd?.isParty ?? false}
          />
          Em party
        </label>
      </div>

      {/* Remounting on character change swaps in that character's last known values. */}
      <div key={characterId} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="monster">
              Monstro
            </label>
            <input
              id="monster"
              name="monster"
              className="input"
              list="knownMonsters"
              maxLength={80}
              autoComplete="off"
              defaultValue={lastEnd?.monster ?? ""}
            />
            <datalist id="knownMonsters">
              {knownMonsters.map((monster) => (
                <option key={monster} value={monster} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="field-label" htmlFor="map">
              Mapa
            </label>
            <input
              id="map"
              name="map"
              className="input"
              list="knownMaps"
              maxLength={80}
              autoComplete="off"
              defaultValue={lastEnd?.map ?? ""}
            />
            <datalist id="knownMaps">
              {knownMaps.map((map) => (
                <option key={map} value={map} />
              ))}
            </datalist>
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="mesosStart">
            Mesos agora
          </label>
          <NumberInput
            id="mesosStart"
            name="mesosStart"
            defaultValue={lastEnd?.mesosEnd ?? null}
            isRequired
            hasAutoFocus
          />
        </div>
        <LevelExpFields
          levelName="levelStart"
          expName="expStart"
          levelLabel="Level"
          expLabel="EXP agora"
          defaultLevel={lastEnd?.levelEnd ?? null}
          defaultExp={lastEnd?.expEnd ?? null}
        />
      </div>

      <FormFeedback state={state} />
      <button type="submit" className="btn btn-primary w-full py-3 text-base" disabled={isPending}>
        Iniciar grind
      </button>
      <p className="hint">
        {lastEnd
          ? "Os campos já vêm do fim da última sessão. Confira antes de iniciar."
          : "Copie os valores da tela do jogo antes de iniciar."}{" "}
        Valores aceitam atalhos como 350k e 1,2m.
      </p>
    </form>
  );
}
