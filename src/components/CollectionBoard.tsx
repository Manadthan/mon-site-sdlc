"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { dupliquerCollection } from "@/app/actions/collections";
import { deleteItem, moveItem, setOwned } from "@/app/actions/items";
import { AddItemForm } from "@/components/AddItemForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CopieImagesManquantes } from "@/components/CopieImagesManquantes";
import { RecadrageImages } from "@/components/RecadrageImages";
import { FilterTabs } from "@/components/FilterTabs";
import { ItemEditTile } from "@/components/ItemEditTile";
import { ItemTile, type Item } from "@/components/ItemTile";
import { RenameCollectionSheet } from "@/components/RenameCollectionSheet";
import { RenameItemSheet } from "@/components/RenameItemSheet";
import { SearchField } from "@/components/SearchField";
import { ItemSortBar } from "@/components/ItemSortBar";
import { ZoomGrille } from "@/components/ZoomGrille";
import { CLASSES_GRILLE, changerColonnes, COOKIE_GRILLE, type Colonnes } from "@/lib/items/grille";
import { filtrerItems, type Filtre } from "@/lib/items/filter";
import { COOKIE_TRI_ITEMS, serialiserTriItems, trierItems, triSuivant, TRI_PAR_DEFAUT, type CleTri, type TriItems } from "@/lib/items/sort";
import { moveInList, type Direction } from "@/lib/items/order";
import { confirmationDuplication } from "@/lib/collections/messages";
import { applyOwned, countOwned } from "@/lib/items/owned";
import { computeProgress, formatProgress } from "@/lib/progress";

type Props = {
  collectionId: string;
  name: string;
  /** Catégorie de la collection et catégories déjà utilisées (US-19), pour le panneau « Nom et catégorie ». */
  category?: string | null;
  categories?: (string | null)[];
  items: Item[];
  imagesACopier?: string[];
  /** Items dont la vignette date d'avant le rognage des bords (issue #79). */
  imagesARecadrer?: string[];
  colonnes?: Colonnes;
  tri?: TriItems;
  /** Collection partagée vue par un proche (US-17) : ni coche, ni mode édition. */
  lectureSeule?: boolean;
  /** Page du bouton retour : l'accueil, ou la liste partagée (US-17). */
  retour?: string;
};
type Changement = { type: "coche"; id: string; owned: boolean } | { type: "ordre"; id: string; direction: Direction };

// Page d'une collection côté navigateur — maquettes n° 2 (mode cocher : US-06, US-07)
// et n° 3 (mode édition : US-08 — ajouter, renommer, supprimer).
// Recherche et filtre (US-09) en mode cocher ; le mode édition montre toujours tous les items, dans l'ordre.
// Les deux modes sont séparés pour éviter les suppressions accidentelles (US-08).
export function CollectionBoard({
  collectionId,
  name,
  category = null,
  categories = [],
  items,
  imagesACopier = [],
  imagesARecadrer = [],
  colonnes: colonnesInitiales = 2,
  tri: triInitial = TRI_PAR_DEFAUT,
  lectureSeule = false,
  retour = "/",
}: Props) {
  // Affichage « optimiste » : la coche, le compteur et l'ordre changent tout de suite, sans attendre le serveur.
  // Si l'enregistrement échoue, l'affichage revient tout seul à l'état réel.
  const [affiches, appliquer] = useOptimistic(items, (etat, changement: Changement) =>
    changement.type === "coche"
      ? applyOwned(etat, changement.id, changement.owned)
      : moveInList(etat, changement.id, changement.direction),
  );
  const [, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();
  // État voulu par le dernier tap, par item : deux taps très rapprochés s'annulent même si
  // l'affichage n'a pas encore été redessiné entre les deux.
  const voulu = useRef(new Map<string, boolean>());
  const progress = computeProgress(countOwned(affiches), affiches.length);

  const [edition, setEdition] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [recherche, setRecherche] = useState("");
  // US-14 : items par ligne, mémorisés dans un cookie (toutes collections, cet appareil).
  const [colonnes, setColonnes] = useState<Colonnes>(colonnesInitiales);
  // US-15 : tri à l'affichage, mémorisé lui aussi.
  const [tri, setTri] = useState<TriItems>(triInitial);
  function trier(cle: CleTri) {
    const suivant = triSuivant(tri, cle);
    setTri(suivant);
    document.cookie = `${COOKIE_TRI_ITEMS}=${serialiserTriItems(suivant)}; path=/; max-age=31536000; samesite=lax`;
  }
  function zoomer(sens: "plus" | "moins") {
    const suivant = changerColonnes(colonnes, sens);
    setColonnes(suivant);
    document.cookie = `${COOKIE_GRILLE}=${suivant}; path=/; max-age=31536000; samesite=lax`;
  }
  // Le compteur porte sur toute la collection ; seule la grille est filtrée et triée.
  // Le mode édition montre toujours l'ordre de la collection (flèches haut / bas).
  const visibles = edition ? affiches : trierItems(filtrerItems(affiches, filtre, recherche), tri);
  const filtrage = !edition && (filtre !== "tous" || recherche.trim() !== "");
  const [cible, setCible] = useState<Item>();
  const renommerRef = useRef<HTMLDialogElement>(null);
  const renommerCollectionRef = useRef<HTMLDialogElement>(null);
  const supprimerRef = useRef<HTMLDialogElement>(null);
  const [suppressionEnCours, startSuppression] = useTransition();
  const [erreurSuppression, setErreurSuppression] = useState<string>();
  // US-18 : dupliquer la collection, puis ouvrir la copie.
  const router = useRouter();
  const dupliquerRef = useRef<HTMLDialogElement>(null);
  const [duplicationEnCours, startDuplication] = useTransition();
  const [erreurDuplication, setErreurDuplication] = useState<string>();

  function confirmerDuplication() {
    startDuplication(async () => {
      const resultat = await dupliquerCollection(collectionId);
      if (resultat.id) router.push(`/collections/${resultat.id}`);
      else setErreurDuplication(resultat.error);
    });
  }

  function deplacer(item: Item, direction: Direction) {
    setErreur(undefined);
    startTransition(async () => {
      appliquer({ type: "ordre", id: item.id, direction });
      const resultat = await moveItem(collectionId, item.id, direction);
      if (resultat.error) setErreur(resultat.error);
    });
  }

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
      appliquer({ type: "coche", id: item.id, owned });
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
      <header className="sticky top-0 z-10 flex flex-col gap-2.5 border-b border-bordure bg-surface pt-[max(env(safe-area-inset-top),8px)] pr-2 pb-3 pl-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href={retour} aria-label="Retour aux collections" className="flex size-11 items-center justify-center text-texte">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            {lectureSeule && <p className="text-[13px] text-texte-doux">Lecture seule</p>}
          </div>
          {lectureSeule ? (
            <div className="mr-2 flex h-11 items-center">
              <ZoomGrille colonnes={colonnes} onChange={zoomer} />
            </div>
          ) : edition ? (
            <button
              type="button"
              onClick={() => setEdition(false)}
              className="mr-2 flex h-9 items-center rounded-full bg-action px-4 text-sm font-semibold text-white"
            >
              Terminé
            </button>
          ) : (
            <div className="mr-2 flex items-center gap-2">
              {/* US-14 : dans la barre du haut, qui reste visible au défilement. */}
              <ZoomGrille colonnes={colonnes} onChange={zoomer} />
              <button
                type="button"
                onClick={() => setEdition(true)}
                className="flex h-9 items-center gap-1.5 rounded-full border border-champ bg-surface px-3.5 text-sm font-semibold text-texte"
              >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
                Modifier
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 px-3">
          <div className="flex items-start gap-1">
            <h1 className="min-w-0 flex-1 text-[22px] leading-tight font-bold tracking-tight break-words">{name}</h1>
            {edition && (
              // US-12, US-19 : nom et catégorie de la collection, seulement en mode édition.
              <button
                type="button"
                aria-label="Modifier le nom et la catégorie"
                onClick={() => renommerCollectionRef.current?.showModal()}
                className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center text-texte-doux"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <p className="text-sm whitespace-nowrap text-texte-doux" aria-live="polite">
              <span className="sr-only">Possédés : </span>
              <strong className="font-semibold text-texte">{formatProgress(progress)}</strong>
            </p>
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutre"
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
            <p role="alert" className="text-sm text-alarme">
              {erreur}
            </p>
          )}
          {edition && (
            <p className="flex items-center gap-2 rounded-[10px] border border-alerte-bord bg-alerte px-3 py-2 text-[13px] text-alerte-texte">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              Mode édition — un tap ne coche plus les items
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 pt-3 pb-8">
        {edition && (
          <div className="mb-3 flex flex-col gap-2">
            <CopieImagesManquantes collectionId={collectionId} itemIds={imagesACopier} />
            <RecadrageImages collectionId={collectionId} itemIds={imagesARecadrer} />
            <button
              type="button"
              onClick={() => {
                setErreurDuplication(undefined);
                dupliquerRef.current?.showModal();
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-champ bg-surface text-sm font-semibold text-texte"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
              </svg>
              Dupliquer la collection
            </button>
          </div>
        )}
        {!edition && affiches.length > 0 && (
          <div className="mb-3 flex flex-col gap-2.5">
            <SearchField valeur={recherche} onChange={setRecherche} />
            <FilterTabs valeur={filtre} onChange={setFiltre} />
            <ItemSortBar tri={tri} onChange={trier} />
          </div>
        )}
        {filtrage && (
          <p className="sr-only" role="status">
            {visibles.length} item{visibles.length > 1 ? "s" : ""} affiché{visibles.length > 1 ? "s" : ""}
          </p>
        )}
        {filtrage && visibles.length === 0 && (
          <p className="pt-6 pb-4 text-center text-[15px] text-texte-doux">Aucun item ne correspond.</p>
        )}
        {affiches.length === 0 && (
          <p className="pt-6 pb-4 text-center text-[15px] text-texte-doux">Aucun item dans cette collection pour l’instant.</p>
        )}
        {/* Le mode édition garde 2 items par ligne : ses boutons doivent rester utilisables (US-14). */}
        <div className={`grid ${CLASSES_GRILLE[edition ? 2 : colonnes]}`}>
          {/* Mode édition : les actions d'ajout en tête de grille, avant les items (demande du propriétaire). */}
          {edition && (
            <div>
              <AddItemForm collectionId={collectionId} />
            </div>
          )}
          {edition && (
            // US-13 : ajouter les éléments d'une autre page, avec l'aperçu du scraper.
            <Link
              href={`/collections/${collectionId}/completer`}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-pointille px-2 text-center text-sm font-semibold text-lien"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
              </svg>
              Compléter depuis une adresse
            </Link>
          )}
          {visibles.length > 0 && (
            // display: contents : vignettes et bouton « Ajouter » partagent la même grille.
            // role="list" explicite : sinon Safari (VoiceOver) ne l'annonce plus comme une liste.
            <ul role="list" aria-label="Items" className="contents">
              {visibles.map((item, index) =>
                edition ? (
                  <ItemEditTile
                    key={item.id}
                    item={item}
                    position={index + 1}
                    premier={index === 0}
                    dernier={index === affiches.length - 1}
                    onMove={(direction) => deplacer(item, direction)}
                    onRename={() => ouvrirRenommer(item)}
                    onDelete={() => ouvrirSupprimer(item)}
                  />
                ) : (
                  <ItemTile
                    key={item.id}
                    item={item}
                    densite={colonnes}
                    onToggle={lectureSeule ? undefined : () => basculer(item)}
                  />
                ),
              )}
            </ul>
          )}

        </div>
        {!edition && !lectureSeule && affiches.length === 0 && (
          <p className="text-center text-sm text-texte-doux">Touchez « Modifier » pour ajouter des items.</p>
        )}
      </main>

      <RenameItemSheet dialogRef={renommerRef} item={cible} />
      <RenameCollectionSheet
        dialogRef={renommerCollectionRef}
        collectionId={collectionId}
        name={name}
        category={category}
        categories={categories}
      />
      <ConfirmDialog
        dialogRef={dupliquerRef}
        title={confirmationDuplication(name, affiches.length)}
        description="La copie reprend les items, leur ordre et leurs images, sans aucun item coché."
        confirmLabel="Dupliquer"
        onConfirm={confirmerDuplication}
        pending={duplicationEnCours}
        pendingLabel="Duplication…"
        ton="action"
        error={erreurDuplication}
      />
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
