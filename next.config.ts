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
      { source: "/profile", destination: "/family/senior-profile", permanent: false },
      { source: "/documents", destination: "/family/documents", permanent: false },
      { source: "/applications", destination: "/family/applications", permanent: false },
      { source: "/messages", destination: "/family/messages", permanent: false },
      { source: "/tasks", destination: "/family/tasks", permanent: false },
      { source: "/notifications", destination: "/family/notifications", permanent: false },
      { source: "/settings", destination: "/family/settings", permanent: false },
      { source: "/compare", destination: "/family/compare", permanent: false },
      { source: "/residences", destination: "/find-senior-living", permanent: false },
      { source: "/residences/:id", destination: "/find-senior-living/:id", permanent: false },
      { source: "/admin", destination: "/community/dashboard", permanent: false },
      { source: "/admin/:path*", destination: "/community/:path*", permanent: false },
      { source: "/residence-login", destination: "/community/sign-in", permanent: false },
      { source: "/for-residences", destination: "/for-communities", permanent: false },
    ];
  },
};

export default nextConfig;
