import { describe, expect, it } from "vitest";
import { authRedirect } from "@/lib/auth/routes";

describe("authRedirect", () => {
  it("envoie un visiteur non connecté vers /login, quelle que soit la page", () => {
    expect(authRedirect("/", false)).toBe("/login");
    expect(authRedirect("/collections/123", false)).toBe("/login");
    expect(authRedirect("/collections/new", false)).toBe("/login");
  });

  it("laisse un visiteur non connecté sur /login", () => {
    expect(authRedirect("/login", false)).toBeNull();
  });

  it("ne confond pas /login avec une page qui commence pareil", () => {
    expect(authRedirect("/login-admin", false)).toBe("/login");
  });

  it("laisse passer un utilisateur connecté", () => {
    expect(authRedirect("/", true)).toBeNull();
    expect(authRedirect("/collections/123", true)).toBeNull();
  });

  it("renvoie vers l'accueil un utilisateur déjà connecté qui ouvre /login", () => {
    expect(authRedirect("/login", true)).toBe("/");
  });

  it("laisse ouvrir une collection partagée, connecté ou non (US-17)", () => {
    expect(authRedirect("/partage/abc", false)).toBeNull();
    expect(authRedirect("/partage/abc", true)).toBeNull();
    expect(authRedirect("/partages", false)).toBe("/login");
  });
});
