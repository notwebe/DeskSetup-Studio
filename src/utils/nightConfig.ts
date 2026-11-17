import { ROOM_CONFIG } from '../constants/deskConfig';

// Konstanta terpusat untuk mode siang/malam, saklar dinding, lampu periferal, dan post-processing bloom
// Semua ukuran jarak dalam satuan meter (1 unit = 1 meter)
export const NIGHT_DAMP_LAMBDA = 5; // Kecepatan transisi damp (~0,7 detik)
export const NIGHT_SNAP_EPSILON = 0.001;

// Saklar lampu di dinding belakang (WallSwitch.tsx)
export const WALL_SWITCH_X = 0.88; // Di sisi kanan meja, terlihat jelas di dalam kamera default
export const WALL_SWITCH_Y = 1.2;  // Tinggi 1,2 m dari lantai
export const WALL_SWITCH_CONFIG = {
  x: WALL_SWITCH_X,
  y: WALL_SWITCH_Y,
  plateWidth: 0.086,
  plateHeight: 0.086,
  plateDepth: 0.01,
  plateColor: '#e8e6e1',
  plateRoughness: 0.5,
  frameWidth: 0.044,
  frameHeight: 0.064,
  frameDepth: 0.003,
  rockerWidth: 0.032,
  rockerHeight: 0.052,
  rockerDepth: 0.008,
  rockerColor: '#f4f2ee',
  rockerMaxTiltRad: 0.14,
  indicatorRadius: 0.0035,
  indicatorOffsetY: -0.034,
  indicatorColor: '#ffc46b',
  indicatorMaxEmissiveIntensity: 1.8,
} as const;

// Nilai pencahayaan ruangan siang (DAY) dan malam (NIGHT)
export const ROOM_LIGHTING_CONFIG = {
  day: {
    environmentIntensity: 0.38,
    directionalIntensity: 1.15,
    ambientIntensity: 0.25,
    wallPointLightIntensity: 0.45,
    contactShadowsOpacity: 0.42,
    backgroundColor: ROOM_CONFIG.backgroundColor, // '#dcd9d2'
    fogColor: ROOM_CONFIG.backgroundColor,
  },
  night: {
    environmentIntensity: 0.05,
    directionalIntensity: 0,
    dayAmbientIntensity: 0,
    nightAmbientColor: '#20284a',
    nightAmbientIntensity: 0.07,
    wallPointLightIntensity: 0,
    contactShadowsOpacityFactor: 0.3, // 0,3 x DAY
    backgroundColor: '#05060a',
    fogColor: '#05060a',
  },
} as const;

// Konfigurasi layar monitor & cahaya limpahan (Monitor.tsx)
export const SCREEN_ON_IN_DAY = false;
export const SCREEN_ON_INTENSITY = 1.1;
export const MONITOR_LIGHT_INTENSITY = 1.5;
export const MONITOR_LIGHT_COLOR = '#5a6cff';
export const MONITOR_LIGHT_DISTANCE = 1.6;
export const MONITOR_LIGHT_DECAY = 2;
export const MONITOR_LIGHT_FORWARD_OFFSET = 0.2;

// Konfigurasi lampu keyboard (Keyboard.tsx)
export const KEY_LEGEND_INTENSITY = 2.0;
export const KEY_GAP_PLANE_OFFSET_Y = 0.0004;
export const KEY_GAP_RECT_EXPAND_M = 0.0012; // Diperbesar 1,2 mm tiap sisi
export const KEY_GAP_COLOR_MULTIPLIER = 2.2;
export const KEY_GAP_MAX_OPACITY = 0.85;
export const KEYBOARD_GLOW_PADDING_M = 0.05; // Footprint + 0,05 m tiap sisi
export const KEYBOARD_GLOW_MAX_OPACITY = 0.25;

// Konfigurasi lampu mouse (Mouse.tsx)
export const MOUSE_WHEEL_STRIP_MAX_INTENSITY = 1.4;
export const MOUSE_MMO_NUMBER_MAX_INTENSITY = 1.2;
export const MOUSE_EMBLEM_MAX_INTENSITY = 1.0;
export const MOUSE_GLOW_PADDING_M = 0.03; // Footprint + 0,03 m tiap sisi
export const MOUSE_GLOW_MAX_OPACITY = 0.3;

// Konfigurasi Glow Decal di permukaan meja/mat
export const GLOW_DECAL_SURFACE_OFFSET_Y = 0.0006;

// Konfigurasi Post-Processing Bloom (PostFX.tsx)
export const BLOOM_ENABLED = true;
export const BLOOM_INTENSITY = 0.9;
export const BLOOM_LUMINANCE_THRESHOLD = 1.0;
export const BLOOM_LUMINANCE_SMOOTHING = 0.2;
export const BLOOM_MULTISAMPLING = 4;
