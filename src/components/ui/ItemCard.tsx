import type { CatalogItem } from '../../types/catalog';

interface ItemCardProps {
  item: CatalogItem;
  isPlaced: boolean;
  onSelect: () => void;
  warningText?: string;
}

function formatRupiah(priceIdr: number): string {
  return `Rp ${priceIdr.toLocaleString('id-ID')}`;
}

// Kartu item katalog di sidebar dengan indikator status terpasang & peringatan kapasitas opsional
export function ItemCard({
  item,
  isPlaced,
  onSelect,
  warningText,
}: ItemCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
        isPlaced
          ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40'
          : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-800/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-neutral-100">
          {item.name}
        </span>
        {isPlaced && (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Terpasang
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-400 mb-2">{item.specText}</p>

      {warningText && (
        <div className="mb-2 inline-block text-[11px] font-medium px-2 py-0.5 rounded-md bg-yellow-500/15 text-yellow-300 border border-yellow-500/40">
          {warningText}
        </div>
      )}

      <p className="text-sm font-medium text-amber-400">
        {formatRupiah(item.priceIdr)}
      </p>
    </button>
  );
}
