export default function PageHeader({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="no-print flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        <h1 className="headline text-4xl sm:text-5xl">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
