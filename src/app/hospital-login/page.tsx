"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Hospital portal remains a later phase, point staff to family auth for now. */
export default function HospitalLoginPage() {
  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-5 py-12">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Building2 size={20} />
      </div>
      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
        Hospital discharge
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Coming in a later step</h1>
      <p className="mt-2 text-ink-muted">
        Hospital case-manager accounts will use the same secure sign-in system. For now, use a family
        demo account to explore Haven.
      </p>
      <Card className="mt-8 space-y-3 p-6">
        <Button href="/sign-in" className="w-full" size="lg">
          Family sign-in
        </Button>
        <Button href="/get-started" variant="secondary" className="w-full">
          Get Started
        </Button>
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Community staff?{" "}
        <Link href="/community/sign-in" className="font-medium text-brand">
          Community sign-in
        </Link>
      </p>
    </div>
  );
}
