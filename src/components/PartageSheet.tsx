"use client";

import { useRef, useState, useTransition } from "react";
import { arreterPartage, partagerCollections } from "@/app/actions/partage";
import { lienPartage } from "@/lib/collections/partage";

// Adresse du site (aperçu Vercel ou production) ; vide pendant le rendu serveur.
function origine() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

// Partage de toutes les collections en lecture seule (US-17, ADR-06) : bouton de l'accueil + panneau du bas.
// « Créer le lien » ouvre ensuite la feuille de partage de l'iPhone ; à défaut, le lien est copié.
// Safari peut refuser la feuille de partage après l'attente du serveur : « Envoyer le lien » reste là.
export function PartageSheet({ jeton: jetonInitial }: { jeton: string | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [jeton, setJeton] = useState(jetonInitial);
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();
  const [message, setMessage] = useState<string>();
  const lien = jeton ? lienPartage(origine(), jeton) : null;

  async function envoyer(adresse: string) {
    setMessage(undefined);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Mes collections", url: adresse });
        return;
      } catch (e) {
        // Partage annulé par l'utilisateur : rien à faire. Autre refus : on copie le lien.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(adresse);
      setMessage("Lien copié.");
    } catch {
      setMessage("Copiez le lien ci-dessus pour l’envoyer.");
    }
  }

  function partager() {
    setErreur(undefined);
    startTransition(async () => {
      const resultat = await partagerCollections();
      if (resultat.error || !resultat.jeton) {
        setErreur(resultat.error);
        return;
      }
      setJeton(resultat.jeton);
      await envoyer(lienPartage(origine(), resultat.jeton));
    });
  }

  function arreter() {
    setErreur(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const resultat = await arreterPartage();
      if (resultat.error) setErreur(resultat.error);
      else setJeton(null);
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Partager"
        onClick={() => {
          setMessage(undefined);
          setErreur(undefined);
          dialogRef.current?.showModal();
        }}
        className="flex size-11 items-center justify-center rounded-full text-lien"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="partage-titre"
        className="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-[20px] bg-surface px-5 pt-2.5 pb-[max(env(safe-area-inset-bottom),24px)] text-texte backdrop:bg-[rgba(21,23,26,0.45)]"
      >
        <div className="mx-auto h-[5px] w-10 rounded-full bg-champ" aria-hidden="true" />
        <div className="mt-2 flex items-center justify-between">
          <h2 id="partage-titre" className="text-lg font-bold">
            Partager mes collections
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
        <div className="mt-2 flex flex-col gap-3 text-[15px] text-texte-doux">
          {lien ? (
            <>
              <p>Toutes vos collections sont visibles avec ce lien, sans compte et sans modification possible.</p>
              <p data-testid="lien-partage" className="rounded-[10px] bg-fond px-3 py-2 text-[13px] break-all text-texte select-all">
                {lien}
              </p>
              <button
                type="button"
                onClick={() => envoyer(lien)}
                disabled={enCours}
                className="flex h-12 items-center justify-center rounded-xl bg-action text-base font-semibold text-white disabled:opacity-60"
              >
                Envoyer le lien
              </button>
              <button
                type="button"
                onClick={arreter}
                disabled={enCours}
                className="flex h-12 items-center justify-center rounded-xl border border-champ bg-surface text-base font-semibold text-alarme disabled:opacity-60"
              >
                Arrêter le partage
              </button>
            </>
          ) : (
            <>
              <p>
                Un lien secret pour montrer toutes vos collections à un proche, sans compte et sans modification possible.
                Les nouvelles collections y apparaîtront aussi.
              </p>
              <button
                type="button"
                onClick={partager}
                disabled={enCours}
                className="flex h-12 items-center justify-center rounded-xl bg-action text-base font-semibold text-white disabled:opacity-60"
              >
                Créer le lien et l’envoyer
              </button>
            </>
          )}
          {message && <p role="status">{message}</p>}
          {erreur && (
            <p role="alert" className="text-alarme">
              {erreur}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
