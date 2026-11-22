"use client";

import { useState, useTransition } from "react";
import { arreterPartage, partagerCollection } from "@/app/actions/collections";
import { lienPartage } from "@/lib/collections/partage";

// Adresse du site (aperçu Vercel ou production) ; vide pendant le rendu serveur.
function origine() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

type Props = { collectionId: string; name: string; jeton: string | null };

// Partage en lecture seule (US-17, ADR-06), en mode édition.
// « Partager » crée un lien secret puis ouvre la feuille de partage de l'iPhone ; à défaut, le lien est copié.
// Safari peut refuser la feuille de partage après l'attente du serveur : le bouton « Envoyer le lien » reste là.
export function PartageCollection({ collectionId, name, jeton: jetonInitial }: Props) {
  const [jeton, setJeton] = useState(jetonInitial);
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();
  const [message, setMessage] = useState<string>();
  const lien = jeton ? lienPartage(origine(), jeton) : null;

  async function envoyer(adresse: string) {
    setMessage(undefined);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: name, url: adresse });
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
      const resultat = await partagerCollection(collectionId);
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
      const resultat = await arreterPartage(collectionId);
      if (resultat.error) setErreur(resultat.error);
      else setJeton(null);
    });
  }

  return (
    <section
      aria-label="Partage"
      className="flex flex-col gap-2 rounded-[10px] border border-bordure bg-surface px-3 py-2.5 text-[13px] text-texte-doux"
    >
      {lien ? (
        <>
          <p className="font-semibold text-texte">Partagée en lecture seule</p>
          <p data-testid="lien-partage" className="break-all text-texte-doux select-all">
            {lien}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => envoyer(lien)}
              disabled={enCours}
              className="flex h-11 items-center rounded-full bg-action px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              Envoyer le lien
            </button>
            <button
              type="button"
              onClick={arreter}
              disabled={enCours}
              className="flex h-11 items-center rounded-full border border-champ bg-surface px-4 text-sm font-semibold text-alarme disabled:opacity-60"
            >
              Arrêter le partage
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <p className="flex-1">Un lien pour la montrer à un proche, sans compte et sans modification possible.</p>
          <button
            type="button"
            onClick={partager}
            disabled={enCours}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-champ bg-surface px-4 text-sm font-semibold text-lien disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
            </svg>
            Partager
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {erreur && (
        <p role="alert" className="text-alarme">
          {erreur}
        </p>
      )}
    </section>
  );
}
