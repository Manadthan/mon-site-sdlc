"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const champ =
  "h-12 rounded-[10px] border border-[#d3d6dc] bg-white px-3 text-base text-texte outline-none focus:border-action focus:ring-2 focus:ring-action/20";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-3.5" noValidate>
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-[10px] border border-[#f1c4c4] bg-[#fff5f5] px-3 py-2.5 text-sm leading-snug text-danger"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="mt-px shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          {state.error}
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-texte-doux">
        E-mail
        <input name="email" type="email" autoComplete="username" inputMode="email" required defaultValue={state.email} className={champ} />
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-texte-doux">
        Mot de passe
        <input name="password" type="password" autoComplete="current-password" required className={champ} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-1.5 h-[50px] rounded-xl bg-action text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
