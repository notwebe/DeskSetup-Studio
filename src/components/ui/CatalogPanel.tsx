import {
  getActiveMountParams,
  getCatalogItemById,
  getCatalogItemsByCategory,
} from '../../data/catalog';
import { CATEGORIES, useSetupStore } from '../../store/useSetupStore';
import { CLAMP_BASE_X_LIMIT } from '../../utils/clampToDesk';
import { ItemCard } from './ItemCard';

function formatKg(val: number): string {
  return val.toLocaleString('id-ID');
}

// Panel katalog untuk kategori aktif + bagian Penyangga & Posisi
export function CatalogPanel() {
  const activeCategory = useSetupStore((state) => state.activeCategory);
  const placed = useSetupStore((state) => state.placed);
  const mountHeight = useSetupStore((state) => state.mountHeight);
  const baseX = useSetupStore((state) => state.baseX);
  const placeItem = useSetupStore((state) => state.placeItem);
  const setMountHeight = useSetupStore((state) => state.setMountHeight);
  const setBaseX = useSetupStore((state) => state.setBaseX);
  const resetTransform = useSetupStore((state) => state.resetTransform);

  const activeMeta =
    CATEGORIES.find((cat) => cat.id === activeCategory) ?? CATEGORIES[0];
  const items = getCatalogItemsByCategory(activeCategory);
  const placedItemId = placed[activeCategory];

  const mountItems = getCatalogItemsByCategory('monitorMount');
  const placedMonitor = placed.monitor
    ? getCatalogItemById<'monitor'>(placed.monitor)
    : undefined;
  const activeMountParams = getActiveMountParams(placed.monitorMount);
  const isArmOrBracket =
    activeMountParams.mountType === 'arm' ||
    activeMountParams.mountType === 'bracket';

  const minHeightCm = Math.round(activeMountParams.minHeight * 100);
  const maxHeightCm = Math.round(activeMountParams.maxHeight * 100);
  const currentHeightCm = Math.round(mountHeight * 100);

  const maxBaseXCm = Math.round(CLAMP_BASE_X_LIMIT * 100);
  const currentBaseXCm = Math.round(baseX * 100);

  return (
    <div className="flex-1 p-5 flex flex-col min-h-0 overflow-y-auto">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-neutral-100">
          {activeMeta.label}
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 flex flex-col items-center justify-center text-center p-6">
          <p className="text-sm font-medium text-neutral-200 mb-1">
            {activeMeta.label}
          </p>
          <p className="text-xs text-neutral-400">Segera hadir</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Daftar kartu item utama kategori aktif */}
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isPlaced={placedItemId === item.id}
              onSelect={() => placeItem(activeCategory, item.id)}
            />
          ))}

          {/* Bagian Penyangga khusus pada tab Monitor */}
          {activeCategory === 'monitor' && (
            <div className="mt-3 pt-4 border-t border-neutral-800 flex flex-col gap-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                Penyangga
              </h3>
              {mountItems.map((mountItem) => {
                const isOverweight =
                  placedMonitor !== undefined &&
                  placedMonitor.params.weightKg >
                    mountItem.params.maxWeightKg;

                const warningText = isOverweight
                  ? `Melebihi kapasitas (${formatKg(placedMonitor.params.weightKg)} kg > ${formatKg(mountItem.params.maxWeightKg)} kg)`
                  : undefined;

                return (
                  <ItemCard
                    key={mountItem.id}
                    item={mountItem}
                    isPlaced={placed.monitorMount === mountItem.id}
                    warningText={warningText}
                    onSelect={() => placeItem('monitorMount', mountItem.id)}
                  />
                );
              })}
            </div>
          )}

          {/* Bagian Posisi khusus ketika monitor sudah terpasang */}
          {activeCategory === 'monitor' && placedItemId !== null && (
            <div className="mt-2 pt-4 border-t border-neutral-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                Posisi
              </h3>

              {isArmOrBracket && (
                <div className="flex flex-col gap-3 mb-3.5 p-3 rounded-lg bg-neutral-950/50 border border-neutral-800/80">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-300">Tinggi monitor</span>
                      <span className="text-amber-400 font-medium">
                        {currentHeightCm} cm
                      </span>
                    </div>
                    <input
                      type="range"
                      min={minHeightCm}
                      max={maxHeightCm}
                      step={1}
                      value={currentHeightCm}
                      onChange={(e) =>
                        setMountHeight(Number(e.target.value) / 100)
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-300">Posisi klem</span>
                      <span className="text-amber-400 font-medium">
                        {currentBaseXCm > 0
                          ? `+${currentBaseXCm}`
                          : currentBaseXCm}{' '}
                        cm
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-maxBaseXCm}
                      max={maxBaseXCm}
                      step={1}
                      value={currentBaseXCm}
                      onChange={(e) => setBaseX(Number(e.target.value) / 100)}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-neutral-300 mb-1">
                Seret monitor di desk. Q/E untuk memutar.
              </p>
              <p className="text-xs text-neutral-400 mb-3">
                {activeMountParams.mountType === 'stand' &&
                  'Stand: bebas digeser di atas permukaan desk.'}
                {activeMountParams.mountType === 'arm' &&
                  'Arm: jangkauan terbatas panjang lengan.'}
                {activeMountParams.mountType === 'bracket' &&
                  'Bracket: hanya geser kiri-kanan di tepi belakang (rotasi maks ±25°).'}
              </p>

              <button
                type="button"
                onClick={() => resetTransform('monitor')}
                className="w-full py-2 px-3 rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-xs font-medium text-neutral-200 transition-colors"
              >
                Reset posisi
              </button>
            </div>
          )}

          {/* Bagian Posisi khusus ketika keyboard sudah terpasang */}
          {activeCategory === 'keyboard' && placedItemId !== null && (
            <div className="mt-2 pt-4 border-t border-neutral-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                Posisi
              </h3>
              <p className="text-xs text-neutral-400 mb-3">
                Seret keyboard di meja. Q/E untuk memutar. Kabel otomatis
                terhubung ke lubang kabel terdekat.
              </p>
              <button
                type="button"
                onClick={() => resetTransform('keyboard')}
                className="w-full py-2 px-3 rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-xs font-medium text-neutral-200 transition-colors"
              >
                Reset posisi
              </button>
            </div>
          )}

          {/* Bagian Posisi khusus ketika mouse sudah terpasang */}
          {activeCategory === 'mouse' && placedItemId !== null && (
            <div className="mt-2 pt-4 border-t border-neutral-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                Posisi
              </h3>
              <p className="text-xs text-neutral-400 mb-3">
                Seret mouse di meja. Q/E untuk memutar.
              </p>
              <button
                type="button"
                onClick={() => resetTransform('mouse')}
                className="w-full py-2 px-3 rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-xs font-medium text-neutral-200 transition-colors"
              >
                Reset posisi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
