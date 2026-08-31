"use client";

import {
  PROFILE_STEPS,
  PROCHE_RELATIONSHIP_OPTIONS,
  computeFamilyDossierCompleteness,
  isFamilyProfileSelf,
  profileDisplayName,
  type FamilyProfile,
  type FamilyDoc,
  type DossierMode,
} from "@/data/family-space";
import {
  askAssistant,
  assistantOpener,
  assistantSuggestions,
  type AssistantTurn,
} from "@/data/assistant";
import { useT } from "@/lib/i18n/locale";

/** PROFILE_STEPS ships pre-set French labels; map each to its English source key for t(). */
const STEP_LABEL_KEYS: Record<string, string> = {
  "Pour qui": "Who it's for",
  Identité: "Identity",
  Contacts: "Contacts",
  "Statut légal": "Legal status",
  Assurances: "Insurance",
  Finances: "Finances",
  Soins: "Care",
  Recherche: "Search",
  Signature: "Signature",
};

/**
 * PROCHE_RELATIONSHIP_OPTIONS values are persisted as profile.rel; only the
 * displayed label is translated, the option `value` stays the original French text.
 */
const RELATIONSHIP_LABEL_KEYS: Record<string, string> = {
  Parent: "Parent",
  "Beau-parent": "Step-parent",
  "Conjoint / conjointe": "Spouse / partner",
  Enfant: "Child",
  "Frère / sœur": "Sibling",
  "Petit-enfant": "Grandchild",
  "Ami(e)": "Friend",
  "Aidant professionnel": "Professional caregiver",
  Autre: "Other",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fs-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function DossiersView({
  profiles,
  activeProfileId,
  mode,
  profileStep,
  claireOpen,
  chat,
  chatInput,
  claireTyping,
  onSelectProfile,
  onCreateProfile,
  onSetMode,
  onSetStep,
  onPatchActive,
  onUploadDoc,
  onWithdrawAccess,
  onToggleClaire,
  onChatInput,
  onSendChat,
  onSuggest,
  accountUser,
}: {
  profiles: FamilyProfile[];
  activeProfileId: string;
  mode: DossierMode;
  profileStep: number;
  claireOpen: boolean;
  chat: AssistantTurn[];
  chatInput: string;
  claireTyping: boolean;
  onSelectProfile: (id: string) => void;
  onCreateProfile: () => void;
  onSetMode: (mode: DossierMode) => void;
  onSetStep: (step: number) => void;
  onPatchActive: (patch: Partial<FamilyProfile>) => void;
  onUploadDoc: (docId: string) => void;
  onWithdrawAccess: (residenceId: string) => void;
  onToggleClaire: () => void;
  onChatInput: (v: string) => void;
  onSendChat: () => void;
  onSuggest: (msg: string) => void;
  accountUser?: { firstName: string; lastName: string; email: string };
}) {
  const t = useT();
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  if (!profiles.length || !activeProfile) {
    return (
      <div className="flex flex-col gap-6">
        <div className="fs-card flex flex-wrap items-start justify-between gap-4 p-6 md:p-7">
          <div className="max-w-2xl">
            <h1 className="fs-serif text-[28px] leading-tight md:text-[32px]">
              {t("Admission files")}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
            {t(
              "A file for you, or for someone you are supporting. The documents and details apply to every application submitted for this profile.",
            )}
          </p>
        </div>
        <button type="button" className="fs-btn fs-btn-outline shrink-0" onClick={onCreateProfile}>
          + {t("Create a file")}
        </button>
      </div>
        <div className="fs-card p-10 text-center">
          <h2 className="fs-serif text-[24px]">{t("No file yet")}</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-[var(--fs-ink-body)]">
            {t(
              "Indicate whether the file is for yourself or a loved one, then add the documents required to submit applications.",
            )}
          </p>
          <button type="button" className="fs-btn fs-btn-primary mt-6" onClick={onCreateProfile}>
            {t("Create a file")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="fs-card flex flex-wrap items-start justify-between gap-4 p-6 md:p-7">
        <div className="max-w-2xl">
          <h1 className="fs-serif text-[28px] leading-tight md:text-[32px]">
            {t("Admission files")}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
            {t(
              "One file per person you are supporting. A file's details and documents apply to every application submitted for that person.",
            )}
          </p>
        </div>
        <button type="button" className="fs-btn fs-btn-outline shrink-0" onClick={onCreateProfile}>
          + {t("Create a file")}
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {profiles.map((p) => {
          const active = p.id === activeProfile.id;
          const prog = computeFamilyDossierCompleteness(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectProfile(p.id)}
              className="fs-card shrink-0 p-5 text-left transition-colors"
              style={{
                minWidth: 246,
                borderRadius: 11,
                background: active ? "var(--fs-black)" : undefined,
                borderColor: active ? "var(--fs-black)" : undefined,
                color: active ? "#fff" : undefined,
              }}
            >
              <span
                className="fs-pill"
                style={
                  p.draft
                    ? { background: "var(--fs-terra-bg)", color: "var(--fs-terra)" }
                    : active
                      ? { background: "rgba(255,255,255,0.14)", color: "#fff" }
                      : { background: "var(--fs-green-tint)", color: "#0A6F63" }
                }
              >
                {p.draft ? t("Draft") : t("Active")}
              </span>
              <p className="fs-serif mt-3 text-[18px] leading-snug">{profileDisplayName(p)}</p>
              <p
                className="mt-1 text-[13px]"
                style={{ color: active ? "#C5D2CD" : "var(--fs-ink-muted)" }}
              >
                {p.draft
                  ? t("In progress · {percent}%", { percent: prog.percent })
                  : t("{rel} · {percent}% complete", { rel: p.rel, percent: prog.percent })}
              </p>
              <div
                className="mt-3 h-[5px] overflow-hidden rounded-full"
                style={{ background: active ? "rgba(255,255,255,0.18)" : "var(--fs-subtle)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${prog.percent}%`,
                    background: active ? "var(--fs-green-light)" : "var(--fs-green)",
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="fs-pill"
          style={{
            cursor: "pointer",
            background: mode === "overview" ? "var(--fs-black)" : "var(--fs-subtle)",
            color: mode === "overview" ? "#fff" : "var(--fs-ink-muted)",
          }}
          onClick={() => onSetMode("overview")}
        >
          {t("Overview")}
        </button>
        <button
          type="button"
          className="fs-pill"
          style={{
            cursor: "pointer",
            background: mode === "edition" ? "var(--fs-black)" : "var(--fs-subtle)",
            color: mode === "edition" ? "#fff" : "var(--fs-ink-muted)",
          }}
          onClick={() => onSetMode("edition")}
        >
          {t("Information and documents")}
        </button>
      </div>

      {mode === "overview" ? (
        <OverviewMode
          profile={activeProfile}
          onSetMode={onSetMode}
          onPatchActive={onPatchActive}
          onUploadDoc={onUploadDoc}
          onWithdrawAccess={onWithdrawAccess}
        />
      ) : (
        <EditionMode
          profile={activeProfile}
          profileStep={profileStep}
          onSetStep={onSetStep}
          onPatchActive={onPatchActive}
          onSetMode={onSetMode}
          claireOpen={claireOpen}
          onToggleClaire={onToggleClaire}
          chat={chat}
          chatInput={chatInput}
          claireTyping={claireTyping}
          onChatInput={onChatInput}
          onSendChat={onSendChat}
          onSuggest={onSuggest}
          accountUser={accountUser}
        />
      )}
    </div>
  );
}

function OverviewMode({
  profile,
  onSetMode,
  onPatchActive,
  onUploadDoc,
  onWithdrawAccess,
}: {
  profile: FamilyProfile;
  onSetMode: (mode: DossierMode) => void;
  onPatchActive: (patch: Partial<FamilyProfile>) => void;
  onUploadDoc: (docId: string) => void;
  onWithdrawAccess: (residenceId: string) => void;
}) {
  const t = useT();
  const progress = computeFamilyDossierCompleteness(profile);
  const docsReceived = progress.docsReceived;
  const docsTotal = progress.docsTotal;
  const meta = [
    [t("Autonomy level"), profile.draft || !profile.autonomie ? t("To be determined") : profile.autonomie],
    [
      t("Autonomy score"),
      profile.autonomyScore != null ? `${profile.autonomyScore}/10` : t("To be determined"),
    ],
    [t("Desired services"), profile.draft || !profile.services ? t("To be determined") : profile.services],
    [
      t("Search"),
      [
        profile.searchSector,
        profile.searchBudgetMax ? t("max {amount} $", { amount: profile.searchBudgetMax }) : null,
      ]
        .filter(Boolean)
        .join(" · ") || t("To be determined"),
    ],
    [t("Monthly budget"), profile.draft || !profile.budget ? t("To be determined") : profile.budget],
    [t("Desired move-in"), profile.draft || !profile.move ? t("To be determined") : profile.move],
  ];

  return (
    <div className="fs-grid-main grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-5">
        {profile.draft ? (
          <div
            className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] px-5 py-4"
            style={{ background: "var(--fs-terra-bg)" }}
          >
            <p className="max-w-xl text-[14.5px] leading-relaxed" style={{ color: "var(--fs-terra)" }}>
              {t(
                "This file was just created. Fill in the applicant's information so it can be sent to residences.",
              )}
            </p>
            <button
              type="button"
              className="fs-btn fs-btn-primary shrink-0"
              onClick={() => onSetMode("edition")}
            >
              {t("Get started")}
            </button>
          </div>
        ) : null}

        <div className="fs-card p-6">
          <div className="flex flex-wrap gap-5">
            <label className="cursor-pointer">
              <div
                className="overflow-hidden rounded-lg bg-[var(--fs-subtle)]"
                style={{ width: 132, height: 158 }}
              >
                {profile.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-3 text-center text-[12px] text-[var(--fs-ink-faint)]">
                    {t("Add a photo")}
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPatchActive({ photo: URL.createObjectURL(file) });
                }}
              />
              <p className="mt-2 max-w-[132px] text-[12px] text-[var(--fs-ink-faint)]">
                {t("Visible to residences")}
              </p>
            </label>
            <div className="min-w-0 flex-1">
              <h2 className="fs-serif text-[28px] leading-tight">{profileDisplayName(profile)}</h2>
              <p className="mt-2 text-[14.5px] text-[var(--fs-ink-muted)]">
                {profile.draft ? t("File in progress") : `${profile.rel} · ${profile.meta}`}
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {meta.map(([l, v]) => (
                  <div key={l}>
                    <p className="fs-label">{l}</p>
                    <p className="mt-1 text-[15px] font-medium">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  className="fs-btn fs-btn-outline"
                  onClick={() => onSetMode("edition")}
                >
                  {t("Edit information")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="fs-card p-6">
          <h3 className="fs-serif text-[22px]">{t("Documents")}</h3>
          <p className="mt-1 text-[13.5px] text-[var(--fs-ink-muted)]">
            {t(
              "{docsReceived} of {docsTotal} documents · the same documents apply to every application for this file",
              { docsReceived, docsTotal },
            )}
          </p>
          <ul className="mt-5 divide-y divide-[var(--fs-border-faint)]">
            {profile.docs.map((d) => (
              <DocRow key={d.id} doc={d} onUpload={() => onUploadDoc(d.id)} />
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="fs-card p-6 text-white" style={{ background: "var(--fs-black)" }}>
          <p className="fs-label" style={{ color: "#8E9B96" }}>
            {t("File progress")}
          </p>
          <p className="fs-serif mt-3 text-[44px] leading-none">{progress.percent} %</p>
          <p className="mt-2 text-[13px] text-[#8E9B96]">
            {t("{fieldsDone} of {fieldsTotal} sections · {docsReceived} of {docsTotal} documents", {
              fieldsDone: progress.fieldsDone,
              fieldsTotal: progress.fieldsTotal,
              docsReceived,
              docsTotal,
            })}
          </p>
          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${progress.percent}%`, background: "var(--fs-green-light)" }}
            />
          </div>
          <p className="mt-4 text-[14px] text-[#C5D2CD]">
            {progress.next
              ? t("Next action: {action}.", {
                  action: `${progress.next.charAt(0).toLowerCase()}${progress.next.slice(1)}`,
                })
              : t("File complete — information and documents are up to date.")}
          </p>
        </div>

        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">{t("Who can see this file")}</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
            {t(
              "These residences have received this file and can view the information and documents it contains. You can withdraw access at any time.",
            )}
          </p>
          <ul className="mt-4 divide-y divide-[var(--fs-border-faint)]">
            {profile.accesses.length === 0 ? (
              <li className="py-3 text-[14.5px] text-[var(--fs-ink-muted)]">
                {t("No residence has access to this file yet.")}
              </li>
            ) : (
              profile.accesses.map((a) => (
                <li key={a.residenceId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <span className="block text-[14.5px] font-medium">{a.residenceName}</span>
                    <span className="mt-0.5 block text-[13px] text-[var(--fs-ink-muted)]">
                      {a.city}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-[13.5px] font-semibold text-[var(--fs-ink-muted)] hover:text-[var(--fs-terra)]"
                    onClick={() => {
                      if (
                        window.confirm(
                          t("Withdraw {name}'s access to this file?", { name: a.residenceName }),
                        )
                      ) {
                        onWithdrawAccess(a.residenceId);
                      }
                    }}
                  >
                    {t("Withdraw access")}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function DocRow({ doc, onUpload }: { doc: FamilyDoc; onUpload: () => void }) {
  const t = useT();
  const received = doc.status === "reçu";
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3.5">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: received ? "var(--fs-success)" : "var(--fs-terra)" }}
        />
        <div>
          <p className="font-semibold">{doc.name}</p>
          <p className="text-[13px] text-[var(--fs-ink-muted)]">{doc.detail}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="text-[13.5px] font-semibold"
          style={{ color: received ? "var(--fs-success)" : "var(--fs-terra)" }}
        >
          {received ? t("Received") : t("Pending")}
        </span>
        <label className="fs-btn fs-btn-outline cursor-pointer">
          {received ? t("Replace") : t("Upload")}
          <input
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
            onChange={onUpload}
          />
        </label>
      </div>
    </li>
  );
}

function EditionMode({
  profile,
  profileStep,
  onSetStep,
  onPatchActive,
  onSetMode,
  claireOpen,
  onToggleClaire,
  chat,
  chatInput,
  claireTyping,
  onChatInput,
  onSendChat,
  onSuggest,
  accountUser,
}: {
  profile: FamilyProfile;
  profileStep: number;
  onSetStep: (step: number) => void;
  onPatchActive: (patch: Partial<FamilyProfile>) => void;
  onSetMode: (mode: DossierMode) => void;
  claireOpen: boolean;
  onToggleClaire: () => void;
  chat: AssistantTurn[];
  chatInput: string;
  claireTyping: boolean;
  onChatInput: (v: string) => void;
  onSendChat: () => void;
  onSuggest: (msg: string) => void;
  accountUser?: { firstName: string; lastName: string; email: string };
}) {
  const t = useT();
  const totalSteps = PROFILE_STEPS.length;
  const isLast = profileStep >= totalSteps - 1;
  const forSelf = isFamilyProfileSelf(profile);
  const canProceed =
    profileStep !== 0 ||
    (profile.profileSubject === "self" ||
      (profile.profileSubject === "proche" && Boolean(profile.rel.trim())));

  const finishOrNext = () => {
    if (!canProceed) return;
    if (isLast) {
      onPatchActive({ draft: false });
      onSetMode("overview");
      return;
    }
    onSetStep(Math.min(totalSteps - 1, profileStep + 1));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="fs-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="fs-serif text-[26px] leading-tight">
              {profile.draft
                ? forSelf
                  ? t("Creating your file")
                  : profile.profileSubject === "proche"
                    ? t("Creating a loved one's file")
                    : t("New admission file")
                : t("{name}'s file", { name: profileDisplayName(profile) })}
            </h2>
            <p className="mt-2 max-w-2xl text-[14.5px] text-[var(--fs-ink-body)]">
              {t(
                "You can pause at any time and pick up later: your answers are saved at every step.",
              )}
            </p>
          </div>
          <p className="shrink-0 text-[14px] font-medium text-[var(--fs-ink-muted)]">
            {t("Step {current} of {total}", { current: profileStep + 1, total: totalSteps })}
          </p>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--fs-subtle)]">
          <div
            className="h-full rounded-full bg-[var(--fs-green)]"
            style={{ width: `${((profileStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROFILE_STEPS.map((label, i) => {
            const on = i === profileStep;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onSetStep(i)}
                className="fs-pill"
                style={{
                  cursor: "pointer",
                  background: on ? "var(--fs-black)" : "var(--fs-subtle)",
                  color: on ? "#fff" : "var(--fs-ink-muted)",
                }}
              >
                {i + 1}. {t(STEP_LABEL_KEYS[label] ?? label)}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`fs-grid-main grid gap-5 ${claireOpen ? "lg:grid-cols-[1fr_372px]" : ""}`}
      >
        <div className="fs-card p-6">
          <EditionStepFields
            step={profileStep}
            profile={profile}
            onPatchActive={onPatchActive}
            accountUser={accountUser}
          />

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--fs-border)] pt-5">
            <button
              type="button"
              className="fs-btn fs-btn-outline"
              disabled={profileStep === 0}
              onClick={() => onSetStep(Math.max(0, profileStep - 1))}
            >
              {t("Previous")}
            </button>
            <p className="text-[13.5px] text-[var(--fs-ink-muted)]">
              {t("Step {current} of {total}", { current: profileStep + 1, total: totalSteps })}
              {!canProceed ? ` · ${t("choose who this file is for")}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="fs-btn fs-btn-outline"
                onClick={() => onSetMode("overview")}
              >
                {t("Save and view file")}
              </button>
              <button
                type="button"
                className="fs-btn fs-btn-primary"
                disabled={!canProceed}
                onClick={finishOrNext}
              >
                {isLast ? t("Finish") : t("Next")}
              </button>
            </div>
          </div>
        </div>

        <div className="order-last flex flex-col gap-3 lg:order-none">
          <button
            type="button"
            className="fs-btn fs-btn-outline self-start"
            onClick={onToggleClaire}
          >
            {t("Fill in with Claire")}
          </button>
          {claireOpen ? (
            <aside className="fs-claire-sticky sticky top-[74px] h-fit">
              <ClairePanel
                profileStep={profileStep}
                chat={chat}
                chatInput={chatInput}
                claireTyping={claireTyping}
                onChatInput={onChatInput}
                onSendChat={onSendChat}
                onSuggest={onSuggest}
              />
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ClairePanel({
  profileStep,
  chat,
  chatInput,
  claireTyping,
  onChatInput,
  onSendChat,
  onSuggest,
}: {
  profileStep: number;
  chat: AssistantTurn[];
  chatInput: string;
  claireTyping: boolean;
  onChatInput: (v: string) => void;
  onSendChat: () => void;
  onSuggest: (msg: string) => void;
}) {
  const t = useT();
  const suggestions = assistantSuggestions(profileStep);
  const turns = chat.length > 0 ? chat : [{ from: "claire" as const, body: assistantOpener(profileStep) }];

  return (
    <div className="fs-card flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 text-white" style={{ background: "var(--fs-black)" }}>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold"
          style={{ background: "var(--fs-black-soft)" }}
        >
          C
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{t("Claire, your assistant")}</p>
          <p className="text-[12px] text-[#8E9B96]">
            {claireTyping ? t("Claire is typing…") : t("She fills in the file with you")}
          </p>
        </div>
      </div>
      <div className="max-h-[360px] space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
        {turns.map((m, i) => (
          <div key={`${i}-${m.body.slice(0, 12)}`} className={`flex ${m.from === "family" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[90%] px-3 py-2 text-[14px] leading-relaxed"
              style={
                m.from === "family"
                  ? { background: "var(--fs-green)", color: "#fff", borderRadius: "12px 12px 4px 12px" }
                  : { background: "var(--fs-hover)", borderRadius: "12px 12px 12px 4px" }
              }
            >
              {m.body}
            </div>
          </div>
        ))}
        {claireTyping ? (
          <div className="flex justify-start">
            <div
              className="px-3 py-2 text-[13px] text-[var(--fs-ink-muted)]"
              style={{ background: "var(--fs-hover)", borderRadius: "12px 12px 12px 4px" }}
            >
              {t("Claire is typing…")}
            </div>
          </div>
        ) : null}
      </div>
      <div className="space-y-2 border-t border-[var(--fs-border)] p-3">
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={claireTyping}
              onClick={() => onSuggest(s)}
              className="rounded-[20px] border border-[var(--fs-border)] bg-white px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-[var(--fs-hover)] disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSendChat();
          }}
        >
          <input
            className="fs-input"
            placeholder={t("Reply to Claire…")}
            value={chatInput}
            disabled={claireTyping}
            onChange={(e) => onChatInput(e.target.value)}
            aria-label={t("Message to Claire")}
          />
          <button type="submit" className="fs-btn fs-btn-primary" disabled={claireTyping || !chatInput.trim()}>
            {t("Send")}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditionStepFields({
  step,
  profile,
  onPatchActive,
  accountUser,
}: {
  step: number;
  profile: FamilyProfile;
  onPatchActive: (patch: Partial<FamilyProfile>) => void;
  accountUser?: { firstName: string; lastName: string; email: string };
}) {
  const t = useT();
  const forSelf = isFamilyProfileSelf(profile);

  if (step === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="fs-serif text-[24px] leading-tight">{t("Who is this file for?")}</p>
          <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
            {t(
              "HavenApply can be used for your own residence search or to support a loved one. The journey adapts to your choice.",
            )}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-[16px] border-2 p-5 text-left transition"
            style={{
              borderColor:
                profile.profileSubject === "self" ? "var(--fs-green)" : "var(--fs-border)",
              background:
                profile.profileSubject === "self" ? "var(--fs-green-tint)" : "var(--fs-surface)",
            }}
            onClick={() =>
              onPatchActive({
                profileSubject: "self",
                rel: "Moi-même",
                prenom: profile.prenom || accountUser?.firstName || "",
                nom: profile.nom || accountUser?.lastName || "",
              })
            }
          >
            <p className="fs-serif text-[22px]">{t("For myself")}</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
              {t("I'm creating my admission file and searching for a residence for myself.")}
            </p>
          </button>
          <button
            type="button"
            className="rounded-[16px] border-2 p-5 text-left transition"
            style={{
              borderColor:
                profile.profileSubject === "proche" ? "var(--fs-green)" : "var(--fs-border)",
              background:
                profile.profileSubject === "proche" ? "var(--fs-green-tint)" : "var(--fs-surface)",
            }}
            onClick={() =>
              onPatchActive({
                profileSubject: "proche",
                rel:
                  profile.rel && profile.rel !== "Moi-même" ? profile.rel : "",
              })
            }
          >
            <p className="fs-serif text-[22px]">{t("For a loved one")}</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
              {t("I'm supporting a parent, spouse, friend, or other person in their search.")}
            </p>
          </button>
        </div>
        {profile.profileSubject === "proche" ? (
          <Field label={t("Relationship to this person")}>
            <select
              className="fs-input max-w-md"
              value={profile.rel}
              onChange={(e) => onPatchActive({ rel: e.target.value })}
              aria-label={t("Relationship to the loved one")}
            >
              <option value="">{t("Choose…")}</option>
              {PROCHE_RELATIONSHIP_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(RELATIONSHIP_LABEL_KEYS[opt] ?? opt)}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {profile.profileSubject === "self" ? (
          <p className="text-[14px] text-[var(--fs-ink-muted)]">
            {t("The Identity step can reuse your account name")}
            {accountUser?.firstName ? ` (${accountUser.firstName})` : ""}.
          </p>
        ) : null}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        <p className="text-[14.5px] text-[var(--fs-ink-body)]">
          {forSelf
            ? t("Your personal information for the admission file.")
            : t("Information about the person seeking a residence.")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t("First name")}>
          <input
            className="fs-input"
            value={profile.prenom}
            onChange={(e) => onPatchActive({ prenom: e.target.value })}
            autoComplete="given-name"
          />
        </Field>
        <Field label={t("Last name")}>
          <input
            className="fs-input"
            value={profile.nom}
            onChange={(e) => onPatchActive({ nom: e.target.value })}
            autoComplete="family-name"
          />
        </Field>
        <Field label={t("Date of birth")}>
          <input
            className="fs-input"
            type="date"
            value={profile.dateNaissance}
            onChange={(e) => onPatchActive({ dateNaissance: e.target.value })}
          />
        </Field>
        <Field label={t("Sex")}>
          <select
            className="fs-input"
            value={profile.sexe}
            onChange={(e) => onPatchActive({ sexe: e.target.value })}
            aria-label={t("Sex")}
          >
            <option value="">{t("To be determined")}</option>
            <option value="Femme">{t("Female")}</option>
            <option value="Homme">{t("Male")}</option>
            <option value="Autre">{t("Other")}</option>
            <option value="Préfère ne pas dire">{t("Prefer not to say")}</option>
          </select>
        </Field>
        <Field label={t("Current address")}>
          <input
            className="fs-input"
            value={profile.adresse}
            onChange={(e) => onPatchActive({ adresse: e.target.value })}
            autoComplete="street-address"
          />
        </Field>
        <Field label={t("City")}>
          <input
            className="fs-input"
            value={profile.ville}
            onChange={(e) => onPatchActive({ ville: e.target.value })}
            autoComplete="address-level2"
          />
        </Field>
        <Field label={t("Province")}>
          <input
            className="fs-input"
            value={profile.province}
            onChange={(e) => onPatchActive({ province: e.target.value })}
            autoComplete="address-level1"
          />
        </Field>
        <Field label={t("Postal code")}>
          <input
            className="fs-input"
            value={profile.codePostal}
            onChange={(e) => onPatchActive({ codePostal: e.target.value })}
            autoComplete="postal-code"
          />
        </Field>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("Primary contact name")}>
          <input
            className="fs-input"
            value={profile.contactPrincipalNom}
            onChange={(e) => onPatchActive({ contactPrincipalNom: e.target.value })}
          />
        </Field>
        <Field label={forSelf ? t("Relationship to you") : t("Relationship to the applicant")}>
          <input
            className="fs-input"
            value={profile.contactPrincipalLien}
            onChange={(e) => onPatchActive({ contactPrincipalLien: e.target.value })}
          />
        </Field>
        <Field label={t("Phone")}>
          <input
            className="fs-input"
            value={profile.contactPrincipalTel}
            onChange={(e) => onPatchActive({ contactPrincipalTel: e.target.value })}
            autoComplete="tel"
          />
        </Field>
        <Field label={t("Email")}>
          <input
            className="fs-input"
            type="email"
            value={profile.contactPrincipalCourriel}
            onChange={(e) => onPatchActive({ contactPrincipalCourriel: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field label={t("Secondary contact name")}>
          <input
            className="fs-input"
            value={profile.contactSecondaireNom}
            onChange={(e) => onPatchActive({ contactSecondaireNom: e.target.value })}
          />
        </Field>
        <Field label={forSelf ? t("Relationship to you") : t("Relationship to the applicant")}>
          <input
            className="fs-input"
            value={profile.contactSecondaireLien}
            onChange={(e) => onPatchActive({ contactSecondaireLien: e.target.value })}
          />
        </Field>
        <Field label={t("Phone")}>
          <input
            className="fs-input"
            value={profile.contactSecondaireTel}
            onChange={(e) => onPatchActive({ contactSecondaireTel: e.target.value })}
          />
        </Field>
        <Field label={t("Email")}>
          <input
            className="fs-input"
            type="email"
            value={profile.contactSecondaireCourriel}
            onChange={(e) => onPatchActive({ contactSecondaireCourriel: e.target.value })}
          />
        </Field>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <YesNoField
          label={t("Protection mandate")}
          value={profile.mandatProtection}
          onChange={(v) => onPatchActive({ mandatProtection: v })}
        />
        <YesNoField
          label={t("Power of attorney")}
          value={profile.procuration}
          onChange={(v) => onPatchActive({ procuration: v })}
        />
        <YesNoField
          label={t("Curatorship")}
          value={profile.curatelle}
          onChange={(v) => onPatchActive({ curatelle: v })}
        />
        <Field label={t("Advance medical directives")}>
          <input
            className="fs-input"
            value={profile.directivesMedicales}
            onChange={(e) => onPatchActive({ directivesMedicales: e.target.value })}
            placeholder={t("Yes / No / details")}
          />
        </Field>
        <Field label={t("Mandatary's name")}>
          <input
            className="fs-input"
            value={profile.nomMandataire}
            onChange={(e) => onPatchActive({ nomMandataire: e.target.value })}
          />
        </Field>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t("Health insurance")}>
          <input
            className="fs-input"
            value={profile.assuranceMaladie}
            onChange={(e) => onPatchActive({ assuranceMaladie: e.target.value })}
          />
        </Field>
        <Field label={t("Private insurance")}>
          <input
            className="fs-input"
            value={profile.assurancePrivee}
            onChange={(e) => onPatchActive({ assurancePrivee: e.target.value })}
          />
        </Field>
        <Field label={t("Policy number")}>
          <input
            className="fs-input"
            value={profile.numeroPolice}
            onChange={(e) => onPatchActive({ numeroPolice: e.target.value })}
          />
        </Field>
        <Field label={t("Life insurance")}>
          <input
            className="fs-input"
            value={profile.assuranceVie}
            onChange={(e) => onPatchActive({ assuranceVie: e.target.value })}
          />
        </Field>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("Monthly income")}>
          <input
            className="fs-input"
            value={profile.revenusMensuels}
            onChange={(e) => onPatchActive({ revenusMensuels: e.target.value })}
          />
        </Field>
        <Field label={t("Income sources")}>
          <input
            className="fs-input"
            value={profile.sourcesRevenus}
            onChange={(e) => onPatchActive({ sourcesRevenus: e.target.value })}
          />
        </Field>
        <Field label={t("Financial guarantor")}>
          <input
            className="fs-input"
            value={profile.garantFinancier}
            onChange={(e) => onPatchActive({ garantFinancier: e.target.value })}
          />
        </Field>
        <Field label={t("Payment method")}>
          <input
            className="fs-input"
            value={profile.modePaiement}
            onChange={(e) => onPatchActive({ modePaiement: e.target.value })}
            placeholder={t("Private, insurance…")}
          />
        </Field>
      </div>
    );
  }

  if (step === 6) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3 rounded-[12px] border border-[var(--fs-border)] bg-[var(--fs-subtle)] p-4">
          <p className="fs-label mb-2">{t("Physical autonomy (1 to 10)")}</p>
          <p className="mb-3 text-[13.5px] text-[var(--fs-ink-muted)]">
            {t(
              "1 = not autonomous at all · 10 = 100% autonomous. This score guides matching with RPA categories.",
            )}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              className="w-full max-w-md accent-[var(--fs-green)]"
              value={profile.autonomyScore ?? 5}
              onChange={(e) => {
                const n = Number(e.target.value);
                onPatchActive({
                  autonomyScore: n,
                  autonomie:
                    n <= 3
                      ? `${n}/10 — peu autonome`
                      : n <= 6
                        ? `${n}/10 — semi-autonome`
                        : n <= 8
                          ? `${n}/10 — assez autonome`
                          : `${n}/10 — très autonome`,
                });
              }}
              aria-label={t("Autonomy score from 1 to 10")}
            />
            <span className="fs-serif text-[28px] tabular-nums text-[var(--fs-green)]">
              {profile.autonomyScore ?? "—"}
              <span className="text-[14px] text-[var(--fs-ink-muted)]"> /10</span>
            </span>
          </div>
          {!profile.autonomyScore ? (
            <button
              type="button"
              className="fs-btn fs-btn-outline mt-3"
              onClick={() =>
                onPatchActive({
                  autonomyScore: 5,
                  autonomie: "5/10 — semi-autonome",
                })
              }
            >
              {t("Set to 5/10 to get started")}
            </button>
          ) : null}
        </div>
        <Field label={t("Autonomy level (label)")}>
          <input
            className="fs-input"
            value={profile.autonomie === "À préciser" ? "" : profile.autonomie}
            onChange={(e) => onPatchActive({ autonomie: e.target.value })}
          />
        </Field>
        <Field label={t("Mobility")}>
          <input
            className="fs-input"
            value={profile.mobilite}
            onChange={(e) => onPatchActive({ mobilite: e.target.value })}
          />
        </Field>
        <Field label={t("Meal assistance")}>
          <input
            className="fs-input"
            value={profile.aideRepas}
            onChange={(e) => onPatchActive({ aideRepas: e.target.value })}
          />
        </Field>
        <Field label={t("Hygiene assistance")}>
          <input
            className="fs-input"
            value={profile.aideHygiene}
            onChange={(e) => onPatchActive({ aideHygiene: e.target.value })}
          />
        </Field>
        <Field label={t("Medication assistance")}>
          <input
            className="fs-input"
            value={profile.aideMedication}
            onChange={(e) => onPatchActive({ aideMedication: e.target.value })}
          />
        </Field>
        <Field label={t("Allergies")}>
          <input
            className="fs-input"
            value={profile.allergies}
            onChange={(e) => onPatchActive({ allergies: e.target.value })}
          />
        </Field>
        <Field label={t("Diet")}>
          <input
            className="fs-input"
            value={profile.regimeAlimentaire}
            onChange={(e) => onPatchActive({ regimeAlimentaire: e.target.value })}
          />
        </Field>
      </div>
    );
  }

  if (step === 7) {
    const Priority = ({
      label,
      value,
      onChange,
    }: {
      label: string;
      value: number;
      onChange: (n: number) => void;
    }) => (
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[13px] text-[var(--fs-ink-muted)]">{label}</p>
          <span className="text-[13px] font-semibold tabular-nums">{value}/5</span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          className="w-full accent-[var(--fs-green)]"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
      </div>
    );

    return (
      <div className="space-y-6">
        <div>
          <p className="fs-serif text-[20px]">{t("What you're looking for")}</p>
          <p className="mt-1 max-w-[640px] text-[14.5px] text-[var(--fs-ink-body)]">
            {t(
              "Separate from the care profile: these criteria drive the match score (area, budget, size) and priority weighting.",
            )}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("Desired area / city")}>
            <input
              className="fs-input"
              value={profile.searchSector}
              onChange={(e) => onPatchActive({ searchSector: e.target.value })}
              placeholder={t("E.g. Sillery, Lévis, Montreal…")}
            />
          </Field>
          <Field label={t("Max radius (km)")}>
            <input
              className="fs-input"
              type="number"
              min={5}
              max={200}
              value={profile.searchRadiusKm ?? ""}
              onChange={(e) =>
                onPatchActive({
                  searchRadiusKm: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="25"
            />
          </Field>
          <Field label={t("Max monthly budget ($)")}>
            <input
              className="fs-input"
              type="number"
              min={500}
              step={100}
              value={profile.searchBudgetMax ?? ""}
              onChange={(e) =>
                onPatchActive({
                  searchBudgetMax: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="3500"
            />
          </Field>
          <Field label={t("Facility size")}>
            <select
              className="fs-input"
              value={profile.searchSize}
              onChange={(e) =>
                onPatchActive({
                  searchSize: e.target.value as FamilyProfile["searchSize"],
                })
              }
            >
              <option value="any">{t("No preference")}</option>
              <option value="small">{t("Small (< 40 units)")}</option>
              <option value="medium">{t("Medium (40–99)")}</option>
              <option value="large">{t("Large (100+)")}</option>
            </select>
          </Field>
          <Field label={t("Minimum Google rating (if available)")}>
            <select
              className="fs-input"
              value={profile.searchMinRating ?? ""}
              onChange={(e) =>
                onPatchActive({
                  searchMinRating: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">{t("No minimum")}</option>
              <option value="3">{t("3.0+")}</option>
              <option value="3.5">{t("3.5+")}</option>
              <option value="4">{t("4.0+")}</option>
              <option value="4.5">{t("4.5+")}</option>
            </select>
          </Field>
        </div>

        <div className="rounded-[12px] border border-[var(--fs-border)] p-4">
          <p className="fs-label mb-1">{t("Priority weighting")}</p>
          <p className="mb-4 text-[13.5px] text-[var(--fs-ink-muted)]">
            {t(
              "1 = not important · 5 = very important. Criteria without data (e.g. Google rating, price) are ignored automatically.",
            )}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Priority
              label={t("Care & autonomy")}
              value={profile.priorityCare}
              onChange={(n) => onPatchActive({ priorityCare: n })}
            />
            <Priority
              label={t("Geographic area")}
              value={profile.priorityGeo}
              onChange={(n) => onPatchActive({ priorityGeo: n })}
            />
            <Priority
              label={t("Budget")}
              value={profile.priorityBudget}
              onChange={(n) => onPatchActive({ priorityBudget: n })}
            />
            <Priority
              label={t("Size")}
              value={profile.prioritySize}
              onChange={(n) => onPatchActive({ prioritySize: n })}
            />
            <Priority
              label={t("Google rating")}
              value={profile.priorityRating}
              onChange={(n) => onPatchActive({ priorityRating: n })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[14.5px] text-[var(--fs-ink-body)]">
        {forSelf
          ? t("File summary. Review the information before signing.")
          : t("Summary of {name}'s file. Review the information before signing.", {
              name: profileDisplayName(profile),
            })}
      </p>
      <label className="flex items-start gap-3 rounded-[10px] bg-[var(--fs-subtle)] p-4">
        <input
          type="checkbox"
          className="mt-1"
          checked={profile.consentPartage}
          onChange={(e) => onPatchActive({ consentPartage: e.target.checked })}
        />
        <span className="text-[14.5px]">
          {t("I consent to sharing this file with the selected residences.")}
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Signature of the applicant or mandatary")}>
          <input
            className="fs-input"
            placeholder={t("Full name")}
            value={profile.signatureNom}
            onChange={(e) => onPatchActive({ signatureNom: e.target.value })}
          />
        </Field>
        <Field label={t("Date")}>
          <input
            className="fs-input"
            type="date"
            value={profile.signatureDate}
            onChange={(e) => onPatchActive({ signatureDate: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  return (
    <Field label={label}>
      <select
        className="fs-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        <option value="">{t("To be determined")}</option>
        <option value="Oui">{t("Yes")}</option>
        <option value="Non">{t("No")}</option>
      </select>
    </Field>
  );
}
