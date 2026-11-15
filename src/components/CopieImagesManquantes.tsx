"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { importerImages } from "@/app/actions/import";
import { enLots } from "@/lib/collections/lots";

type Props = { collectionId: string; itemIds: string[] };

// Reprise d'un import interrompu (issue #51) : en mode édition, les items importés dont l'image n'a pas
// encore été copiée (onglet fermé pendant l'import, site momentanément indisponible).
// Même copie que l'import : lots de 10, protection SSRF (ADR-03).
export function CopieImagesManquantes({ collectionId, itemIds }: Props) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [traites, setTraites] = useState(0);
  const [total, setTotal] = useState(0);
  const [echecs, setEchecs] = useState<number>();

  async function copier() {
    const ids = [...itemIds];
    setEnCours(true);
    setEchecs(undefined);
    setTraites(0);
    setTotal(ids.length);
    let ratees = 0;
    for (const lot of enLots(ids)) {
      try {
        ratees += (await importerImages(collectionId, lot)).echecs;
      } catch {
        ratees += lot.length;
      }
      setTraites((avant) => avant + lot.length);
    }
    setEchecs(ratees);
    setEnCours(false);
    router.refresh();
  }

  if (itemIds.length === 0 && !echecs) return null;

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-bordure bg-white px-3 py-2.5 text-[13px] text-texte-doux">
      {enCours ? (
        <>
          <p role="status">
            Copie des images… {traites} / {total}
          </p>
          <div
            role="progressbar"
            aria-label="Images copiées"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={traites}
            className="h-1.5 overflow-hidden rounded-full bg-[#e9ecf1]"
          >
            <div className="h-1.5 bg-action transition-[width]" style={{ width: `${total ? (traites / total) * 100 : 0}%` }} />
          </div>
        </>
      ) : (
        <>
          {echecs !== undefined && (
            <p role="status" className={echecs ? "text-[#7a4b00]" : ""}>
              {echecs === 0
                ? "Images copiées."
                : echecs === 1
                  ? "1 image n’a pas pu être copiée. Réessayez plus tard, ou ajoutez-en une à la main."
                  : `${echecs} images n’ont pas pu être copiées. Réessayez plus tard, ou ajoutez-les à la main.`}
            </p>
          )}
          {itemIds.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <p>
                {itemIds.length === 1 ? "1 image à copier" : `${itemIds.length} images à copier`} depuis le site d’origine.
              </p>
              <button
                type="button"
                onClick={copier}
                className="h-9 shrink-0 rounded-full bg-action px-3.5 text-sm font-semibold text-white"
              >
                Copier les images
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
