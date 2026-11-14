"use client";

import { useActionState } from "react";
import { createCollection, type CreateCollectionState } from "@/app/actions/collections";
import { NOM_MAX } from "@/lib/collections/name";

export function NewCollectionForm() {
  const [state, action, pending] = useActionState<CreateCollectionState, FormData>(createCollection, {});

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-texte-doux">
        Nom de la collection
        <input
          name="name"
          type="text"
          required
          maxLength={NOM_MAX}
          autoComplete="off"
          defaultValue={state.name}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "erreur-nom" : undefined}
          className="h-12 rounded-[10px] border border-[#d3d6dc] bg-white px-3 text-base text-texte outline-none focus:border-action focus:ring-2 focus:ring-action/20 aria-invalid:border-danger"
        />
      </label>
      {state.error && (
        <p id="erreur-nom" role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-[50px] rounded-xl border border-action bg-white text-base font-semibold text-action disabled:opacity-60"
      >
        {pending ? "Création…" : "Créer une collection vide"}
      </button>
      <p className="text-center text-[13px] text-texte-doux">
        L’import depuis l’adresse d’une page arrive bientôt. En attendant, vous ajouterez les objets à la main.
      </p>
    </form>
  );
}
