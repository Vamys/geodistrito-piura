/**
 * Lógica de procesamiento de datos y clasificación espacial
 */
import { state } from './state.js';
import { isPointInPolygon, getBoundingBox, isPointInBox } from './utils.js';

/**
 * Clasifica un punto (lon, lat) buscando el distrito correspondiente
 * Optimizado con Bounding Box check
 */
export function classifyPoint(lon, lat) {
  for (const d of state.districtPolys) {
    // Primero verificamos el Bounding Box del distrito (rápido)
    if (isPointInBox(lon, lat, d.bbox)) {
      // Si está en el box, verificamos cada anillo con PiP (lento)
      for (const ring of d.rings) {
        if (isPointInPolygon(lon, lat, ring)) {
          return { district: d.name, province: d.province };
        }
      }
    }
  }
  return { district: 'NO IDENTIFICADO', province: '—' };
}

/**
 * Procesa los datos crudos del Excel y los clasifica
 */
export function processAndClassify() {
  const colLat  = document.getElementById('selLat').value;
  const colLon  = document.getElementById('selLon').value;
  const colName = document.getElementById('selName').value;
  const colDist = document.getElementById('selDist').value;

  const classified = state.rawData.map((row, idx) => {
    const lat = parseFloat(row[colLat]);
    const lon = parseFloat(row[colLon]);
    const valid = !isNaN(lat) && !isNaN(lon);
    
    const { district, province } = valid 
      ? classifyPoint(lon, lat) 
      : { district: 'SIN COORDENADAS', province: '—' };

    const out = { 
      ...row, 
      _idx: idx, 
      _lat: lat, 
      _lon: lon, 
      _name: row[colName] || `Cliente ${idx + 1}`, 
      _district: district, 
      _province: province 
    };
    
    // Guardamos resultados en columnas originales y nuevas
    out[colDist] = district;
    out['PROVINCIA'] = province;
    return out;
  });

  state.setClassifiedData(classified);
}

/**
 * Prepara los polígonos del GeoJSON calculando sus Bounding Boxes
 */
export function prepareDistrictPolys(geojson) {
  const polys = [];
  for (const feat of geojson.features) {
    const props = feat.properties;
    const distName = (props.NOMBDIST || props.nombdist || '').toUpperCase().trim();
    const provName = (props.NOMBPROV || props.nombprov || '').toUpperCase().trim();
    if (!distName) continue;

    const geom = feat.geometry;
    const rings = [];
    if (geom.type === 'Polygon') {
      rings.push(geom.coordinates[0]);
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach(p => rings.push(p[0]));
    }

    // Calculamos el Bounding Box global para el distrito (unión de sus anillos)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    rings.forEach(ring => {
      const box = getBoundingBox(ring);
      if (box.minX < minX) minX = box.minX;
      if (box.maxX > maxX) maxX = box.maxX;
      if (box.minY < minY) minY = box.minY;
      if (box.maxY > maxY) maxY = box.maxY;
    });

    polys.push({ 
      name: distName, 
      province: provName, 
      rings, 
      feature: feat,
      bbox: { minX, maxX, minY, maxY }
    });
  }
  state.setDistrictPolys(polys);
}
