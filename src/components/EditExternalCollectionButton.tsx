"use client";

import { useActionState, useEffect, useRef } from "react";
import { renameCollection, type RenameCollectionState } from "@/app/actions/collections";
import { ChampCategorie } from "@/components/ChampCategorie";
import { NOM_MAX } from "@/lib/collections/name";

type Props = {
  id: string;
  name: string;
  category: string | null;
  externalUrl: string;
  categories?: (string | null)[];
};

const CHAMP =
  "h-12 rounded-[10px] border border-champ bg-surface px-3 text-base text-texte outline-none focus:border-action focus:ring-2 focus:ring-action/20 aria-invalid:border-danger";

// Bouton crayon d'une collection liée : modifie le nom, la catégorie et l'URL du filtre (resynchronise les compteurs).
export function EditExternalCollectionButton({ id, name, category, externalUrl, categories = [] }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<RenameCollectionState, FormData>(renameCollection, {});

  useEffect(() => {
    if (state.ok) dialogRef.current?.close();
  }, [state.ok]);

  return (
    <>
      <button
        type="button"
        aria-label={`Modifier la collection ${name}`}
        onClick={() => dialogRef.current?.showModal()}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-icone"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`modifier-externe-${id}`}
        className="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-[20px] bg-surface px-5 pt-2.5 pb-[max(env(safe-area-inset-bottom),24px)] text-texte backdrop:bg-[rgba(21,23,26,0.45)]"
      >
        <div className="mx-auto h-[5px] w-10 rounded-full bg-champ" aria-hidden="true" />
        <div className="mt-2 flex items-center justify-between">
          <h2 id={`modifier-externe-${id}`} className="text-lg font-bold">
            Modifier la collection liée
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
        <form key={`${name}|${category}|${externalUrl}`} action={action} className="mt-3 flex flex-col gap-3.5" noValidate>
          <input type="hidden" name="collectionId" value={id} />
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
              className={CHAMP}
            />
          </label>
          <ChampCategorie defaultValue={(state.error ? state.category : category) ?? ""} suggestions={categories} className={CHAMP} />
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-texte-doux">
            URL du filtre
            <input
              name="externalUrl"
              type="url"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
              defaultValue={state.error ? (state.externalUrl ?? externalUrl) : externalUrl}
              aria-invalid={state.error ? true : undefined}
              className={CHAMP}
            />
          </label>
          {state.error && (
            <p role="alert" className="text-sm text-alarme">
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className="h-[50px] rounded-xl bg-action text-base font-semibold text-white disabled:opacity-60">
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </dialog>
    </>
  );
}
