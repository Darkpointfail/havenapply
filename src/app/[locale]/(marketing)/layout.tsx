export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Full-bleed marketing pages provide their own header/footer.
  return <>{children}</>;
}
