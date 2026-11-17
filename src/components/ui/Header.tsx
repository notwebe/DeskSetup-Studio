// Header tipis di bagian atas aplikasi
export function Header() {
  return (
    <header className="h-12 shrink-0 px-5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-neutral-100 select-none">
      <div className="flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <h1 className="text-sm font-semibold tracking-wide text-neutral-100">
          DeskSetup Studio
        </h1>
      </div>
      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700/60">
        3D Planner
      </span>
    </header>
  );
}
