"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ResidenceConsoleShell } from "@/components/residence-console/ResidenceConsole";
import { useAuth } from "@/lib/auth";
import { useCommunityPortal } from "@/lib/community-portal-store";
import { useMessaging } from "@/lib/messaging-store";
import {
  applicationCareType,
  applicationPriority,
  initialsFromName,
  type CommunityApplication,
} from "@/lib/community-portal";
import "./resident-application-profile.css";

const NOT_PROVIDED = "Non précisé";

const DECLINE_REASONS = [
  "Aucune unité disponible",
  "Besoins de soins trop élevés",
  "Budget non compatible",
  "Dossier incomplet",
] as const;

function present(value?: string | null) {
  return value?.trim() || NOT_PROVIDED;
}

function prettyToken(value?: string | null) {
  if (!value?.trim()) return NOT_PROVIDED;
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return NOT_PROVIDED;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function formatBudget(min?: string, max?: string) {
  const values = [min, max].map((value) => value?.trim()).filter(Boolean);
  if (!values.length) return NOT_PROVIDED;
  if (values.length === 1) return `${values[0]} $ / mois`;
  return `${values[0]} $ à ${values[1]} $ / mois`;
}

function statusMeta(status: CommunityApplication["status"]) {
  if (status === "approved" || status === "conditionally_approved") {
    return { label: "Acceptée", className: "rp-status rp-status--accepted" };
  }
  if (status === "declined") {
    return { label: "Refusée", className: "rp-status rp-status--declined" };
  }
  return { label: "En évaluation", className: "rp-status rp-status--review" };
}

function Field({ label, value }: { label: string; value?: string | null }) {
  const missing = !value?.trim();
  return (
    <div className="rp-field">
      <p className="rp-label">{label}</p>
      <p className={missing ? "rp-missing" : undefined}>{present(value)}</p>
    </div>
  );
}

function CollapsibleSection({
  title,
  summary,
  badge,
  children,
}: {
  title: string;
  summary?: string;
  badge?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rp-card rp-section">
      <button
        type="button"
        className="rp-section-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <span className="rp-h2">{title}</span>
          {summary ? <span className="rp-section-summary">{summary}</span> : null}
        </span>
        <span className="rp-section-toggle-end">
          {badge ? <span className="rp-chip rp-chip--terra">{badge}</span> : null}
          <span>{open ? "Réduire ▲" : "Afficher ▼"}</span>
        </span>
      </button>
      {open ? <div className="rp-section-body">{children}</div> : null}
    </section>
  );
}

function ContactCall({
  name,
  phone,
  dark = false,
}: {
  name: string;
  phone?: string;
  dark?: boolean;
}) {
  if (!phone?.trim()) {
    return <span className="rp-missing">{NOT_PROVIDED}</span>;
  }
  return (
    <a className={dark ? "rp-phone rp-phone--dark" : "rp-phone"} href={`tel:${phone}`}>
      <span>{phone}</span>
      <span className="rp-call-action">Appeler {name.split(" ")[0]}</span>
    </a>
  );
}

function autonomyTiles(app: CommunityApplication) {
  const dossier = app.dossier;
  const adls = new Map(
    (dossier?.adls ?? []).map((entry) => [entry.activity.toLowerCase(), entry.level]),
  );
  const adl = (needle: string) =>
    [...adls.entries()].find(([activity]) => activity.includes(needle))?.[1];
  return [
    {
      label: "Mobilité",
      value: dossier?.mobilityAids?.join(" · ") || app.careNeeds[0],
      tone: "help",
    },
    { label: "Hygiène", value: adl("bathing") || adl("toileting"), tone: "help" },
    {
      label: "Médication",
      value:
        dossier?.medications?.length || dossier?.medicationNotes
          ? "Assistance à valider"
          : undefined,
      tone: "assist",
    },
    { label: "Alimentation", value: dossier?.diet, tone: "independent" },
    { label: "Cognition", value: dossier?.cognitiveNotes, tone: "help" },
    { label: "Continence", value: dossier?.continence, tone: "independent" },
    {
      label: "Supervision",
      value: app.careNeeds.find((need) => /supervision|daily|quotid/i.test(need)),
      tone: "help",
    },
    {
      label: "Soins spécialisés",
      value: app.medicalHighlights[0] || dossier?.pathologies?.[0]?.name,
      tone: "assist",
    },
  ];
}

function ResidentMessages({
  app,
}: {
  app: CommunityApplication;
}) {
  const messaging = useMessaging();
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const thread = messaging.visibleThreads.find(
    (candidate) =>
      candidate.applicationId === app.id ||
      candidate.applicationId === app.id.replace("capp-shared-", ""),
  );
  const messages = thread?.messages ?? [];

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (thread) {
      const result = await messaging.sendMessage(thread.id, text);
      if (!result.ok) {
        setFeedback(
          result.sensitiveFlags?.length
            ? "Ce message semble contenir un renseignement sensible. Ouvrez la messagerie complète pour confirmer l’envoi."
            : "Le message n’a pas pu être envoyé.",
        );
        return;
      }
    } else {
      await messaging.startConversation({
        scope: "application",
        residenceId: app.residenceId,
        residenceName: "Équipe des admissions",
        avatar: initialsFromName(app.seniorName),
        applicationId: app.id,
        subject: `Dossier de ${app.seniorName}`,
        firstMessage: text,
        familyEmail: app.family.email,
        fromRole: "community",
      });
    }
    setDraft("");
    setFeedback("");
  };

  return (
    <div className="rp-thread">
      <div className="rp-thread-head">
        <span className="rp-label rp-label--dark">Échanges avec la famille</span>
        <span>Messagerie HavenApply</span>
      </div>
      <div className="rp-thread-list" aria-live="polite">
        {messages.length ? (
          messages.map((message) => (
            <article
              key={message.id}
              className={
                message.fromRole === "family"
                  ? "rp-message rp-message--family"
                  : "rp-message rp-message--residence"
              }
            >
              <p>{message.text}</p>
              <small>
                {message.senderName} · {message.time}
              </small>
            </article>
          ))
        ) : (
          <p className="rp-thread-empty">
            Aucun échange pour l’instant. Le premier message créera un fil lié à ce dossier.
          </p>
        )}
      </div>
      <form className="rp-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="resident-message">
          Écrire à {app.family.name}
        </label>
        <input
          id="resident-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Écrire à ${app.family.name.split(" ")[0] || "la famille"}…`}
        />
        <button type="submit">Envoyer</button>
      </form>
      {feedback ? <p className="rp-thread-feedback">{feedback}</p> : null}
    </div>
  );
}

export function ResidentApplicationProfile() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const {
    ready,
    workspace,
    getApplication,
    can,
    changeStatus,
    declineApplication,
    requestDocument,
    addInternalNote,
  } = useCommunityPortal();
  const app = getApplication(params.id);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] =
    useState<(typeof DECLINE_REASONS)[number]>("Aucune unité disponible");
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notesOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotesOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [notesOpen]);

  const profile = useMemo(() => {
    if (!app) return null;
    const received = app.documents.filter((document) => document.shared);
    const missingDocuments = app.dossierCompleteness?.missingDocuments ?? [];
    const totalDocuments = Math.max(received.length + missingDocuments.length, received.length, 1);
    const completeness =
      app.dossierCompleteness?.percent ??
      Math.round((received.length / totalDocuments) * 100);
    return {
      status: statusMeta(app.status),
      priority:
        applicationPriority(app) === "high"
          ? "Élevée"
          : applicationPriority(app) === "low"
            ? "Faible"
            : "Standard",
      careType: prettyToken(applicationCareType(app)),
      received,
      missingDocuments,
      completeness,
      missingItems: app.dossierCompleteness?.missingItems ?? [],
      tiles: autonomyTiles(app),
    };
  }, [app]);

  if (!ready) {
    return (
      <div className="rc-console flex min-h-screen items-center justify-center">
        Chargement du dossier…
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="rc-console rp-load-error">
        <div className="rp-card">
          <h1>Impossible de charger le dossier</h1>
          <p>
            Vérifiez que votre compte possède un accès actif à cette résidence, puis réessayez.
          </p>
          <div>
            <button className="rp-button rp-button--primary" onClick={() => window.location.reload()}>
              Réessayer
            </button>
            <button className="rp-button rp-button--outline" onClick={() => router.push("/community/dashboard")}>
              Retour aux demandes
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!app || !profile) {
    return (
      <ResidenceConsoleShell
        activeView="dossier"
        activeCount={workspace.applications.length}
        title="Profil du résident"
        subtitle="Lecture du dossier d’admission"
        onNavigate={() => router.push("/community/dashboard")}
      >
        <div className="rp-not-found">
          <h1 className="rc-serif">Dossier introuvable</h1>
          <p>Ce dossier n’appartient pas au périmètre de votre résidence.</p>
          <button className="rc-btn rc-btn-primary" onClick={() => router.push("/community/dashboard")}>
            Retour aux demandes
          </button>
        </div>
      </ResidenceConsoleShell>
    );
  }

  const dossier = app.dossier;
  const decisionAccepted = app.status === "approved" || app.status === "conditionally_approved";
  const decisionDeclined = app.status === "declined";
  const decisionReason = app.auditLog
    .slice()
    .reverse()
    .find((entry) => /declin|refus/i.test(entry.action))?.action;
  const noteCount = app.internalNotes.length;
  const noteAuthor = user?.name || "Équipe des admissions";
  const documentRequest = [
    ...profile.missingDocuments,
    ...profile.missingItems.filter((item) => /document|formulaire|procuration/i.test(item)),
  ].filter(Boolean);
  const addressCurrent = dossier?.currentAddress;
  const contactPreference = app.communicationPreference || NOT_PROVIDED;
  const housing = app.housingPreferences;
  const showAdequation = Boolean(
    workspace.availability?.length && (housing?.roomPreference || app.careType),
  );

  const accept = async () => {
    const result = await changeStatus(app.id, "approved");
    setNotice(result.ok ? "La décision est enregistrée dans HavenApply." : result.error || "");
  };
  const confirmDecline = async () => {
    const result = await declineApplication(app.id, declineReason);
    if (result.ok) {
      setDeclineOpen(false);
      setNotice("Le motif est enregistré dans l’historique du dossier.");
    } else {
      setNotice(result.error || "La décision n’a pas pu être enregistrée.");
    }
  };
  const undoDecision = async () => {
    const result = await changeStatus(app.id, "under_review");
    setNotice(result.ok ? "Le dossier est de nouveau en évaluation." : result.error || "");
  };
  const requestMissingDocuments = async () => {
    const labels = documentRequest.length
      ? documentRequest.join(", ")
      : "Documents complémentaires au dossier";
    const result = await requestDocument(app.id, labels);
    setNotice(
      result.ok
        ? "La demande de documents est enregistrée dans le dossier."
        : result.error || "",
    );
  };
  const addNote = async () => {
    const result = await addInternalNote(app.id, noteDraft);
    if (result.ok) {
      setNoteDraft("");
      setNotice("Note interne ajoutée.");
    } else {
      setNotice(result.error || "La note n’a pas pu être ajoutée.");
    }
  };

  return (
    <ResidenceConsoleShell
      activeView="dossier"
      activeCount={workspace.applications.filter((candidate) => candidate.status !== "closed").length}
      title="Profil du résident"
      subtitle="Lecture du dossier d’admission"
      onNavigate={(view) =>
        router.push(view === "demandes" ? "/community/dashboard" : `/community/dashboard?view=${view}`)
      }
    >
      <main className="rp-profile">
        <nav className="rp-breadcrumb" aria-label="Fil d’Ariane">
          <button type="button" onClick={() => router.push("/community/dashboard")}>Admissions</button>
          <span>/</span>
          <button type="button" onClick={() => router.push("/community/applications")}>Dossiers</button>
          <span>/</span>
          <strong>Profil du résident</strong>
        </nav>

        {notice ? <p className="rp-notice" role="status">{notice}</p> : null}

        <div className="rp-top-grid">
          <section className="rp-card rp-header-card">
            <div className="rp-title-row">
              <div className="rp-avatar" aria-hidden>{initialsFromName(app.seniorName)}</div>
              <div className="rp-name">
                <div className="rp-name-line">
                  <h1>{app.seniorName}</h1>
                  <span className={profile.status.className}>{profile.status.label}</span>
                </div>
                <p>
                  {app.seniorAge ? `${app.seniorAge} ans` : NOT_PROVIDED} · dossier ouvert le{" "}
                  {formatDate(app.submittedAt)} · dernière mise à jour{" "}
                  {formatDate(app.lastUpdated, true)}
                </p>
              </div>
              <div className="rp-actions">
                <button className="rp-button rp-button--outline" onClick={requestMissingDocuments} disabled={!can("requestDocuments")}>
                  Demander un document
                </button>
                <button className="rp-button rp-button--decline" onClick={() => setDeclineOpen(true)} disabled={!can("acceptDecline")}>
                  Refuser
                </button>
                <button className="rp-button rp-button--primary" onClick={accept} disabled={!can("acceptDecline")}>
                  Accepter la demande
                </button>
                <button
                  className="rp-more"
                  aria-label={`Ouvrir les notes du dossier (${noteCount})`}
                  onClick={() => setNotesOpen(true)}
                >
                  ··· <span>{noteCount}</span>
                </button>
              </div>
            </div>

            {decisionAccepted ? (
              <div className="rp-decision-banner rp-decision-banner--accepted">
                <p>
                  <strong>Demande acceptée</strong> — {app.seniorName.split(" ")[0]} est maintenant
                  dans le parcours de transition. La famille verra la décision dans HavenApply.
                </p>
                <button onClick={undoDecision}>Annuler la décision</button>
              </div>
            ) : null}
            {decisionDeclined ? (
              <div className="rp-decision-banner rp-decision-banner--declined">
                <p>
                  <strong>Demande refusée</strong> — {decisionReason || "motif consigné au dossier"}.
                </p>
                <button onClick={undoDecision}>Annuler la décision</button>
              </div>
            ) : null}

            {declineOpen && !decisionDeclined ? (
              <div className="rp-decline-panel">
                <h2>Motif du refus</h2>
                <div className="rp-reason-list" role="radiogroup" aria-label="Motif du refus">
                  {DECLINE_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      role="radio"
                      aria-checked={declineReason === reason}
                      className={declineReason === reason ? "is-active" : undefined}
                      onClick={() => setDeclineReason(reason)}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <p>
                  La famille verra ce motif dans HavenApply et le dossier restera consultable dans
                  les demandes refusées. Aucun courriel ou SMS externe n’est envoyé par ce bouton.
                </p>
                <div className="rp-panel-actions">
                  <button className="rp-button rp-button--terra" onClick={confirmDecline}>Confirmer le refus</button>
                  <button className="rp-button rp-button--outline" onClick={() => setDeclineOpen(false)}>Annuler</button>
                </div>
              </div>
            ) : null}

            <div className="rp-progress-head">
              <span className="rp-label">Dossier</span>
              <strong>{profile.completeness} % complété</strong>
              <span>{profile.missingItems.length} éléments à compléter</span>
            </div>
            <div className="rp-progress" aria-label={`Dossier complété à ${profile.completeness} %`}>
              <span style={{ width: `${profile.completeness}%` }} />
            </div>
            <div className="rp-summary-grid">
              <Field label="Entrée souhaitée" value={app.moveInRequested} />
              <div className="rp-field">
                <p className="rp-label">Priorité</p>
                <span className="rp-chip rp-chip--terra">{profile.priority}</span>
              </div>
              <Field label="Milieu recherché" value={housing?.communityTypes.join(" · ") || profile.careType} />
              <Field label="Budget estimé" value={formatBudget(housing?.budgetMin, housing?.budgetMax)} />
            </div>
          </section>

          <aside className="rp-contact-card">
            <div className="rp-contact-labels">
              <span className="rp-label rp-label--dark">Contact principal</span>
              <span>{present(app.decisionAuthority)}</span>
            </div>
            <div>
              <h2>{app.family.name}</h2>
              <p>{prettyToken(app.family.relationship)}</p>
            </div>
            <ContactCall name={app.family.name} phone={app.family.phone} dark />
            <div className="rp-contact-foot">
              <a href={`mailto:${app.family.email}`}>{present(app.family.email)}</a>
              <span>{contactPreference}</span>
            </div>
            <ResidentMessages app={app} />
          </aside>
        </div>

        <div className="rp-details-grid">
          <div className="rp-main-column">
            <CollapsibleSection
              title="Aperçu du dossier"
              badge={`${profile.missingItems.length} éléments à compléter`}
            >
              <p className="rp-context">
                {present(app.executiveSummary || app.summary)}
              </p>
              <div className="rp-info-grid">
                <Field label="Secteurs recherchés" value={housing?.preferredCities} />
                <Field label="Provenance" value={app.referralSource === "Family" ? "Déposée par la famille (HavenApply)" : app.referralSource} />
                <Field label="Adresse actuelle" value={addressCurrent} />
                <Field label="Référence externe" value={app.publicRef} />
              </div>
              {profile.missingItems.length || profile.missingDocuments.length ? (
                <div className="rp-warning">
                  <div>
                    <strong>Éléments à obtenir</strong>
                    <p>{[...profile.missingItems, ...profile.missingDocuments].join(" · ")}</p>
                  </div>
                  <button onClick={requestMissingDocuments}>Demander les documents manquants</button>
                </div>
              ) : null}
            </CollapsibleSection>

            <CollapsibleSection
              title="Autonomie et besoins"
              summary={`${present(dossier?.mobilityAids?.[0])}, ${profile.careType.toLowerCase()}`}
            >
              <div className="rp-autonomy-grid">
                {profile.tiles.map((tile) => (
                  <article key={tile.label} className={`rp-autonomy rp-autonomy--${tile.tone}`}>
                    <span className="rp-label">{tile.label}</span>
                    <strong className={!tile.value ? "rp-missing" : undefined}>
                      {present(tile.value)}
                    </strong>
                  </article>
                ))}
              </div>
              <div className="rp-section-foot">
                <span>Évaluation mise à jour le {formatDate(app.dossierLastUpdated)}</span>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Médication"
              badge={
                dossier?.medications?.length
                  ? `${dossier.medications.length} médicaments`
                  : dossier?.medicationNotes
                    ? "Liste à structurer"
                    : "Non précisé"
              }
            >
              <div className="rp-info-grid">
                <Field label="Gestion actuelle" value={dossier?.medicationNotes} />
                <Field label="Aide requise" value={profile.tiles.find((tile) => tile.label === "Médication")?.value} />
                <Field label="Pharmacie" value={dossier?.pharmacy} />
                <Field label="Allergies connues" value={dossier?.allergies.map((allergy) => allergy.substance).join(" · ")} />
              </div>
              {dossier?.medications?.length ? (
                <div className="rp-med-table" role="table" aria-label="Médication">
                  <div className="rp-med-row rp-med-head" role="row">
                    <span>Médicament</span><span>Dose</span><span>Fréquence</span><span>Indication</span>
                  </div>
                  {dossier.medications.map((medication, index) => (
                    <div className="rp-med-row" role="row" key={`${medication.name}-${index}`}>
                      <strong>{present(medication.name)}</strong>
                      <span>{present(medication.dose)}</span>
                      <span>{present(medication.frequency)}</span>
                      <span>{present(medication.indication)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rp-raw-medication">
                  {dossier?.medicationNotes
                    ? "La liste a été transmise en texte libre. Elle doit être validée et structurée par l’équipe clinique avant l’admission."
                    : "Aucune liste de médicaments n’a été transmise."}
                </p>
              )}
              <div className="rp-section-foot">
                <span>À valider par l’infirmière avant l’admission</span>
              </div>
            </CollapsibleSection>
          </div>

          <aside className="rp-side-column">
            <section className="rp-card rp-side-card">
              <h2 className="rp-h2">Personnes à joindre</h2>
              <div className="rp-person">
                <div className="rp-person-title">
                  <strong>{app.family.name}</strong>
                  <span className="rp-chip">Contact principal</span>
                </div>
                <p>{prettyToken(app.family.relationship)} · {contactPreference}</p>
                <ContactCall name={app.family.name} phone={app.family.phone} />
                <a className="rp-email" href={`mailto:${app.family.email}`}>{present(app.family.email)}</a>
              </div>
              <div className="rp-person">
                <div className="rp-person-title">
                  <strong>{present(app.emergencyContact?.name)}</strong>
                  <span className="rp-chip rp-chip--terra">Contact d’urgence</span>
                </div>
                <p>{prettyToken(app.emergencyContact?.relationship)}</p>
                <ContactCall name={app.emergencyContact?.name || "le contact"} phone={app.emergencyContact?.phone} />
                {app.emergencyContact?.email ? (
                  <a className="rp-email" href={`mailto:${app.emergencyContact.email}`}>{app.emergencyContact.email}</a>
                ) : <span className="rp-missing">{NOT_PROVIDED}</span>}
              </div>
            </section>

            <section className="rp-card rp-side-card">
              <div className="rp-side-title">
                <h2 className="rp-h2">Documents</h2>
                <span>{profile.received.length} reçus sur {profile.received.length + profile.missingDocuments.length}</span>
              </div>
              <div className="rp-doc-progress"><span style={{ width: `${profile.completeness}%` }} /></div>
              <ul className="rp-document-list">
                {profile.received.map((document) => (
                  <li key={document.id}>
                    <span className="rp-doc-dot rp-doc-dot--received" />
                    <strong>{document.name}</strong>
                    <small>Reçu</small>
                  </li>
                ))}
                {profile.missingDocuments.map((document) => (
                  <li key={document} className="is-missing">
                    <span className="rp-doc-dot" />
                    <strong>{document}</strong>
                    <small>Manquant</small>
                  </li>
                ))}
              </ul>
              <button className="rp-request-button" onClick={requestMissingDocuments}>
                Demander les documents manquants
              </button>
            </section>

            <CollapsibleSection
              title="Préférences de logement"
              summary={housing?.roomPreference ? prettyToken(housing.roomPreference) : NOT_PROVIDED}
            >
              {housing?.specialPreferencesNotes ? (
                <div className="rp-nonnegotiable">
                  <span>Non négociable</span>
                  <strong>{housing.specialPreferencesNotes}</strong>
                </div>
              ) : null}
              <div className="rp-preference-chips">
                {[
                  housing?.roomPreference,
                  ...(housing?.specialPreferences ?? []),
                  ...(housing?.communityTypes ?? []),
                ]
                  .filter(Boolean)
                  .map((preference) => <span key={preference}>{prettyToken(preference)}</span>)}
                {!housing?.roomPreference && !housing?.specialPreferences.length ? (
                  <em>{NOT_PROVIDED}</em>
                ) : null}
              </div>
            </CollapsibleSection>

            {showAdequation ? (
              <section className="rp-fit-card">
                <span className="rp-label">Adéquation avec la résidence</span>
                <strong>Bonne</strong>
                <p>
                  Le type de milieu recherché correspond aux services déclarés. La disponibilité,
                  le budget et l’accès sans escalier doivent être confirmés par une personne.
                </p>
                <button className="rp-button rp-button--outline">Proposer une unité</button>
              </section>
            ) : null}
          </aside>
        </div>
      </main>

      {notesOpen ? (
        <div className="rp-notes-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setNotesOpen(false);
        }}>
          <aside className="rp-notes-drawer" role="dialog" aria-modal="true" aria-labelledby="notes-title">
            <header>
              <div>
                <h2 id="notes-title">Notes du dossier</h2>
                <p>Visibles uniquement par l’équipe de la résidence</p>
              </div>
              <button aria-label="Fermer les notes" onClick={() => setNotesOpen(false)}>×</button>
            </header>
            <div className="rp-note-compose">
              <label htmlFor="internal-note">Ajouter une note interne</label>
              <textarea
                id="internal-note"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder={`Ajouter une note sur le dossier de ${app.seniorName.split(" ")[0]}…`}
              />
              <div>
                <span>Signée {noteAuthor}</span>
                <button className="rp-button rp-button--primary" onClick={addNote}>Ajouter la note</button>
              </div>
            </div>
            <div className="rp-note-list">
              {app.internalNotes
                .slice()
                .reverse()
                .map((note) => (
                  <article key={note.id}>
                    <div>
                      <strong>{note.author}</strong>
                      <time>{formatDate(note.at, true)}</time>
                      <span className="rp-chip">Suivi</span>
                    </div>
                    <p>{note.body}</p>
                  </article>
                ))}
              {!app.internalNotes.length ? (
                <p className="rp-empty-notes">Aucune note interne pour ce dossier.</p>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </ResidenceConsoleShell>
  );
}
