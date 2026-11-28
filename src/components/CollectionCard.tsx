import Link from "next/link";
import { DeleteCollectionButton } from "@/components/DeleteCollectionButton";
import { EditExternalCollectionButton } from "@/components/EditExternalCollectionButton";
import { ItemImage } from "@/components/ItemImage";
import type { CollectionCard as Carte } from "@/lib/collections/cards";
import { libelleSourceExterne } from "@/lib/externes/sources";
import { formatProgress } from "@/lib/progress";

// Carte d'une collection sur l'accueil (US-02), avec bouton de suppression (US-04) — maquette n° 1.
// Couverture : image du premier item qui en a une (issue #59), couverture externe pour une collection liée,
// sinon une vignette neutre.
// Toute la carte (sauf les actions) mène à la page de la collection (US-06), ou au site compagnon dans le même onglet.
// Liste partagée (US-17) : lecture seule, sans boutons d'édition ni corbeille.
export function CollectionCard({
  carte,
  lien,
  lectureSeule = false,
  categories = [],
}: {
  carte: Carte;
  lien?: string;
  lectureSeule?: boolean;
  categories?: (string | null)[];
}) {
  const { id, name, category, coverPath, progress, externalUrl, externalSource, externalCoverUrl } = carte;
  const contenu = (
    <>
      <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-neutre text-icone" aria-hidden="true">
        {externalCoverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={externalCoverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full rounded-[inherit] object-contain"
          />
        ) : (
          <ItemImage chemin={coverPath} taille={24} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="text-base leading-snug font-semibold break-words">{name}</h2>
          {externalUrl && (
            <span className="rounded-md bg-neutre px-1.5 py-0.5 text-[11px] font-medium text-texte-doux">
              {libelleSourceExterne(externalSource)}
            </span>
          )}
        </div>
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
    </>
  );

  return (
    <li className="flex items-center gap-3 rounded-[14px] border border-bordure bg-surface py-2.5 pr-1.5 pl-2.5">
      {externalUrl && !lectureSeule ? (
        <a href={externalUrl} className="flex min-w-0 flex-1 items-center gap-3 text-texte">
          {contenu}
        </a>
      ) : (
        <Link href={lien ?? `/collections/${id}`} className="flex min-w-0 flex-1 items-center gap-3 text-texte">
          {contenu}
        </Link>
      )}
      {lectureSeule ? (
        <span className="w-1" />
      ) : (
        <div className="flex shrink-0 items-center">
          {externalUrl && (
            <EditExternalCollectionButton
              id={id}
              name={name}
              category={category}
              externalUrl={externalUrl}
              categories={categories}
            />
          )}
          <DeleteCollectionButton id={id} name={name} total={externalUrl ? 0 : progress.total} />
        </div>
      )}
    </li>
  );
}
