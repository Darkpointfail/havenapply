export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-sm">
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}
