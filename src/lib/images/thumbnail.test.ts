import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { versVignette, LARGEUR_VIGNETTE } = await import("@/lib/images/thumbnail");

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
});
