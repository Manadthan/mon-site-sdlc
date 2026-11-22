import type { Metadata } from "next";

// US-17 : les pages partagées ne sont pas indexées par les moteurs de recherche,
// et le lien secret n'est pas transmis aux autres sites (images comprises).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PartageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
