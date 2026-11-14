import type { RaisonEchec } from "@/lib/scraper/ssrf";

export type MessageEchec = { titre: string; texte: string };

const INACCESSIBLE = "Page inaccessible";

/** Message affiché quand l'analyse d'une page échoue (US-03, maquette n° 11). */
export function messageEchecPage(raison: RaisonEchec | undefined): MessageEchec {
  switch (raison) {
    case "url-invalide":
      return { titre: "Adresse invalide", texte: "L’adresse doit commencer par http:// ou https://." };
    case "adresse-interdite":
      return { titre: INACCESSIBLE, texte: "Cette adresse n’est pas autorisée." };
    case "delai":
      return {
        titre: INACCESSIBLE,
        texte: "Le site n’a pas répondu dans les 10 secondes. Vérifiez l’adresse ou réessayez plus tard.",
      };
    case "trop-gros":
      return { titre: INACCESSIBLE, texte: "La page est trop lourde (5 Mo au plus)." };
    case "type":
      return { titre: INACCESSIBLE, texte: "Cette adresse ne mène pas à une page web." };
    case "aucun-element":
      return {
        titre: "Aucun élément trouvé sur cette page",
        texte: "La page ne contient aucune image exploitable.",
      };
    default:
      return { titre: INACCESSIBLE, texte: "Le site n’a pas pu être lu. Vérifiez l’adresse ou réessayez plus tard." };
  }
}
