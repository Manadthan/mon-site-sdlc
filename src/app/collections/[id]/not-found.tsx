import Link from "next/link";

export default function CollectionIntrouvable() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-8 text-center">
      <h1 className="text-xl font-bold">Collection introuvable</h1>
      <p className="text-[15px] text-texte-doux">Elle a peut-être été supprimée.</p>
      <Link href="/" className="mt-2 font-semibold text-action">
        Retour à mes collections
      </Link>
    </main>
  );
}
