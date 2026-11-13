/** Avancement d'une collection : nombre d'items possédés sur le total (US-02, US-06). */
export type Progress = {
  owned: number;
  total: number;
  /** Pourcentage arrondi à l'entier, entre 0 et 100. */
  percent: number;
};

export function computeProgress(owned: number, total: number): Progress {
  if (!Number.isInteger(owned) || !Number.isInteger(total) || owned < 0 || total < 0 || owned > total) {
    throw new RangeError(`Avancement invalide : ${owned} / ${total}`);
  }
  const percent = total === 0 ? 0 : Math.round((owned / total) * 100);
  return { owned, total, percent };
}

/** Texte affiché sous une collection, ex. « 12 / 48 · 25 % » (espaces insécables, typographie française). */
export function formatProgress({ owned, total, percent }: Progress): string {
  return `${owned} / ${total} · ${percent} %`;
}
