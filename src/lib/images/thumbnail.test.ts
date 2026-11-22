import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { versVignette, rognerVignette, LARGEUR_VIGNETTE } = await import("@/lib/images/thumbnail");

/** Objet rouge de 100 × 200 au milieu d'un fond uni (bords « cuits » dans l'image, issue #79). */
const avecBords = async (fond: string | { r: number; g: number; b: number; alpha: number }, format: "jpeg" | "png" | "webp") => {
  const objet = await sharp({ create: { width: 100, height: 200, channels: 3, background: "#c0392b" } }).png().toBuffer();
  return sharp({ create: { width: 600, height: 600, channels: 4, background: fond } })
    .composite([{ input: objet, left: 250, top: 200 }])
    .toFormat(format)
    .toBuffer();
};

const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 29, g: 78, b: 216 } } }).jpeg().toBuffer();

describe("versVignette", () => {
  it("réduit une grande photo à 400 px de large, en WebP, proportions conservées", async () => {
    const sortie = await sharp(await versVignette(await image(1200, 900))).metadata();
    expect(sortie.format).toBe("webp");
    expect(sortie.width).toBe(LARGEUR_VIGNETTE);
    expect(sortie.height).toBe(300);
  });

  it("n'agrandit pas une petite image", async () => {
    const sortie = await sharp(await versVignette(await image(200, 100))).metadata();
    expect(sortie.width).toBe(200);
  });

  it("refuse ce qui n'est pas une image", async () => {
    await expect(versVignette(Buffer.from("pas une image"))).rejects.toThrow();
  });

  it("retire les bords blancs, malgré les défauts de la compression JPEG", async () => {
    const sortie = await sharp(await versVignette(await avecBords("#ffffff", "jpeg"))).metadata();
    expect(sortie.width).toBeLessThanOrEqual(104);
    expect(sortie.height).toBeLessThanOrEqual(204);
    expect(sortie.width).toBeGreaterThanOrEqual(100);
  });

  it("retire les bords transparents", async () => {
    const sortie = await sharp(await versVignette(await avecBords({ r: 0, g: 0, b: 0, alpha: 0 }, "png"))).metadata();
    expect([sortie.width, sortie.height]).toEqual([100, 200]);
  });

  it("garde une image unie entière", async () => {
    const sortie = await sharp(await versVignette(await image(300, 200))).metadata();
    expect([sortie.width, sortie.height]).toEqual([300, 200]);
  });
});

describe("rognerVignette", () => {
  it("rogne une ancienne vignette qui a des bords vides", async () => {
    const sortie = await rognerVignette(await avecBords("#ffffff", "webp"));
    const { width, height, format } = await sharp(sortie!).metadata();
    expect(format).toBe("webp");
    expect(width).toBeLessThanOrEqual(104);
    expect(height).toBeLessThanOrEqual(204);
  });

  it("renvoie null quand il n'y a rien à rogner", async () => {
    expect(await rognerVignette(await sharp(await image(400, 300)).webp().toBuffer())).toBeNull();
  });
});
