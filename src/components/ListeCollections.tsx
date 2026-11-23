import { CollectionCard } from "@/components/CollectionCard";
import type { CollectionCard as Carte } from "@/lib/collections/cards";
import { grouperParCategorie } from "@/lib/collections/categorie";

type Props = {
  /** Cartes déjà triées (US-05) : l'ordre est gardé dans chaque section. */
  cartes: Carte[];
  label: string;
  /** Liste partagée (US-17) : début des liens (/partage/{jeton}), sans corbeille. */
  lienPartage?: string;
};

// Liste des collections de l'accueil et de la liste partagée, regroupée par catégorie (US-19).
// Sans aucune catégorie : une simple liste, sans titre de section (comme avant).
export function ListeCollections({ cartes, label, lienPartage }: Props) {
  const sections = grouperParCategorie(cartes);
  const liste = (contenu: Carte[], aria: string) => (
    <ul className="flex flex-col gap-2.5" aria-label={aria}>
      {contenu.map((carte) =>
        lienPartage ? (
          <CollectionCard key={carte.id} carte={carte} lien={`${lienPartage}/${carte.id}`} lectureSeule />
        ) : (
          <CollectionCard key={carte.id} carte={carte} />
        ),
      )}
    </ul>
  );

  if (sections.length === 1 && sections[0]!.titre === null) {
    return <div className="px-4 pt-2">{liste(sections[0]!.cartes, label)}</div>;
  }
  return (
    <div className="flex flex-col gap-5 px-4 pt-2">
      {sections.map(({ titre, cartes: contenu }) => {
        const nom = titre ?? "Sans catégorie";
        return (
          <section key={nom} aria-label={nom} className="flex flex-col gap-2">
            <h2 className="px-1 text-[13px] font-semibold tracking-wide text-texte-doux uppercase">
              {nom} <span className="font-normal">· {contenu.length}</span>
            </h2>
            {liste(contenu, nom)}
          </section>
        );
      })}
    </div>
  );
}
