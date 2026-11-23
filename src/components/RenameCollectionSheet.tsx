"use client";

import { useActionState, useEffect, type RefObject } from "react";
import { renameCollection, type RenameCollectionState } from "@/app/actions/collections";
import { ChampCategorie } from "@/components/ChampCategorie";
import { NOM_MAX } from "@/lib/collections/name";

type Props = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  collectionId: string;
  name: string;
  category: string | null;
  /** Catégories déjà utilisées, proposées dans le champ (US-19). */
  categories: (string | null)[];
};

const CHAMP =
  "h-12 rounded-[10px] border border-champ bg-surface px-3 text-base text-texte outline-none focus:border-action focus:ring-2 focus:ring-action/20 aria-invalid:border-danger";

// « Nom et catégorie » : renommer la collection (US-12) et changer sa catégorie (US-19).
// Panneau du bas, comme « Modifier l'item » (maquette n° 9).
export function RenameCollectionSheet({ dialogRef, collectionId, name, category, categories }: Props) {
  const [state, action, pending] = useActionState<RenameCollectionState, FormData>(renameCollection, {});

  useEffect(() => {
    if (state.ok) dialogRef.current?.close();
  }, [state.ok, dialogRef]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="renommer-collection-titre"
      className="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-[20px] bg-surface px-5 pt-2.5 pb-[max(env(safe-area-inset-bottom),24px)] text-texte backdrop:bg-[rgba(21,23,26,0.45)]"
    >
      <div className="mx-auto h-[5px] w-10 rounded-full bg-champ" aria-hidden="true" />
      <div className="mt-2 flex items-center justify-between">
        <h2 id="renommer-collection-titre" className="text-lg font-bold">
          Nom et catégorie
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
      {/* key : les champs reprennent les valeurs enregistrées après chaque enregistrement. */}
      <form key={`${name}|${category}`} action={action} className="mt-3 flex flex-col gap-3.5" noValidate>
        <input type="hidden" name="collectionId" value={collectionId} />
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-texte-doux">
          Nom de la collection
          <input
            name="name"
            type="text"
            required
            maxLength={NOM_MAX}
            autoComplete="off"
            defaultValue={state.error ? state.name : name}
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "renommer-collection-erreur" : undefined}
            className={CHAMP}
          />
        </label>
        <ChampCategorie defaultValue={(state.error ? state.category : category) ?? ""} suggestions={categories} className={CHAMP} />
        {state.error && (
          <p id="renommer-collection-erreur" role="alert" className="text-sm text-alarme">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className="h-[50px] rounded-xl bg-action text-base font-semibold text-white disabled:opacity-60">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </dialog>
  );
}
