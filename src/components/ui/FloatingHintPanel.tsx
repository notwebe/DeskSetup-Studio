import { useSetupStore } from '../../store/useSetupStore';

// Panel kecil mengambang di pojok kiri-bawah kanvas 3D untuk panduan interaksi & tombol Reset meja
export function FloatingHintPanel() {
  const selectedTarget = useSetupStore((state) => state.selectedTarget);
  const resetDeskTransform = useSetupStore((state) => state.resetDeskTransform);

  let hintText = 'Klik meja atau item untuk memilih.';
  if (selectedTarget === 'desk') {
    hintText = 'Seret meja untuk memindahkan. Q/E memutar.';
  } else if (selectedTarget === 'monitor') {
    hintText = 'Seret monitor di desk. Q/E untuk memutar.';
  } else if (selectedTarget === 'keyboard') {
    hintText =
      'Seret keyboard di meja. Q/E untuk memutar. Kabel otomatis terhubung ke lubang kabel terdekat.';
  } else if (selectedTarget === 'mouse') {
    hintText = 'Seret mouse di meja. Q/E untuk memutar.';
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 text-neutral-100 shadow-lg select-none">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-200">{hintText}</span>
        <span className="text-[11px] text-neutral-400">
          Klik saklar di dinding untuk mematikan/menyalakan lampu ruangan.
        </span>
      </div>
      <button
        type="button"
        onClick={resetDeskTransform}
        className="shrink-0 px-2.5 py-1 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
      >
        Reset meja
      </button>
    </div>
  );
}
