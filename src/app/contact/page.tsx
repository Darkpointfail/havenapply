"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Heart,
  Mail,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const topics = [
  { id: "family", label: "I’m a family", icon: Heart },
  { id: "community", label: "I’m a community", icon: Building2 },
  { id: "other", label: "Something else", icon: MessageCircle },
] as const;

type TopicId = (typeof topics)[number]["id"];

const fieldClass =
  "mt-2 w-full rounded-[14px] border-[1.5px] border-line bg-surface px-4 py-3.5 text-[16px] text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-strong focus-visible:ring-[3px] focus-visible:ring-brand-strong focus-visible:ring-offset-2";

export default function ContactPage() {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<TopicId>("family");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const reset = () => {
    setSent(false);
    setName("");
    setEmail("");
    setTopic("family");
    setMessage("");
  };

  return (
    <div className="bg-bg">
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-[1320px] px-5 pb-10 pt-12 md:px-16 md:pb-14 md:pt-16">
          <p className="home-eyebrow text-brand-strong">{t("Contact")}</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-ink md:text-[2.85rem] md:leading-[1.12]">
            {t("Tell us how we can help")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted md:text-lg">
            {t("Whether you’re navigating senior living for a loved one or reviewing applications as a")}
            community, we’re happy to answer.
          </p>
        </div>
      </section>

      <section className="relative mx-auto max-w-[1320px] px-5 pb-20 md:px-16 md:pb-28">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8 lg:items-start">
          {/* Side panel */}
          <aside className="overflow-hidden rounded-[20px] border border-line bg-surface ">
            <div className="border-b border-line bg-brand-soft/40 px-6 py-6 md:px-7">
              <p className="text-sm font-semibold text-ink">Prefer email?</p>
              <a
                href="mailto:hello@havenapply.com"
                className="mt-3 inline-flex items-center gap-2 text-lg font-semibold text-brand-strong transition hover:text-brand-strong"
              >
                <Mail size={18} />
                hello@havenapply.com
              </a>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {t("We usually reply within one business day.")}
              </p>
            </div>

            <div className="space-y-5 px-6 py-6 md:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  {t("Quick links")}
                </p>
                <ul className="mt-3 space-y-2">
                  {[
                    { href: "/get-started", label: "For families" },
                    { href: "/community/sign-in", label: "For communities" },
                    { href: "/#comment", label: "How it works" },
                    { href: "/get-started", label: "Create a family profile" },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="group flex items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-ink-secondary transition hover:border-line hover:bg-bg-soft hover:text-ink"
                      >
                        {l.label}
                        <ArrowRight
                          size={14}
                          className="text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-brand-strong"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[14px] border border-line bg-bg-soft/60 px-4 py-4">
                <p className="text-sm font-semibold text-ink">Built for trust</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {t("Haven helps families and communities share applications with clarity, without")}
                  scattering documents across email.
                </p>
              </div>
            </div>
          </aside>

          {/* Form */}
          <div className="rounded-[20px] border border-line bg-surface p-6  md:p-8">
            {sent ? (
              <div className="flex min-h-[22rem] flex-col items-center justify-center px-4 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-brand-soft text-brand-strong">
                  <CheckCircle2 size={28} />
                </span>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
                  {t("Message received")}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
                  Thanks{name ? `, ${name.split(" ")[0]}` : ""}. We’ll reply to{" "}
                  <span className="font-medium text-ink">{email}</span> soon.
                </p>
                <Button type="button" variant="secondary" className="mt-8" onClick={reset}>
                  {t("Send another message")}
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-ink">Who are you?</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {topics.map(({ id, label, icon: Icon }) => {
                      const active = topic === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setTopic(id)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3 text-left text-sm font-medium transition",
                            active
                              ? "border-brand/30 bg-brand-soft text-brand-strong shadow-xs"
                              : "border-line bg-bg-soft/40 text-ink-muted hover:border-brand/20 hover:bg-bg-soft",
                          )}
                        >
                          <Icon size={16} className={active ? "text-brand-strong" : "text-ink-faint"} />
                          <span className="leading-snug">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-semibold text-ink">Name</span>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={fieldClass}
                      placeholder={t("Your name")}
                      autoComplete="name"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-ink">Email</span>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={fieldClass}
                      placeholder={t("you@email.com")}
                      autoComplete="email"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="font-semibold text-ink">Message</span>
                  <textarea
                    required
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={cn(fieldClass, "resize-y min-h-[9rem]")}
                    placeholder={t("Tell us a bit about what you need…")}
                  />
                </label>

                <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-ink-faint sm:max-w-[16rem]">
                    {t("By sending, you agree we may reply to the email you provide.")}
                  </p>
                  <Button type="submit" size="lg" className="w-full sm:w-auto">
                    {t("Send message")}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
