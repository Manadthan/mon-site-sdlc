"use client";

import { useActionState, useEffect, useRef } from "react";
import { addItem, type AddItemState } from "@/app/actions/items";
import { INTITULE_MAX } from "@/lib/items/title";

// « Ajouter un item » (US-08 partie 1/2) — maquette n° 8 : panneau qui monte du bas, à portée de pouce.
// Rejoindra le mode édition à l'étape 5 ; l'image facultative arrive avec la partie 2/2.
export function AddItemForm({ collectionId }: { collectionId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<AddItemState, FormData>(addItem.bind(null, collectionId), {});

  // Ajout réussi : on vide le champ et on referme le panneau.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      dialogRef.current?.close();
    }
  }, [state.ok]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#b9bec7] text-sm font-semibold text-action"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Ajouter un item
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="ajout-titre"
        className="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-[20px] bg-white px-5 pt-2.5 pb-[max(env(safe-area-inset-bottom),24px)] text-texte backdrop:bg-[rgba(21,23,26,0.45)]"
      >
        <div className="mx-auto h-[5px] w-10 rounded-full bg-[#d3d6dc]" aria-hidden="true" />
        <div className="mt-2 flex items-center justify-between">
          <h2 id="ajout-titre" className="text-lg font-bold">
            Ajouter un item
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

        <form ref={formRef} action={action} className="mt-3 flex flex-col gap-3.5" noValidate>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-texte-doux">
            Intitulé (obligatoire)
            <input
              name="title"
              type="text"
              required
              maxLength={INTITULE_MAX}
              autoComplete="off"
              defaultValue={state.error ? state.title : ""}
              aria-invalid={state.error ? true : undefined}
              aria-describedby={state.error ? "ajout-erreur" : undefined}
              className="h-12 rounded-[10px] border border-[#d3d6dc] bg-white px-3 text-base text-texte outline-none focus:border-action focus:ring-2 focus:ring-action/20 aria-invalid:border-danger"
            />
          </label>
          {state.error && (
            <p id="ajout-erreur" role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          <p className="text-[13px] text-texte-doux">L’item sera placé en fin de liste.</p>
          <button
            type="submit"
            disabled={pending}
            className="h-[50px] rounded-xl bg-action text-base font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Ajout…" : "Ajouter"}
          </button>
        </form>
      </dialog>
    </>
  );
}
