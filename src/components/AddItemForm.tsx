"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addItem, type AddItemState } from "@/app/actions/items";
import { reduirePhoto } from "@/lib/images/resize";
import { INTITULE_MAX } from "@/lib/items/title";

// « Ajouter un item » (US-08), en mode édition — maquette n° 8 : panneau qui monte du bas, à portée de pouce.
// Image facultative : une photo (appareil photo ou photothèque, réduite dans le navigateur avant l'envoi)
// ou l'adresse d'une image sur le web (téléchargée par le serveur).
export function AddItemForm({ collectionId }: { collectionId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [nomPhoto, setNomPhoto] = useState<string>();
  const [state, action, pending] = useActionState<AddItemState, FormData>(async (precedent, formData) => {
    const photo = formData.get("image");
    if (photo instanceof File && photo.size > 0) {
      try {
        formData.set("image", await reduirePhoto(photo));
      } catch {
        return {
          error: "Cette photo n’a pas pu être lue. Essayez-en une autre.",
          title: String(formData.get("title") ?? ""),
          imageUrl: String(formData.get("imageUrl") ?? ""),
        };
      }
    }
    const resultat = await addItem(collectionId, precedent, formData);
    if (resultat.ok) setNomPhoto(undefined);
    return resultat;
  }, {});

  // Ajout réussi : on vide le formulaire ; on referme le panneau, sauf s'il y a un avertissement à lire.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      if (!state.warning) dialogRef.current?.close();
    }
  }, [state.ok, state.warning]);

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
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-texte-doux">Image (facultative)</span>
            <label className="flex h-[60px] cursor-pointer items-center gap-3 rounded-xl border border-[#d3d6dc] bg-white px-4 text-sm font-semibold text-texte has-focus-visible:ring-2 has-focus-visible:ring-action/40">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              <span className="min-w-0 flex-1 truncate">{nomPhoto ? `Photo : ${nomPhoto}` : "Prendre ou choisir une photo"}</span>
              {/* accept="image/*" : Safari propose l'appareil photo ou la photothèque. */}
              <input
                name="image"
                type="file"
                accept="image/*"
                aria-label="Photo de l’item"
                className="sr-only"
                onChange={(e) => setNomPhoto(e.currentTarget.files?.[0]?.name)}
              />
            </label>
            <input
              name="imageUrl"
              type="url"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="ou adresse d’une image : https://…"
              aria-label="Adresse de l’image"
              defaultValue={state.error ? state.imageUrl : ""}
              className="h-12 rounded-[10px] border border-[#d3d6dc] bg-white px-3 text-base text-texte outline-none focus:border-action focus:ring-2 focus:ring-action/20"
            />
          </div>
          {state.warning && (
            <p role="status" className="text-sm text-[#7a4b00]">
              {state.warning}
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
