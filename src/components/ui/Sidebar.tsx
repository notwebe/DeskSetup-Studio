import { CategoryTabs } from './CategoryTabs';
import { CatalogPanel } from './CatalogPanel';

// Sidebar kanan tetap (360px) dengan tab kategori dan panel katalog
export function Sidebar() {
  return (
    <aside className="w-[360px] shrink-0 h-full bg-neutral-900 border-l border-neutral-800 flex flex-col text-neutral-100 select-none">
      <CategoryTabs />
      <CatalogPanel />
    </aside>
  );
}
