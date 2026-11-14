"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { deleteItem, setOwned } from "@/app/actions/items";
import { AddItemForm } from "@/components/AddItemForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ItemEditTile } from "@/components/ItemEditTile";
import { ItemTile, type Item } from "@/components/ItemTile";
import { RenameItemSheet } from "@/components/RenameItemSheet";
import { applyOwned, countOwned } from "@/lib/items/owned";
import { computeProgress, formatProgress } from "@/lib/progress";

type Props = { collectionId: string; name: string; items: Item[] };

// Page d'une collection côté navigateur — maquettes n° 2 (mode cocher : US-06, US-07)
// et n° 3 (mode édition : US-08 — ajouter, renommer, supprimer).
// Les deux modes sont séparés pour éviter les suppressions accidentelles (US-08).
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

  const [edition, setEdition] = useState(false);
  const [cible, setCible] = useState<Item>();
  const renommerRef = useRef<HTMLDialogElement>(null);
  const supprimerRef = useRef<HTMLDialogElement>(null);
  const [suppressionEnCours, startSuppression] = useTransition();
  const [erreurSuppression, setErreurSuppression] = useState<string>();

  function ouvrirRenommer(item: Item) {
    setCible(item);
    renommerRef.current?.showModal();
  }

  function ouvrirSupprimer(item: Item) {
    setCible(item);
    setErreurSuppression(undefined);
    supprimerRef.current?.showModal();
  }

  function confirmerSuppression() {
    if (!cible) return;
    startSuppression(async () => {
      const resultat = await deleteItem(cible.id);
      if (resultat.error) setErreurSuppression(resultat.error);
      else supprimerRef.current?.close();
    });
  }

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
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Retour aux collections" className="flex size-11 items-center justify-center text-texte">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          {edition ? (
            <button
              type="button"
              onClick={() => setEdition(false)}
              className="mr-2 flex h-9 items-center rounded-full bg-action px-4 text-sm font-semibold text-white"
            >
              Terminé
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEdition(true)}
              className="mr-2 flex h-9 items-center gap-1.5 rounded-full border border-[#d3d6dc] bg-white px-3.5 text-sm font-semibold text-texte"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              Modifier
            </button>
          )}
        </div>
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
          {edition && (
            <p className="flex items-center gap-2 rounded-[10px] border border-[#f3d9a4] bg-[#fff7e6] px-3 py-2 text-[13px] text-[#7a4b00]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              Mode édition — un tap ne coche plus les items
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
              {affiches.map((item, index) =>
                edition ? (
                  <ItemEditTile
                    key={item.id}
                    item={item}
                    position={index + 1}
                    onRename={() => ouvrirRenommer(item)}
                    onDelete={() => ouvrirSupprimer(item)}
                  />
                ) : (
                  <ItemTile key={item.id} item={item} onToggle={() => basculer(item)} />
                ),
              )}
            </ul>
          )}
          {edition && (
            <div>
              <AddItemForm collectionId={collectionId} />
            </div>
          )}
        </div>
        {!edition && affiches.length === 0 && (
          <p className="text-center text-sm text-texte-doux">Touchez « Modifier » pour ajouter des items.</p>
        )}
      </main>

      <RenameItemSheet dialogRef={renommerRef} item={cible} />
      <ConfirmDialog
        dialogRef={supprimerRef}
        title={cible ? `Supprimer « ${cible.title} » ?` : ""}
        description="Cette action est définitive."
        confirmLabel="Supprimer"
        onConfirm={confirmerSuppression}
        pending={suppressionEnCours}
        error={erreurSuppression}
      />
    </div>
  );
}
