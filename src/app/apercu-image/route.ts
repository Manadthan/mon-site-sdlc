import { NextResponse, type NextRequest } from "next/server";
import { telechargerImage } from "@/lib/images/download";
import { versVignette } from "@/lib/images/thumbnail";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Relais d'une image de l'aperçu (US-03, issue #49) : notre serveur la télécharge, avec la protection SSRF
 * (DESIGN.md §6, images seulement, 10 Mo), et la renvoie en vignette WebP. Rien n'est enregistré (ADR-03).
 * Réservé à l'utilisateur connecté (vérifié ici en plus de src/proxy.ts) : ce n'est pas un relais ouvert.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  try {
    const image = await telechargerImage(request.nextUrl.searchParams.get("url") ?? "");
    // Toujours ré-encodée par sharp : on ne renvoie jamais le fichier d'origine tel quel.
    const vignette = await versVignette(image);
    return new NextResponse(new Uint8Array(vignette), {
      headers: {
        "content-type": "image/webp",
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    // Adresse refusée, site injoignable, pas une image : l'aperçu affiche une vignette neutre.
    return new NextResponse(null, { status: 404 });
  }
}
