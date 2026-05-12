/**
 * Funciones de utilidad y ayudantes geométricos
 */

/**
 * Algoritmo Point-in-Polygon (Ray Casting)
 */
export function isPointInPolygon(lon, lat, ring) {
  let inside = false, n = ring.length, j = n - 1;
  for (let i = 0; i < n; i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    const intersect = ((yi > lat) !== (yj > lat)) &&
                      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

/**
 * Calcula el bounding box de un anillo de coordenadas
 */
export function getBoundingBox(ring) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Verifica si un punto está dentro de un bounding box
 */
export function isPointInBox(lon, lat, box) {
  return lon >= box.minX && lon <= box.maxX && lat >= box.minY && lat <= box.maxY;
}

/**
 * Capitaliza una cadena de texto
 */
export function capitalize(s) {
  if (!s) return '';
  return s.charAt(0) + s.slice(1).toLowerCase();
}

/**
 * Escapa caracteres para IDs de DOM
 */
export function escapeId(s) {
  return s.replace(/'/g, "\\'").replace(/\s/g, '_');
}

/**
 * Pausa la ejecución
 */
export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
