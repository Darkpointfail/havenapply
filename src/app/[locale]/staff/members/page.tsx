import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { createT, isLocale, type Locale } from "@/lib/i18n";
import { getCsrfToken, CSRF_FIELD } from "@/lib/csrf";
import {
  getManagedOrganizationId,
  listStaffOrgMembersAndInvites,
} from "@/lib/staff-invitations";
import {
  createStaffInviteAction,
  resendStaffInviteAction,
  revokeStaffInviteAction,
  revokeStaffMemberAction,
} from "@/app/actions/invitations";
import { AuthzError } from "@/lib/authz";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export default async function StaffMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await requireRole(["STAFF", "ADMIN"], locale);
  const t = createT(locale);
  const q = await searchParams;
  const csrfToken = await getCsrfToken();

  const organizationId = await getManagedOrganizationId(session.user.id);
  if (!organizationId) redirect(`/${locale}/access-denied`);

  let data;
  try {
    data = await listStaffOrgMembersAndInvites(session.user.id, organizationId);
  } catch (error) {
    if (error instanceof AuthzError) redirect(`/${locale}/access-denied`);
    throw error;
  }

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("staffMembersTitle")}</h1>
        <p className="mt-2 text-sm opacity-70">{t("staffMembersHelp")}</p>
        {q.ok ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {t("inviteActionOk")}
          </p>
        ) : null}
        {q.error ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>
        ) : null}

        <h2 className="mt-8 text-sm font-semibold">{t("inviteMember")}</h2>
        <form
          action={createStaffInviteAction.bind(null, locale)}
          className="mt-3 space-y-3"
          data-testid="staff-invite-form"
        >
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <input type="hidden" name="organizationId" value={organizationId} />
          <label className="block text-sm">
            <span className="opacity-70">{t("email")}</span>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              data-testid="staff-invite-email"
            />
          </label>
          <label className="block text-sm">
            <span className="opacity-70">{t("role")}</span>
            <select
              name="orgRole"
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              defaultValue="EDITOR"
              data-testid="staff-invite-role"
            >
              <option value="VIEWER">VIEWER</option>
              <option value="EDITOR">EDITOR</option>
              <option value="OWNER">OWNER</option>
            </select>
          </label>
          <fieldset className="text-sm">
            <legend className="opacity-70">{t("inviteSitesHelp")}</legend>
            <div className="mt-2 space-y-1">
              {data.sites.map((s) => (
                <label key={s.id} className="flex items-center gap-2">
                  <input type="checkbox" name="siteIds" value={s.id} />
                  <span>
                    {s.name}
                    {s.city ? ` · ${s.city}` : ""}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs opacity-60">{t("inviteSitesOrgWide")}</p>
          </fieldset>
          <button
            type="submit"
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
            data-testid="staff-invite-submit"
          >
            {t("sendInvite")}
          </button>
        </form>

        <h2 className="mt-10 text-sm font-semibold">{t("members")}</h2>
        <ul className="mt-3 divide-y divide-[var(--line)] text-sm" data-testid="staff-members">
          {data.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium">{m.user.name || m.user.email}</p>
                <p className="opacity-60">
                  {m.user.email} · {m.orgRole}
                  {m.site ? ` · ${m.site.name}` : ` · ${t("orgWide")}`}
                </p>
              </div>
              {m.userId !== session.user.id ? (
                <form action={revokeStaffMemberAction.bind(null, locale, m.id)}>
                  <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                  <ConfirmSubmitButton
                    label={t("revokeAccess")}
                    confirmMessage={t("inviteConfirmRevoke")}
                  />
                </form>
              ) : null}
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-sm font-semibold">{t("pendingInvites")}</h2>
        {data.invites.length === 0 ? (
          <p className="mt-2 text-sm opacity-60">{t("noPendingInvites")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--line)] text-sm" data-testid="staff-invites">
            {data.invites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{inv.email}</p>
                  <p className="opacity-60">
                    {inv.orgRole}
                    {inv.sites.length
                      ? ` · ${inv.sites.map((s) => s.site.name).join(", ")}`
                      : ` · ${t("orgWide")}`}
                  </p>
                </div>
                <div className="flex gap-3">
                  <form action={resendStaffInviteAction.bind(null, locale, inv.id)}>
                    <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                    <button type="submit" className="text-xs underline opacity-70">
                      {t("resendInvite")}
                    </button>
                  </form>
                  <form action={revokeStaffInviteAction.bind(null, locale, inv.id)}>
                    <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                    <ConfirmSubmitButton
                      label={t("revokeInvite")}
                      confirmMessage={t("inviteConfirmRevoke")}
                    />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
