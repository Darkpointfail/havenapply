"use client";

import {
  PROFILE_STEPS,
  docsProgress,
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
}) {
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  if (!profiles.length || !activeProfile) {
    return (
      <div className="flex flex-col gap-6">
        <div className="fs-card flex flex-wrap items-start justify-between gap-4 p-6 md:p-7">
          <div className="max-w-2xl">
            <h1 className="fs-serif text-[28px] leading-tight md:text-[32px]">
              Dossiers d&apos;admission
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
              Un dossier par personne que vous accompagnez. Les renseignements et les pièces
              d&apos;un dossier servent à toutes les demandes déposées pour cette personne.
            </p>
          </div>
          <button type="button" className="fs-btn fs-btn-outline shrink-0" onClick={onCreateProfile}>
            + Créer un dossier
          </button>
        </div>
        <div className="fs-card p-10 text-center">
          <h2 className="fs-serif text-[24px]">Aucun dossier pour le moment</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-[var(--fs-ink-body)]">
            Créez le dossier de votre proche pour y ajouter les pièces requises et déposer des
            demandes auprès des résidences.
          </p>
          <button type="button" className="fs-btn fs-btn-primary mt-6" onClick={onCreateProfile}>
            Créer un dossier
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
            Dossiers d&apos;admission
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
            Un dossier par personne que vous accompagnez. Les renseignements et les pièces
            d&apos;un dossier servent à toutes les demandes déposées pour cette personne.
          </p>
        </div>
        <button type="button" className="fs-btn fs-btn-outline shrink-0" onClick={onCreateProfile}>
          + Créer un dossier
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {profiles.map((p) => {
          const active = p.id === activeProfile.id;
          const prog = docsProgress(p.docs);
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
                {p.draft ? "Brouillon" : "Actif"}
              </span>
              <p className="fs-serif mt-3 text-[18px] leading-snug">{profileDisplayName(p)}</p>
              <p
                className="mt-1 text-[13px]"
                style={{ color: active ? "#C5D2CD" : "var(--fs-ink-muted)" }}
              >
                {p.draft ? "Dossier en création" : `${p.rel} · ${prog.percent} % complété`}
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
          Vue d&apos;ensemble
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
          Renseignements et documents
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
  const progress = docsProgress(profile.docs);
  const meta = [
    ["Niveau d'autonomie", profile.draft || !profile.autonomie ? "À préciser" : profile.autonomie],
    [
      "Score autonomie",
      profile.autonomyScore != null ? `${profile.autonomyScore}/10` : "À préciser",
    ],
    ["Services souhaités", profile.draft || !profile.services ? "À préciser" : profile.services],
    [
      "Recherche",
      [profile.searchSector, profile.searchBudgetMax ? `max ${profile.searchBudgetMax} $` : null]
        .filter(Boolean)
        .join(" · ") || "À préciser",
    ],
    ["Budget mensuel", profile.draft || !profile.budget ? "À préciser" : profile.budget],
    ["Emménagement souhaité", profile.draft || !profile.move ? "À préciser" : profile.move],
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
              Ce dossier vient d&apos;être créé. Remplissez les renseignements du demandeur pour
              qu&apos;il puisse être transmis à des résidences.
            </p>
            <button
              type="button"
              className="fs-btn fs-btn-primary shrink-0"
              onClick={() => onSetMode("edition")}
            >
              Commencer
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
                    Ajouter une photo
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
                Visible par les résidences
              </p>
            </label>
            <div className="min-w-0 flex-1">
              <h2 className="fs-serif text-[28px] leading-tight">{profileDisplayName(profile)}</h2>
              <p className="mt-2 text-[14.5px] text-[var(--fs-ink-muted)]">
                {profile.draft ? "Dossier en création" : `${profile.rel} · ${profile.meta}`}
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
                  Modifier les renseignements
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="fs-card p-6">
          <h3 className="fs-serif text-[22px]">Documents</h3>
          <p className="mt-1 text-[13.5px] text-[var(--fs-ink-muted)]">
            {progress.received} pièce{progress.received > 1 ? "s" : ""} sur {progress.total} · les
            mêmes pièces servent à toutes les demandes de ce dossier
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
            Avancement du dossier
          </p>
          <p className="fs-serif mt-3 text-[44px] leading-none">{progress.percent} %</p>
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
              ? `Prochaine pièce à fournir : ${progress.next}.`
              : "Toutes les pièces exigées sont reçues."}
          </p>
        </div>

        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">Qui voit ce dossier</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
            Ces résidences ont reçu ce dossier et peuvent consulter les renseignements et les
            pièces qu&apos;il contient. Vous pouvez retirer l&apos;accès en tout temps.
          </p>
          <ul className="mt-4 divide-y divide-[var(--fs-border-faint)]">
            {profile.accesses.length === 0 ? (
              <li className="py-3 text-[14.5px] text-[var(--fs-ink-muted)]">
                Aucune résidence n&apos;a encore accès à ce dossier.
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
                        window.confirm(`Retirer l'accès de ${a.residenceName} à ce dossier ?`)
                      ) {
                        onWithdrawAccess(a.residenceId);
                      }
                    }}
                  >
                    Retirer l&apos;accès
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
          {received ? "Reçu" : "En attente"}
        </span>
        <label className="fs-btn fs-btn-outline cursor-pointer">
          {received ? "Remplacer" : "Téléverser"}
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
}) {
  const totalSteps = PROFILE_STEPS.length;
  const isLast = profileStep >= totalSteps - 1;

  const finishOrNext = () => {
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
                ? "Renseignements du nouveau dossier"
                : `Dossier de ${profileDisplayName(profile)}`}
            </h2>
            <p className="mt-2 max-w-2xl text-[14.5px] text-[var(--fs-ink-body)]">
              Vous pouvez interrompre à tout moment et reprendre plus tard : vos réponses sont
              enregistrées à chaque étape.
            </p>
          </div>
          <p className="shrink-0 text-[14px] font-medium text-[var(--fs-ink-muted)]">
            Étape {profileStep + 1} sur {totalSteps}
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
                {i + 1}. {label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`fs-grid-main grid gap-5 ${claireOpen ? "lg:grid-cols-[1fr_372px]" : ""}`}
      >
        <div className="fs-card p-6">
          <EditionStepFields step={profileStep} profile={profile} onPatchActive={onPatchActive} />

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--fs-border)] pt-5">
            <button
              type="button"
              className="fs-btn fs-btn-outline"
              disabled={profileStep === 0}
              onClick={() => onSetStep(Math.max(0, profileStep - 1))}
            >
              Précédent
            </button>
            <p className="text-[13.5px] text-[var(--fs-ink-muted)]">
              Étape {profileStep + 1} sur {totalSteps}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="fs-btn fs-btn-outline"
                onClick={() => onSetMode("overview")}
              >
                Enregistrer et voir le dossier
              </button>
              <button type="button" className="fs-btn fs-btn-primary" onClick={finishOrNext}>
                {isLast ? "Terminer" : "Suivant"}
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
            Remplir avec Claire
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
          <p className="text-[14px] font-semibold">Claire, votre accompagnatrice</p>
          <p className="text-[12px] text-[#8E9B96]">
            {claireTyping ? "Claire écrit…" : "Elle remplit le dossier avec vous"}
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
              Claire écrit…
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
            placeholder="Répondre à Claire…"
            value={chatInput}
            disabled={claireTyping}
            onChange={(e) => onChatInput(e.target.value)}
            aria-label="Message à Claire"
          />
          <button type="submit" className="fs-btn fs-btn-primary" disabled={claireTyping || !chatInput.trim()}>
            Envoyer
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
}: {
  step: number;
  profile: FamilyProfile;
  onPatchActive: (patch: Partial<FamilyProfile>) => void;
}) {
  if (step === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Prénom">
          <input
            className="fs-input"
            value={profile.prenom}
            onChange={(e) => onPatchActive({ prenom: e.target.value })}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Nom">
          <input
            className="fs-input"
            value={profile.nom}
            onChange={(e) => onPatchActive({ nom: e.target.value })}
            autoComplete="family-name"
          />
        </Field>
        <Field label="Date de naissance">
          <input
            className="fs-input"
            type="date"
            value={profile.dateNaissance}
            onChange={(e) => onPatchActive({ dateNaissance: e.target.value })}
          />
        </Field>
        <Field label="Sexe">
          <select
            className="fs-input"
            value={profile.sexe}
            onChange={(e) => onPatchActive({ sexe: e.target.value })}
            aria-label="Sexe"
          >
            <option value="">À préciser</option>
            <option value="Femme">Femme</option>
            <option value="Homme">Homme</option>
            <option value="Autre">Autre</option>
            <option value="Préfère ne pas dire">Préfère ne pas dire</option>
          </select>
        </Field>
        <Field label="Adresse actuelle">
          <input
            className="fs-input"
            value={profile.adresse}
            onChange={(e) => onPatchActive({ adresse: e.target.value })}
            autoComplete="street-address"
          />
        </Field>
        <Field label="Ville">
          <input
            className="fs-input"
            value={profile.ville}
            onChange={(e) => onPatchActive({ ville: e.target.value })}
            autoComplete="address-level2"
          />
        </Field>
        <Field label="Province">
          <input
            className="fs-input"
            value={profile.province}
            onChange={(e) => onPatchActive({ province: e.target.value })}
            autoComplete="address-level1"
          />
        </Field>
        <Field label="Code postal">
          <input
            className="fs-input"
            value={profile.codePostal}
            onChange={(e) => onPatchActive({ codePostal: e.target.value })}
            autoComplete="postal-code"
          />
        </Field>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nom du contact principal">
          <input
            className="fs-input"
            value={profile.contactPrincipalNom}
            onChange={(e) => onPatchActive({ contactPrincipalNom: e.target.value })}
          />
        </Field>
        <Field label="Lien avec le demandeur">
          <input
            className="fs-input"
            value={profile.contactPrincipalLien}
            onChange={(e) => onPatchActive({ contactPrincipalLien: e.target.value })}
          />
        </Field>
        <Field label="Téléphone">
          <input
            className="fs-input"
            value={profile.contactPrincipalTel}
            onChange={(e) => onPatchActive({ contactPrincipalTel: e.target.value })}
            autoComplete="tel"
          />
        </Field>
        <Field label="Courriel">
          <input
            className="fs-input"
            type="email"
            value={profile.contactPrincipalCourriel}
            onChange={(e) => onPatchActive({ contactPrincipalCourriel: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field label="Nom du contact secondaire">
          <input
            className="fs-input"
            value={profile.contactSecondaireNom}
            onChange={(e) => onPatchActive({ contactSecondaireNom: e.target.value })}
          />
        </Field>
        <Field label="Lien avec le demandeur">
          <input
            className="fs-input"
            value={profile.contactSecondaireLien}
            onChange={(e) => onPatchActive({ contactSecondaireLien: e.target.value })}
          />
        </Field>
        <Field label="Téléphone">
          <input
            className="fs-input"
            value={profile.contactSecondaireTel}
            onChange={(e) => onPatchActive({ contactSecondaireTel: e.target.value })}
          />
        </Field>
        <Field label="Courriel">
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

  if (step === 2) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <YesNoField
          label="Mandat de protection"
          value={profile.mandatProtection}
          onChange={(v) => onPatchActive({ mandatProtection: v })}
        />
        <YesNoField
          label="Procuration"
          value={profile.procuration}
          onChange={(v) => onPatchActive({ procuration: v })}
        />
        <YesNoField
          label="Curatelle"
          value={profile.curatelle}
          onChange={(v) => onPatchActive({ curatelle: v })}
        />
        <Field label="Directives médicales anticipées">
          <input
            className="fs-input"
            value={profile.directivesMedicales}
            onChange={(e) => onPatchActive({ directivesMedicales: e.target.value })}
            placeholder="Oui / Non / détails"
          />
        </Field>
        <Field label="Nom du mandataire">
          <input
            className="fs-input"
            value={profile.nomMandataire}
            onChange={(e) => onPatchActive({ nomMandataire: e.target.value })}
          />
        </Field>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Assurance maladie">
          <input
            className="fs-input"
            value={profile.assuranceMaladie}
            onChange={(e) => onPatchActive({ assuranceMaladie: e.target.value })}
          />
        </Field>
        <Field label="Assurance privée">
          <input
            className="fs-input"
            value={profile.assurancePrivee}
            onChange={(e) => onPatchActive({ assurancePrivee: e.target.value })}
          />
        </Field>
        <Field label="Numéro de police">
          <input
            className="fs-input"
            value={profile.numeroPolice}
            onChange={(e) => onPatchActive({ numeroPolice: e.target.value })}
          />
        </Field>
        <Field label="Assurance vie">
          <input
            className="fs-input"
            value={profile.assuranceVie}
            onChange={(e) => onPatchActive({ assuranceVie: e.target.value })}
          />
        </Field>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Revenus mensuels">
          <input
            className="fs-input"
            value={profile.revenusMensuels}
            onChange={(e) => onPatchActive({ revenusMensuels: e.target.value })}
          />
        </Field>
        <Field label="Sources de revenus">
          <input
            className="fs-input"
            value={profile.sourcesRevenus}
            onChange={(e) => onPatchActive({ sourcesRevenus: e.target.value })}
          />
        </Field>
        <Field label="Garant financier">
          <input
            className="fs-input"
            value={profile.garantFinancier}
            onChange={(e) => onPatchActive({ garantFinancier: e.target.value })}
          />
        </Field>
        <Field label="Mode de paiement">
          <input
            className="fs-input"
            value={profile.modePaiement}
            onChange={(e) => onPatchActive({ modePaiement: e.target.value })}
            placeholder="Privé, assurance…"
          />
        </Field>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3 rounded-[12px] border border-[var(--fs-border)] bg-[var(--fs-subtle)] p-4">
          <p className="fs-label mb-2">Autonomie physique (1 à 10)</p>
          <p className="mb-3 text-[13.5px] text-[var(--fs-ink-muted)]">
            1 = pas du tout autonome · 10 = 100 % autonome. Ce score guide le matching avec les
            catégories RPA.
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
              aria-label="Score d'autonomie de 1 à 10"
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
              Définir à 5/10 pour commencer
            </button>
          ) : null}
        </div>
        <Field label="Niveau d'autonomie (libellé)">
          <input
            className="fs-input"
            value={profile.autonomie === "À préciser" ? "" : profile.autonomie}
            onChange={(e) => onPatchActive({ autonomie: e.target.value })}
          />
        </Field>
        <Field label="Mobilité">
          <input
            className="fs-input"
            value={profile.mobilite}
            onChange={(e) => onPatchActive({ mobilite: e.target.value })}
          />
        </Field>
        <Field label="Aide au repas">
          <input
            className="fs-input"
            value={profile.aideRepas}
            onChange={(e) => onPatchActive({ aideRepas: e.target.value })}
          />
        </Field>
        <Field label="Aide à l'hygiène">
          <input
            className="fs-input"
            value={profile.aideHygiene}
            onChange={(e) => onPatchActive({ aideHygiene: e.target.value })}
          />
        </Field>
        <Field label="Aide à la médication">
          <input
            className="fs-input"
            value={profile.aideMedication}
            onChange={(e) => onPatchActive({ aideMedication: e.target.value })}
          />
        </Field>
        <Field label="Allergies">
          <input
            className="fs-input"
            value={profile.allergies}
            onChange={(e) => onPatchActive({ allergies: e.target.value })}
          />
        </Field>
        <Field label="Régime alimentaire">
          <input
            className="fs-input"
            value={profile.regimeAlimentaire}
            onChange={(e) => onPatchActive({ regimeAlimentaire: e.target.value })}
          />
        </Field>
      </div>
    );
  }

  if (step === 6) {
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
          <p className="fs-serif text-[20px]">Ce que vous recherchez</p>
          <p className="mt-1 max-w-[640px] text-[14.5px] text-[var(--fs-ink-body)]">
            Distinct du profil de soins : ces critères orientent le score de correspondance
            (secteur, budget, taille) et la pondération des priorités.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Secteur / ville recherchée">
            <input
              className="fs-input"
              value={profile.searchSector}
              onChange={(e) => onPatchActive({ searchSector: e.target.value })}
              placeholder="Ex. Sillery, Lévis, Montréal…"
            />
          </Field>
          <Field label="Rayon max (km)">
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
          <Field label="Budget mensuel max ($)">
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
          <Field label="Taille d'établissement">
            <select
              className="fs-input"
              value={profile.searchSize}
              onChange={(e) =>
                onPatchActive({
                  searchSize: e.target.value as FamilyProfile["searchSize"],
                })
              }
            >
              <option value="any">Indifférent</option>
              <option value="small">Petite (&lt; 40 unités)</option>
              <option value="medium">Moyenne (40–99)</option>
              <option value="large">Grande (100+)</option>
            </select>
          </Field>
          <Field label="Note Google minimale (si dispo)">
            <select
              className="fs-input"
              value={profile.searchMinRating ?? ""}
              onChange={(e) =>
                onPatchActive({
                  searchMinRating: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Sans minimum</option>
              <option value="3">3,0+</option>
              <option value="3.5">3,5+</option>
              <option value="4">4,0+</option>
              <option value="4.5">4,5+</option>
            </select>
          </Field>
        </div>

        <div className="rounded-[12px] border border-[var(--fs-border)] p-4">
          <p className="fs-label mb-1">Pondération des priorités</p>
          <p className="mb-4 text-[13.5px] text-[var(--fs-ink-muted)]">
            1 = peu important · 5 = très important. Les axes sans donnée (ex. note Google, tarif)
            sont ignorés automatiquement.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Priority
              label="Soins & autonomie"
              value={profile.priorityCare}
              onChange={(n) => onPatchActive({ priorityCare: n })}
            />
            <Priority
              label="Secteur géographique"
              value={profile.priorityGeo}
              onChange={(n) => onPatchActive({ priorityGeo: n })}
            />
            <Priority
              label="Budget"
              value={profile.priorityBudget}
              onChange={(n) => onPatchActive({ priorityBudget: n })}
            />
            <Priority
              label="Taille"
              value={profile.prioritySize}
              onChange={(n) => onPatchActive({ prioritySize: n })}
            />
            <Priority
              label="Note Google"
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
        Récapitulatif du dossier de {profileDisplayName(profile)}. Vérifiez les renseignements
        avant de signer.
      </p>
      <label className="flex items-start gap-3 rounded-[10px] bg-[var(--fs-subtle)] p-4">
        <input
          type="checkbox"
          className="mt-1"
          checked={profile.consentPartage}
          onChange={(e) => onPatchActive({ consentPartage: e.target.checked })}
        />
        <span className="text-[14.5px]">
          Je consens au partage de ce dossier avec les résidences choisies.
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Signature du demandeur ou du mandataire">
          <input
            className="fs-input"
            placeholder="Nom complet"
            value={profile.signatureNom}
            onChange={(e) => onPatchActive({ signatureNom: e.target.value })}
          />
        </Field>
        <Field label="Date">
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
  return (
    <Field label={label}>
      <select
        className="fs-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        <option value="">À préciser</option>
        <option value="Oui">Oui</option>
        <option value="Non">Non</option>
      </select>
    </Field>
  );
}
