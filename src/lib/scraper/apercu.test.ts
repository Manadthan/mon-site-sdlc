import { describe, expect, it } from "vitest";
import { sourcesApercu } from "@/lib/scraper/apercu";

describe("sourcesApercu", () => {
  it("image en HTTP : par notre serveur directement (contenu mixte refusé par Safari)", () => {
    expect(sourcesApercu("http://www.dbzcollection.fr/img/carte 1.jpg")).toEqual([
      "/apercu-image?url=http%3A%2F%2Fwww.dbzcollection.fr%2Fimg%2Fcarte%201.jpg",
    ]);
  });

  it("image en HTTPS : le site source d'abord, notre serveur ensuite", () => {
    expect(sourcesApercu("https://www.kanzenshuu.com/guides/01.png?v=2&x=1")).toEqual([
      "https://www.kanzenshuu.com/guides/01.png?v=2&x=1",
      "/apercu-image?url=https%3A%2F%2Fwww.kanzenshuu.com%2Fguides%2F01.png%3Fv%3D2%26x%3D1",
    ]);
  });
});
