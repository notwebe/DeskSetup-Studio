import {
  Cpu,
  Keyboard,
  Lightbulb,
  Monitor,
  Mouse,
  PackagePlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  CATEGORIES,
  useSetupStore,
  type CategoryId,
} from '../../store/useSetupStore';

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  monitor: Monitor,
  monitorMount: Monitor,
  pc: Cpu,
  keyboard: Keyboard,
  mouse: Mouse,
  lighting: Lightbulb,
  addons: PackagePlus,
};

// Navigasi tab 6 kategori di bagian atas sidebar
export function CategoryTabs() {
  const activeCategory = useSetupStore((state) => state.activeCategory);
  const setActiveCategory = useSetupStore((state) => state.setActiveCategory);

  return (
    <nav
      aria-label="Kategori perlengkapan"
      className="grid grid-cols-3 gap-1.5 p-3 border-b border-neutral-800 bg-neutral-900/60"
    >
      {CATEGORIES.map(({ id, label }) => {
        const Icon = CATEGORY_ICONS[id];
        const isActive = activeCategory === id;

        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            onClick={() => setActiveCategory(id)}
            className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg border text-xs transition-colors ${
              isActive
                ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 font-medium shadow-sm'
                : 'bg-neutral-800/60 border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <Icon className="w-4 h-4" strokeWidth={1.8} />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
