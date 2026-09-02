"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Building2, Check, FileText, Send, UserPlus, UserRound } from "lucide-react";
import { MacBookFrame } from "@/components/marketing/MacBookFrame";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

type DemoStep =
  | "account"
  | "senior"
  | "needs"
  | "documents"
  | "complete"
  | "residences"
  | "send"
  | "ready";

const SEQUENCE: { id: DemoStep; duration: number; progress: number }[] = [
  { id: "account", duration: 2600, progress: 12 },
  { id: "senior", duration: 2800, progress: 28 },
  { id: "needs", duration: 2800, progress: 46 },
  { id: "documents", duration: 2800, progress: 64 },
  { id: "complete", duration: 2200, progress: 78 },
  { id: "residences", duration: 2800, progress: 90 },
  { id: "send", duration: 2400, progress: 100 },
  { id: "ready", duration: 3200, progress: 100 },
];

const PAUSE_BEFORE_LOOP_MS = 1400;

export function DossierLaptopDemo({ className }: { className?: string }) {
  const t = useT();
  const prefersReduced = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [demoReady, setDemoReady] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (prefersReduced) {
      setEntered(true);
      setDemoReady(true);
      setStepIndex(SEQUENCE.length - 1);
      return;
    }
    const enter = window.setTimeout(() => setEntered(true), 80);
    const ready = window.setTimeout(() => setDemoReady(true), 550);
    return () => {
      window.clearTimeout(enter);
      window.clearTimeout(ready);
    };
  }, [prefersReduced]);

  useEffect(() => {
    if (prefersReduced || !demoReady) return;
    const current = SEQUENCE[stepIndex];
    if (!current) return;
    const delay =
      current.id === "ready"
        ? current.duration + PAUSE_BEFORE_LOOP_MS
        : current.duration;
    const id = window.setTimeout(() => {
      setStepIndex((i) => (i + 1) % SEQUENCE.length);
    }, delay);
    return () => window.clearTimeout(id);
  }, [demoReady, prefersReduced, stepIndex]);

  const step = SEQUENCE[stepIndex] ?? SEQUENCE[0];

  const title = useMemo(() => {
    switch (step.id) {
      case "account":
        return t("Create your account");
      case "senior":
        return t("About your loved one");
      case "needs":
        return t("Needs & preferences");
      case "documents":
        return t("Add documents");
      case "complete":
        return t("Profile complete");
      case "residences":
        return t("Choose residences");
      case "send":
        return t("Send your dossier");
      case "ready":
        return t("Your profile is ready");
      default:
        return "";
    }
  }, [step.id, t]);

  return (
    <motion.div
      className={cn("w-full", className)}
      aria-hidden
      initial={prefersReduced ? false : { opacity: 0, y: 20 }}
      animate={entered || prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <MacBookFrame>
        <div className="flex h-full flex-col bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[#F4F7F8] px-3 py-1.5">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D7DEE3]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#D7DEE3]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#D7DEE3]" />
            </span>
            <div className="ml-1 flex-1 truncate rounded-md bg-white px-2 py-0.5 text-[10px] text-[var(--ink-muted)]">
              havenapply.com
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col p-3.5 md:p-4">
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#EEF3F4]">
              <motion.div
                className="h-full rounded-full bg-[var(--brand-strong)]"
                animate={{ width: `${step.progress}%` }}
                transition={{ duration: prefersReduced ? 0 : 0.55, ease: "easeOut" }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-0 flex-1"
              >
                <ScreenContent step={step.id} title={title} t={t} reduced={!!prefersReduced} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </MacBookFrame>
    </motion.div>
  );
}

function ScreenContent({
  step,
  title,
  t,
  reduced,
}: {
  step: DemoStep;
  title: string;
  t: (key: string) => string;
  reduced: boolean;
}) {
  if (step === "ready") {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <motion.span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-strong)]"
          initial={reduced ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <Check size={22} strokeWidth={2.4} />
        </motion.span>
        <p className="mt-3 text-[16px] font-semibold tracking-tight text-[var(--ink)] md:text-[17px]">
          {title}
        </p>
        <p className="mt-1 text-[12px] text-[var(--ink-muted)]">
          {t("You can send it to several residences")}
        </p>
      </div>
    );
  }

  if (step === "account") {
    return (
      <Panel title={title} icon={<UserPlus size={14} />}>
        <Field label={t("Email")} value="alex.martin@email.com" delay={0.1} reduced={reduced} />
        <Field label={t("Password")} value="••••••••••" delay={0.25} reduced={reduced} />
        <PrimaryButton label={t("Create account")} delay={0.4} reduced={reduced} />
      </Panel>
    );
  }

  if (step === "senior") {
    return (
      <Panel title={title} icon={<UserRound size={14} />}>
        <Field label={t("Preferred name")} value="Paul" delay={0.1} reduced={reduced} />
        <Field label={t("Care level")} value={t("Assisted living")} delay={0.22} reduced={reduced} />
        <Field label={t("Timeline")} value={t("Within 3 months")} delay={0.34} reduced={reduced} />
      </Panel>
    );
  }

  if (step === "needs") {
    return (
      <Panel title={title} icon={<Check size={14} />}>
        <ChipRow
          items={[t("Mobility"), t("Memory"), t("Budget")]}
          delay={0.12}
          reduced={reduced}
        />
        <Field label={t("Autonomy")} value={t("Some daily help")} delay={0.28} reduced={reduced} />
        <Field label={t("Preferences")} value={t("Near family")} delay={0.4} reduced={reduced} />
      </Panel>
    );
  }

  if (step === "documents") {
    return (
      <Panel title={title} icon={<FileText size={14} />}>
        <DocRow name={t("ID card")} done delay={0.1} reduced={reduced} uploadingLabel={t("Uploading…")} />
        <DocRow name={t("Insurance")} done delay={0.22} reduced={reduced} uploadingLabel={t("Uploading…")} />
        <DocRow
          name={t("Physician note")}
          done={false}
          delay={0.34}
          reduced={reduced}
          uploadingLabel={t("Uploading…")}
        />
      </Panel>
    );
  }

  if (step === "complete") {
    return (
      <Panel title={title} icon={<Check size={14} />}>
        <CheckRow label={t("Profile")} delay={0.1} reduced={reduced} />
        <CheckRow label={t("Needs & preferences")} delay={0.22} reduced={reduced} />
        <CheckRow label={t("Documents")} delay={0.34} reduced={reduced} />
      </Panel>
    );
  }

  if (step === "residences") {
    return (
      <Panel title={title} icon={<Building2 size={14} />}>
        <ResidenceRow name={t("Parc Residence")} selected delay={0.1} reduced={reduced} />
        <ResidenceRow name={t("Maple House")} selected delay={0.22} reduced={reduced} />
        <ResidenceRow name={t("River Gardens")} selected={false} delay={0.34} reduced={reduced} />
      </Panel>
    );
  }

  return (
    <Panel title={title} icon={<Send size={14} />}>
      <p className="text-[12px] leading-relaxed text-[var(--ink-muted)]">
        {t("Same dossier · 2 residences")}
      </p>
      <PrimaryButton label={t("Send applications")} delay={0.2} reduced={reduced} />
      <motion.p
        className="text-center text-[11px] font-medium text-[var(--brand-strong)]"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : 0.55 }}
      >
        {t("Sent securely")}
      </motion.p>
    </Panel>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold tracking-tight text-[var(--ink)] md:text-[15px]">
          {title}
        </h3>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-strong)]">
          {icon}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  delay,
  reduced,
}: {
  label: string;
  value: string;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="rounded-[10px] border border-[var(--line)] bg-[#F7FAFA] px-2.5 py-2"
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : delay, duration: 0.35 }}
    >
      <p className="text-[10px] text-[var(--ink-muted)]">{label}</p>
      <div className="mt-0.5 overflow-hidden">
        <motion.p
          className="text-[12px] font-semibold text-[var(--ink)]"
          initial={reduced ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: reduced ? 0 : delay + 0.18, duration: 0.4, ease: "easeOut" }}
        >
          {value}
        </motion.p>
      </div>
    </motion.div>
  );
}

function PrimaryButton({
  label,
  delay,
  reduced,
}: {
  label: string;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="mt-auto flex h-9 items-center justify-center rounded-[10px] bg-[var(--brand-strong)] text-[12px] font-semibold text-white"
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : delay, duration: 0.35 }}
    >
      {label}
    </motion.div>
  );
}

function ChipRow({
  items,
  delay,
  reduced,
}: {
  items: string[];
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="flex flex-wrap gap-1.5"
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : delay, duration: 0.35 }}
    >
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-strong)]"
        >
          {item}
        </span>
      ))}
    </motion.div>
  );
}

function DocRow({
  name,
  done,
  delay,
  reduced,
  uploadingLabel,
}: {
  name: string;
  done: boolean;
  delay: number;
  reduced: boolean;
  uploadingLabel: string;
}) {
  return (
    <motion.div
      className="flex items-center justify-between rounded-[10px] border border-[var(--line)] px-2.5 py-2"
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : delay, duration: 0.35 }}
    >
      <span className="text-[12px] font-medium text-[var(--ink)]">{name}</span>
      {done ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-strong)]">
          <Check size={12} strokeWidth={2.5} />
        </span>
      ) : (
        <span className="text-[10px] font-semibold text-[var(--ink-muted)]">{uploadingLabel}</span>
      )}
    </motion.div>
  );
}

function CheckRow({
  label,
  delay,
  reduced,
}: {
  label: string;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="flex items-center gap-2 rounded-[10px] border border-[var(--line)] px-2.5 py-2"
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : delay, duration: 0.35 }}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-strong)]">
        <Check size={12} strokeWidth={2.5} />
      </span>
      <span className="text-[12px] font-medium text-[var(--ink)]">{label}</span>
    </motion.div>
  );
}

function ResidenceRow({
  name,
  selected,
  delay,
  reduced,
}: {
  name: string;
  selected: boolean;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "flex items-center justify-between rounded-[10px] border px-2.5 py-2",
        selected
          ? "border-[var(--brand-strong)] bg-[var(--brand-soft)]/50"
          : "border-[var(--line)] bg-white",
      )}
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : delay, duration: 0.35 }}
    >
      <span className="text-[12px] font-medium text-[var(--ink)]">{name}</span>
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-[4px] border",
          selected
            ? "border-[var(--brand-strong)] bg-[var(--brand-strong)] text-white"
            : "border-[var(--line-strong)] bg-white",
        )}
      >
        {selected ? <Check size={10} strokeWidth={3} /> : null}
      </span>
    </motion.div>
  );
}
