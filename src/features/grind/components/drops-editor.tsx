"use client";

import { useRef, useState } from "react";
import { NumberInput } from "@/components/number-input";
import { formatInteger } from "@/lib/format";
import type { KnownItem, SessionDrop } from "../queries";

type DropRow = {
  key: number;
  itemName: string;
  quantity: number | null;
  unitPrice: number | null;
  /** Bumped when a remembered price is filled in, to remount the price input with it. */
  priceRevision: number;
};

type DropsEditorProps = {
  initialDrops: SessionDrop[];
  knownItems: KnownItem[];
};

function toSubmittedDrops(rows: DropRow[]): SessionDrop[] {
  return rows
    .filter((row) => row.itemName.trim() !== "")
    .map((row) => ({
      itemName: row.itemName.trim(),
      quantity: Math.max(1, row.quantity ?? 1),
      unitPrice: Math.max(0, row.unitPrice ?? 0),
    }));
}

/** Rows of dropped items; submitted as JSON in a single hidden "drops" field. */
export function DropsEditor({ initialDrops, knownItems }: DropsEditorProps) {
  const [rows, setRows] = useState<DropRow[]>(() =>
    initialDrops.map((drop, index) => ({ ...drop, key: index, priceRevision: 0 })),
  );
  const nextKey = useRef(initialDrops.length);
  const submittedDrops = toSubmittedDrops(rows);
  const totalValue = submittedDrops.reduce((sum, drop) => sum + drop.quantity * drop.unitPrice, 0);

  function updateRow(key: number, changes: Partial<DropRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  }

  function renameItem(row: DropRow, itemName: string) {
    const rememberedPrice = knownItems.find((item) => item.itemName === itemName)?.unitPrice;
    if (rememberedPrice === undefined || row.unitPrice !== null) {
      updateRow(row.key, { itemName });
      return;
    }
    updateRow(row.key, {
      itemName,
      unitPrice: rememberedPrice,
      priceRevision: row.priceRevision + 1,
    });
  }

  function addRow() {
    const key = nextKey.current++;
    setRows((current) => [
      ...current,
      { key, itemName: "", quantity: 1, unitPrice: null, priceRevision: 0 },
    ]);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="field-label">Drops (opcional)</legend>
      <input type="hidden" name="drops" value={JSON.stringify(submittedDrops)} />
      <datalist id="knownItems">
        {knownItems.map((item) => (
          <option key={item.itemName} value={item.itemName} />
        ))}
      </datalist>

      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[1fr_64px_110px_auto] items-center gap-2">
          <label className="sr-only" htmlFor={`dropItem-${row.key}`}>
            Item
          </label>
          <input
            id={`dropItem-${row.key}`}
            className="input"
            list="knownItems"
            placeholder="Item"
            maxLength={60}
            autoComplete="off"
            value={row.itemName}
            onChange={(event) => renameItem(row, event.target.value)}
          />
          <label className="sr-only" htmlFor={`dropQuantity-${row.key}`}>
            Quantidade
          </label>
          <NumberInput
            id={`dropQuantity-${row.key}`}
            name={`dropQuantity-${row.key}`}
            defaultValue={row.quantity}
            isPlain
            onValueChange={(quantity) => updateRow(row.key, { quantity })}
          />
          <label className="sr-only" htmlFor={`dropPrice-${row.key}`}>
            Preço unitário
          </label>
          <NumberInput
            key={row.priceRevision}
            id={`dropPrice-${row.key}`}
            name={`dropPrice-${row.key}`}
            defaultValue={row.unitPrice}
            placeholder="Preço un."
            onValueChange={(unitPrice) => updateRow(row.key, { unitPrice })}
          />
          <button
            type="button"
            className="btn btn-small btn-danger"
            aria-label={`Remover ${row.itemName || "item"}`}
            onClick={() => setRows((current) => current.filter((other) => other.key !== row.key))}
          >
            ×
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3">
        <button type="button" className="btn btn-small" onClick={addRow}>
          + Adicionar drop
        </button>
        {totalValue > 0 ? (
          <span className="text-xs tabular-nums text-muted">
            Valor dos drops: <b className="text-accent">{formatInteger(totalValue)}</b>
          </span>
        ) : null}
      </div>
    </fieldset>
  );
}
