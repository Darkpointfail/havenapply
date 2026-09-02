"use client";

import { AuthProvider } from "@/lib/auth";
import { AiProvider } from "@/lib/ai";
import { CommunityPortalProvider } from "@/lib/community-portal-store";
import { FamilyCollaborationProvider } from "@/lib/family-collaboration-store";
import { FamilyDataProvider } from "@/lib/family-data";
import { InternalAdminProvider } from "@/lib/internal-admin-store";
import { MessagingProvider } from "@/lib/messaging-store";
import { NotificationsTasksProvider } from "@/lib/notifications-tasks-store";
import { PrivacySecurityProvider } from "@/lib/privacy-security-store";
import { ProfessionalProvider } from "@/lib/professional-store";
import { LocaleProvider } from "@/lib/i18n/locale";
import { ThemeProvider } from "@/lib/theme";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <FamilyDataProvider>
            <ProfessionalProvider>
              <MessagingProvider>
                <FamilyCollaborationProvider>
                  <CommunityPortalProvider>
                    <InternalAdminProvider>
                      <NotificationsTasksProvider>
                        <PrivacySecurityProvider>
                          <AiProvider>{children}</AiProvider>
                        </PrivacySecurityProvider>
                      </NotificationsTasksProvider>
                    </InternalAdminProvider>
                  </CommunityPortalProvider>
                </FamilyCollaborationProvider>
              </MessagingProvider>
            </ProfessionalProvider>
          </FamilyDataProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
