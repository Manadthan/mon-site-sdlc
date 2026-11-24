import Link from "next/link";
import { DeleteCollectionButton } from "@/components/DeleteCollectionButton";
import { ItemImage } from "@/components/ItemImage";
import { formatProgress } from "@/lib/progress";
import type { CollectionCard as Carte } from "@/lib/collections/cards";

// Carte d'une collection sur l'accueil (US-02), avec bouton de suppression (US-04) — maquette n° 1.
// Couverture : image du premier item qui en a une (issue #59), sinon une vignette neutre.
// Toute la carte (sauf la corbeille) mène à la page de la collection (US-06).
// Liste partagée (US-17) : lien vers la page partagée, sans corbeille.
export function CollectionCard({ carte, lien, lectureSeule = false }: { carte: Carte; lien?: string; lectureSeule?: boolean }) {
  const { id, name, coverPath, progress } = carte;
  return (
    <li className="flex items-center gap-3 rounded-[14px] border border-bordure bg-surface py-2.5 pr-1.5 pl-2.5">
      <Link href={lien ?? `/collections/${id}`} className="flex min-w-0 flex-1 items-center gap-3 text-texte">
        <div className="relative flex size-16 shrink-0 items-center justify-center rounded-[10px] bg-neutre text-icone" aria-hidden="true">
          <ItemImage chemin={coverPath} taille={24} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="text-base leading-snug font-semibold break-words">{name}</h2>
          <p className="text-[13px] text-texte-doux">
            <span className="sr-only">Possédés : </span>
            {formatProgress(progress)}
          </p>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-neutre"
            role="progressbar"
            aria-label={`${name} : ${progress.percent} % complété`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
          >
            <div className="h-1.5 rounded-full bg-possede" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      </Link>
      {lectureSeule ? <span className="w-1" /> : <DeleteCollectionButton id={id} name={name} total={progress.total} />}
    </li>
  );
}
