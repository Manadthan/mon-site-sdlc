"use client";

import { strFromU8, unzipSync } from "fflate";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ajouterItemsImportes, creerCollectionImportee, enregistrerImagesImportees } from "@/app/actions/sauvegarde";
import { enLots } from "@/lib/collections/lots";
import { ITEMS_PAR_APPEL, lireSauvegarde } from "@/lib/sauvegarde";

type Etat = { type: "repos" } | { type: "en-cours" | "fini" | "erreur"; texte: string };

// Importer une sauvegarde (US-11) : le .zip produit par « Exporter mes données » est ouvert dans le navigateur,
// puis chaque collection est AJOUTÉE (jamais de remplacement) : collection, items par paquets, images par lots de 10.
export function ImportSauvegarde() {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [etat, setEtat] = useState<Etat>({ type: "repos" });

  async function importer(fichier: File) {
    setEtat({ type: "en-cours", texte: "Lecture du fichier…" });
    let zip: Record<string, Uint8Array>;
    let lecture: ReturnType<typeof lireSauvegarde>;
    try {
      zip = unzipSync(new Uint8Array(await fichier.arrayBuffer()));
      lecture = lireSauvegarde(JSON.parse(strFromU8(zip["donnees.json"] ?? new Uint8Array())));
    } catch {
      return setEtat({ type: "erreur", texte: "Ce fichier n’est pas une sauvegarde de Suivi de collections." });
    }
    if (!lecture.ok) return setEtat({ type: "erreur", texte: lecture.error });

    const { collections } = lecture;
    let echecsImages = 0;
    for (const [rang, collection] of collections.entries()) {
      const etape = `Collection ${rang + 1} / ${collections.length} : ${collection.nom}`;
      setEtat({ type: "en-cours", texte: etape });
      const creee = await creerCollectionImportee(collection.nom, collection.page_source).catch(() => ({ error: "" }));
      if ("error" in creee) {
        router.refresh();
        return setEtat({ type: "erreur", texte: `L’import s’est arrêté à « ${collection.nom} ». Les collections précédentes ont été ajoutées.` });
      }

      // Items, dans l'ordre, par paquets.
      const ids: string[] = [];
      for (const [index, paquet] of enLots(collection.items, ITEMS_PAR_APPEL).entries()) {
        const ajout = await ajouterItemsImportes(creee.id, paquet, index * ITEMS_PAR_APPEL + 1).catch(() => ({ error: "" }));
        if ("error" in ajout) {
          router.refresh();
          return setEtat({ type: "erreur", texte: `L’import s’est arrêté pendant « ${creee.nom} ».` });
        }
        ids.push(...ajout.ids);
      }

      // Images, par lots de 10.
      const avecImage = collection.items.flatMap((item, index) => {
        const donnees = item.image ? zip[item.image] : undefined;
        return donnees && ids[index] ? [{ id: ids[index], donnees }] : [];
      });
      echecsImages += collection.items.filter((item, index) => item.image && !avecImage.some((a) => a.id === ids[index])).length;
      let faites = 0;
      for (const lot of enLots(avecImage)) {
        const formData = new FormData();
        formData.set("collectionId", creee.id);
        for (const { id, donnees } of lot) {
          formData.append("itemId", id);
          formData.append("image", new Blob([donnees as BlobPart], { type: "image/webp" }), `${id}.webp`);
        }
        echecsImages += (await enregistrerImagesImportees(formData).catch(() => ({ echecs: lot.length }))).echecs;
        faites += lot.length;
        setEtat({ type: "en-cours", texte: `${etape} — images ${faites} / ${avecImage.length}` });
      }
    }

    router.refresh();
    setEtat({
      type: "fini",
      texte:
        `${collections.length} collection${collections.length > 1 ? "s" : ""} importée${collections.length > 1 ? "s" : ""}.` +
        (echecsImages ? ` ${echecsImages} image(s) n’ont pas pu être ajoutées.` : ""),
    });
  }

  return (
    <div className="flex flex-col items-center gap-2 px-4 pt-3 text-center">
      <label
        className={`flex h-11 cursor-pointer items-center gap-2 rounded-full border border-[#d3d6dc] bg-white px-4 text-sm font-semibold text-texte has-focus-visible:ring-2 has-focus-visible:ring-action/40 ${
          etat.type === "en-cours" ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 15V3M7 8l5-5 5 5M5 21h14" />
        </svg>
        {etat.type === "en-cours" ? "Import en cours…" : "Importer une sauvegarde"}
        <input
          ref={champ}
          type="file"
          accept=".zip,application/zip"
          aria-label="Fichier de sauvegarde"
          className="sr-only"
          disabled={etat.type === "en-cours"}
          onChange={(e) => {
            const fichier = e.currentTarget.files?.[0];
            if (champ.current) champ.current.value = "";
            if (fichier) void importer(fichier);
          }}
        />
      </label>
      {etat.type !== "repos" && (
        <p role={etat.type === "erreur" ? "alert" : "status"} className={`text-[13px] ${etat.type === "erreur" ? "text-danger" : "text-texte-doux"}`}>
          {etat.texte}
        </p>
      )}
    </div>
  );
}
