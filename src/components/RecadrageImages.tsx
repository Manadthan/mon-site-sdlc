"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recadrerImages } from "@/app/actions/recadrage";
import { enLots } from "@/lib/collections/lots";

type Props = { collectionId: string; itemIds: string[] };

// Retraitement des vignettes importées avant le rognage des bords (issue #79), en mode édition :
// les bords vides sont retirés pour que l'objet remplisse sa case. Lots de 10, comme l'import (ADR-03).
export function RecadrageImages({ collectionId, itemIds }: Props) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [traites, setTraites] = useState(0);
  const [total, setTotal] = useState(0);
  const [echecs, setEchecs] = useState<number>();

  async function recadrer() {
    const ids = [...itemIds];
    setEnCours(true);
    setEchecs(undefined);
    setTraites(0);
    setTotal(ids.length);
    let ratees = 0;
    for (const lot of enLots(ids)) {
      try {
        ratees += (await recadrerImages(collectionId, lot)).echecs;
      } catch {
        ratees += lot.length;
      }
      setTraites((avant) => avant + lot.length);
    }
    setEchecs(ratees);
    setEnCours(false);
    router.refresh();
  }

  if (itemIds.length === 0 && echecs === undefined) return null;

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-bordure bg-surface px-3 py-2.5 text-[13px] text-texte-doux">
      {enCours ? (
        <>
          <p role="status">
            Recadrage des images… {traites} / {total}
          </p>
          <div
            role="progressbar"
            aria-label="Images recadrées"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={traites}
            className="h-1.5 overflow-hidden rounded-full bg-neutre"
          >
            <div className="h-1.5 bg-action transition-[width]" style={{ width: `${total ? (traites / total) * 100 : 0}%` }} />
          </div>
        </>
      ) : (
        <>
          {echecs !== undefined && (
            <p role="status" className={echecs ? "text-alerte-texte" : ""}>
              {echecs === 0
                ? "Images recadrées."
                : echecs === 1
                  ? "1 image n’a pas pu être recadrée. Réessayez plus tard."
                  : `${echecs} images n’ont pas pu être recadrées. Réessayez plus tard.`}
            </p>
          )}
          {itemIds.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <p>
                {itemIds.length === 1 ? "1 image a" : `${itemIds.length} images ont`} peut-être des bords vides.
              </p>
              <button
                type="button"
                onClick={recadrer}
                className="h-9 shrink-0 rounded-full bg-action px-3.5 text-sm font-semibold text-white"
              >
                Recadrer
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
