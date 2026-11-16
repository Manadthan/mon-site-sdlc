"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { importerImages } from "@/app/actions/import";
import { enLots } from "@/lib/collections/lots";

type Props = { collectionId: string; nom: string; itemIds: string[]; ajout?: boolean };

// Import des images (US-03, maquette n° 10) : le navigateur envoie les items par lots de 10 (ADR-03),
// pour rester sous la durée maximale d'une fonction serveur et afficher la progression.
// À la fin, la collection s'ouvre ; s'il y a eu des échecs, on laisse le temps de lire l'avertissement.
export function ImportProgress({ collectionId, nom, itemIds, ajout = false }: Props) {
  const router = useRouter();
  const lancement = useRef(false);
  const [traites, setTraites] = useState(0);
  const [lot, setLot] = useState(1);
  const [echecs, setEchecs] = useState(0);
  const [fini, setFini] = useState(false);

  const lots = enLots(itemIds);
  const total = itemIds.length;
  const adresse = `/collections/${collectionId}`;

  useEffect(() => {
    // Une seule fois, même si React monte le composant deux fois en développement.
    if (lancement.current) return;
    lancement.current = true;
    (async () => {
      let ratees = 0;
      for (const [index, ids] of enLots(itemIds).entries()) {
        setLot(index + 1);
        try {
          ratees += (await importerImages(collectionId, ids)).echecs;
        } catch {
          // Réseau coupé : le lot est compté en échec, on continue avec le suivant.
          ratees += ids.length;
        }
        setEchecs(ratees);
        setTraites((avant) => avant + ids.length);
      }
      setFini(true);
      if (ratees === 0) router.push(adresse);
    })();
  }, [itemIds, collectionId, router, adresse]);

  const pourcentage = total ? Math.round((traites / total) * 100) : 100;

  return (
    <div className="flex flex-col gap-[18px] pt-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold">Import de « {nom} »</h2>
        <p className="text-[15px] leading-normal text-texte-doux">
          Copie des images sur le serveur, par lots de 10. Gardez cette page ouverte.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label="Images importées"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={traites}
          className="h-2.5 overflow-hidden rounded-[5px] bg-bordure"
        >
          <div className="h-2.5 rounded-[5px] bg-action transition-[width]" style={{ width: `${pourcentage}%` }} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-semibold">
            {traites} / {total} images
          </span>
          <span className="text-texte-doux">
            Lot {lot} sur {Math.max(lots.length, 1)}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5 text-sm">
        <Etape etat="fait">{ajout ? `${total} items ajoutés à la collection` : `Collection et ${total} items enregistrés`}</Etape>
        <Etape etat={fini ? "fait" : "en-cours"}>Copie des images{fini ? "" : "…"}</Etape>
        <Etape etat={fini ? (echecs ? "a-faire" : "en-cours") : "a-faire"}>Ouverture de la collection</Etape>
      </ul>

      {echecs > 0 && (
        <p role="status" className="rounded-[10px] border border-alerte-bord bg-alerte px-3 py-2.5 text-[13px] leading-snug text-alerte-texte">
          {echecs === 1
            ? "1 image n’a pas pu être copiée : l’item est gardé sans image, vous pourrez en ajouter une."
            : `${echecs} images n’ont pas pu être copiées : les items sont gardés sans image, vous pourrez en ajouter.`}
        </p>
      )}

      {fini && echecs > 0 && (
        <Link
          href={adresse}
          className="flex h-[50px] items-center justify-center rounded-xl bg-action text-base font-semibold text-white"
        >
          Ouvrir la collection
        </Link>
      )}
    </div>
  );
}

function Etape({ etat, children }: { etat: "fait" | "en-cours" | "a-faire"; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-2.5 ${etat === "a-faire" ? "text-icone" : ""}`}>
      {etat === "fait" ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-action text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
        </span>
      ) : etat === "en-cours" ? (
        <span className="size-6 shrink-0 animate-spin rounded-full border-[3px] border-action border-r-champ" aria-hidden="true" />
      ) : (
        <span className="size-6 shrink-0 rounded-full border-2 border-champ" aria-hidden="true" />
      )}
      {children}
    </li>
  );
}
