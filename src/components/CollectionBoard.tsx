"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { setOwned } from "@/app/actions/items";
import { AddItemForm } from "@/components/AddItemForm";
import { ItemTile, type Item } from "@/components/ItemTile";
import { applyOwned, countOwned } from "@/lib/items/owned";
import { computeProgress, formatProgress } from "@/lib/progress";

type Props = { collectionId: string; name: string; items: Item[] };

// Page d'une collection côté navigateur : grille (US-06) et coche immédiate (US-07) — maquette n° 2.
export function CollectionBoard({ collectionId, name, items }: Props) {
  // Affichage « optimiste » : la coche et le compteur changent tout de suite, sans attendre le serveur.
  // Si l'enregistrement échoue, l'affichage revient tout seul à l'état réel.
  const [affiches, appliquer] = useOptimistic(items, (etat, { id, owned }: { id: string; owned: boolean }) =>
    applyOwned(etat, id, owned),
  );
  const [, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();
  // État voulu par le dernier tap, par item : deux taps très rapprochés s'annulent même si
  // l'affichage n'a pas encore été redessiné entre les deux.
  const voulu = useRef(new Map<string, boolean>());
  const progress = computeProgress(countOwned(affiches), affiches.length);

  function basculer(item: Item) {
    const owned = !(voulu.current.get(item.id) ?? item.owned);
    voulu.current.set(item.id, owned);
    setErreur(undefined);
    startTransition(async () => {
      appliquer({ id: item.id, owned });
      // Next.js envoie les actions serveur une par une, dans l'ordre : le dernier tap gagne toujours.
      const resultat = await setOwned(item.id, owned);
      if (resultat.error) {
        voulu.current.delete(item.id);
        setErreur(resultat.error);
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col">
      <header className="sticky top-0 z-10 flex flex-col gap-2.5 border-b border-bordure bg-white pt-[max(env(safe-area-inset-top),8px)] pr-2 pb-3 pl-2">
        <Link href="/" aria-label="Retour aux collections" className="flex size-11 items-center justify-center text-texte">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex flex-col gap-2 px-3">
          <h1 className="text-[22px] leading-tight font-bold tracking-tight break-words">{name}</h1>
          <div className="flex items-center gap-2.5">
            <p className="text-sm whitespace-nowrap text-texte-doux" aria-live="polite">
              <span className="sr-only">Possédés : </span>
              <strong className="font-semibold text-texte">{formatProgress(progress)}</strong>
            </p>
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e9ecf1]"
              role="progressbar"
              aria-label={`${progress.percent} % complété`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
            >
              <div className="h-1.5 bg-possede transition-[width]" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
          {erreur && (
            <p role="alert" className="text-sm text-danger">
              {erreur}
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 pt-3 pb-8">
        {affiches.length === 0 && (
          <p className="pt-6 pb-4 text-center text-[15px] text-texte-doux">Aucun item dans cette collection pour l’instant.</p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {affiches.length > 0 && (
            // display: contents : vignettes et bouton « Ajouter » partagent la même grille.
            // role="list" explicite : sinon Safari (VoiceOver) ne l'annonce plus comme une liste.
            <ul role="list" aria-label="Items" className="contents">
              {affiches.map((item) => (
                <ItemTile key={item.id} item={item} onToggle={() => basculer(item)} />
              ))}
            </ul>
          )}
          <div>
            <AddItemForm collectionId={collectionId} />
          </div>
        </div>
      </main>
    </div>
  );
}
