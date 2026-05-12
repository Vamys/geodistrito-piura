/**
 * Lógica de inicialización y renderizado del mapa (Leaflet)
 */
import { state } from './state.js';
import { PROVINCE_COLORS, APP_CONFIG } from './config.js';
import { capitalize } from './utils.js';

export function initMap() {
  if (state.map) {
    state.map.remove();
    state.map = null;
  }
  
  state.map = L.map('map', { 
    zoomControl: true, 
    attributionControl: false 
  }).setView(APP_CONFIG.DEFAULT_CENTER, APP_CONFIG.DEFAULT_ZOOM);

  L.tileLayer(APP_CONFIG.TILE_LAYER, {
    maxZoom: 19
  }).addTo(state.map);
}

export function buildPopup(c) {
  const color = PROVINCE_COLORS[c._province] || '#94a3b8';
  return `
    <div class="popup-name">${c._name}</div>
    <div class="popup-row"><span class="popup-key">Distrito</span><span class="popup-val">${c._district}</span></div>
    <div class="popup-row"><span class="popup-key">Provincia</span><span class="popup-val">${c._province}</span></div>
    <div class="popup-row"><span class="popup-key">Lat</span><span class="popup-val">${isNaN(c._lat) ? '—' : c._lat.toFixed(5)}</span></div>
    <div class="popup-row"><span class="popup-key">Lon</span><span class="popup-val">${isNaN(c._lon) ? '—' : c._lon.toFixed(5)}</span></div>
    <span class="popup-dist-tag" style="background:${color}22;color:${color}">${c._district}</span>
  `;
}

export function renderMapLayers(onMarkerClick) {
  // Limpiar capas previas
  Object.values(state.polyLayers).forEach(l => l && state.map.removeLayer(l));
  state.polyLayers = {};
  if (state.markersLayer) {
    state.map.removeLayer(state.markersLayer);
    state.markersLayer = null;
  }

  // Conteo por distrito para el estilo visual
  const distCount = {};
  state.classifiedData.forEach(c => {
    distCount[c._district] = (distCount[c._district] || 0) + 1;
  });

  // Dibujar polígonos
  state.districtPolys.forEach(dp => {
    const color = PROVINCE_COLORS[dp.province] || '#94a3b8';
    const count = distCount[dp.name] || 0;
    
    const layer = L.geoJSON(dp.feature, {
      style: {
        color: color,
        weight: 1.2,
        opacity: 0.7,
        fillColor: color,
        fillOpacity: count > 0 ? 0.22 : 0.06,
      }
    }).addTo(state.map);

    layer.on('click', () => {
      // Evento global disparado desde UI
      window.dispatchEvent(new CustomEvent('districtSelected', { detail: dp.name }));
    });
    
    layer.on('mouseover', (e) => {
      e.target.setStyle({ fillOpacity: count > 0 ? 0.38 : 0.15, weight: 2 });
    });
    
    layer.on('mouseout', (e) => {
      if (state.selectedDist !== dp.name) {
        e.target.setStyle({ fillOpacity: count > 0 ? 0.22 : 0.06, weight: 1.2 });
      }
    });

    state.polyLayers[dp.name] = layer;
  });

  // Marcadores con Clústeres
  state.markersLayer = L.markerClusterGroup({
    maxClusterRadius: 40,
    iconCreateFunction: cluster => {
      const n = cluster.getChildCount();
      return L.divIcon({
        html: `<div style="background:rgba(59,130,246,.85);color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:2px solid rgba(255,255,255,.3)">${n}</div>`,
        iconSize: [34, 34], 
        className: ''
      });
    }
  });

  state.classifiedData.forEach(c => {
    if (isNaN(c._lat) || isNaN(c._lon)) return;
    const color = PROVINCE_COLORS[c._province] || '#94a3b8';
    const icon = L.divIcon({
      html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,.5);box-shadow:0 0 6px ${color}"></div>`,
      iconSize: [10, 10], 
      iconAnchor: [5, 5], 
      className: ''
    });
    
    const marker = L.marker([c._lat, c._lon], { icon });
    marker.bindPopup(buildPopup(c));
    marker.on('click', () => onMarkerClick(c));
    state.markersLayer.addLayer(marker);
  });

  state.map.addLayer(state.markersLayer);

  // Ajustar vista
  const valid = state.classifiedData.filter(c => !isNaN(c._lat));
  if (valid.length) {
    const bounds = L.latLngBounds(valid.map(c => [c._lat, c._lon]));
    state.map.fitBounds(bounds, { padding: [40, 40] });
  }
}
