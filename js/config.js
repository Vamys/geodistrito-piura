/**
 * Configuración global y constantes del proyecto
 */
export const PROVINCE_COLORS = {
  'PIURA':       '#3b82f6',
  'SULLANA':     '#22c55e',
  'PAITA':       '#f97316',
  'TALARA':      '#ef4444',
  'SECHURA':     '#a855f7',
  'MORROPON':    '#f59e0b',
  'HUANCABAMBA': '#06b6d4',
  'AYABACA':     '#ec4899',
};

export const GEOJSON_URL = 'https://raw.githubusercontent.com/josedaniel-cb/limites-piura-geojson/main/LIM_DISTRITAL_PIURA_MIN.json';

export const APP_CONFIG = {
  DEFAULT_CENTER: [-5.2, -80.5],
  DEFAULT_ZOOM: 8,
  MAX_CLIENTS_LIST: 200,
  TILE_LAYER: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
};
