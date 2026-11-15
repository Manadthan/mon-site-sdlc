"use client";

import { useActionState, useState } from "react";
import { analyserPage, completerCollection, type AnalyseState, type ImportState } from "@/app/actions/import";
import { ImportProgress } from "@/components/ImportProgress";
import { ScrapePreview } from "@/components/ScrapePreview";

type Props = { collectionId: string; nom: string; imagesExistantes: string[] };

// Compléter une collection depuis une URL (US-13) : même aperçu que la création (US-03),
// sans toucher au nom. Les éléments déjà présents (même image d'origine) sont signalés et décochés ;
// les éléments retenus vont en fin de collection, puis leurs images sont copiées par lots.
export function CompleterCollectionForm({ collectionId, nom, imagesExistantes }: Props) {
  const [dejaPresents] = useState<ReadonlySet<string>>(() => new Set(imagesExistantes));
  const [exclus, setExclus] = useState<ReadonlySet<number>>(new Set());

  const [analyse, analyser, analyseEnCours] = useActionState<AnalyseState, FormData>(async (precedent, formData) => {
    const resultat = await analyserPage(precedent, formData);
    if (resultat.apercu) {
      setExclus(
        new Set(resultat.apercu.candidates.flatMap((c, i) => (c.decor || dejaPresents.has(c.imageUrl) ? [i] : []))),
      );
    }
    return resultat;
  }, {});
  const [ajout, ajouter, ajoutEnCours] = useActionState<ImportState, FormData>(completerCollection.bind(null, collectionId), {});

  if (ajout.collectionId && ajout.itemIds) {
    return <ImportProgress collectionId={ajout.collectionId} nom={nom} itemIds={ajout.itemIds} ajout />;
  }

  const apercu = analyse.apercu;
  const retenus = apercu?.candidates.filter((_, i) => !exclus.has(i)) ?? [];
  const nbDejaPresents = apercu?.candidates.filter((c) => dejaPresents.has(c.imageUrl)).length ?? 0;
  const occupe = analyseEnCours || ajoutEnCours;
  const basculer = (index: number) =>
    setExclus((avant) => {
      const apres = new Set(avant);
      if (!apres.delete(index)) apres.add(index);
      return apres;
    });

  return (
    <div className="flex flex-col gap-3">
      <form action={analyser} noValidate>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-texte-doux">
          Adresse de la page à ajouter
          <span className="flex gap-2">
            <input
              name="url"
              type="url"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="https://…"
              defaultValue={analyse.url}
              aria-invalid={analyse.echec ? true : undefined}
              aria-describedby={analyse.echec ? "echec-analyse" : undefined}
              className="h-12 min-w-0 flex-1 rounded-[10px] border border-[#d3d6dc] bg-white px-3 text-base text-texte outline-none focus:border-action focus:ring-2 focus:ring-action/20 aria-invalid:border-danger"
            />
            <button
              type="submit"
              disabled={occupe}
              className="h-12 rounded-[10px] border border-[#d3d6dc] bg-white px-3.5 text-sm font-semibold text-texte disabled:opacity-60"
            >
              {analyseEnCours ? "Analyse…" : analyse.echec ? "Réessayer" : "Analyser"}
            </button>
          </span>
        </label>
      </form>

      {analyseEnCours && (
        <p role="status" className="text-sm text-texte-doux">
          Lecture de la page… (10 secondes au plus)
        </p>
      )}

      {analyse.echec && !analyseEnCours && (
        <div id="echec-analyse" role="alert" className="flex flex-col gap-2 rounded-[14px] border border-[#f1c4c4] bg-white p-4">
          <h2 className="text-base font-bold text-danger">{analyse.echec.titre}</h2>
          <p className="text-sm leading-normal text-texte-doux">{analyse.echec.texte}</p>
        </div>
      )}

      {apercu && !analyseEnCours && (
        <form action={ajouter} className="flex flex-col gap-3" noValidate>
          <input type="hidden" name="items" value={JSON.stringify(retenus.map(({ title, imageUrl }) => ({ title, imageUrl })))} />
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-base font-bold">Aperçu</h2>
            <span className="text-[13px] text-texte-doux">
              {retenus.length} retenus sur {apercu.candidates.length}
            </span>
          </div>
          <p className="text-[13px] leading-snug text-texte-doux">
            Touchez une vignette pour l’exclure.{" "}
            {nbDejaPresents > 0
              ? `Le décor et les éléments déjà dans la collection (${nbDejaPresents}) sont décochés.`
              : "Le décor est décoché."}{" "}
            Les éléments ajoutés iront en fin de collection.
          </p>
          {ajout.error && (
            <p role="alert" className="text-sm text-danger">
              {ajout.error}
            </p>
          )}
          <ScrapePreview candidats={apercu.candidates} exclus={exclus} onBasculer={basculer} dejaPresents={dejaPresents} />
          <div className="h-24" aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-0 border-t border-bordure bg-white px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
            <button
              type="submit"
              disabled={occupe || retenus.length === 0}
              className="mx-auto block h-[50px] w-full max-w-md rounded-xl bg-action text-base font-semibold text-white disabled:opacity-60"
            >
              {ajoutEnCours ? "Ajout…" : `Ajouter ${retenus.length} élément${retenus.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
