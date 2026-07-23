import { AUTH_MESSAGES } from "@/lib/auth-messages";
import { isValidPassword, normalizeEmail } from "@/lib/auth-crypto";
import {
  accountTypeLabel,
  type SignupRole,
} from "@/lib/auth-store";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  role?: SignupRole;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  acceptedTerms?: boolean;
  organization?: string;
  jobTitle?: string;
  phone?: string;
};

function isSignupRole(value: unknown): value is SignupRole {
  return value === "family" || value === "professional" || value === "facility";
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: AUTH_MESSAGES.generic }, { status: 400 });
  }

  if (!body.acceptedTerms) {
    return NextResponse.json({ ok: false, error: AUTH_MESSAGES.acceptTerms }, { status: 400 });
  }
  if (!isSignupRole(body.role)) {
    return NextResponse.json({ ok: false, error: AUTH_MESSAGES.required }, { status: 400 });
  }
  if (!body.firstName?.trim() || !body.lastName?.trim() || !body.email?.trim()) {
    return NextResponse.json({ ok: false, error: AUTH_MESSAGES.required }, { status: 400 });
  }

  const needsOrg = body.role === "professional" || body.role === "facility";
  if (needsOrg && (!body.organization?.trim() || !body.jobTitle?.trim())) {
    return NextResponse.json({ ok: false, error: AUTH_MESSAGES.required }, { status: 400 });
  }
  if (!body.password || !isValidPassword(body.password)) {
    return NextResponse.json({ ok: false, error: AUTH_MESSAGES.weakPassword }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        ok: false,
        error: AUTH_MESSAGES.signupNeedsSmtp,
        code: "missing_service_role",
      },
      { status: 503 },
    );
  }

  const email = normalizeEmail(body.email);
  const metadata: Record<string, unknown> = {
    first_name: body.firstName.trim(),
    last_name: body.lastName.trim(),
    role: body.role,
    account_type: accountTypeLabel(body.role),
    onboarding_completed: body.role !== "family",
  };
  if (needsOrg) {
    metadata.organization = body.organization!.trim();
    metadata.job_title = body.jobTitle!.trim();
    metadata.phone = body.phone?.trim() || "";
  }
  if (body.role === "facility") {
    metadata.community_status = "verified";
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already") || message.includes("exists")) {
      return NextResponse.json({ ok: false, error: AUTH_MESSAGES.emailTaken }, { status: 409 });
    }
    console.error("[auth] admin signup failed:", body.role, error.message);
    return NextResponse.json(
      { ok: false, error: AUTH_MESSAGES.generic, detail: error.message },
      { status: 400 },
    );
  }

  if (!data.user) {
    return NextResponse.json({ ok: false, error: AUTH_MESSAGES.generic }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email,
    role: body.role,
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
  });
}
