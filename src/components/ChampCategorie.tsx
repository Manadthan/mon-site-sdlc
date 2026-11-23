import { useId } from "react";
import { CATEGORIE_MAX, categoriesUtilisees } from "@/lib/collections/categorie";

type Props = {
  /** Champ contrôlé (création) ou valeur initiale (panneau « Nom et catégorie »). */
  valeur?: string;
  onChange?: (valeur: string) => void;
  defaultValue?: string;
  /** Catégories déjà utilisées : proposées au-dessus du clavier (évite « Manga » et « Mangas »). */
  suggestions: (string | null)[];
  className: string;
};

// Champ « Catégorie » facultatif (US-19), à la création (US-03) et avec le nom en mode édition (US-12).
export function ChampCategorie({ valeur, onChange, defaultValue, suggestions, className }: Props) {
  const liste = useId();
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-texte-doux">
      <span>
        Catégorie <span className="font-normal">(facultatif)</span>
      </span>
      <input
        name="category"
        type="text"
        maxLength={CATEGORIE_MAX}
        autoComplete="off"
        list={liste}
        placeholder="Cartes, Mangas, DVD…"
        {...(onChange ? { value: valeur, onChange: (e) => onChange(e.currentTarget.value) } : { defaultValue })}
        className={className}
      />
      <datalist id={liste}>
        {categoriesUtilisees(suggestions).map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </label>
  );
}
