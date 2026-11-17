import { KEYBOARD_CONFIG } from '../constants/deskConfig';

export type KeyboardVariant = 'tkl' | 'fullsize' | '65';

export interface KeyCapSpec {
  // Koordinat pusat tombol dalam meter relatif ke pojok kiri-depan area tombol
  x: number;
  z: number;
  // Ukuran aktual keycap setelah dikurangi celah 1,5 mm (dalam meter)
  w: number;
  d: number;
  // Label teks pada tombol (baris tunggal, fungsi kecil rata kiri-bawah, atau simbol ganda dipisah "\n")
  legend: string;
  // Apakah tombol fungsi/modifier (teks huruf kecil rata kiri-bawah)
  isFunctionKey: boolean;
}

export interface KeyboardLayoutData {
  variant: KeyboardVariant;
  keys: KeyCapSpec[];
  keysAreaWidth: number;
  keysAreaDepth: number;
  caseWidth: number;
  caseDepth: number;
  caseHeight: number;
  indicatorPositions: { x: number; z: number }[];
}

interface RawKeyDef {
  uX: number;       // Offset kiri dalam satuan u dari sisi kiri area tombol
  uRowBack: number; // Offset baris dalam satuan u dari sisi belakang area tombol
  uW: number;       // Lebar dalam satuan u
  uD: number;       // Kedalaman dalam satuan u (ke arah depan)
  legend: string;
  isFunctionKey?: boolean;
}

function addRowKeys(
  target: RawKeyDef[],
  uRowBack: number,
  startUX: number,
  specs: Array<
    | string
    | { legend: string; uW?: number; uD?: number; gapBefore?: number; fn?: boolean }
  >
): void {
  let cursorX = startUX;
  for (const item of specs) {
    if (typeof item === 'string') {
      target.push({
        uX: cursorX,
        uRowBack,
        uW: 1,
        uD: 1,
        legend: item,
        isFunctionKey: false,
      });
      cursorX += 1;
    } else {
      if (item.gapBefore) {
        cursorX += item.gapBefore;
      }
      const uW = item.uW ?? 1;
      const uD = item.uD ?? 1;
      target.push({
        uX: cursorX,
        uRowBack,
        uW,
        uD,
        legend: item.legend,
        isFunctionKey: Boolean(item.fn),
      });
      cursorX += uW;
    }
  }
}

// Bangun blok 5 baris utama (15u) yang dipakai oleh TKL dan Full-size
function buildStandardMainBlock(
  rawKeys: RawKeyDef[],
  baseRowOffset: number
): void {
  // Baris angka (15u, 14 tombol)
  addRowKeys(rawKeys, baseRowOffset, 0, [
    '~\n`',
    '!\n1',
    '@\n2',
    '#\n3',
    '$\n4',
    '%\n5',
    '^\n6',
    '&\n7',
    '*\n8',
    '(\n9',
    ')\n0',
    '_\n-',
    '+\n=',
    { legend: 'backspace', uW: 2, fn: true },
  ]);

  // Baris QWERTY (15u, 14 tombol)
  addRowKeys(rawKeys, baseRowOffset + 1, 0, [
    { legend: 'tab', uW: 1.5, fn: true },
    'Q',
    'W',
    'E',
    'R',
    'T',
    'Y',
    'U',
    'I',
    'O',
    'P',
    '{\n[',
    '}\n]',
    { legend: '|\n\\', uW: 1.5 },
  ]);

  // Baris ASDF (15u, 13 tombol)
  addRowKeys(rawKeys, baseRowOffset + 2, 0, [
    { legend: 'caps lock', uW: 1.75, fn: true },
    'A',
    'S',
    'D',
    'F',
    'G',
    'H',
    'J',
    'K',
    'L',
    ':\n;',
    '"\n\'',
    { legend: 'enter', uW: 2.25, fn: true },
  ]);

  // Baris Shift (15u, 12 tombol)
  addRowKeys(rawKeys, baseRowOffset + 3, 0, [
    { legend: 'shift', uW: 2.25, fn: true },
    'Z',
    'X',
    'C',
    'V',
    'B',
    'N',
    'M',
    '<\n,',
    '>\n.',
    '?\n/',
    { legend: 'shift', uW: 2.75, fn: true },
  ]);

  // Baris bawah (15u, 8 tombol)
  addRowKeys(rawKeys, baseRowOffset + 4, 0, [
    { legend: 'ctrl', uW: 1.25, fn: true },
    { legend: 'win', uW: 1.25, fn: true },
    { legend: 'alt', uW: 1.25, fn: true },
    { legend: '', uW: 6.25, fn: true },
    { legend: 'alt', uW: 1.25, fn: true },
    { legend: 'fn', uW: 1.25, fn: true },
    { legend: 'menu', uW: 1.25, fn: true },
    { legend: 'ctrl', uW: 1.25, fn: true },
  ]);
}

// Bangun blok navigasi 3 kolom (Ins/Home/PgUp, Del/End/PgDn, dan panah)
function buildNavigationCluster(
  rawKeys: RawKeyDef[],
  baseRowOffset: number,
  navStartX: number
): void {
  addRowKeys(rawKeys, baseRowOffset, navStartX, [
    { legend: 'ins', fn: true },
    { legend: 'home', fn: true },
    { legend: 'pgup', fn: true },
  ]);
  addRowKeys(rawKeys, baseRowOffset + 1, navStartX, [
    { legend: 'del', fn: true },
    { legend: 'end', fn: true },
    { legend: 'pgdn', fn: true },
  ]);
  // Panah Up di tengah baris Shift
  addRowKeys(rawKeys, baseRowOffset + 3, navStartX + 1, ['↑']);
  // Panah Left / Down / Right di baris bawah
  addRowKeys(rawKeys, baseRowOffset + 4, navStartX, ['←', '↓', '→']);
}

const layoutCache = new Map<KeyboardVariant, KeyboardLayoutData>();

// Fungsi murni penghitung tata letak tombol dan dimensi casing keyboard
export function buildLayout(variant: KeyboardVariant): KeyboardLayoutData {
  const cached = layoutCache.get(variant);
  if (cached) {
    return cached;
  }

  const {
    unitPitch,
    keyGap,
    plateMargin,
    wedgeBackHeight,
    plateThickness,
    keycapHeight,
  } = KEYBOARD_CONFIG;

  const rawKeys: RawKeyDef[] = [];
  let totalUnitsW = 0;
  let totalUnitsD = 0;
  const indicatorUnits: { uX: number; uZFromBack: number }[] = [];

  if (variant === 'tkl' || variant === 'fullsize') {
    // Baris F: Esc, jarak 1u, F1-F4, jarak 0.5u, F5-F8, jarak 0.5u, F9-F12 (13 tombol)
    addRowKeys(rawKeys, 0, 0, [
      { legend: 'esc', fn: true },
      { legend: 'F1', gapBefore: 1 },
      'F2',
      'F3',
      'F4',
      { legend: 'F5', gapBefore: 0.5 },
      'F6',
      'F7',
      'F8',
      { legend: 'F9', gapBefore: 0.5 },
      'F10',
      'F11',
      'F12',
    ]);

    const navStartX = 15.25; // Celah 0,25u setelah blok utama 15u
    const mainRowStart = 1.5; // Jarak vertikal 0,5u antara baris F (1u) dan baris angka

    buildStandardMainBlock(rawKeys, mainRowStart);
    buildNavigationCluster(rawKeys, mainRowStart, navStartX);

    if (variant === 'tkl') {
      totalUnitsW = 18.25;
      totalUnitsD = 6.5;
      // Tiga lampu indikator di area kosong kanan atas (pengganti PrtSc/ScrLk/Pause)
      indicatorUnits.push(
        { uX: navStartX + 0.7, uZFromBack: 0.5 },
        { uX: navStartX + 1.5, uZFromBack: 0.5 },
        { uX: navStartX + 2.3, uZFromBack: 0.5 }
      );
    } else {
      // Full-size (104 tombol): tambah 3 tombol sistem + celah 0,25u + numpad 4u (17 tombol)
      addRowKeys(rawKeys, 0, navStartX, [
        { legend: 'prt sc', fn: true },
        { legend: 'scr lk', fn: true },
        { legend: 'pause', fn: true },
      ]);

      const numpadStartX = 18.5; // 18,25u + celah 0,25u
      addRowKeys(rawKeys, mainRowStart, numpadStartX, [
        { legend: 'num', fn: true },
        '/',
        '*',
        '-',
      ]);
      addRowKeys(rawKeys, mainRowStart + 1, numpadStartX, [
        '7',
        '8',
        '9',
        { legend: '+', uW: 1, uD: 2 },
      ]);
      addRowKeys(rawKeys, mainRowStart + 2, numpadStartX, ['4', '5', '6']);
      addRowKeys(rawKeys, mainRowStart + 3, numpadStartX, [
        '1',
        '2',
        '3',
        { legend: 'enter', uW: 1, uD: 2, fn: true },
      ]);
      addRowKeys(rawKeys, mainRowStart + 4, numpadStartX, [
        { legend: '0', uW: 2 },
        '.',
      ]);

      totalUnitsW = 22.5;
      totalUnitsD = 6.5;
      // Tiga lampu indikator di kanan atas (di atas numpad)
      indicatorUnits.push(
        { uX: numpadStartX + 1.2, uZFromBack: 0.5 },
        { uX: numpadStartX + 2.0, uZFromBack: 0.5 },
        { uX: numpadStartX + 2.8, uZFromBack: 0.5 }
      );
    }
  } else {
    // Varian "65": tanpa baris F, 5 baris utama (15u) + 1 kolom kanan (Del, PgUp, PgDn, End) = 68 tombol
    addRowKeys(rawKeys, 0, 0, [
      { legend: 'esc', fn: true },
      '!\n1',
      '@\n2',
      '#\n3',
      '$\n4',
      '%\n5',
      '^\n6',
      '&\n7',
      '*\n8',
      '(\n9',
      ')\n0',
      '_\n-',
      '+\n=',
      { legend: 'backspace', uW: 2, fn: true },
      { legend: 'del', fn: true },
    ]);

    addRowKeys(rawKeys, 1, 0, [
      { legend: 'tab', uW: 1.5, fn: true },
      'Q',
      'W',
      'E',
      'R',
      'T',
      'Y',
      'U',
      'I',
      'O',
      'P',
      '{\n[',
      '}\n]',
      { legend: '|\n\\', uW: 1.5 },
      { legend: 'pgup', fn: true },
    ]);

    addRowKeys(rawKeys, 2, 0, [
      { legend: 'caps lock', uW: 1.75, fn: true },
      'A',
      'S',
      'D',
      'F',
      'G',
      'H',
      'J',
      'K',
      'L',
      ':\n;',
      '"\n\'',
      { legend: 'enter', uW: 2.25, fn: true },
      { legend: 'pgdn', fn: true },
    ]);

    addRowKeys(rawKeys, 3, 0, [
      { legend: 'shift', uW: 2.25, fn: true },
      'Z',
      'X',
      'C',
      'V',
      'B',
      'N',
      'M',
      '<\n,',
      '>\n.',
      '?\n/',
      { legend: 'shift', uW: 1.75, fn: true },
      '↑',
      { legend: 'end', fn: true },
    ]);

    addRowKeys(rawKeys, 4, 0, [
      { legend: 'ctrl', uW: 1.25, fn: true },
      { legend: 'win', uW: 1.25, fn: true },
      { legend: 'alt', uW: 1.25, fn: true },
      { legend: '', uW: 6.25, fn: true },
      { legend: 'alt', uW: 1, fn: true },
      { legend: 'fn', uW: 1, fn: true },
      { legend: 'ctrl', uW: 1, fn: true },
      '←',
      '↓',
      '→',
    ]);

    totalUnitsW = 16;
    totalUnitsD = 5;
  }

  const keysAreaWidth = totalUnitsW * unitPitch;
  const keysAreaDepth = totalUnitsD * unitPitch;

  // Konversi ke meter relatif terhadap pojok kiri-depan area tombol (x ke kanan, z ke arah belakang)
  const keys: KeyCapSpec[] = rawKeys.map((rk) => {
    const w = rk.uW * unitPitch - keyGap;
    const d = rk.uD * unitPitch - keyGap;
    const centerX = (rk.uX + rk.uW / 2) * unitPitch;
    const centerZFromFront =
      (totalUnitsD - (rk.uRowBack + rk.uD / 2)) * unitPitch;

    return {
      x: centerX,
      z: centerZFromFront,
      w,
      d,
      legend: rk.legend,
      isFunctionKey: Boolean(rk.isFunctionKey),
    };
  });

  const indicatorPositions = indicatorUnits.map((ind) => ({
    x: ind.uX * unitPitch,
    z: (totalUnitsD - ind.uZFromBack) * unitPitch,
  }));

  const caseWidth = keysAreaWidth + plateMargin * 2;
  const caseDepth = keysAreaDepth + plateMargin * 2;
  const caseHeight = wedgeBackHeight + plateThickness + keycapHeight;

  const result: KeyboardLayoutData = {
    variant,
    keys,
    keysAreaWidth,
    keysAreaDepth,
    caseWidth,
    caseDepth,
    caseHeight,
    indicatorPositions,
  };

  layoutCache.set(variant, result);
  return result;
}

// Validasi ringan (console.assert) untuk jumlah tombol dan lebar total tiap varian
const _tklTest = buildLayout('tkl');
const _fullTest = buildLayout('fullsize');
const _65Test = buildLayout('65');

console.assert(
  _tklTest.keys.length === 84,
  `[keyboardLayout] TKL harus memiliki 84 tombol, aktual: ${_tklTest.keys.length}`
);
console.assert(
  Math.abs(_tklTest.caseWidth - 0.36) < 0.015,
  `[keyboardLayout] Lebar TKL sekitar 0.36 m, aktual: ${_tklTest.caseWidth.toFixed(4)} m`
);
console.assert(
  _fullTest.keys.length === 104,
  `[keyboardLayout] Full-size harus memiliki 104 tombol, aktual: ${_fullTest.keys.length}`
);
console.assert(
  Math.abs(_fullTest.caseWidth - 0.44) < 0.015,
  `[keyboardLayout] Lebar Full-size sekitar 0.44 m, aktual: ${_fullTest.caseWidth.toFixed(4)} m`
);
console.assert(
  _65Test.keys.length === 68,
  `[keyboardLayout] 65% harus memiliki 68 tombol, aktual: ${_65Test.keys.length}`
);
console.assert(
  Math.abs(_65Test.caseWidth - 0.31) < 0.02,
  `[keyboardLayout] Lebar 65% sekitar 0.31-0.32 m, aktual: ${_65Test.caseWidth.toFixed(4)} m`
);
