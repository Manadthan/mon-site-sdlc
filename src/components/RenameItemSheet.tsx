"use client";

import { useActionState, useEffect, type RefObject } from "react";
import { renameItem, type RenameItemState } from "@/app/actions/items";
import type { Item } from "@/components/ItemTile";
import { INTITULE_MAX } from "@/lib/items/title";

type Props = { dialogRef: RefObject<HTMLDialogElement | null>; item: Item | undefined };

// « Modifier l'item » (US-08) — maquette n° 9 : panneau du bas, ouvert en touchant l'intitulé en mode édition.
export function RenameItemSheet({ dialogRef, item }: Props) {
  const [state, action, pending] = useActionState<RenameItemState, FormData>(renameItem, {});

  useEffect(() => {
    if (state.ok) dialogRef.current?.close();
  }, [state.ok, dialogRef]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="renommer-titre"
      className="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-[20px] bg-white px-5 pt-2.5 pb-[max(env(safe-area-inset-bottom),24px)] text-texte backdrop:bg-[rgba(21,23,26,0.45)]"
    >
      <div className="mx-auto h-[5px] w-10 rounded-full bg-[#d3d6dc]" aria-hidden="true" />
      <div className="mt-2 flex items-center justify-between">
        <h2 id="renommer-titre" className="text-lg font-bold">
          Modifier l’item
        </h2>
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => dialogRef.current?.close()}
          className="-mr-2.5 flex size-11 items-center justify-center text-texte-doux"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {/* key : le formulaire repart de zéro à chaque item ouvert. */}
      {item && <RenameForm key={item.id} item={item} state={state} action={action} pending={pending} />}
    </dialog>
  );
}

type FormProps = { item: Item; state: RenameItemState; action: (formData: FormData) => void; pending: boolean };

function RenameForm({ item, state, action, pending }: FormProps) {
  // L'erreur ne concerne que l'item sur lequel elle s'est produite.
  const erreur = state.itemId === item.id ? state.error : undefined;
  return (
    <form action={action} className="mt-3 flex flex-col gap-3.5" noValidate>
      <input type="hidden" name="itemId" value={item.id} />
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-texte-doux">
        Intitulé
        <input
          name="title"
          type="text"
          required
          maxLength={INTITULE_MAX}
          autoComplete="off"
          defaultValue={erreur ? state.title : item.title}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? "renommer-erreur" : undefined}
          className="h-12 rounded-[10px] border border-[#d3d6dc] bg-white px-3 text-base text-texte outline-none focus:border-action focus:ring-2 focus:ring-action/20 aria-invalid:border-danger"
        />
      </label>
      {erreur && (
        <p id="renommer-erreur" role="alert" className="text-sm text-danger">
          {erreur}
        </p>
      )}
      <button type="submit" disabled={pending} className="h-[50px] rounded-xl bg-action text-base font-semibold text-white disabled:opacity-60">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
