// Lien de partage inconnu ou arrêté (US-17).
export function LienInvalide() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-8 text-center">
      <h1 className="text-xl font-bold">Ce lien de partage n’est plus valide</h1>
      <p className="text-[15px] text-texte-doux">Demandez un nouveau lien à la personne qui vous l’a envoyé.</p>
    </main>
  );
}
