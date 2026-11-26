"use client";

import { useActionState, useState } from "react";
import { createCollection, createExternalCollection, type CreateCollectionState } from "@/app/actions/collections";
import { analyserPage, importerCollection, type AnalyseState, type ImportState } from "@/app/actions/import";
import { ChampCategorie } from "@/components/ChampCategorie";
import { ImportProgress } from "@/components/ImportProgress";
import { ScrapePreview } from "@/components/ScrapePreview";
import { NOM_MAX } from "@/lib/collections/name";
import { computeProgress, formatProgress } from "@/lib/progress";

const CHAMP =
  "h-12 rounded-[10px] border border-champ bg-surface px-3 text-base text-texte outline-none focus:border-action focus:ring-2 focus:ring-action/20 aria-invalid:border-danger";

// Création d'une collection (US-03) — maquettes n° 4 (aperçu) et n° 11 (page inaccessible).
// 1. On colle l'adresse d'une page, « Analyser » montre un aperçu (rien n'est enregistré).
//    Si c'est une URL d'un site compagnon (ex. Nintendo DB), elle est reconnue automatiquement.
// 2. Le nom est pré-rempli ; un tap sur une vignette l'exclut (pour un import HTML).
// 3. « Importer » crée la collection et ses items, ou « Lier cette collection » relie le suivi externe.
// Sans adresse, ou si la page échoue : collection vide.
export function NewCollectionForm({ categories = [] }: { categories?: (string | null)[] }) {
  const [nom, setNom] = useState("");
  // Catégorie facultative (US-19), gardée si la création échoue.
  const [categorie, setCategorie] = useState("");
  const [exclus, setExclus] = useState<ReadonlySet<number>>(new Set());

  const [analyse, analyser, analyseEnCours] = useActionState<AnalyseState, FormData>(async (precedent, formData) => {
    const resultat = await analyserPage(precedent, formData);
    if (resultat.externe) {
      setNom((actuel) => (actuel.trim() ? actuel : resultat.externe!.suggestedTitle));
    } else if (resultat.apercu) {
      const { candidates, pageTitle } = resultat.apercu;
      // Le décor (logos, bannières…) est présenté décoché ; l'utilisateur garde la main.
      setExclus(new Set(candidates.flatMap((c, i) => (c.decor ? [i] : []))));
      setNom((actuel) => (actuel.trim() ? actuel : pageTitle));
    }
    return resultat;
  }, {});
  const [vide, creerVide, videEnCours] = useActionState<CreateCollectionState, FormData>(createCollection, {});
  const [externeState, creerExterne, externeEnCours] = useActionState<CreateCollectionState, FormData>(createExternalCollection, {});
  const [importe, importer, importEnCours] = useActionState<ImportState, FormData>(importerCollection, {});

  const apercu = analyse.apercu;
  const externe = analyse.externe;
  const retenus = apercu?.candidates.filter((_, i) => !exclus.has(i)) ?? [];
  const erreurNom = externeState.error ?? importe.error ?? vide.error;
  const occupe = analyseEnCours || videEnCours || importEnCours || externeEnCours;

  if (importe.collectionId && importe.itemIds) {
    return <ImportProgress collectionId={importe.collectionId} nom={nom.trim()} itemIds={importe.itemIds} />;
  }

  const basculer = (index: number) =>
    setExclus((avant) => {
      const apres = new Set(avant);
      if (!apres.delete(index)) apres.add(index);
      return apres;
    });

  const progressionExterne = externe ? computeProgress(externe.owned, externe.total) : null;

  return (
    <div className="flex flex-col gap-3">
      <form action={analyser} noValidate>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-texte-doux">
          Adresse de la page source
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
              className={`${CHAMP} min-w-0 flex-1`}
            />
            <button
              type="submit"
              disabled={occupe}
              className="h-12 rounded-[10px] border border-champ bg-surface px-3.5 text-sm font-semibold text-texte disabled:opacity-60"
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
        <div id="echec-analyse" role="alert" className="flex flex-col gap-2 rounded-[14px] border border-erreur-bord bg-surface p-4">
          <h2 className="flex items-center gap-2.5 text-base font-bold text-alarme">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            {analyse.echec.titre}
          </h2>
          <p className="text-sm leading-normal text-texte-doux">{analyse.echec.texte}</p>
        </div>
      )}

      <form action={creerVide} className="flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-texte-doux">
          Nom de la collection
          <input
            name="name"
            type="text"
            required
            maxLength={NOM_MAX}
            autoComplete="off"
            value={nom}
            onChange={(e) => setNom(e.currentTarget.value)}
            aria-invalid={erreurNom ? true : undefined}
            aria-describedby={erreurNom ? "erreur-nom" : undefined}
            className={CHAMP}
          />
        </label>
        <ChampCategorie valeur={categorie} onChange={setCategorie} suggestions={categories} className={CHAMP} />
        {erreurNom && (
          <p id="erreur-nom" role="alert" className="text-sm text-alarme">
            {erreurNom}
          </p>
        )}

        {externe && progressionExterne && !analyseEnCours ? (
          <>
            <input type="hidden" name="externalUrl" value={externe.url} />
            <div className="flex items-center gap-3 rounded-[14px] border border-bordure bg-surface p-3">
              <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-neutre text-icone" aria-hidden="true">
                {externe.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={externe.coverUrl} alt="" className="absolute inset-0 size-full object-contain" />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-neutre px-2 py-0.5 text-[11px] font-semibold text-texte-doux">
                    {externe.label}
                  </span>
                </div>
                <p className="text-[13px] text-texte-doux">{formatProgress(progressionExterne)}</p>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-neutre"
                  role="progressbar"
                  aria-label={`${nom.trim() || externe.suggestedTitle} : ${progressionExterne.percent} % complété`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressionExterne.percent}
                >
                  <div className="h-1.5 rounded-full bg-possede" style={{ width: `${progressionExterne.percent}%` }} />
                </div>
              </div>
            </div>
            <button
              type="submit"
              formAction={creerExterne}
              disabled={occupe}
              className="mt-1 h-[50px] rounded-xl bg-action text-base font-semibold text-white disabled:opacity-60"
            >
              {externeEnCours ? "Liaison…" : "Lier cette collection"}
            </button>
            <p className="text-center text-[13px] text-texte-doux">
              Les compteurs se mettront à jour automatiquement depuis {externe.label}.
            </p>
          </>
        ) : apercu && !analyseEnCours ? (
          <>
            <input type="hidden" name="sourceUrl" value={apercu.url} />
            <input
              type="hidden"
              name="items"
              value={JSON.stringify(retenus.map(({ title, imageUrl }) => ({ title, imageUrl })))}
            />
            <div className="mt-1 flex items-baseline justify-between">
              <h2 className="text-base font-bold">Aperçu</h2>
              <span className="text-[13px] text-texte-doux">
                {retenus.length} retenus sur {apercu.candidates.length}
              </span>
            </div>
            <p className="text-[13px] leading-snug text-texte-doux">
              Touchez une vignette pour l’exclure. Les éléments qui ressemblent à du décor sont déjà décochés.
            </p>
            <ScrapePreview candidats={apercu.candidates} exclus={exclus} onBasculer={basculer} />
            {/* Barre du bas, à portée de pouce ; l'espace sous la grille évite qu'elle cache les dernières vignettes. */}
            <div className="h-24" aria-hidden="true" />
            <div className="fixed inset-x-0 bottom-0 border-t border-bordure bg-surface px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
              <button
                type="submit"
                formAction={importer}
                disabled={occupe || retenus.length === 0}
                className="mx-auto block h-[50px] w-full max-w-md rounded-xl bg-action text-base font-semibold text-white disabled:opacity-60"
              >
                {importEnCours ? "Import…" : `Importer ${retenus.length} élément${retenus.length > 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="submit"
              disabled={occupe}
              className="mt-1 h-[50px] rounded-xl border border-action bg-surface text-base font-semibold text-lien disabled:opacity-60"
            >
              {videEnCours ? "Création…" : "Créer une collection vide"}
            </button>
            <p className="text-center text-[13px] text-texte-doux">Vous ajouterez les items à la main en mode édition.</p>
          </>
        )}
      </form>
    </div>
  );
}
