"use client";

import { useId, type RefObject } from "react";

type Props = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  error?: string;
};

/**
 * Boîte de confirmation (maquette n° 7), réutilisée pour supprimer une collection (US-04) puis un item (US-08).
 * Élément <dialog> natif : focus piégé, touche Échap et lecteur d'écran gérés par Safari.
 */
export function ConfirmDialog({ dialogRef, title, description, confirmLabel, onConfirm, pending, error }: Props) {
  // Identifiants uniques : plusieurs boîtes coexistent sur la page (une par carte).
  const id = useId();
  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby={`${id}-titre`}
      aria-describedby={`${id}-description`}
      className="m-auto w-[calc(100%-48px)] max-w-sm rounded-2xl bg-white p-5 pb-4 text-texte shadow-[0_12px_32px_rgba(0,0,0,0.25)] backdrop:bg-[rgba(21,23,26,0.45)]"
    >
      <h2 id={`${id}-titre`} className="text-lg leading-snug font-bold">
        {title}
      </h2>
      <p id={`${id}-description`} className="mt-2.5 text-sm leading-relaxed text-texte-doux">
        {description}
      </p>
      {error && (
        <p role="alert" className="mt-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          autoFocus
          onClick={() => dialogRef.current?.close()}
          className="h-12 rounded-xl border border-[#d3d6dc] bg-white text-[15px] font-semibold"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="h-12 rounded-xl bg-danger text-[15px] font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Suppression…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
