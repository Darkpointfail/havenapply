"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { csrfHeaders } from "@/lib/family/client-api";
import { isFacilityRole } from "@/lib/auth-store";

/**
 * Free, self-serve entry point for a residence that has never used
 * HavenApply: a family sent them a dossier, they follow this link, and
 * either sign in or create an account to instantly become that site's
 * admin — no sales call, no manual setup on our side. See
 * identity-store.ts::consumeSiteClaim for the guard that makes this safe
 * (a site with existing staff can never be re-claimed).
 */
export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { user, ready, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"create" | "signin">("create");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  async function finishClaim() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/community/claim", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...(await csrfHeaders()) },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || json.error) {
        setError(json.error || "Ce lien n'est plus valide.");
        setSubmitting(false);
        return;
      }
      setClaimed(true);
      router.push("/community/dashboard");
    } catch {
      setError("Une erreur réseau est survenue. Réessaie.");
      setSubmitting(false);
    }
  }

  // Already signed in as staff: claim immediately, no form needed.
  useEffect(() => {
    if (ready && user && isFacilityRole(user.role) && !submitting && !claimed) {
      void finishClaim();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    if (mode === "signin") {
      const result = await signIn({ email, password });
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
    } else {
      const result = await signUp({
        role: "facility",
        firstName,
        lastName,
        email,
        password,
        acceptedTerms: true,
      });
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
    }
    await finishClaim();
  };

  if (!ready) return null;

  if (user && !isFacilityRole(user.role)) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 20px", fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: 22 }}>Ce lien est réservé aux résidences</h1>
        <p>
          Tu es connecté avec un compte famille ou professionnel. Déconnecte-toi puis
          réessaie ce lien pour créer ou rejoindre l&apos;accès de ta résidence.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: "60px auto", padding: "0 20px", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Accéder à votre dossier HavenApply</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Une famille vous a transmis une demande d&apos;admission. Créez votre accès gratuit
        pour la consulter et y répondre — sans engagement.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setMode("create")}
          style={{ fontWeight: mode === "create" ? 700 : 400 }}
        >
          Créer mon accès
        </button>
        <button
          type="button"
          onClick={() => setMode("signin")}
          style={{ fontWeight: mode === "signin" ? 700 : 400 }}
        >
          J&apos;ai déjà un compte
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {mode === "create" && (
          <>
            <input
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </>
        )}
        <input
          type="email"
          placeholder="Courriel professionnel"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: "#b42318" }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting
            ? "..."
            : mode === "create"
              ? "Créer mon accès gratuit"
              : "Me connecter et accéder au dossier"}
        </button>
      </form>
    </main>
  );
}
