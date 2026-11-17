// Skala scene: 1 unit = 1 meter
// Batas posisi klem arm/bracket sepanjang tepi belakang meja (+/- 40 cm agar bebas dari lubang kabel & kaki)
export const CLAMP_X_RANGE = 0.4;

export const DESK_CONFIG = {
  // Dimensi utama meja (lebar, kedalaman, dan tinggi permukaan atas TIDAK berubah dari Step 1)
  width: 1.4,          // 140 cm (lebar meja)
  depth: 0.7,          // 70 cm (kedalaman meja)
  height: 0.75,        // 75 cm (tinggi permukaan atas meja dari lantai)
  topThickness: 0.025, // 2,5 cm (ketebalan daun meja gaming elektrik)

  // Pertahankan field kompatibilitas Step 1
  legThickness: 0.07,
  legInset: 0.05,
  topColor: '#121212',
  legColor: '#0d0d0d',

  // Geometri & material daun meja (DeskTop)
  topCornerRadius: 0.05,
  topBevel: 0.002,
  topCurveSegments: 16,
  topRoughness: 0.35,
  topMetalness: 0.1,
  topClearcoat: 0.5,
  topClearcoatRoughness: 0.25,

  // Kaki T-terbalik teleskopik (DeskLegs)
  legOffsetFromEdgeX: 0.14, // X = +/-(width / 2 - 0.14) = +/-0.56 m
  footLength: 0.64,         // Panjang kaki dasar searah Z
  footWidth: 0.07,          // Lebar kaki dasar searah X
  footHeight: 0.03,         // Tinggi kaki dasar dari lantai
  footChamfer: 0.03,        // Potongan miring 45 derajat di ujung kaki dasar
  lowerColWidth: 0.07,      // Penampang X kolom bawah
  lowerColDepth: 0.09,      // Penampang Z kolom bawah
  lowerColHeight: 0.38,     // Tinggi kolom bawah dari atas kaki dasar
  jointRingHeight: 0.003,   // Cincin/celah sambungan teleskopik (0,3 cm)
  upperColWidth: 0.06,      // Penampang X kolom atas
  upperColDepth: 0.08,      // Penampang Z kolom atas
  topPlateWidth: 0.08,      // Lebar X pelat penyambung di bawah top
  topPlateDepth: 0.4,       // Panjang Z pelat penyambung di bawah top
  topPlateHeight: 0.008,    // Tebal Y pelat penyambung di bawah top
  legRoughness: 0.65,
  legMetalness: 0.3,

  // Alas meja besar (DeskMat)
  matWidth: 1.0,
  matDepth: 0.4,
  matThickness: 0.003,
  matCornerRadius: 0.01,
  matFrontMargin: 0.06,
  matRoughness: 0.9,
  matMetalness: 0,

  // Dua lubang kabel belakang (Grommets)
  grommetOffsetX: 0.52,
  grommetBackMargin: 0.07,
  grommetOuterRadius: 0.03,
  grommetInnerRadius: 0.022,
  grommetHeight: 0.004,
  grommetOuterColor: '#1c1c1c',
  grommetInnerColor: '#050505',

  // Aksesori sisi kiri & panel kontrol depan (DeskAccessories)
  accessoryColor: '#111111',
  accessoryRoughness: 0.6,
  accessoryMetalness: 0.2,
  leftAccessoryOverhang: 0.08, // Tambahan kotak pembatas di sisi kiri meja
  cupHolderFrontMargin: 0.12,
  cupHolderDiameter: 0.08,
  cupHolderOutwardOffset: 0.06,
  cupHolderDropY: 0.03,
  hookBehindCupOffset: 0.2,
  hookTubeRadius: 0.006,
  hookDropLength: 0.1,
  hookOutwardReach: 0.045,
  controlPanelX: 0.38,
  controlPanelFrontMargin: 0.03,
  controlPanelWidth: 0.11,
  controlPanelDepth: 0.03,
  controlPanelHeight: 0.02,
  controlScreenWidth: 0.05,
  controlScreenHeight: 0.012,
  controlScreenEmissiveIntensity: 0.8,
} as const;

// Konstanta ukuran dan material untuk Keyboard Mekanikal Prosedural (1 unit = 1 meter)
export const KEYBOARD_CONFIG = {
  unitPitch: 0.01905,        // 1u = 19,05 mm
  keyGap: 0.0015,            // Jarak antar tombol 1,5 mm
  plateMargin: 0.008,        // Margin pelat 8 mm di semua sisi
  frontMarginFromDesk: 0.12, // Jarak tepi depan keyboard dari tepi depan meja (12 cm)
  wedgeFrontHeight: 0.012,   // Tinggi depan casing baji (1,2 cm)
  wedgeBackHeight: 0.022,    // Tinggi belakang casing baji (2,2 cm)
  plateThickness: 0.003,     // Ketebalan pelat atas logam (3 mm)
  plateCornerRadius: 0.008,  // Radius sudut pelat atas (8 mm)
  keycapHeight: 0.01,        // Tinggi seluruh keycap (1,0 cm)
  keycapTopTaper: 0.78,      // Rasio lebar/kedalaman bagian atas keycap terhadap bawah (78%)
  legendOffsetAboveKey: 0.0003,
  legendPxPerMm: 8,
  legendMaxTexWidth: 4096,
  caseColor: '#26272a',
  caseRoughness: 0.6,
  plateColor: '#7a7c80',
  plateMetalness: 0.85,
  plateRoughness: 0.4,
  keycapColor: '#2a2b2d',
  keycapRoughness: 0.55,
  keycapMetalness: 0,
  legendTextColor: '#e6e6e6',
  indicatorRadius: 0.0015,
  indicatorEmissiveIntensity: 1.0,
  cableRadius: 0.0018,
  cableRadialSegments: 8,
  cableTubularSegments: 48,
  cableColor: '#151515',
  cableRoughness: 0.8,
} as const;

// Konstanta ukuran dan warna ruangan netral
export const ROOM_CONFIG = {
  floorWidth: 6,       // 6 meter
  floorDepth: 6,       // 6 meter
  wallHeight: 3,       // 3 meter
  wallThickness: 0.1,  // 10 cm
  backWallZ: -0.6,     // Posisi dinding belakang (di belakang meja)
  floorColor: '#e5e2dc',
  wallColor: '#f2f0ec',
  backgroundColor: '#dcd9d2',
} as const;
