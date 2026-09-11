"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useAuth } from "@/lib/auth";
import { useCommunityPortal } from "@/lib/community-portal-store";
import type { AvailabilityUnit } from "@/lib/community-portal";
import {
  communityAppToDemande,
  communityAppsToWaitlist,
  communityAppsToWeeklySeries,
  communityAppsToFunnel,
} from "@/lib/fr-portal-dynamic";
import { useLocale, useT, type Locale } from "@/lib/i18n/locale";
import { catalogLabel } from "@/lib/i18n/catalog-labels";
import {
  docsForDemande,
  REFUS_MOTIFS,
  REQUIRED_DOCS,
  RESIDENCE,
  sortWaitlist,
  STATUS_STYLES,
  VISITS,
  type AutonomyTile,
  type Demande,
  type DemandeStatus,
  type NoteEntry,
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

type FilterId = "All" | "New" | "Missing documents" | "Visit scheduled";

const NAV: { id: ConsoleView; label: string; badge?: boolean }[] = [
  { id: "demandes", label: "Requests", badge: true },
  { id: "documents", label: "Documents and follow-ups" },
  { id: "visites", label: "Visits" },
  { id: "attente", label: "Waitlist" },
  { id: "tableau", label: "Dashboard" },
  { id: "etablissement", label: "Residence page" },
];

const DEMANDE_STATUS_EN: Record<DemandeStatus, string> = {
  Nouvelle: "New",
  "En évaluation": "Under review",
  "Documents manquants": "Missing documents",
  "Visite planifiée": "Visit scheduled",
  Acceptée: "Accepted",
  "Liste d'attente": "Waitlist",
  "Refusée": "Declined",
};

function todayLabel(locale: Locale) {
  const raw = new Date().toLocaleDateString(locale === "en" ? "en-CA" : "fr-CA", {
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

function relationLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  lien: string,
) {
  return catalogLabel(t, lien);
}

/** Urgency levels are French enum values kept for data compatibility; map to English for display. */
const URGENCE_EN: Record<UrgenceLevel, string> = {
  Urgente: "Urgent",
  Élevée: "High",
  Standard: "Standard",
};

function StatusPill({ status }: { status: DemandeStatus }) {
  const t = useT();
  const s = STATUS_STYLES[status];
  return (
    <span className="rc-pill" style={{ background: s.bg, color: s.color }}>
      {t(DEMANDE_STATUS_EN[status] || status)}
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
  const t = useT();
  const { locale } = useLocale();
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
            placeholder={t("Search a file or applicant")}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        ) : null}
        <LanguageSwitcher compact />
        <span className="h-8 w-px bg-[var(--rc-border)]" aria-hidden />
        <p className="whitespace-nowrap text-[13.5px] font-medium text-[var(--rc-ink)]">
          {todayLabel(locale)}
        </p>
      </div>
    </header>
  );
}

function AccountMenu() {
  const { user, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const displayName =
    user?.name?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    t("Team member");
  // "Fonction" isn't wired through account creation yet (tracked
  // separately) — a signed-in user with no jobTitle set gets a generic
  // label here, never a fabricated specific title.
  const displayRole = user?.jobTitle?.trim() || t("Team member");
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
    router.push("/get-started?signedOut=1");
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
          <span className="block truncate text-[12px] text-[#8E9B96]">{t(displayRole)}</span>
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
                {t("Edit account")}
              </p>
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#8E9B96]">{t("First name")}</span>
                <input
                  className="rc-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#8E9B96]">{t("Last name")}</span>
                <input
                  className="rc-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#8E9B96]">{t("Job title")}</span>
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
                  {t("Cancel")}
                </button>
                <button type="button" className="rc-btn rc-btn-primary flex-1" onClick={saveEdit}>
                  {t("Save")}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-1.5">
              <div className="border-b border-white/10 px-3 py-2.5">
                <p className="truncate text-[13.5px] font-semibold text-white">{displayName}</p>
                <p className="truncate text-[12px] text-[#8E9B96]">{t(displayRole)}</p>
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
                {t("Edit name or title")}
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full rounded-[7px] px-3 py-2.5 text-left text-[13.5px] text-[#E8B4A0] hover:bg-white/5"
                onClick={handleSignOut}
              >
                {t("Sign out")}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ResidenceConsoleShell({
  activeView,
  activeCount,
  title,
  subtitle,
  search,
  onSearch,
  onNavigate,
  children,
}: {
  activeView: ConsoleView;
  activeCount: number;
  title: string;
  subtitle: string;
  search?: string;
  onSearch?: (value: string) => void;
  onNavigate: (view: ConsoleView) => void;
  children: React.ReactNode;
}) {
  const t = useT();
  const { user } = useAuth();

  return (
    <div className="rc-console flex min-h-screen w-full">
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
              {t("Residence console")}
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label={t("Residence console")}>
          {NAV.map((item) => {
            const active =
              activeView === item.id || (item.id === "demandes" && activeView === "dossier");
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="flex items-center gap-3 rounded-[7px] px-[14px] py-[11px] text-left text-[14.5px] transition-colors"
                style={{
                  background: active ? "var(--rc-black-soft)" : "transparent",
                  color: active ? "#fff" : "#C5D2CD",
                }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "currentColor" }}
                  aria-hidden
                />
                <span className="flex-1">{t(item.label)}</span>
                {item.badge ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--rc-terra)] px-1.5 text-[11px] font-semibold text-white">
                    {activeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 px-5 py-5">
          <p className="rc-label" style={{ color: "#8E9B96" }}>
            {t("Residence")}
          </p>
          <p className="mt-1.5 text-[14px] font-medium leading-snug text-white">
            {user?.organization?.trim() || RESIDENCE.name}
          </p>
          <AccountMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <ViewHeader
          title={title}
          subtitle={subtitle}
          search={search}
          onSearch={onSearch}
        />
        {children}
      </div>
    </div>
  );
}

export function ResidenceConsole() {
  const portal = useCommunityPortal();
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();
  // Real signed-in staff name, with a generic (never fictional) fallback —
  // used anywhere the console needs to attribute an action ("Signed …",
  // note authorship) to whoever is actually logged in.
  const staffDisplayName =
    user?.name?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    t("Team member");
  // The résidence's own configured document checklist (profile.requiredDocuments)
  // takes priority; REQUIRED_DOCS is only a generic starting default, never a
  // stand-in for this specific résidence's real requirements.
  const requiredDocuments =
    portal.workspace?.profile?.requiredDocuments?.length
      ? portal.workspace.profile.requiredDocuments
      : REQUIRED_DOCS;
  const [view, setView] = useState<ConsoleView>("demandes");
  const [filter, setFilter] = useState<FilterId>("All");
  const [selId, setSelId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [placed, setPlaced] = useState<Record<string, UrgenceLevel>>({});
  const [refused, setRefused] = useState<Record<string, string>>({});
  const [notesByDemande, setNotesByDemande] = useState<Record<string, NoteEntry[]>>({});
  // Local overlay for optimistic edits: starts empty. It is only ever
  // populated by real mutations below (accept/refuse/etc. when the server
  // call fails) — never seeded from fictional demo data. When a résidence
  // has zero real applications, the console must say so honestly instead of
  // showing fabricated ones (see the community-portal-seed regression test
  // for the equivalent guarantee on the server side).
  // No setter: this only ever stayed empty in practice (its 3 writers were
  // the "local mock mutation" fallback for a server sync that silently
  // failed — mutateApp now surfaces that failure for real instead).
  const [localDemandes] = useState<Demande[]>([]);
  // Starts empty, same reasoning as localDemandes above: only ever
  // populated by real data (the sync effect below) or real local mutations,
  // never by fictional seed names.
  const [localWaitlist, setLocalWaitlist] = useState<WaitlistEntry[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  // This in-console thread is a local demo affordance, not yet wired to
  // the real messaging system — it starts empty rather than with a
  // fabricated exchange, and any message the résidence sends is attributed
  // to whoever is actually signed in.
  const [messages, setMessages] = useState<
    { id: string; from: "family" | "residence"; author: string; body: string }[]
  >([]);
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
    if (filter === "New") list = list.filter((d) => d.statut === "Nouvelle");
    if (filter === "Missing documents")
      list = list.filter((d) => d.statut === "Documents manquants");
    if (filter === "Visit scheduled") list = list.filter((d) => d.statut === "Visite planifiée");
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
    router.push(`/community/applications/${encodeURIComponent(id)}`);
  };

  const acceptWithUrgence = async (demandeId: string, urgence: UrgenceLevel) => {
    // Prefer waitlist placement for capacity management; accept when urgent+complete
    const result = await portal.changeStatus(demandeId, "waitlisted");
    if (!result.ok) {
      // A real, server-backed application whose sync actually failed — say
      // so instead of faking local success (this fallback used to run
      // unconditionally before changeStatus() ever awaited its real result).
      window.alert(result.error || "Impossible d'enregistrer cette décision.");
      return;
    }
    setPlaced((p) => ({ ...p, [demandeId]: urgence }));
    setAccepting(false);
    setView("attente");
  };

  const refuseWithReason = async (demandeId: string, reasonLabel: string) => {
    const result = await portal.changeStatus(demandeId, "declined");
    if (!result.ok) {
      window.alert(result.error || "Impossible d'enregistrer ce refus.");
      return;
    }
    setRefused((r) => ({ ...r, [demandeId]: reasonLabel }));
  };

  const cancelDecision = async (demandeId: string) => {
    const result = await portal.changeStatus(demandeId, "under_review");
    if (!result.ok) {
      window.alert(result.error || "Impossible d'annuler cette décision.");
      return;
    }
    setPlaced((p) => {
      const next = { ...p };
      delete next[demandeId];
      return next;
    });
    setRefused((r) => {
      const next = { ...r };
      delete next[demandeId];
      return next;
    });
  };

  const titles: Record<ConsoleView, { title: string; subtitle: string }> = {
    demandes: {
      title: t("Requests"),
      subtitle: t("Admissions queue · files sent by families"),
    },
    documents: {
      title: t("Documents and follow-ups"),
      subtitle: t("Missing documents and reminder cadence"),
    },
    visites: {
      title: t("Visits"),
      subtitle: t("Visit and call schedule"),
    },
    attente: {
      title: t("Waitlist"),
      subtitle: t("Ranked by urgency then seniority"),
    },
    tableau: {
      title: t("Dashboard"),
      subtitle: t("Admission indicators over 90 days"),
    },
    etablissement: {
      title: t("Residence page"),
      subtitle: t("Preview of the public profile families see"),
    },
    dossier: {
      title: selected?.nom ?? t("File"),
      subtitle: t("Prospective resident file"),
    },
  };

  const meta = titles[view];

  return (
    <ResidenceConsoleShell
      activeView={view}
      activeCount={activeCount}
      title={meta.title}
      subtitle={meta.subtitle}
      search={view === "demandes" || view === "dossier" ? search : undefined}
      onSearch={view === "demandes" || view === "dossier" ? setSearch : undefined}
      onNavigate={(nextView) => {
        setView(nextView);
        setAccepting(false);
        if (nextView !== "dossier") setSelId(null);
      }}
    >
        <div className="flex-1 overflow-auto px-[34px] pb-[46px] pt-[30px]">
          {view === "demandes" && (
            <DemandesView
              filtered={filtered}
              allDemandes={demandes}
              filter={filter}
              setFilter={setFilter}
              onOpen={openDossier}
            />
          )}
          {view === "dossier" && selected && (
            <DossierView
              key={selected.id}
              demande={selected}
              staffName={staffDisplayName}
              requiredDocuments={requiredDocuments}
              placed={placed[selected.id]}
              refused={refused[selected.id]}
              accepting={accepting}
              setAccepting={setAccepting}
              onBack={() => {
                setView("demandes");
                setAccepting(false);
              }}
              onAccept={(u) => acceptWithUrgence(selected.id, u)}
              onRefuse={(label) => refuseWithReason(selected.id, label)}
              onCancelDecision={() => cancelDecision(selected.id)}
              notes={notesByDemande[selected.id] ?? selected.notes ?? []}
              onAddNote={(entry) =>
                setNotesByDemande((prev) => ({
                  ...prev,
                  [selected.id]: [entry, ...(prev[selected.id] ?? selected.notes ?? [])],
                }))
              }
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
                    author: staffDisplayName,
                    body: message.trim(),
                  },
                ]);
                setMessage("");
              }}
            />
          )}
          {view === "documents" && (
            <DocumentsView demandes={demandes} requiredDocuments={requiredDocuments} />
          )}
          {view === "visites" && <VisitesView />}
          {view === "attente" && (
            <AttenteView
              waitlist={waitlist}
              availability={portal.workspace?.availability ?? []}
              setWaitlist={setLocalWaitlist}
              onRemove={async (id) => {
                const r = await portal.changeStatus(id, "under_review");
                if (!r.ok) {
                  window.alert(r.error || "Impossible de retirer ce dossier de la liste d'attente.");
                }
              }}
            />
          )}
          {view === "tableau" && <TableauView />}
          {view === "etablissement" && <EtablissementView />}
        </div>
    </ResidenceConsoleShell>
  );
}

function DemandesView({
  filtered,
  allDemandes,
  filter,
  setFilter,
  onOpen,
}: {
  filtered: Demande[];
  allDemandes: Demande[];
  filter: FilterId;
  setFilter: (f: FilterId) => void;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const filters: FilterId[] = ["All", "New", "Missing documents", "Visit scheduled"];

  // Real counts computed from the actual queue — never a fixed placeholder.
  const activeCount = allDemandes.filter((d) =>
    ["Nouvelle", "En évaluation", "Documents manquants", "Visite planifiée"].includes(d.statut),
  ).length;
  const completeCount = allDemandes.filter((d) => d.piecesManquantes === 0).length;
  const missingDocsCount = allDemandes.filter((d) => d.piecesManquantes > 0).length;
  const avgProcessingDays = (() => {
    const withDates = allDemandes
      .map((d) => {
        const t2 = Date.parse(d.recueLe);
        return Number.isFinite(t2) ? (Date.now() - t2) / (1000 * 60 * 60 * 24) : null;
      })
      .filter((v): v is number => v != null && v >= 0);
    if (!withDates.length) return null;
    return Math.round(withDates.reduce((a, b) => a + b, 0) / withDates.length);
  })();

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="grid grid-cols-4 gap-5">
        <StatCard
          label={t("Active applications")}
          value={activeCount}
          context={t("Currently being processed")}
        />
        <StatCard
          label={t("Complete files")}
          value={completeCount}
          context={t("Ready for a decision")}
        />
        <StatCard
          label={t("Missing documents")}
          value={missingDocsCount}
          context={t("Documents pending")}
          alert={missingDocsCount > 0}
        />
        <StatCard
          label={t("Average processing time")}
          value={avgProcessingDays != null ? `${avgProcessingDays} ${t("d")}` : t("Not available yet")}
          context={t("Over 90 days")}
        />
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
                  {t(f)}
                </button>
              );
            })}
          </div>
          <p className="text-[13.5px] text-[var(--rc-ink-muted)]">
            {t(filtered.length === 1 ? "{count} application" : "{count} applications", {
              count: filtered.length,
            })}
          </p>
        </div>

        <div
          className="rc-table-head rc-label"
          style={{ gridTemplateColumns: "2.1fr 1.3fr 1.2fr 1fr 1.1fr 0.7fr" }}
        >
          <span>{t("Future resident")}</span>
          <span>{t("Desired unit")}</span>
          <span>{t("Status")}</span>
          <span>{t("File")}</span>
          <span>{t("Received on")}</span>
          <span />
        </div>

        {filtered.length === 0 ? (
          <div className="rc-table-row" style={{ display: "block", padding: "32px 4px" }}>
            <p className="text-[14.5px] font-medium text-[var(--rc-ink)]">
              {t("No requests yet")}
            </p>
            <p className="mt-1 text-[13.5px] text-[var(--rc-ink-muted)]">
              {t("Families' applications will appear here as soon as they are submitted.")}
            </p>
          </div>
        ) : (
          filtered.map((d) => (
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
                {t("{age} yrs", { age: d.age })} · {d.contact}, {relationLabel(t, d.contactLien)}
              </p>
              {d.publicRef ? (
                <p className="mt-1 font-mono text-[12px] tracking-wide text-[var(--rc-ink-faint)]">
                  {d.publicRef}
                </p>
              ) : null}
            </div>
            <p className="text-[14.5px]">{catalogLabel(t, d.unite)}</p>
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
                ? t(d.piecesManquantes === 1 ? "{count} missing document" : "{count} missing documents", {
                    count: d.piecesManquantes,
                  })
                : t("Complete")}
            </p>
            <p className="text-[14px] text-[var(--rc-ink-muted)]">{t(d.recueLe)}</p>
           <p className="text-right text-[14px] font-semibold text-[var(--rc-green)]">
             {t("View file")}
           </p>
          </div>
          ))
        )}
      </div>
    </div>
  );
}

function DossierView({
  demande,
  staffName,
  requiredDocuments,
  placed,
  refused,
  accepting,
  setAccepting,
  onBack,
  onAccept,
  onRefuse,
  onCancelDecision,
  messages,
  message,
  setMessage,
  onSend,
  notes,
  onAddNote,
}: {
  demande: Demande;
  staffName: string;
  requiredDocuments: readonly string[];
  placed?: UrgenceLevel;
  refused?: string;
  accepting: boolean;
  setAccepting: (v: boolean) => void;
  onBack: () => void;
  onAccept: (u: UrgenceLevel) => void;
  onRefuse: (reasonLabel: string) => void;
  onCancelDecision: () => void;
  messages: { id: string; from: "family" | "residence"; author: string; body: string }[];
  message: string;
  setMessage: (v: string) => void;
  onSend: () => void;
  notes: NoteEntry[];
  onAddNote: (entry: NoteEntry) => void;
}) {
  const t = useT();
  const docs = docsForDemande(demande.piecesManquantes, requiredDocuments);
  const received = docs.filter((d) => d.received).length;
  const completionPourcent = Math.round((received / requiredDocuments.length) * 100);

  const [showRefusePanel, setShowRefusePanel] = useState(false);
  const [selectedMotif, setSelectedMotif] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const decided = !!placed || !!refused;

  const autonomieTuiles: AutonomyTile[] =
    demande.autonomieTuiles && demande.autonomieTuiles.length > 0
      ? demande.autonomieTuiles
      : [{ label: t("Declared autonomy level"), value: catalogLabel(t, demande.autonomie), level: "aide" }];

  const tileBorder: Record<AutonomyTile["level"], string> = {
    autonome: "#2C6B4F",
    aide: "var(--rc-green)",
    assistance: "var(--rc-terra)",
  };

  function submitRefuse() {
    const motif = REFUS_MOTIFS.find((m) => m.id === selectedMotif);
    if (!motif) return;
    onRefuse(motif.label);
    setShowRefusePanel(false);
  }

  function submitNote() {
    const texte = noteDraft.trim();
    if (!texte) return;
    onAddNote({
      id: `local-${Date.now()}`,
      auteur: staffName,
      horodatage: t("Just now"),
      etiquette: "Suivi",
      texte,
    });
    setNoteDraft("");
  }

  return (
    <div className="flex flex-col gap-5">
      <nav className="text-[13.5px] text-[var(--rc-ink-muted)]">
        <button type="button" onClick={onBack} className="hover:underline">
          {t("Applications")}
        </button>{" "}
        / {t("Files")} / <span className="font-medium text-[var(--rc-ink)]">{t("Resident profile")}</span>
      </nav>

      {/* Bloc 1: header card + contact card */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px,1fr))" }}>
        {/* Header card */}
        <div className="rc-card flex flex-col gap-[22px]" style={{ padding: "26px 28px" }}>
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border"
              style={{ background: "var(--rc-green-bg)", borderColor: "var(--rc-mint-bd)" }}
            >
              <span className="rc-serif text-[22px]" style={{ color: "var(--rc-green-deep)" }}>
                {initialsFrom(demande.nom)}
              </span>
            </div>
            <h1 className="rc-serif text-[31px]" style={{ textWrap: "balance" as any }}>
              {demande.nom}
            </h1>
            <StatusPill status={demande.statut} />

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button type="button" className="rc-btn rc-btn-outline">
                {t("Request a document")}
              </button>
              {!decided ? (
                <button
                  type="button"
                  className="rc-btn"
                  style={{ background: "transparent", border: "1px solid var(--rc-terra-bd)", color: "var(--rc-terra)" }}
                  onClick={() => setShowRefusePanel((v) => !v)}
                >
                  {t("Decline")}
                </button>
              ) : null}
              {!decided && !accepting ? (
                <button type="button" className="rc-btn rc-btn-primary" onClick={() => setAccepting(true)}>
                  {t("Accept the application")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                className="rc-btn rc-btn-outline relative"
              >
                ···
                <span
                  className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white"
                  style={{ background: "var(--rc-black)" }}
                >
                  {notes.length}
                </span>
              </button>
            </div>
          </div>

          <p className="text-[14px] text-[var(--rc-ink-muted)]">
            {t("{age} yrs", { age: demande.age })} · {t("file opened on {date}", { date: t(demande.recueLe) })} ·{" "}
            {t("last updated {when}", { when: demande.derniereMaj || t("today") })}
          </p>

          {placed ? (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border px-4 py-3 text-[14.5px] font-medium"
              style={{ background: "var(--rc-mint)", borderColor: "var(--rc-mint-bd)", color: "var(--rc-green-deep)" }}
            >
              <span>
                {t("Application accepted — {name} is added to the waitlist for the {unit} at the main building. {contact} has been notified.", {
                  name: demande.nom.split(" ")[0],
                  unit: catalogLabel(t, demande.unite),
                  contact: demande.contact.split(" ")[0],
                })}
              </span>
              <button
                type="button"
                onClick={onCancelDecision}
                className="shrink-0 text-[13.5px] font-medium underline underline-offset-2"
                style={{ color: "var(--rc-ink)" }}
              >
                {t("Cancel decision")}
              </button>
            </div>
          ) : null}

          {refused ? (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border px-4 py-3 text-[14.5px]"
              style={{ background: "var(--rc-warn-bg)", borderColor: "var(--rc-terra-bd)", color: "var(--rc-ink)" }}
            >
              <span>
                {t("Reason: {reason}", { reason: refused })}
              </span>
              <button
                type="button"
                onClick={onCancelDecision}
                className="shrink-0 text-[13.5px] font-medium underline underline-offset-2"
                style={{ color: "var(--rc-ink)" }}
              >
                {t("Cancel decision")}
              </button>
            </div>
          ) : null}

          {showRefusePanel && !decided ? (
            <div
              className="flex flex-col gap-3 rounded-[10px] border p-4"
              style={{ background: "var(--rc-warn-bg)", borderColor: "var(--rc-terra-bd)" }}
            >
              <h3 className="text-[15px] font-semibold">{t("Reason for declining")}</h3>
              <div className="flex flex-wrap gap-2">
                {REFUS_MOTIFS.map((m) => {
                  const active = selectedMotif === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMotif(m.id)}
                      className="rounded-full border px-3 py-1.5 text-[13.5px] font-medium transition-colors"
                      style={
                        active
                          ? { background: "var(--rc-black)", borderColor: "var(--rc-black)", color: "#fff" }
                          : { background: "var(--rc-surface)", borderColor: "var(--rc-border)", color: "var(--rc-ink)" }
                      }
                    >
                      {t(m.label)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[13.5px] text-[var(--rc-ink-muted)]">
                {t("{contact} will receive a notice with this reason, and the file will remain visible in declined applications.", {
                  contact: demande.contact,
                })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rc-btn rc-btn-terra"
                  disabled={!selectedMotif}
                  onClick={submitRefuse}
                  style={!selectedMotif ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                >
                  {t("Confirm decline")}
                </button>
                <button type="button" className="rc-btn rc-btn-outline" onClick={() => setShowRefusePanel(false)}>
                  {t("Cancel")}
                </button>
              </div>
            </div>
          ) : null}

          {accepting && !decided ? (
            <div className="rounded-[10px] border border-[var(--rc-border)] bg-[var(--rc-subtle)] p-4">
              <p className="rc-serif text-[19px]">{t("Urgency level")}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--rc-ink-muted)]">
                {t("The accepted file is automatically ranked on the waitlist according to this level.")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="rc-btn rc-btn-terra" onClick={() => onAccept("Urgente")}>
                  {t(URGENCE_EN.Urgente)}
                </button>
                <button type="button" className="rc-btn rc-btn-primary" onClick={() => onAccept("Élevée")}>
                  {t(URGENCE_EN["Élevée"])}
                </button>
                <button type="button" className="rc-btn rc-btn-ghost" onClick={() => onAccept("Standard")}>
                  {t(URGENCE_EN.Standard)}
                </button>
                <button type="button" className="rc-btn rc-btn-outline" onClick={() => setAccepting(false)}>
                  {t("Cancel")}
                </button>
              </div>
            </div>
          ) : null}

          {/* Progress */}
          <div className="border-t pt-4" style={{ borderColor: "var(--rc-border-faint)" }}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="rc-label">{t("File")}</span>
              <div className="flex items-center gap-3">
                <span className="text-[13.5px] font-medium">{t("{pct}% complete", { pct: completionPourcent })}</span>
                {demande.piecesManquantes > 0 ? (
                  <span className="text-[13.5px] font-medium" style={{ color: "var(--rc-terra)" }}>
                    {t(demande.piecesManquantes === 1 ? "{count} item to complete" : "{count} items to complete", {
                      count: demande.piecesManquantes,
                    })}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="h-[9px] w-full overflow-hidden rounded-full" style={{ background: "var(--rc-canvas)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${completionPourcent}%`, background: "var(--rc-green)" }}
              />
            </div>
          </div>

          {/* Summary grid */}
          <div
            className="grid gap-4 border-t pt-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", borderColor: "var(--rc-border-faint)" }}
          >
            <div>
              <p className="rc-label">{t("Desired move-in")}</p>
              <p className="mt-1 text-[15px]">{catalogLabel(t, demande.emmenagement)}</p>
            </div>
            <div>
              <p className="rc-label">{t("Priority")}</p>
              <span
                className="mt-1 inline-flex rounded-full px-2.5 py-1 text-[13px] font-medium"
                style={{ background: "var(--rc-terra-bg)", color: "var(--rc-terra)" }}
              >
                {t(demande.priorite || "Moyenne")}
              </span>
            </div>
            <div>
              <p className="rc-label">{t("Sought environment")}</p>
              <p className="mt-1 text-[15px]">{demande.milieuRecherche || catalogLabel(t, demande.unite)}</p>
            </div>
            <div>
              <p className="rc-label">{t("Estimated budget")}</p>
              <p className="mt-1 text-[15px]">{catalogLabel(t, demande.budget)}</p>
            </div>
          </div>
        </div>

        {/* Contact card (black, merged with chat) */}
        <div className="flex flex-col gap-[14px] rounded-[12px]" style={{ background: "var(--rc-black)", padding: "18px 20px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium uppercase tracking-[0.07em] text-white/70">
              {t("Primary contact")}
            </span>
            <span className="text-[12.5px] font-medium" style={{ color: "#7FD8C8" }}>
              {t("Decisions authorized")}
            </span>
          </div>

          <div>
            <div className="rc-serif text-[21px] text-white">{demande.contact}</div>
            <div className="text-[13.5px]" style={{ color: "#B3C7C1" }}>
              {relationLabel(t, demande.contactLien)}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {demande.contactTel ? (
              <>
                <a href={`tel:${demande.contactTel.replace(/\s+/g, "")}`} className="rc-serif text-[22px] text-white hover:underline">
                  {demande.contactTel}
                </a>
                <a
                  href={`tel:${demande.contactTel.replace(/\s+/g, "")}`}
                  className="rc-btn rc-btn-primary"
                >
                  {t("Call {name}", { name: demande.contact.split(" ")[0] })}
                </a>
              </>
            ) : (
              <span className="text-[14px] italic text-white/50">{t("Not specified")}</span>
            )}
          </div>

          <div className="flex flex-col gap-1 border-t pt-3 text-[13.5px]" style={{ borderColor: "rgba(255,255,255,0.09)" }}>
            <span style={{ color: "#7FD8C8" }}>{demande.contactCourriel || t("Not specified")}</span>
            <span style={{ color: "#B3C7C1" }}>{demande.contactPreference || t("Not specified")}</span>
          </div>

          {/* Chat thread */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.09)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-medium uppercase tracking-[0.07em] text-white/70">
                {t("Messages with the family")}
              </span>
              <span className="text-[12px]" style={{ color: "#7FD8C8" }}>
                {t("Secure messaging")}
              </span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 280 }}>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "residence" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] px-3 py-2"
                    style={
                      m.from === "residence"
                        ? { background: "#E9F1EE", color: "var(--rc-ink)", borderRadius: "10px 10px 3px 10px" }
                        : { background: "var(--rc-black-msg)", color: "#fff", borderRadius: "10px 10px 10px 3px" }
                    }
                  >
                    <div className="text-[14px] leading-snug">{t(m.body)}</div>
                    <div
                      className="mt-1 text-[11.5px]"
                      style={{ color: m.from === "residence" ? "var(--rc-ink-muted)" : "rgba(255,255,255,0.6)" }}
                    >
                      {m.author}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSend();
                }}
                placeholder={t("Write to {name}…", { name: demande.contact.split(" ")[0] })}
                className="flex-1 rounded-[8px] border px-3 py-2 text-[14px] text-white placeholder:text-white/40 focus:outline-none"
                style={{ borderColor: "rgba(255,255,255,0.14)", background: "var(--rc-black-soft)" }}
              />
              <button type="button" onClick={onSend} className="rc-btn rc-btn-primary">
                {t("Send")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bloc 2 */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px,1fr))" }}>
        {/* Large column */}
        <div className="flex flex-col gap-5" style={{ gridColumn: "span 2 / span 2" }}>
          <CollapsibleCard
            title={t("Application overview")}
            summary={
              demande.piecesManquantes > 0 ? (
                <span className="rc-pill" style={{ background: "var(--rc-terra-bg)", color: "var(--rc-terra)" }}>
                  {t("{count} items to complete", { count: demande.piecesManquantes })}
                </span>
              ) : undefined
            }
          >
            <p className="mb-4 max-w-[70ch] text-[15px]" style={{ textWrap: "pretty" as any }}>
              {t(demande.resumeIa)}
            </p>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))" }}>
              <div>
                <p className="rc-label">{t("Areas of interest")}</p>
                <p className="mt-1 text-[15px]">{demande.secteursRecherches || <Empty t={t} />}</p>
              </div>
              <div>
                <p className="rc-label">{t("Application source")}</p>
                <p className="mt-1 text-[15px]">{catalogLabel(t, demande.provenance)}</p>
              </div>
              <div>
                <p className="rc-label">{t("Current address")}</p>
                <p className="mt-1 text-[15px]">{demande.adresse || <Empty t={t} />}</p>
              </div>
              <div>
                <p className="rc-label">{t("External reference")}</p>
                <p className="mt-1 text-[15px]">
                  {demande.referenceExterne ? demande.referenceExterne : <Empty t={t} />}
                </p>
              </div>
            </div>
            {demande.piecesManquantes > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[10px] px-4 py-3" style={{ background: "var(--rc-warn-bg)" }}>
                <span className="text-[13.5px]">
                  {t("{count} missing documents", { count: demande.piecesManquantes })}
                </span>
                <button type="button" className="text-[13.5px] font-medium underline underline-offset-2" style={{ color: "var(--rc-terra)" }}>
                  {t("Request missing documents")}
                </button>
              </div>
            ) : null}
          </CollapsibleCard>

          <CollapsibleCard
            title={t("Autonomy and needs")}
            summary={<span className="text-[13.5px] text-[var(--rc-ink-muted)]">{catalogLabel(t, demande.autonomie)}</span>}
          >
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))" }}>
              {autonomieTuiles.map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-[8px] p-3"
                  style={{ background: "var(--rc-subtle)", borderLeft: `3px solid ${tileBorder[tile.level]}` }}
                >
                  <p className="rc-label">{tile.label}</p>
                  <p
                    className="mt-1 text-[14px] font-medium"
                    style={{ color: tile.level === "assistance" ? "var(--rc-terra)" : "var(--rc-ink)" }}
                  >
                    {tile.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[13.5px]" style={{ borderColor: "var(--rc-border-faint)" }}>
              <button type="button" className="font-medium underline underline-offset-2" style={{ color: "var(--rc-green-deep)" }}>
                {t("See needs details")}
              </button>
              <span className="text-[var(--rc-ink-muted)]">
                {demande.evaluationTransmise || <Empty t={t} />}
              </span>
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            title={t("Medication")}
            summary={
              <>
                {demande.medicaments && demande.medicaments.length > 0 ? (
                  <span className="rc-pill" style={{ background: "var(--rc-terra-bg)", color: "var(--rc-terra)" }}>
                    {t("Assistance required")}
                  </span>
                ) : null}
                <span className="text-[13.5px] text-[var(--rc-ink-muted)]">
                  {demande.medicaments
                    ? t("{count} medications", { count: demande.medicaments.length })
                    : t("Not specified")}
                </span>
              </>
            }
          >
            {demande.medicaments && demande.medicaments.length > 0 ? (
              <>
                <div className="mb-5 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))" }}>
                  <div>
                    <p className="rc-label">{t("Pharmacy")}</p>
                    <p className="mt-1 text-[15px]">{demande.pharmacie || <Empty t={t} />}</p>
                  </div>
                  <div>
                    <p className="rc-label">{t("Known allergies")}</p>
                    <p className="mt-1 text-[15px] font-semibold" style={{ color: demande.allergies ? "var(--rc-terra)" : undefined }}>
                      {demande.allergies || <Empty t={t} />}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[520px] grid rc-label" style={{ gridTemplateColumns: "1.6fr 0.9fr 1.1fr 1fr" }}>
                    <div className="border-b py-2" style={{ borderColor: "var(--rc-border)" }}>{t("Medication")}</div>
                    <div className="border-b py-2" style={{ borderColor: "var(--rc-border)" }}>{t("Dose")}</div>
                    <div className="border-b py-2" style={{ borderColor: "var(--rc-border)" }}>{t("Frequency")}</div>
                    <div className="border-b py-2" style={{ borderColor: "var(--rc-border)" }}>{t("Indication")}</div>
                  </div>
                  {demande.medicaments.map((m) => (
                    <div key={m.nom} className="min-w-[520px] grid text-[14.5px]" style={{ gridTemplateColumns: "1.6fr 0.9fr 1.1fr 1fr" }}>
                      <div className="border-b py-2.5 font-medium" style={{ borderColor: "var(--rc-border-faint)" }}>{m.nom}</div>
                      <div className="border-b py-2.5" style={{ borderColor: "var(--rc-border-faint)" }}>{m.dose}</div>
                      <div className="border-b py-2.5" style={{ borderColor: "var(--rc-border-faint)" }}>{m.frequence}</div>
                      <div className="border-b py-2.5" style={{ borderColor: "var(--rc-border-faint)" }}>{m.indication}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13.5px] text-[var(--rc-ink-muted)]">
                  <span>{t("List transmitted · to validate before admission")}</span>
                  <button type="button" className="font-medium underline underline-offset-2" style={{ color: "var(--rc-green-deep)" }}>
                    {t("See full list")}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[14px] italic" style={{ color: "var(--rc-ink-faint)" }}>
                {t("Not specified")}
              </p>
            )}
          </CollapsibleCard>
        </div>

        {/* Narrow column */}
        <div className="flex flex-col gap-5">
          <div className="rc-card p-6">
            <h2 className="rc-serif text-[19px]">{t("People to reach")}</h2>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold">{demande.contact}</span>
                <span className="rc-pill" style={{ background: "var(--rc-green-bg)", color: "var(--rc-green-deep)" }}>
                  {t("Primary contact")}
                </span>
              </div>
              <p className="text-[13.5px] text-[var(--rc-ink-muted)]">
                {relationLabel(t, demande.contactLien)}
                {demande.contactPreference ? ` · ${demande.contactPreference}` : ""}
              </p>
              <div
                className="flex items-center justify-between gap-2 rounded-[8px] border px-3 py-2.5"
                style={{ background: "var(--rc-mint)", borderColor: "var(--rc-mint-bd)" }}
              >
                {demande.contactTel ? (
                  <>
                    <a href={`tel:${demande.contactTel.replace(/\s+/g, "")}`} className="rc-serif text-[21px] hover:underline">
                      {demande.contactTel}
                    </a>
                    <a href={`tel:${demande.contactTel.replace(/\s+/g, "")}`} className="text-[13.5px] font-semibold" style={{ color: "var(--rc-green-deep)" }}>
                      {t("Call")}
                    </a>
                  </>
                ) : (
                  <Empty t={t} />
                )}
              </div>
              <span className="text-[13.5px] text-[var(--rc-ink-muted)]">{demande.contactCourriel || <Empty t={t} />}</span>
            </div>

            <div className="my-4 border-t" style={{ borderColor: "var(--rc-border-faint)" }} />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold">{demande.contactUrgenceNom || <Empty t={t} />}</span>
                <span className="rc-pill" style={{ background: "var(--rc-terra-bg)", color: "var(--rc-terra)" }}>
                  {t("Emergency contact")}
                </span>
              </div>
              <p className="text-[13.5px] text-[var(--rc-ink-muted)]">
                {demande.contactUrgenceLien ? relationLabel(t, demande.contactUrgenceLien) : <Empty t={t} />}
              </p>
              <div className="flex items-center justify-between gap-2 rounded-[8px] px-3 py-2.5" style={{ background: "var(--rc-subtle)" }}>
                {demande.contactUrgenceTel ? (
                  <>
                    <a href={`tel:${demande.contactUrgenceTel.replace(/\s+/g, "")}`} className="rc-serif text-[21px] hover:underline">
                      {demande.contactUrgenceTel}
                    </a>
                    <a href={`tel:${demande.contactUrgenceTel.replace(/\s+/g, "")}`} className="text-[13.5px] font-semibold" style={{ color: "var(--rc-green-deep)" }}>
                      {t("Call")}
                    </a>
                  </>
                ) : (
                  <Empty t={t} />
                )}
              </div>
              <span className="text-[13.5px] text-[var(--rc-ink-muted)]">{demande.contactUrgenceCourriel || <Empty t={t} />}</span>
            </div>
          </div>

          <div className="rc-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="rc-serif text-[19px]">{t("Documents")}</h2>
              <span className="text-[13.5px] text-[var(--rc-ink-muted)]">
                {t("{received} of {total} received", { received, total: requiredDocuments.length })}
              </span>
            </div>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--rc-canvas)" }}>
              <div className="h-full rounded-full" style={{ width: `${completionPourcent}%`, background: "var(--rc-green)" }} />
            </div>
            <ul className="flex flex-col gap-2.5">
              {docs.map((doc) => (
                <li key={doc.name} className="flex items-center justify-between gap-2 text-[14px]">
                  <span className="flex items-center gap-2">
                    <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: doc.received ? "#2C6B4F" : "var(--rc-terra)" }} />
                    <span className={doc.received ? undefined : "font-semibold"} style={{ color: doc.received ? "var(--rc-ink)" : "var(--rc-terra)" }}>
                      {t(doc.name)}
                    </span>
                  </span>
                  <span className="text-[13px]" style={{ color: doc.received ? "var(--rc-ink-muted)" : "var(--rc-terra)", fontWeight: doc.received ? 400 : 600 }}>
                    {doc.received ? t("Received") : t("Missing")}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 w-full rounded-[8px] px-4 py-2.5 text-[14px] font-semibold"
              style={{ background: "var(--rc-terra-bg)", color: "var(--rc-terra)" }}
            >
              {t("Request missing documents")}
            </button>
          </div>

          <CollapsibleCard
            title={t("Housing preferences")}
            summary={
              demande.logementPreferences && demande.logementPreferences.length > 0 ? (
                <span className="text-[13.5px] text-[var(--rc-ink-muted)]">{demande.logementPreferences.slice(0, 2).join(" · ")}</span>
              ) : undefined
            }
          >
            {demande.logementNonNegociable ? (
              <div className="mb-4 rounded-[10px] p-3" style={{ background: "var(--rc-mint)" }}>
                <span
                  className="mb-1 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-white"
                  style={{ background: "var(--rc-black)" }}
                >
                  {t("Non-negotiable")}
                </span>
                <p className="text-[14.5px]">{demande.logementNonNegociable}</p>
              </div>
            ) : null}
            {demande.logementPreferences && demande.logementPreferences.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {demande.logementPreferences.map((p) => (
                  <span key={p} className="rounded-full border px-3 py-1.5 text-[13.5px]" style={{ borderColor: "var(--rc-border)" }}>
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[14px] italic" style={{ color: "var(--rc-ink-faint)" }}>
                {t("Not specified")}
              </p>
            )}
          </CollapsibleCard>

          {demande.adequation ? (
            <div className="rc-card p-6" style={{ background: "var(--rc-subtle)" }}>
              <p className="rc-label">{t("Fit with the residence")}</p>
              <p className="rc-serif mt-1 text-[34px]" style={{ color: "var(--rc-green-deep)" }}>
                {demande.adequation.verdict}
              </p>
              <p className="mt-1 text-[14px] font-medium">{demande.adequation.sousTitre}</p>
              <p className="mt-2 text-[13.5px] text-[var(--rc-ink-muted)]">{demande.adequation.nuance}</p>
              <button type="button" className="rc-btn rc-btn-primary mt-4 w-full">
                {t("Propose a unit")}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Notes drawer */}
      {notesOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0" style={{ background: "rgba(16,24,21,0.34)" }} onClick={() => setNotesOpen(false)} />
          <div
            className="relative flex h-full w-[min(440px,92vw)] flex-col border-l"
            style={{ borderColor: "var(--rc-border)", background: "var(--rc-surface)" }}
          >
            <div className="flex items-start justify-between border-b p-6" style={{ borderColor: "var(--rc-border-faint)" }}>
              <div>
                <h2 className="rc-serif text-[20px]">{t("File notes")}</h2>
                <p className="mt-1 text-[13px] text-[var(--rc-ink-muted)]">{t("Visible only to the residence team")}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotesOpen(false)}
                aria-label={t("Close")}
                className="text-[18px] leading-none text-[var(--rc-ink-muted)] hover:text-[var(--rc-ink)]"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 border-b p-6" style={{ borderColor: "var(--rc-border-faint)" }}>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={t("Add a note about {name}'s file…", { name: demande.nom.split(" ")[0] })}
                className="min-h-[86px] w-full rounded-[8px] border p-3 text-[14px] outline-none"
                style={{ borderColor: "var(--rc-border)", background: "var(--rc-subtle)" }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-[var(--rc-ink-muted)]">{t("Signed {name}", { name: staffName })}</span>
                <button type="button" className="rc-btn rc-btn-primary" onClick={submitNote}>
                  {t("Add note")}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2">
              {notes.length === 0 ? (
                <p className="py-6 text-[14px] italic" style={{ color: "var(--rc-ink-faint)" }}>
                  {t("No notes yet.")}
                </p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="border-b py-4 last:border-none" style={{ borderColor: "var(--rc-border-faint)" }}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[14px] font-semibold">{n.auteur}</span>
                      <NoteTag etiquette={n.etiquette} />
                    </div>
                    <div className="mb-1.5 text-[12px] text-[var(--rc-ink-muted)]">{n.horodatage}</div>
                    <p className="text-[14.5px] leading-[1.6]">{n.texte}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CollapsibleCard({
  title,
  summary,
  defaultOpen = true,
  children,
}: {
  title: string;
  summary?: import("react").ReactNode;
  defaultOpen?: boolean;
  children: import("react").ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rc-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-[26px] py-[20px] text-left transition-colors hover:bg-[var(--rc-subtle)]"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="rc-serif text-[19px]">{title}</h2>
          {summary}
        </div>
        <span className="shrink-0 text-[13.5px] font-medium text-[var(--rc-ink-muted)]">
          {open ? t("Collapse ▲") : t("Show ▼")}
        </span>
      </button>
      {open ? (
        <div className="border-t px-[26px] py-[22px]" style={{ borderColor: "var(--rc-border-faint)" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function Empty({ t }: { t: (key: string) => string }) {
  return <span className="italic" style={{ color: "var(--rc-ink-faint)" }}>{t("Not specified")}</span>;
}

function NoteTag({ etiquette }: { etiquette: NoteEntry["etiquette"] }) {
  const map: Record<NoteEntry["etiquette"], { bg: string; fg: string }> = {
    Suivi: { bg: "var(--rc-green-bg)", fg: "var(--rc-green-deep)" },
    Documents: { bg: "var(--rc-terra-bg)", fg: "var(--rc-terra)" },
    Soins: { bg: "var(--rc-canvas)", fg: "#3C4B46" },
    Logement: { bg: "var(--rc-canvas)", fg: "#3C4B46" },
  };
  const s = map[etiquette];
  return (
    <span className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ background: s.bg, color: s.fg }}>
      {etiquette}
    </span>
  );
}
function DocumentsView({
  demandes,
  requiredDocuments,
}: {
  demandes: Demande[];
  requiredDocuments: readonly string[];
}) {
  const t = useT();
  const rows = demandes
    .filter((d) => d.piecesManquantes > 0)
    .flatMap((d) => {
      const docs = docsForDemande(d.piecesManquantes, requiredDocuments).filter((x) => !x.received);
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
          <h3 className="rc-serif text-[19px]">{t("Documents pending")}</h3>
          <p className="mt-1 text-[13.5px] text-[var(--rc-ink-muted)]">
            {t("12 missing documents across 9 active files")}
          </p>
        </div>
        <div
          className="rc-table-head rc-label"
          style={{ gridTemplateColumns: "1.4fr 1.5fr 1fr 1fr" }}
        >
          <span>{t("File")}</span>
          <span>{t("Document requested")}</span>
          <span>{t("Requested on")}</span>
          <span>{t("Follow-ups")}</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.key}
            className="rc-table-row"
            style={{ gridTemplateColumns: "1.4fr 1.5fr 1fr 1fr", cursor: "default" }}
          >
            <p className="text-[14.5px] font-semibold">{r.dossier}</p>
            <p className="text-[14px]">{t(r.piece)}</p>
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
          <h3 className="rc-serif text-[19px]">{t("Automated follow-ups")}</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--rc-ink-muted)]">
            {t(
              "Families receive secure reminders on a schedule set by the facility, with no manual work.",
            )}
          </p>
          <dl className="mt-5 divide-y divide-[var(--rc-border-faint)]">
            {[
              [t("First reminder"), t("3 days after the request")],
              [t("Following reminders"), t("every 5 days")],
              [t("Stops after"), t("4 reminders with no response")],
              [t("Team alert"), t("after 10 days of inactivity")],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-[13.5px] text-[var(--rc-ink-muted)]">{k}</dt>
                <dd className="text-right text-[14px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rc-card p-6">
          <h3 className="rc-serif text-[19px]">{t("Documents required by the facility")}</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {requiredDocuments.map((doc) => (
              <span
                key={doc}
                className="rc-pill"
                style={{
                  background: "var(--rc-subtle)",
                  color: "var(--rc-ink)",
                  borderColor: "var(--rc-border)",
                }}
              >
                {t(doc)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatVisitTime(time: string, locale: Locale) {
  const [h, m] = time.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(locale === "en" ? "en-CA" : "fr-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * KNOWN FICTIONAL DATA — not yet wired to real data (tracked as a separate
 * follow-up, not part of the 2026-09-09 real-data pass): this tab still
 * renders the hardcoded `VISITS` demo calendar and a hand-typed subtitle
 * regardless of which résidence is signed in. Tour scheduling has no
 * structured backend entity yet (CommunityApplication only carries loose
 * `tourProposal`/`assessmentProposal` text) — replacing this properly needs
 * a real scheduling data model, not just a fallback swap like the other
 * tabs in this file got.
 */
function VisitesView() {
  const t = useT();
  const { locale } = useLocale();
  const days = [
    { day: "Monday", date: 31, idx: 0 },
    { day: "Tuesday", date: 1, idx: 1 },
    { day: "Wednesday", date: 2, idx: 2 },
    { day: "Thursday", date: 3, idx: 3 },
    { day: "Friday", date: 4, idx: 4 },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rc-card flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="rc-serif text-[19px]">{t("Week of August 31 to September 4")}</p>
          <p className="mt-1 text-[13.5px] text-[var(--rc-ink-muted)]">
            {t("6 visits scheduled · 2 open slots")}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="rc-btn rc-btn-outline">
            {t("Previous week")}
          </button>
          <button type="button" className="rc-btn rc-btn-outline">
            {t("Next week")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {days.map((day) => {
          const slots = VISITS.filter((v) => v.day === day.idx);
          return (
            <div
              key={day.day}
              className="rc-card flex min-h-[330px] flex-col p-3"
            >
              <p className="rc-label mb-3 px-1">
                {t(day.day)} {day.date}
              </p>
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
                    <p className="text-[13px] text-[var(--rc-ink-muted)]">
                      {formatVisitTime(s.time, locale)}
                    </p>
                    <p className="mt-0.5 text-[14.5px] font-semibold">{s.name}</p>
                    <p className="mt-0.5 text-[13px] text-[var(--rc-ink-muted)]">
                      {s.kind === "suivi" ? t("Follow-up") : catalogLabel(t, s.unit)}
                    </p>
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
  availability,
  setWaitlist,
  onRemove,
}: {
  waitlist: WaitlistEntry[];
  availability: AvailabilityUnit[];
  setWaitlist: React.Dispatch<React.SetStateAction<WaitlistEntry[]>>;
  onRemove?: (id: string) => void;
}) {
  const t = useT();
  const urgentCount = waitlist.filter((w) => w.urgence === "Urgente").length;

  // Real per-unit-type availability, aggregated from `workspace.availability`
  // — never the fictional demo table.
  const availabilityByType = useMemo(() => {
    const map = new Map<string, { roomType: string; free: number; waiting: number; alert: boolean }>();
    for (const u of availability) {
      const entry = map.get(u.roomType) ?? { roomType: u.roomType, free: 0, waiting: 0, alert: false };
      entry.free += u.count;
      entry.waiting += u.waitlistCount;
      if (u.count === 0 && u.waitlistCount > 0) entry.alert = true;
      map.set(u.roomType, entry);
    }
    return Array.from(map.values());
  }, [availability]);

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
            <h3 className="rc-serif text-[19px]">{t("Waitlist")}</h3>
            <p className="mt-1 text-[13.5px] text-[var(--rc-ink-muted)]">
              {t("{count} people waiting, ranked by urgency level then by seniority", {
                count: waitlist.length,
              })}
            </p>
          </div>
          {urgentCount > 0 ? (
            <span
              className="rc-pill shrink-0"
              style={{ background: "var(--rc-terra-bg)", color: "var(--rc-terra)" }}
            >
              {t(urgentCount === 1 ? "{count} urgent case" : "{count} urgent cases", {
                count: urgentCount,
              })}
            </span>
          ) : null}
        </div>

        <div
          className="rc-table-head rc-label"
          style={{ gridTemplateColumns: "0.4fr 1.5fr 1.2fr 1fr 1.2fr 0.8fr 0.6fr" }}
        >
          <span>{t("Rank")}</span>
          <span>{t("Future resident")}</span>
          <span>{t("Desired unit")}</span>
          <span>{t("Waiting")}</span>
          <span>{t("Urgency")}</span>
          <span>{t("File")}</span>
          <span />
        </div>

        {waitlist.length === 0 ? (
          <div className="rc-table-row" style={{ display: "block", padding: "32px 4px" }}>
            <p className="text-[14.5px] font-medium text-[var(--rc-ink)]">
              {t("No one on the waitlist yet")}
            </p>
            <p className="mt-1 text-[13.5px] text-[var(--rc-ink-muted)]">
              {t("Families placed on the waitlist will appear here.")}
            </p>
          </div>
        ) : (
          waitlist.map((w, i) => (
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
              <p className="text-[12.5px] text-[var(--rc-ink-muted)]">
                {t("{age} yrs", { age: w.age })}
              </p>
            </div>
            <p className="text-[14px]">{catalogLabel(t, w.unite)}</p>
            <p className="text-[14px] text-[var(--rc-ink-muted)]">
              {w.joursAttente} {t("d")}
            </p>
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
              <option value="Urgente">{t(URGENCE_EN.Urgente)}</option>
              <option value="Élevée">{t(URGENCE_EN["Élevée"])}</option>
              <option value="Standard">{t(URGENCE_EN.Standard)}</option>
            </select>
            <p
              className="text-[13.5px] font-medium"
              style={{ color: w.dossierComplet ? "var(--rc-green)" : "var(--rc-terra)" }}
            >
              {w.dossierComplet ? t("Complete") : t("Incomplete")}
            </p>
            <button
              type="button"
              className="text-right text-[13.5px] font-semibold text-[var(--rc-terra)]"
              onClick={() => remove(w.id)}
            >
              {t("Remove")}
            </button>
          </div>
          ))
        )}
      </div>

      <div className="rc-card p-6">
        <h3 className="rc-serif text-[19px]">{t("Availability by unit type")}</h3>
        {availabilityByType.length === 0 ? (
          <p className="mt-5 text-[13.5px] text-[var(--rc-ink-muted)]">
            {t("No availability configured yet.")}
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-[var(--rc-border-faint)]">
            {availabilityByType.map((u) => (
              <li key={u.roomType} className="flex items-baseline justify-between gap-4 py-3.5">
                <div>
                  <p className="text-[15px] font-semibold">{catalogLabel(t, u.roomType)}</p>
                  <p className="mt-0.5 text-[13px] text-[var(--rc-ink-muted)]">
                    {t("{count} waiting", { count: u.waiting })}
                  </p>
                </div>
                <p
                  className="text-[14px] font-semibold"
                  style={{ color: u.alert ? "var(--rc-terra)" : "var(--rc-ink)" }}
                >
                  {u.free > 0 ? t("{count} available", { count: u.free }) : t("Full")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TableauView() {
  const t = useT();
  const { workspace } = useCommunityPortal();
  const applications = workspace?.applications ?? [];
  const profile = workspace?.profile;
  const metrics = workspace?.metrics;

  const receivedLast90d = useMemo(() => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return applications.filter((a) => {
      const t2 = a.submittedAt ? new Date(a.submittedAt).getTime() : NaN;
      return Number.isFinite(t2) && t2 >= cutoff;
    }).length;
  }, [applications]);

  const occupancyPct =
    profile?.unitCount != null && profile.unitCount > 0 && metrics
      ? Math.max(
          0,
          Math.min(100, Math.round(((profile.unitCount - metrics.openBeds) / profile.unitCount) * 100)),
        )
      : null;

  const weekly = useMemo(() => communityAppsToWeeklySeries(applications), [applications]);
  const funnel = useMemo(() => communityAppsToFunnel(applications), [applications]);
  const max = Math.max(1, ...weekly.map((w) => w.count));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-5">
        <StatCard
          label={t("Applications received (90 days)")}
          value={receivedLast90d}
          context={t("All sources")}
        />
        <StatCard
          label={t("Conversion rate")}
          value={metrics ? `${metrics.conversionRate} %` : t("Not available yet")}
          context={t("Confirmed admissions")}
        />
        <StatCard
          label={t("First response time")}
          value={metrics ? `${metrics.avgResponseHours} h` : t("Not available yet")}
          context={t("Team average")}
        />
        <StatCard
          label={t("Occupancy rate")}
          value={occupancyPct != null ? `${occupancyPct} %` : t("Set unit count in your profile")}
          context={t("Units leased")}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rc-card p-6">
          <h3 className="rc-serif text-[19px]">{t("Applications received per week")}</h3>
          {applications.length === 0 ? (
            <p className="mt-6 text-[13.5px] text-[var(--rc-ink-muted)]">
              {t("No applications received yet — this chart fills in as families apply.")}
            </p>
          ) : (
            <div className="mt-8 flex h-[190px] items-end gap-2">
              {weekly.map((w, i) => {
                const h = Math.round((w.count / max) * 160);
                const last = i === weekly.length - 1;
                return (
                  <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[11px] font-medium text-[var(--rc-ink-muted)]">
                      {w.count}
                    </span>
                    <div
                      className="w-full rounded-t-[4px]"
                      style={{
                        height: h,
                        background: last ? "var(--rc-green)" : "#C2DBD4",
                      }}
                    />
                    <span className="text-[11px] text-[var(--rc-ink-faint)]">
                      {new Date(w.weekStart).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rc-card p-6">
          <h3 className="rc-serif text-[19px]">{t("Application funnel")}</h3>
          <ul className="mt-6 space-y-4">
            {funnel.map((f) => (
              <li key={f.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-medium">{t(f.label)}</span>
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
            {applications.length === 0
              ? t("No applications yet — the funnel fills in as your résidence receives files.")
              : t("{received} applications received, {pct}% result in a confirmed admission so far.", {
                  received: funnel[0].value,
                  pct: funnel[3].pct,
                })}
          </p>
        </div>
      </div>
    </div>
  );
}

function EtablissementView() {
  const t = useT();
  const { workspace, updateProfile, can } = useCommunityPortal();
  const profile = workspace?.profile;
  const accepting = profile?.acceptingApplications !== false;
  const receivedLast90d = useMemo(() => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return (workspace?.applications ?? []).filter((a) => {
      const ts = a.submittedAt ? new Date(a.submittedAt).getTime() : NaN;
      return Number.isFinite(ts) && ts >= cutoff;
    }).length;
  }, [workspace?.applications]);
  const canToggle =
    can("editAdmissions") || can("editProfile") || can("acceptDecline");
  // Real profile data only — no fictional residence identity as a
  // fallback. A brand-new (blank) profile shows an honest "not filled in
  // yet" placeholder instead of borrowing another business's details.
  const name = profile?.name || t("Untitled residence");
  const city = profile?.city || t("City not set");
  const description = profile?.description
    ? profile.description
    : t("No description yet — add one from the profile editor.");

  const toggleAccepting = async () => {
    if (!canToggle) return;
    const next = !accepting;
    const result = await updateProfile({ acceptingApplications: next });
    if (!result.ok) {
      window.alert(result.error || "Impossible d'enregistrer ce changement.");
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
              {t("New applications")}
            </p>
            <p className="mt-0.5 text-[13px] text-[var(--rc-ink-muted)]">
              {accepting
                ? t("Families can submit new files. Click to close.")
                : t("Intake is closed. Files already received remain active. Click to reopen.")}
            </p>
          </div>
          <span className="flex items-center gap-3">
            <span
              className="text-[13px] font-semibold"
              style={{ color: accepting ? "var(--rc-green-deep)" : "var(--rc-ink-muted)" }}
            >
              {accepting ? t("Applications open") : t("Applications closed")}
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
            {t("Preview of the page seen by families")}
          </p>
          <a href="/community/profile" className="rc-btn rc-btn-outline">
            {t("Edit the page")}
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
            {t("residence photo — front view")}
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
              {accepting ? t("Applications open") : t("Applications closed")}
            </span>
          </div>
          <p className="mt-2 text-[14.5px] text-[var(--rc-ink-muted)]">
            {city}
            {profile?.unitCount != null ? ` · ${profile.unitCount} ${t("units")}` : ""}
            {profile?.residenceType ? ` · ${profile.residenceType}` : ""}
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
                <span>{t("Type")}</span>
                <span>{t("Size")}</span>
                <span>{t("Indicative price")}</span>
                <span>{t("Availability")}</span>
              </div>
              {(profile?.roomTypes?.length ?? 0) === 0 ? (
                <div className="rc-table-row" style={{ display: "block", padding: "20px 4px" }}>
                  <p className="text-[13.5px] text-[var(--rc-ink-muted)]">
                    {t("No rates configured yet — add them from the profile editor.")}
                  </p>
                </div>
              ) : (
                profile!.roomTypes.map((room, i) => (
                  <div
                    key={`${room.name}-${i}`}
                    className="rc-table-row"
                    style={{
                      gridTemplateColumns: "1.2fr 1fr 1.1fr 1fr",
                      cursor: "default",
                    }}
                  >
                    <p className="text-[14.5px] font-semibold">{catalogLabel(t, room.name)}</p>
                    <p className="text-[14px] text-[var(--rc-ink-muted)]">{room.notes || "—"}</p>
                    <p className="text-[14px] font-medium">
                      {room.price != null ? `$${room.price.toLocaleString()}` : t("On request")}
                    </p>
                    <p className="text-[14px]">
                      {room.availableUnits != null
                        ? t("{count} available", { count: room.availableUnits })
                        : t("Not specified")}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <p className="rc-label mb-3">{t("Services included")}</p>
                <div className="flex flex-wrap gap-2">
                  {(profile?.services?.length ? profile.services : profile?.amenities ?? []).length === 0 ? (
                    <p className="text-[13.5px] text-[var(--rc-ink-muted)]">
                      {t("No services listed yet — add them from the profile editor.")}
                    </p>
                  ) : (
                    (profile?.services?.length ? profile!.services : profile!.amenities).map((s) => (
                      <span
                        key={s}
                        className="rc-pill"
                        style={{
                          background: "var(--rc-subtle)",
                          borderColor: "var(--rc-border)",
                          color: "var(--rc-ink)",
                        }}
                      >
                        {t(s)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div
                className="rounded-[10px] p-5 text-white"
                style={{ background: "var(--rc-black)" }}
              >
                <p className="rc-label" style={{ color: "#8E9B96" }}>
                  {t("From this page")}
                </p>
                <p className="rc-serif mt-3 text-[38px] leading-none">{receivedLast90d}</p>
                <p className="mt-2 text-[13.5px] text-[#C5D2CD]">
                  {t("applications submitted over the last 90 days")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
