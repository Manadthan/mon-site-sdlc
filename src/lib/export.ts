/** Version du format d'export : à augmenter si la structure de donnees.json change. */
export const VERSION_EXPORT = 1;

type CollectionLue = { id: string; name: string; source_url: string | null; created_at: string };
type ItemLu = {
  id: string;
  collection_id: string;
  title: string;
  position: number;
  owned: boolean;
  image_path: string | null;
  source_image: string | null;
  created_at: string;
};

export type ImageAExporter = { cheminZip: string; cheminStockage: string };

export type Export = {
  donnees: {
    format: "suivi-collections";
    version: number;
    exporte_le: string;
    collections: {
      nom: string;
      page_source: string | null;
      creee_le: string;
      items: { intitule: string; possede: boolean; image: string | null; image_source: string | null; ajoute_le: string }[];
    }[];
  };
  images: ImageAExporter[];
};

/**
 * Sauvegarde de toutes les données (SPEC.md §4, « Sauvegarde ») : un fichier JSON lisible + les images.
 * Les collections et items sont dans leur ordre d'affichage ; chaque image est rangée dans
 * images/<collection>/<item>.webp et le JSON y renvoie.
 */
export function construireExport(collections: CollectionLue[], items: ItemLu[], maintenant: Date): Export {
  const parCollection = new Map<string, ItemLu[]>();
  for (const item of items) parCollection.set(item.collection_id, [...(parCollection.get(item.collection_id) ?? []), item]);

  const images: ImageAExporter[] = [];
  const triees = [...collections].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return {
    donnees: {
      format: "suivi-collections",
      version: VERSION_EXPORT,
      exporte_le: maintenant.toISOString(),
      collections: triees.map((collection) => ({
        nom: collection.name,
        page_source: collection.source_url,
        creee_le: collection.created_at,
        items: (parCollection.get(collection.id) ?? [])
          .sort((a, b) => a.position - b.position)
          .map((item) => {
            let image: string | null = null;
            if (item.image_path) {
              image = `images/${collection.id}/${item.id}.webp`;
              images.push({ cheminZip: image, cheminStockage: item.image_path });
            }
            return {
              intitule: item.title,
              possede: item.owned,
              image,
              image_source: item.source_image,
              ajoute_le: item.created_at,
            };
          }),
      })),
    },
    images,
  };
}

/** Nom du fichier téléchargé : suivi-collections-2026-11-15.zip */
export function nomFichierExport(maintenant: Date): string {
  return `suivi-collections-${maintenant.toISOString().slice(0, 10)}.zip`;
}
