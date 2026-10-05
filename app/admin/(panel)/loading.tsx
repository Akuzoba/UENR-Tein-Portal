// Placeholder blocks while an admin page loads.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton h-10 w-56" />
      <div className="skeleton mt-3 h-4 w-72" />
      <div className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-28" />)}
      </div>
      <div className="skeleton mt-4 h-72" />
    </div>
  );
}
