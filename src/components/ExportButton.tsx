"use client";

import { zipSync, strToU8, type Zippable } from "fflate";
import { useState } from "react";
import { preparerExport } from "@/app/actions/export";
import { enParallele } from "@/lib/collections/lots";
import { nomFichierExport } from "@/lib/export";

type Etat = { type: "repos" } | { type: "en-cours"; texte: string } | { type: "fini"; texte: string } | { type: "erreur"; texte: string };

// Sauvegarde de toutes les données (SPEC.md §4) : un fichier .zip avec donnees.json et les images.
// Le zip est fabriqué dans le navigateur (images téléchargées 4 à la fois), puis proposé au téléchargement :
// sur iPhone, Safari propose de l'enregistrer dans Fichiers.
export function ExportButton() {
  const [etat, setEtat] = useState<Etat>({ type: "repos" });

  async function exporter() {
    setEtat({ type: "en-cours", texte: "Préparation…" });
    const prepare = await preparerExport().catch(() => ({ error: "L’export n’a pas pu être préparé. Réessayez." }));
    if ("error" in prepare) return setEtat({ type: "erreur", texte: prepare.error });

    const { donnees, images } = prepare;
    const fichiers: Zippable = {};
    const manquantes: string[] = [];
    let faites = 0;
    await enParallele(
      images.map((image) => async () => {
        try {
          const reponse = await fetch(image.url);
          if (!reponse.ok) throw new Error(String(reponse.status));
          // Images déjà compressées (WebP) : rangées telles quelles (level 0), plus rapide.
          fichiers[image.cheminZip] = [new Uint8Array(await reponse.arrayBuffer()), { level: 0 }];
        } catch {
          manquantes.push(image.cheminZip);
        }
        faites++;
        setEtat({ type: "en-cours", texte: `Images : ${faites} / ${images.length}` });
      }),
      4,
    );

    const json = { ...donnees, images_manquantes: manquantes.sort() };
    fichiers["donnees.json"] = strToU8(JSON.stringify(json, null, 2));
    const zip = zipSync(fichiers);
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
    lien.download = nomFichierExport(new Date());
    lien.click();
    setTimeout(() => URL.revokeObjectURL(lien.href), 60_000);

    const nbItems = donnees.collections.reduce((total, c) => total + c.items.length, 0);
    setEtat({
      type: "fini",
      texte:
        `Export prêt : ${donnees.collections.length} collection${donnees.collections.length > 1 ? "s" : ""}, ` +
        `${nbItems} item${nbItems > 1 ? "s" : ""}, ${images.length - manquantes.length} image${images.length - manquantes.length > 1 ? "s" : ""}.` +
        (manquantes.length ? ` ${manquantes.length} image(s) n’ont pas pu être ajoutées.` : ""),
    });
  }

  return (
    <div className="flex flex-col items-center gap-2 px-4 pt-8 text-center">
      <button
        type="button"
        onClick={exporter}
        disabled={etat.type === "en-cours"}
        className="flex h-11 items-center gap-2 rounded-full border border-[#d3d6dc] bg-white px-4 text-sm font-semibold text-texte disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        {etat.type === "en-cours" ? "Export en cours…" : "Exporter mes données"}
      </button>
      {etat.type === "repos" ? (
        <p className="text-xs text-texte-doux">Un fichier .zip : toutes vos collections (JSON) et leurs images.</p>
      ) : (
        <p role={etat.type === "erreur" ? "alert" : "status"} className={`text-[13px] ${etat.type === "erreur" ? "text-danger" : "text-texte-doux"}`}>
          {etat.texte}
        </p>
      )}
    </div>
  );
}
