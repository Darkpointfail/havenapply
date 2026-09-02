import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/login", destination: "/sign-in", permanent: false },
      { source: "/signup", destination: "/get-started", permanent: false },
      { source: "/dashboard", destination: "/family/dashboard", permanent: false },
      { source: "/profile", destination: "/family/dashboard?view=dossier", permanent: false },
      { source: "/documents", destination: "/family/dashboard?view=dossier", permanent: false },
      { source: "/applications", destination: "/family/dashboard?view=demandes", permanent: false },
      { source: "/messages", destination: "/family/dashboard?view=assistance", permanent: false },
      { source: "/tasks", destination: "/family/dashboard", permanent: false },
      { source: "/notifications", destination: "/family/notifications", permanent: false },
      { source: "/settings", destination: "/family/settings", permanent: false },
      { source: "/compare", destination: "/family/dashboard", permanent: false },
      // Obsolete family portal journeys → FamilySpace
      { source: "/family/find-communities", destination: "/family/dashboard", permanent: false },
      { source: "/family/saved", destination: "/family/dashboard", permanent: false },
      { source: "/family/dossier", destination: "/family/dashboard?view=dossier", permanent: false },
      { source: "/family/profile", destination: "/family/dashboard?view=dossier", permanent: false },
      { source: "/family/compare", destination: "/family/dashboard", permanent: false },
      { source: "/family/applications", destination: "/family/dashboard?view=demandes", permanent: false },
      { source: "/family/applications/:path*", destination: "/family/dashboard?view=demandes", permanent: false },
      { source: "/family/messages", destination: "/family/dashboard?view=assistance", permanent: false },
      { source: "/family/documents", destination: "/family/dashboard?view=dossier", permanent: false },
      { source: "/family/senior-profile", destination: "/family/dashboard?view=dossier", permanent: false },
      { source: "/family/care-needs", destination: "/family/dashboard?view=dossier", permanent: false },
      { source: "/family/tasks", destination: "/family/dashboard", permanent: false },
      { source: "/family/apply", destination: "/family/dashboard?view=residences", permanent: false },
      { source: "/family/apply/:path*", destination: "/family/dashboard?view=residences", permanent: false },
      { source: "/family/apply-multi", destination: "/family/dashboard?view=residences", permanent: false },
      // Avoid catching static files under /residences/*.*
      { source: "/residences", destination: "/find-senior-living", permanent: false },
      {
        source: "/residences/:id((?!.*\\.).*)",
        destination: "/find-senior-living/:id",
        permanent: false,
      },
      { source: "/admin", destination: "/community/dashboard", permanent: false },
      { source: "/admin/:path*", destination: "/community/:path*", permanent: false },
      { source: "/residence-login", destination: "/community/sign-in", permanent: false },
      // Obsolete marketing / onboarding surfaces
      { source: "/onboarding", destination: "/family/dashboard", permanent: false },
      { source: "/onboarding/:path*", destination: "/family/dashboard", permanent: false },
      { source: "/how-it-works", destination: "/", permanent: false },
      { source: "/setup", destination: "/family/dashboard", permanent: false },
      { source: "/start", destination: "/family/dashboard?claire=1", permanent: false },
      { source: "/assistant", destination: "/family/dashboard?claire=1", permanent: false },
      { source: "/about", destination: "/", permanent: false },
      { source: "/resources", destination: "/", permanent: false },
      { source: "/for-families", destination: "/", permanent: false },
      { source: "/for-communities", destination: "/", permanent: false },
      { source: "/for-residences", destination: "/community/sign-in", permanent: false },
      { source: "/hospital", destination: "/", permanent: false },
      { source: "/hospital/:path*", destination: "/", permanent: false },
      { source: "/hospital-login", destination: "/sign-in", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
