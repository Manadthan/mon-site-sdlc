"use client";

import { useRef, useState, useTransition } from "react";
import { deleteCollection } from "@/app/actions/collections";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { confirmationSuppression } from "@/lib/collections/messages";

// Bouton corbeille d'une carte de l'accueil + confirmation (US-04).
export function DeleteCollectionButton({ id, name, total }: { id: string; name: string; total: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function confirmer() {
    startTransition(async () => {
      const resultat = await deleteCollection(id);
      if (resultat.error) setError(resultat.error);
      else dialogRef.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Supprimer la collection ${name}`}
        onClick={() => {
          setError(undefined);
          dialogRef.current?.showModal();
        }}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-[#6b7079]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
      </button>
      <ConfirmDialog
        dialogRef={dialogRef}
        title={confirmationSuppression(name, total)}
        description={total > 0 ? "Les items et leurs images seront aussi effacés. Cette action est définitive." : "Cette action est définitive."}
        confirmLabel="Supprimer"
        onConfirm={confirmer}
        pending={pending}
        error={error}
      />
    </>
  );
}
