"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth";
import { useCommunityPortal } from "@/lib/community-portal-store";
import {
  communityAppToDemande,
  communityAppsToWaitlist,
} from "@/lib/fr-portal-dynamic";
import {
  DASHBOARD_FUNNEL,
  DEMANDES,
  docsForDemande,
  INITIAL_WAITLIST,
  PROGRESS_STEPS,
  progressIndexForStatus,
  REQUIRED_DOCS,
  RESIDENCE,
  SERVICES_INCLUS,
  sortWaitlist,
  STATUS_STYLES,
  UNIT_AVAILABILITY,
  UNIT_PRICING,
  VISITS,
  WEEKLY_DEMANDES,
  type Demande,
  type DemandeStatus,
  type UrgenceLevel,
  type WaitlistEntry,
} from "@/data/residence-console";
import "./residence-console.css";

export type ConsoleView =
  | "demandes"
  | "documents"
  | "visites"
  | "attente"
  | "tableau"
  | "etablissement"
  | "dossier";

type FilterId = "Toutes" | "Nouvelles" | "Documents manquants" | "Visite planifiée";

const NAV: { id: ConsoleView; label: string; badge?: boolean }[] = [
  { id: "demandes", label: "Demandes", badge: true },
  { id: "documents", label: "Documents et relances" },
  { id: "visites", label: "Visites" },
  { id: "attente", label: "Liste d'attente" },
  { id: "tableau", label: "Tableau de bord" },
  { id: "etablissement", label: "Page de l'établissement" },
];

function todayLabel() {
  const raw = new Date().toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function StatusPill({ status }: { status: DemandeStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className="rc-pill" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  context,
  alert,
}: {
  label: string;
  value: string | number;
  context: string;
  alert?: boolean;
}) {
  return (
    <div className="rc-card p-5">
      <p className="rc-label">{label}</p>
      <p
        className="rc-serif mt-3"
        style={{
          fontSize: 38,
          lineHeight: 1,
          color: alert ? "var(--rc-terra)" : "var(--rc-ink)",
        }}
      >
        {value}
      </p>
      <p className="mt-2.5 text-[13.5px] text-[var(--rc-ink-muted)]">{context}</p>
    </div>
  );
}

function ViewHeader({
  title,
  subtitle,
  search,
  onSearch,
}: {
  title: string;
  subtitle: string;
  search?: string;
  onSearch?: (v: string) => void;
}) {
  return (
    <header className="flex h-[82px] shrink-0 items-center justify-between gap-6 border-b border-[var(--rc-border)] bg-[var(--rc-surface)] px-[34px]">
      <div className="min-w-0">
        <h1 className="rc-serif text-[22px] leading-tight text-[var(--rc-ink)]">{title}</h1>
        <p className="mt-1 text-[13px] text-[var(--rc-ink-muted)]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-5">
        {onSearch ? (
          <input
            className="rc-input w-[330px]"
            placeholder="Rechercher un dossier ou un demandeur"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        ) : null}
        <span className="h-8 w-px bg-[var(--rc-border)]" aria-hidden />
        <p className="whitespace-nowrap text-[13.5px] font-medium text-[var(--rc-ink)]">
          {todayLabel()}
        </p>
      </div>
    </header>
  );
}

function AccountMenu() {
  const { user, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const displayName =
    user?.name?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    RESIDENCE.staff.name;
  const displayRole = user?.jobTitle?.trim() || RESIDENCE.staff.role;
  const initials = initialsFrom(displayName);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setEditing(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const startEdit = () => {
    setFirstName(user?.firstName || displayName.split(/\s+/)[0] || "");
    setLastName(
      user?.lastName ||
        displayName.split(/\s+/).slice(1).join(" ") ||
        "",
    );
    setJobTitle(displayRole);
    setEditing(true);
  };

  const saveEdit = () => {
    updateProfile({
      firstName: firstName.trim() || displayName,
      lastName: lastName.trim(),
      jobTitle: jobTitle.trim() || displayRole,
    });
    setEditing(false);
    setOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    router.push("/community/sign-in?signedOut=1");
  };

  return (
    <div ref={rootRef} className="relative mt-4">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-[7px] text-left transition-colors hover:bg-white/5"
        style={{ padding: "8px 6px" }}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setOpen((v) => !v);
          setEditing(false);
        }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
          style={{ background: "var(--rc-black-soft)", color: "#E2F3EF" }}
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1 text-[13px] leading-snug text-[#C5D2CD]">
          <span className="block truncate font-medium text-white">{displayName}</span>
          <span className="block truncate text-[12px] text-[#8E9B96]">{displayRole}</span>
        </span>
        <span className="text-[11px] text-[#8E9B96]" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-50 overflow-hidden rounded-[10px] border border-white/10 bg-[var(--rc-black-soft)] shadow-lg"
        >
          {editing ? (
            <div className="space-y-3 p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8E9B96]">
                Modifier le compte
              </p>
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#8E9B96]">Prénom</span>
                <input
                  className="rc-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#8E9B96]">Nom</span>
                <input
                  className="rc-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#8E9B96]">Poste</span>
                <input
                  className="rc-input"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  className="rc-btn rc-btn-outline flex-1 border-white/15 text-white hover:bg-white/5"
                  onClick={() => setEditing(false)}
                >
                  Annuler
                </button>
                <button type="button" className="rc-btn rc-btn-primary flex-1" onClick={saveEdit}>
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <div className="p-1.5">
              <div className="border-b border-white/10 px-3 py-2.5">
                <p className="truncate text-[13.5px] font-semibold text-white">{displayName}</p>
                <p className="truncate text-[12px] text-[#8E9B96]">{displayRole}</p>
                {user?.email ? (
                  <p className="mt-1 truncate text-[12px] text-[#8E9B96]">{user.email}</p>
                ) : null}
              </div>
              <button
                type="button"
                role="menuitem"
                className="mt-1 flex w-full rounded-[7px] px-3 py-2.5 text-left text-[13.5px] text-[#C5D2CD] hover:bg-white/5 hover:text-white"
                onClick={startEdit}
              >
                Corriger prénom ou poste
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full rounded-[7px] px-3 py-2.5 text-left text-[13.5px] text-[#E8B4A0] hover:bg-white/5"
                onClick={handleSignOut}
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ResidenceConsole() {
  const { user } = useAuth();
  const portal = useCommunityPortal();
  const [view, setView] = useState<ConsoleView>("demandes");
  const [filter, setFilter] = useState<FilterId>("Toutes");
  const [selId, setSelId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [placed, setPlaced] = useState<Record<string, UrgenceLevel>>({});
  // Local overlay for optimistic edits when portal apps empty (seed fallback)
  const [localDemandes, setLocalDemandes] = useState<Demande[]>(DEMANDES);
  const [localWaitlist, setLocalWaitlist] = useState<WaitlistEntry[]>(() =>
    sortWaitlist(INITIAL_WAITLIST),
  );
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { id: string; from: "family" | "residence"; author: string; body: string }[]
  >([
    {
      id: "m1",
      from: "family",
      author: "Sophie Lévesque",
      body: "Bonjour, nous avons envoyé le bilan médical ce matin. La preuve de revenus suivra d'ici demain.",
    },
    {
      id: "m2",
      from: "residence",
      author: "Claudine Mercier",
      body: "Merci Sophie. Dès réception des deux pièces, nous pourrons planifier la visite.",
    },
  ]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const portalApps = portal.workspace?.applications ?? [];
  const demandes = useMemo(() => {
    if (!portalApps.length) return localDemandes;
    return portalApps
      .filter((a) => a.status !== "withdrawn" && a.status !== "closed" && a.status !== "declined")
      .map(communityAppToDemande);
  }, [portalApps, localDemandes]);

  useEffect(() => {
    const fromPortal = communityAppsToWaitlist(portalApps);
    if (fromPortal.length) setLocalWaitlist(sortWaitlist(fromPortal));
  }, [portalApps]);

  const waitlist = localWaitlist;

  const activeCount = demandes.filter((d) =>
    ["Nouvelle", "En évaluation", "Documents manquants", "Visite planifiée"].includes(d.statut),
  ).length;

  const selected = demandes.find((d) => d.id === selId) ?? null;

  const filtered = useMemo(() => {
    let list = demandes;
    if (filter === "Nouvelles") list = list.filter((d) => d.statut === "Nouvelle");
    if (filter === "Documents manquants")
      list = list.filter((d) => d.statut === "Documents manquants");
    if (filter === "Visite planifiée") list = list.filter((d) => d.statut === "Visite planifiée");
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.nom.toLowerCase().includes(q) ||
          d.contact.toLowerCase().includes(q) ||
          d.unite.toLowerCase().includes(q) ||
          (d.publicRef || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [demandes, filter, search]);

  const openDossier = (id: string) => {
    setSelId(id);
    setAccepting(false);
    setView("dossier");
  };

  const acceptWithUrgence = (demandeId: string, urgence: UrgenceLevel) => {
    setPlaced((p) => ({ ...p, [demandeId]: urgence }));
    const priority = urgence === "Urgente" ? "high" : urgence === "Élevée" ? "medium" : "low";
    // Prefer waitlist placement for capacity management; accept when urgent+complete
    const result = portal.changeStatus(demandeId, "waitlisted");
    if (!result.ok) {
      // Fallback local mock mutation
      setLocalDemandes((prev) =>
        prev.map((d) =>
          d.id === demandeId ? { ...d, statut: "Liste d'attente" as DemandeStatus } : d,
        ),
      );
      const d = (portalApps.length ? demandes : localDemandes).find((x) => x.id === demandeId);
      if (d) {
        setLocalWaitlist((prev) =>
          sortWaitlist([
            {
              id: d.id,
              nom: d.nom,
              age: d.age,
              unite: d.unite,
              joursAttente: 1,
              urgence,
              dossierComplet: d.piecesManquantes === 0,
            },
            ...prev.filter((w) => w.id !== d.id),
          ]),
        );
      }
    } else {
      void priority;
    }
    setAccepting(false);
    setView("attente");
  };

  const titles: Record<ConsoleView, { title: string; subtitle: string }> = {
    demandes: {
      title: "Demandes",
      subtitle: "File d'admission · dossiers transmis par les familles",
    },
    documents: {
      title: "Documents et relances",
      subtitle: "Suivi des pièces manquantes et cadence de rappels",
    },
    visites: {
      title: "Visites",
      subtitle: "Agenda des visites et suivis téléphoniques",
    },
    attente: {
      title: "Liste d'attente",
      subtitle: "Classement par urgence puis par ancienneté",
    },
    tableau: {
      title: "Tableau de bord",
      subtitle: "Indicateurs d'admission sur 90 jours",
    },
    etablissement: {
      title: "Page de l'établissement",
      subtitle: "Aperçu de la fiche publique vue par les familles",
    },
    dossier: {
      title: selected?.nom ?? "Dossier",
      subtitle: "Dossier du futur résident",
    },
  };

  const meta = titles[view];

  return (
    <div className="rc-console flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-[262px] shrink-0 flex-col bg-[var(--rc-black)] text-white">
        <div className="flex items-center gap-3 px-5 pb-6 pt-7">
          <div>
            <Logo
              href="/community/dashboard"
              size="nav"
              light
              className="!ml-0 !translate-y-0"
            />
            <p
              className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "#8E9B96" }}
            >
              Console résidence
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active =
              view === item.id || (item.id === "demandes" && view === "dossier");
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setView(item.id);
                  setAccepting(false);
                  if (item.id !== "dossier") setSelId(null);
                }}
                className="flex items-center gap-3 rounded-[7px] text-left text-[14.5px] transition-colors"
                style={{
                  padding: "11px 14px",
                  background: active ? "var(--rc-black-soft)" : "transparent",
                  color: active ? "#fff" : "#C5D2CD",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--rc-black-soft)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "currentColor" }}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white"
                    style={{ background: "var(--rc-terra)" }}
                  >
                    {activeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 px-5 py-5">
          <p className="rc-label" style={{ color: "#8E9B96" }}>
            Établissement
          </p>
          <p className="mt-1.5 text-[14px] font-medium leading-snug text-white">
            {user?.organization?.trim() || RESIDENCE.name}
          </p>
          <AccountMenu />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ViewHeader
          title={meta.title}
          subtitle={meta.subtitle}
          search={view === "demandes" || view === "dossier" ? search : undefined}
          onSearch={
            view === "demandes" || view === "dossier" ? setSearch : undefined
          }
        />

        <div className="flex-1 overflow-auto px-[34px] pb-[46px] pt-[30px]">
          {view === "demandes" && (
            <DemandesView
              filtered={filtered}
              filter={filter}
              setFilter={setFilter}
              onOpen={openDossier}
            />
          )}
          {view === "dossier" && selected && (
            <DossierView
              demande={selected}
              placed={placed[selected.id]}
              accepting={accepting}
              setAccepting={setAccepting}
              onBack={() => {
                setView("demandes");
                setAccepting(false);
              }}
              onAccept={(u) => acceptWithUrgence(selected.id, u)}
              messages={messages}
              message={message}
              setMessage={setMessage}
              onSend={() => {
                if (!message.trim()) return;
                setMessages((m) => [
                  ...m,
                  {
                    id: `m${m.length + 1}`,
                    from: "residence",
                    author: "Claudine Mercier",
                    body: message.trim(),
                  },
                ]);
                setMessage("");
              }}
              photoUrl={photoUrl}
              onPhoto={(file) => {
                if (!file) return;
                const url = URL.createObjectURL(file);
                setPhotoUrl(url);
              }}
            />
          )}
          {view === "documents" && <DocumentsView demandes={demandes} />}
          {view === "visites" && <VisitesView />}
          {view === "attente" && (
            <AttenteView
              waitlist={waitlist}
              setWaitlist={setLocalWaitlist}
              onRemove={(id) => {
                const r = portal.changeStatus(id, "under_review");
                if (!r.ok) {
                  setLocalWaitlist((prev) => prev.filter((w) => w.id !== id));
                }
              }}
            />
          )}
          {view === "tableau" && <TableauView />}
          {view === "etablissement" && <EtablissementView />}
        </div>
      </div>
    </div>
  );
}

function DemandesView({
  filtered,
  filter,
  setFilter,
  onOpen,
}: {
  filtered: Demande[];
  filter: FilterId;
  setFilter: (f: FilterId) => void;
  onOpen: (id: string) => void;
}) {
  const filters: FilterId[] = ["Toutes", "Nouvelles", "Documents manquants", "Visite planifiée"];
  return (
    <div className="flex flex-col gap-[22px]">
      <div className="grid grid-cols-4 gap-5">
        <StatCard label="Demandes actives" value={18} context="En cours de traitement" />
        <StatCard label="Dossiers complets" value={11} context="Prêts pour décision" />
        <StatCard
          label="Documents manquants"
          value={12}
          context="Pièces en attente"
          alert
        />
        <StatCard label="Délai moyen de traitement" value="9 j" context="Sur 90 jours" />
      </div>

      <div className="rc-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--rc-border)] px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className="rc-pill"
                  style={{
                    background: active ? "var(--rc-black)" : "var(--rc-subtle)",
                    color: active ? "#fff" : "var(--rc-ink-muted)",
                    borderColor: active ? "var(--rc-black)" : "var(--rc-border)",
                    cursor: "pointer",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
          <p className="text-[13.5px] text-[var(--rc-ink-muted)]">
            {filtered.length} demande{filtered.length > 1 ? "s" : ""}
          </p>
        </div>

        <div
          className="rc-table-head rc-label"
          style={{ gridTemplateColumns: "2.1fr 1.3fr 1.2fr 1fr 1.1fr 0.7fr" }}
        >
          <span>Futur résident</span>
          <span>Unité souhaitée</span>
          <span>Statut</span>
          <span>Dossier</span>
          <span>Reçue le</span>
          <span />
        </div>

        {filtered.map((d) => (
          <div
            key={d.id}
            role="button"
            tabIndex={0}
            className="rc-table-row"
            style={{ gridTemplateColumns: "2.1fr 1.3fr 1.2fr 1fr 1.1fr 0.7fr" }}
            onClick={() => onOpen(d.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onOpen(d.id);
            }}
          >
            <div>
              <p className="text-[15.5px] font-semibold text-[var(--rc-ink)]">{d.nom}</p>
              <p className="mt-0.5 text-[13px] text-[var(--rc-ink-muted)]">
                {d.age} ans · {d.contact}, {d.contactLien}
              </p>
              {d.publicRef ? (
                <p className="mt-1 font-mono text-[12px] tracking-wide text-[var(--rc-ink-faint)]">
                  {d.publicRef}
                </p>
              ) : null}
            </div>
            <p className="text-[14.5px]">{d.unite}</p>
            <div>
              <StatusPill status={d.statut} />
            </div>
            <p
              className="text-[14px] font-medium"
              style={{
                color:
                  d.piecesManquantes > 0 ? "var(--rc-terra)" : "var(--rc-green)",
              }}
            >
              {d.piecesManquantes > 0
                ? `${d.piecesManquantes} pièce${d.piecesManquantes > 1 ? "s" : ""} manquante${d.piecesManquantes > 1 ? "s" : ""}`
                : "Complet"}
            </p>
            <p className="text-[14px] text-[var(--rc-ink-muted)]">{d.recueLe}</p>
            <p className="text-right text-[14px] font-semibold text-[var(--rc-green)]">
              Ouvrir
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DossierView({
  demande,
  placed,
  accepting,
  setAccepting,
  onBack,
  onAccept,
  messages,
  message,
  setMessage,
  onSend,
  photoUrl,
  onPhoto,
}: {
  demande: Demande;
  placed?: UrgenceLevel;
  accepting: boolean;
  setAccepting: (v: boolean) => void;
  onBack: () => void;
  onAccept: (u: UrgenceLevel) => void;
  messages: { id: string; from: "family" | "residence"; author: string; body: string }[];
  message: string;
  setMessage: (v: string) => void;
  onSend: () => void;
  photoUrl: string | null;
  onPhoto: (f: File | null) => void;
}) {
  const docs = docsForDemande(demande.piecesManquantes);
  const received = docs.filter((d) => d.received).length;
  const step = progressIndexForStatus(demande.statut);

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="w-fit text-[14px] font-semibold text-[var(--rc-green)] hover:text-[var(--rc-green-deep)]"
      >
        ← Retour aux demandes
      </button>

      {placed ? (
        <div
          className="rounded-[10px] border px-4 py-3 text-[14.5px] font-medium"
          style={{
            background: "var(--rc-green-bg)",
            borderColor: "#C2DBD4",
            color: "var(--rc-green-deep)",
          }}
        >
          Placé en liste d&apos;attente · urgence {placed.toLowerCase()}
        </div>
      ) : null}

      <div className="rc-card grid gap-0 lg:grid-cols-[auto_1fr_262px]">
        <div className="border-b border-[var(--rc-border)] p-5 lg:border-b-0 lg:border-r">
          <label className="block cursor-pointer">
            <div
              className="relative overflow-hidden rounded-lg bg-[var(--rc-subtle)]"
              style={{ width: 132, height: 158 }}
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
                  <span className="text-[12px] text-[var(--rc-ink-faint)]">
                    Déposer une photo
                  </span>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-2 max-w-[132px] text-[12px] text-[var(--rc-ink-faint)]">
            Photo transmise par la famille
          </p>
        </div>

        <div className="border-b border-[var(--rc-border)] p-6 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="rc-serif text-[30px] leading-tight">{demande.nom}</h2>
            <StatusPill status={demande.statut} />
          </div>
          <p className="mt-2 text-[14.5px] text-[var(--rc-ink-muted)]">
            {demande.age} ans · demande transmise par {demande.contact}, {demande.contactLien}
          </p>
          {demande.publicRef ? (
            <p className="mt-2 font-mono text-[13.5px] tracking-wide text-[var(--rc-ink-muted)]">
              Réf. {demande.publicRef}
            </p>
          ) : null}
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4">
            {[
              ["Unité souhaitée", demande.unite],
              ["Emménagement souhaité", demande.emmenagement],
              ["Personne-ressource", `${demande.contact} (${demande.contactLien})`],
              ["Reçue le", demande.recueLe],
              ...(demande.publicRef
                ? ([["Référence Haven", demande.publicRef]] as [string, string][])
                : []),
            ].map(([label, value]) => (
              <div key={label}>
                <p className="rc-label">{label}</p>
                <p className="mt-1 text-[15px] font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 p-5">
          {!accepting ? (
            <>
              <button
                type="button"
                className="rc-btn rc-btn-primary w-full"
                onClick={() => setAccepting(true)}
                disabled={!!placed || demande.statut === "Liste d'attente"}
              >
                Accepter la demande
              </button>
              <button type="button" className="rc-btn rc-btn-outline w-full">
                Planifier une visite
              </button>
              <button type="button" className="rc-btn rc-btn-outline w-full">
                Exporter le dossier
              </button>
            </>
          ) : (
            <div className="rounded-[10px] border border-[var(--rc-border)] bg-[var(--rc-subtle)] p-4">
              <p className="rc-serif text-[19px]">Niveau d&apos;urgence</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--rc-ink-muted)]">
                Le dossier accepté est classé automatiquement dans la liste d&apos;attente selon
                ce niveau.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  className="rc-btn rc-btn-terra w-full"
                  onClick={() => onAccept("Urgente")}
                >
                  Urgente
                </button>
                <button
                  type="button"
                  className="rc-btn rc-btn-primary w-full"
                  onClick={() => onAccept("Élevée")}
                >
                  Élevée
                </button>
                <button
                  type="button"
                  className="rc-btn rc-btn-ghost w-full"
                  onClick={() => onAccept("Standard")}
                >
                  Standard
                </button>
                <button
                  type="button"
                  className="rc-btn rc-btn-outline w-full"
                  onClick={() => setAccepting(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-5">
          <div className="rc-card p-6">
            <h3 className="rc-serif text-[19px]">Renseignements du futur résident</h3>
            <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                ["Date de naissance", demande.dateNaissance],
                ["Adresse actuelle", demande.adresse],
                ["Niveau d'autonomie déclaré", demande.autonomie],
                ["Services requis", demande.services],
                ["Budget mensuel indiqué", demande.budget],
                ["Provenance de la demande", demande.provenance],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="rc-label">{label}</p>
                  <p className="mt-1 text-[15px] font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rc-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="rc-serif text-[19px]">Documents</h3>
                <p className="mt-1 text-[13.5px] text-[var(--rc-ink-muted)]">
                  {received} pièces reçues sur {REQUIRED_DOCS.length}
                </p>
              </div>
              <button type="button" className="rc-btn rc-btn-outline">
                Relancer la famille
              </button>
            </div>
            <ul className="mt-5 divide-y divide-[var(--rc-border-faint)]">
              {docs.map((doc) => (
                <li key={doc.name} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: doc.received ? "var(--rc-green)" : "var(--rc-terra)",
                      }}
                    />
                    <span className="text-[14.5px] font-medium">{doc.name}</span>
                  </div>
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color: doc.received ? "var(--rc-green)" : "var(--rc-terra)",
                    }}
                  >
                    {doc.received ? "Reçu" : "En attente"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rc-card p-6">
            <h3 className="rc-serif text-[19px]">Messages avec la famille</h3>
            <div className="mt-5 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.from === "residence" ? "items-end" : "items-start"}`}
                >
                  <p className="mb-1 text-[12.5px] font-medium text-[var(--rc-ink-muted)]">
                    {m.author}
                  </p>
                  <div
                    className="max-w-[85%] px-3.5 py-2.5 text-[14.5px] leading-relaxed"
                    style={
                      m.from === "residence"
                        ? {
                            background: "var(--rc-black)",
                            color: "#E8F0ED",
                            borderRadius: "10px 10px 3px 10px",
                          }
                        : {
                            background: "var(--rc-hover)",
                            border: "1px solid var(--rc-border)",
                            borderRadius: "10px 10px 10px 3px",
                          }
                    }
                  >
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <input
                className="rc-input flex-1"
                placeholder="Écrire un message sécurisé…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSend();
                }}
              />
              <button type="button" className="rc-btn rc-btn-primary" onClick={onSend}>
                Envoyer
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rc-card p-6">
            <h3 className="rc-serif text-[19px]">Avancement</h3>
            <ol className="relative mt-5 space-y-0">
              {PROGRESS_STEPS.map((label, i) => {
                const done = i <= step;
                return (
                  <li key={label} className="flex gap-3 pb-5 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          background: done ? "var(--rc-green)" : "var(--rc-border)",
                        }}
                      />
                      {i < PROGRESS_STEPS.length - 1 ? (
                        <span
                          className="mt-1 w-px flex-1"
                          style={{ background: "var(--rc-border-faint)", minHeight: 20 }}
                        />
                      ) : null}
                    </div>
                    <p
                      className="text-[14.5px] font-medium"
                      style={{ color: done ? "var(--rc-ink)" : "var(--rc-ink-faint)" }}
                    >
                      {label}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="rc-card bg-[var(--rc-subtle)] p-6">
            <h3 className="rc-serif text-[19px]">Assistance</h3>
            <p className="rc-label mt-4">Résumé du dossier</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--rc-ink-muted)]">
              {demande.resumeIa}
            </p>
            <button type="button" className="rc-btn rc-btn-outline mt-4 w-full bg-white">
              Vérifier la conformité du dossier
            </button>
          </div>

          <div className="rc-card p-6">
            <h3 className="rc-serif text-[19px]">Notes internes</h3>
            <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-[var(--rc-ink-muted)]">
              {demande.noteInterne ||
                "Aucune note interne pour le moment.\nAjoutée par C. Mercier · 25 août"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentsView({ demandes }: { demandes: Demande[] }) {
  const rows = demandes
    .filter((d) => d.piecesManquantes > 0)
    .flatMap((d) => {
      const docs = docsForDemande(d.piecesManquantes).filter((x) => !x.received);
      return docs.map((doc, i) => ({
        key: `${d.id}-${doc.name}`,
        dossier: d.nom,
        piece: doc.name,
        date: d.recueLe,
        relances: Math.min(4, d.piecesManquantes + i),
      }));
    });

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="rc-card overflow-hidden">
        <div className="border-b border-[var(--rc-border)] px-5 py-4">
          <h3 className="rc-serif text-[19px]">Pièces en attente</h3>
          <p className="mt-1 text-[13.5px] text-[var(--rc-ink-muted)]">
            12 pièces manquantes sur 9 dossiers actifs
          </p>
        </div>
        <div
          className="rc-table-head rc-label"
          style={{ gridTemplateColumns: "1.4fr 1.5fr 1fr 1fr" }}
        >
          <span>Dossier</span>
          <span>Pièce demandée</span>
          <span>Demandée le</span>
          <span>Relances</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.key}
            className="rc-table-row"
            style={{ gridTemplateColumns: "1.4fr 1.5fr 1fr 1fr", cursor: "default" }}
          >
            <p className="text-[14.5px] font-semibold">{r.dossier}</p>
            <p className="text-[14px]">{r.piece}</p>
            <p className="text-[14px] text-[var(--rc-ink-muted)]">{r.date}</p>
            <p
              className="text-[14px] font-semibold"
              style={{ color: r.relances >= 3 ? "var(--rc-terra)" : "var(--rc-ink)" }}
            >
              {r.relances}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        <div className="rc-card p-6">
          <h3 className="rc-serif text-[19px]">Relances automatisées</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--rc-ink-muted)]">
            Les familles reçoivent des rappels sécurisés selon la cadence définie par
            l&apos;établissement, sans intervention manuelle.
          </p>
          <dl className="mt-5 divide-y divide-[var(--rc-border-faint)]">
            {[
              ["Premier rappel", "3 jours après la demande"],
              ["Rappels suivants", "tous les 5 jours"],
              ["Arrêt après", "4 rappels sans réponse"],
              ["Avis à l'équipe", "après 10 jours d'inactivité"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-[13.5px] text-[var(--rc-ink-muted)]">{k}</dt>
                <dd className="text-right text-[14px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rc-card p-6">
          <h3 className="rc-serif text-[19px]">Pièces exigées par l&apos;établissement</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {REQUIRED_DOCS.map((doc) => (
              <span
                key={doc}
                className="rc-pill"
                style={{
                  background: "var(--rc-subtle)",
                  color: "var(--rc-ink)",
                  borderColor: "var(--rc-border)",
                }}
              >
                {doc}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VisitesView() {
  const days = [
    { label: "Lundi 31", idx: 0 },
    { label: "Mardi 1", idx: 1 },
    { label: "Mercredi 2", idx: 2 },
    { label: "Jeudi 3", idx: 3 },
    { label: "Vendredi 4", idx: 4 },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rc-card flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="rc-serif text-[19px]">Semaine du 31 août au 4 septembre</p>
          <p className="mt-1 text-[13.5px] text-[var(--rc-ink-muted)]">
            6 visites planifiées · 2 créneaux libres
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="rc-btn rc-btn-outline">
            Semaine précédente
          </button>
          <button type="button" className="rc-btn rc-btn-outline">
            Semaine suivante
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {days.map((day) => {
          const slots = VISITS.filter((v) => v.day === day.idx);
          return (
            <div
              key={day.label}
              className="rc-card flex min-h-[330px] flex-col p-3"
            >
              <p className="rc-label mb-3 px-1">{day.label}</p>
              <div className="flex flex-1 flex-col gap-2.5">
                {slots.map((s) => (
                  <div
                    key={`${s.name}-${s.time}`}
                    className="rounded-[7px] bg-[var(--rc-subtle)] px-3 py-2.5"
                    style={{
                      borderLeft: `3px solid ${
                        s.kind === "visite" ? "var(--rc-green)" : "var(--rc-terra)"
                      }`,
                    }}
                  >
                    <p className="text-[13px] text-[var(--rc-ink-muted)]">{s.time}</p>
                    <p className="mt-0.5 text-[14.5px] font-semibold">{s.name}</p>
                    <p className="mt-0.5 text-[13px] text-[var(--rc-ink-muted)]">{s.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttenteView({
  waitlist,
  setWaitlist,
  onRemove,
}: {
  waitlist: WaitlistEntry[];
  setWaitlist: React.Dispatch<React.SetStateAction<WaitlistEntry[]>>;
  onRemove?: (id: string) => void;
}) {
  const urgentCount = waitlist.filter((w) => w.urgence === "Urgente").length;

  const updateUrgence = (id: string, urgence: UrgenceLevel) => {
    setWaitlist((prev) =>
      sortWaitlist(prev.map((w) => (w.id === id ? { ...w, urgence } : w))),
    );
  };

  const remove = (id: string) => {
    if (onRemove) onRemove(id);
    else setWaitlist((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="rc-card overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--rc-border)] px-5 py-4">
          <div>
            <h3 className="rc-serif text-[19px]">Liste d&apos;attente</h3>
            <p className="mt-1 text-[13.5px] text-[var(--rc-ink-muted)]">
              {waitlist.length} personnes en attente, classées par niveau d&apos;urgence puis par
              ancienneté
            </p>
          </div>
          {urgentCount > 0 ? (
            <span
              className="rc-pill shrink-0"
              style={{ background: "var(--rc-terra-bg)", color: "var(--rc-terra)" }}
            >
              {urgentCount} cas urgent{urgentCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        <div
          className="rc-table-head rc-label"
          style={{ gridTemplateColumns: "0.4fr 1.5fr 1.2fr 1fr 1.2fr 0.8fr 0.6fr" }}
        >
          <span>Rang</span>
          <span>Futur résident</span>
          <span>Unité souhaitée</span>
          <span>En attente</span>
          <span>Urgence</span>
          <span>Dossier</span>
          <span />
        </div>

        {waitlist.map((w, i) => (
          <div
            key={w.id}
            className="rc-table-row"
            style={{
              gridTemplateColumns: "0.4fr 1.5fr 1.2fr 1fr 1.2fr 0.8fr 0.6fr",
              cursor: "default",
            }}
          >
            <p className="rc-serif text-[18px] text-[var(--rc-green)]">{i + 1}</p>
            <div>
              <p className="text-[14.5px] font-semibold">{w.nom}</p>
              <p className="text-[12.5px] text-[var(--rc-ink-muted)]">{w.age} ans</p>
            </div>
            <p className="text-[14px]">{w.unite}</p>
            <p className="text-[14px] text-[var(--rc-ink-muted)]">{w.joursAttente} j</p>
            <select
              className="rc-pill h-8 cursor-pointer border border-[var(--rc-border)] bg-[var(--rc-subtle)] px-2 text-[12.5px] font-semibold outline-none"
              value={w.urgence}
              onChange={(e) => updateUrgence(w.id, e.target.value as UrgenceLevel)}
              style={{
                color:
                  w.urgence === "Urgente"
                    ? "var(--rc-terra)"
                    : w.urgence === "Élevée"
                      ? "var(--rc-green-deep)"
                      : "var(--rc-ink-muted)",
              }}
            >
              <option value="Urgente">Urgente</option>
              <option value="Élevée">Élevée</option>
              <option value="Standard">Standard</option>
            </select>
            <p
              className="text-[13.5px] font-medium"
              style={{ color: w.dossierComplet ? "var(--rc-green)" : "var(--rc-terra)" }}
            >
              {w.dossierComplet ? "Complet" : "Incomplet"}
            </p>
            <button
              type="button"
              className="text-right text-[13.5px] font-semibold text-[var(--rc-terra)]"
              onClick={() => remove(w.id)}
            >
              Retirer
            </button>
          </div>
        ))}
      </div>

      <div className="rc-card p-6">
        <h3 className="rc-serif text-[19px]">Disponibilités par type d&apos;unité</h3>
        <ul className="mt-5 divide-y divide-[var(--rc-border-faint)]">
          {UNIT_AVAILABILITY.map((u) => (
            <li key={u.type} className="flex items-baseline justify-between gap-4 py-3.5">
              <div>
                <p className="text-[15px] font-semibold">{u.type}</p>
                <p className="mt-0.5 text-[13px] text-[var(--rc-ink-muted)]">{u.waiting}</p>
              </div>
              <p
                className="text-[14px] font-semibold"
                style={{ color: u.alert ? "var(--rc-terra)" : "var(--rc-ink)" }}
              >
                {u.free}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TableauView() {
  const max = Math.max(...WEEKLY_DEMANDES);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-5">
        <StatCard label="Demandes reçues (90 j)" value={142} context="Toutes provenances" />
        <StatCard label="Taux de conversion" value="24 %" context="Admissions confirmées" />
        <StatCard label="Délai première réponse" value="6 h" context="Moyenne équipe" />
        <StatCard label="Taux d'occupation" value="94 %" context="Unités louées" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rc-card p-6">
          <h3 className="rc-serif text-[19px]">Demandes reçues par semaine</h3>
          <div className="mt-8 flex h-[190px] items-end gap-2">
            {WEEKLY_DEMANDES.map((v, i) => {
              const h = Math.round((v / max) * 160);
              const last = i === WEEKLY_DEMANDES.length - 1;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[var(--rc-ink-muted)]">{v}</span>
                  <div
                    className="w-full rounded-t-[4px]"
                    style={{
                      height: h,
                      background: last ? "var(--rc-green)" : "#C2DBD4",
                    }}
                  />
                  <span className="text-[11px] text-[var(--rc-ink-faint)]">S{24 + i}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rc-card p-6">
          <h3 className="rc-serif text-[19px]">Parcours des demandes</h3>
          <ul className="mt-6 space-y-4">
            {DASHBOARD_FUNNEL.map((f) => (
              <li key={f.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-medium">{f.label}</span>
                  <span className="text-[14px] font-semibold tabular-nums">{f.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--rc-subtle)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${f.pct}%`, background: f.color }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13.5px] leading-relaxed text-[var(--rc-ink-muted)]">
            Sur 142 demandes reçues, 24 % aboutissent à une admission confirmée. Le goulot
            principal se situe entre dossiers complétés et visites réalisées.
          </p>
        </div>
      </div>
    </div>
  );
}

function EtablissementView() {
  const { workspace, updateProfile, can } = useCommunityPortal();
  const profile = workspace?.profile;
  const accepting = profile?.acceptingApplications !== false;
  const canToggle =
    can("editAdmissions") || can("editProfile") || can("acceptDecline");
  const name = profile?.name || RESIDENCE.name;
  const city = profile?.city || RESIDENCE.city;
  const description = profile?.description || RESIDENCE.description;

  const toggleAccepting = () => {
    if (!canToggle) return;
    const next = !accepting;
    const result = updateProfile({ acceptingApplications: next });
    if (!result.ok) {
      console.warn(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rc-card overflow-hidden">
        <button
          type="button"
          role="switch"
          aria-checked={accepting}
          disabled={!canToggle}
          onClick={toggleAccepting}
          className="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--rc-subtle)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <div>
            <p className="text-[14px] font-medium text-[var(--rc-ink)]">
              Nouvelles demandes
            </p>
            <p className="mt-0.5 text-[13px] text-[var(--rc-ink-muted)]">
              {accepting
                ? "Les familles peuvent envoyer de nouveaux dossiers. Cliquez pour fermer."
                : "L'intake est fermé. Les dossiers déjà reçus restent actifs. Cliquez pour rouvrir."}
            </p>
          </div>
          <span className="flex items-center gap-3">
            <span
              className="text-[13px] font-semibold"
              style={{ color: accepting ? "var(--rc-green-deep)" : "var(--rc-ink-muted)" }}
            >
              {accepting ? "Ouvertes" : "Fermées"}
            </span>
            <span
              className="relative h-7 w-12 shrink-0 rounded-full transition"
              style={{
                background: accepting ? "var(--rc-green)" : "var(--rc-border)",
              }}
            >
              <span
                className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition"
                style={{ left: accepting ? "1.25rem" : "0.125rem" }}
              />
            </span>
          </span>
        </button>
      </div>

      <div className="rc-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--rc-border)] px-5 py-4">
          <p className="text-[14px] font-medium text-[var(--rc-ink-muted)]">
            Aperçu de la page vue par les familles
          </p>
          <a href="/community/profile" className="rc-btn rc-btn-outline">
            Modifier la page
          </a>
        </div>

        <div
          className="relative flex h-[250px] items-center justify-center"
          style={{
            background:
              "repeating-linear-gradient(135deg, #E8EFEC 0 12px, #F3F8F6 12px 24px)",
          }}
        >
          <span
            className="rounded-[7px] border border-[var(--rc-border)] bg-white px-3 py-1.5 text-[12px] text-[var(--rc-ink-muted)]"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            photo de la résidence — façade
          </span>
        </div>

        <div className="p-8">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="rc-serif text-[30px] leading-tight">{name}</h2>
            <span
              className="rounded-[7px] border px-2.5 py-1 text-[12px] font-semibold"
              style={{
                background: accepting ? "var(--rc-green-bg)" : "#F4F1EE",
                borderColor: accepting ? "#C2DBD4" : "var(--rc-border)",
                color: accepting ? "var(--rc-green-deep)" : "var(--rc-ink-muted)",
              }}
            >
              {accepting ? "Demandes ouvertes" : "Demandes fermées"}
            </span>
          </div>
          <p className="mt-2 text-[14.5px] text-[var(--rc-ink-muted)]">
            {city} · {RESIDENCE.units} unités · {RESIDENCE.type}
          </p>
          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-[var(--rc-ink-muted)]">
            {description}
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="overflow-hidden rounded-[10px] border border-[var(--rc-border)]">
              <div
                className="rc-table-head rc-label"
                style={{ gridTemplateColumns: "1.2fr 1fr 1.1fr 1fr" }}
              >
                <span>Type</span>
                <span>Superficie</span>
                <span>Prix indicatif</span>
                <span>Disponibilité</span>
              </div>
              {UNIT_PRICING.map((u) => (
                <div
                  key={u.type}
                  className="rc-table-row"
                  style={{
                    gridTemplateColumns: "1.2fr 1fr 1.1fr 1fr",
                    cursor: "default",
                  }}
                >
                  <p className="text-[14.5px] font-semibold">{u.type}</p>
                  <p className="text-[14px] text-[var(--rc-ink-muted)]">{u.area}</p>
                  <p className="text-[14px] font-medium">{u.price}</p>
                  <p className="text-[14px]">{u.avail}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <p className="rc-label mb-3">Services inclus</p>
                <div className="flex flex-wrap gap-2">
                  {SERVICES_INCLUS.map((s) => (
                    <span
                      key={s}
                      className="rc-pill"
                      style={{
                        background: "var(--rc-subtle)",
                        borderColor: "var(--rc-border)",
                        color: "var(--rc-ink)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[10px] p-5 text-white"
                style={{ background: "var(--rc-black)" }}
              >
                <p className="rc-label" style={{ color: "#8E9B96" }}>
                  Depuis cette page
                </p>
                <p className="rc-serif mt-3 text-[38px] leading-none">38</p>
                <p className="mt-2 text-[13.5px] text-[#C5D2CD]">
                  demandes déposées au cours des 90 derniers jours
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
