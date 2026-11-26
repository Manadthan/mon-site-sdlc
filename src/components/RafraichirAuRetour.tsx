"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Rafraîchit l'accueil au retour depuis un site compagnon (bfcache Safari iOS via `pageshow`,
 * ou retour sur l'onglet / PWA via `visibilitychange`) afin que les compteurs des collections
 * liées se mettent à jour sans rechargement manuel.
 */
export function RafraichirAuRetour() {
  const router = useRouter();

  useEffect(() => {
    const surPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) router.refresh();
    };
    const surVisibilite = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("pageshow", surPageShow);
    document.addEventListener("visibilitychange", surVisibilite);
    return () => {
      window.removeEventListener("pageshow", surPageShow);
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, [router]);

  return null;
}
