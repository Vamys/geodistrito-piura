/**
 * Manejo del DOM, eventos de interfaz y renderizado de componentes
 */
import { state } from './state.js';
import { PROVINCE_COLORS, APP_CONFIG } from './config.js';
import { capitalize, escapeId } from './utils.js';

export function updateHeader() {
  document.getElementById('hdrFile').textContent = state.fileName;
  document.getElementById('hdrTotal').textContent = state.classifiedData.length;
  document.getElementById('hdrDistritos').textContent = state.getDistrictsCount();
  document.getElementById('hdrProvincias').textContent = state.getProvincesCount();
}

export function buildLegend() {
  const provClients = {};
  state.classifiedData.forEach(c => {
    if (c._province && c._province !== '—') {
      provClients[c._province] = (provClients[c._province] || 0) + 1;
    }
  });

  const html = Object.entries(PROVINCE_COLORS)
    .filter(([p]) => provClients[p])
    .sort((a, b) => (provClients[b[0]] || 0) - (provClients[a[0]] || 0))
    .map(([p, color]) => `
      <div class="legend-row" onclick="window.app.filterByProvince('${p}')">
        <div class="legend-swatch" style="background:${color}"></div>
        <div class="legend-name">${capitalize(p)}</div>
        <div class="legend-n">${provClients[p] || 0}</div>
      </div>`).join('');
      
  document.getElementById('legendBody').innerHTML = html || '<div style="font-size:11px;color:var(--muted)">Sin datos</div>';
}

export function renderDistrictTree(data) {
  const tree = {};
  data.forEach(c => {
    const p = c._province || '—';
    const d = c._district || '—';
    if (!tree[p]) tree[p] = {};
    if (!tree[p][d]) tree[p][d] = 0;
    tree[p][d]++;
  });

  let html = '';
  Object.entries(tree).sort().forEach(([prov, dists]) => {
    const color = PROVINCE_COLORS[prov] || '#94a3b8';
    const total = Object.values(dists).reduce((a, b) => a + b, 0);
    html += `
      <div class="prov-section">
        <div class="prov-header" onclick="window.app.toggleProv(this)">
          <div class="prov-dot" style="background:${color}"></div>
          <div class="prov-name">${capitalize(prov)}</div>
          <div class="prov-count">${total}</div>
          <div class="prov-chevron">▶</div>
        </div>
        <div class="prov-districts">`;
        
    Object.entries(dists).sort((a, b) => b[1] - a[1]).forEach(([dist, n]) => {
      html += `
        <div class="dist-row" id="dr-${escapeId(dist)}" onclick="window.app.selectDistrict('${dist}')">
          <div class="dist-name">${dist}</div>
          <div class="dist-count">${n}</div>
        </div>`;
    });
    html += `</div></div>`;
  });
  document.getElementById('distListWrap').innerHTML = html || '<div class="empty-msg">Sin datos</div>';
}

export function renderClientList(data) {
  const html = data.slice(0, APP_CONFIG.MAX_CLIENTS_LIST).map(c => {
    const color = PROVINCE_COLORS[c._province] || '#94a3b8';
    return `
      <div class="client-item" id="ci-${c._idx}" onclick="window.app.flyToClient(${c._idx})">
        <div class="client-name">${c._name}</div>
        <div class="client-meta">
          <span>${isNaN(c._lat) ? '—' : c._lat.toFixed(4)}</span>
          <span>${isNaN(c._lon) ? '—' : c._lon.toFixed(4)}</span>
        </div>
        <div class="client-dist">
          <span class="client-tag" style="background:${color}22;color:${color}">${c._district}</span>
          <span style="font-size:10px;color:var(--muted);margin-left:4px">${capitalize(c._province)}</span>
        </div>
      </div>`;
  }).join('');
  
  const extra = data.length > APP_CONFIG.MAX_CLIENTS_LIST 
    ? `<div class="empty-msg">+ ${data.length - APP_CONFIG.MAX_CLIENTS_LIST} más (usa el buscador)</div>` 
    : '';
    
  document.getElementById('clientListWrap').innerHTML = html + extra || '<div class="empty-msg">Sin resultados</div>';
}

export function buildStats() {
  document.getElementById('statTotal').textContent = state.classifiedData.length;

  // Por provincia
  const byProv = {};
  state.classifiedData.forEach(c => { 
    if (c._province !== '—') byProv[c._province] = (byProv[c._province] || 0) + 1; 
  });
  const maxP = Math.max(...Object.values(byProv), 1);
  document.getElementById('statByProv').innerHTML = Object.entries(byProv)
    .sort((a, b) => b[1] - a[1])
    .map(([p, n]) => {
      const color = PROVINCE_COLORS[p] || '#94a3b8';
      const pct = Math.round(n / maxP * 100);
      return `
        <div class="stat-row">
          <div class="stat-label" style="color:${color}">${capitalize(p)}</div>
          <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pct}%;background:${color}"></div></div>
          <div class="stat-val">${n}</div>
        </div>`;
    }).join('') || '<div class="empty-msg">Sin datos</div>';

  // Por distrito (top 15)
  const byDist = {};
  state.classifiedData.forEach(c => { 
    if (c._district !== 'NO IDENTIFICADO' && c._district !== 'SIN COORDENADAS') {
      byDist[c._district] = (byDist[c._district] || 0) + 1;
    }
  });
  const maxD = Math.max(...Object.values(byDist), 1);
  document.getElementById('statByDist').innerHTML = Object.entries(byDist)
    .sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([d, n]) => {
      const dp = state.districtPolys.find(x => x.name === d);
      const color = dp ? (PROVINCE_COLORS[dp.province] || '#94a3b8') : '#94a3b8';
      const pct = Math.round(n / maxD * 100);
      return `
        <div class="stat-row" style="cursor:pointer" onclick="window.app.selectDistrict('${d}');window.app.switchTab('distritos')">
          <div class="stat-label">${d}</div>
          <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pct}%;background:${color}"></div></div>
          <div class="stat-val">${n}</div>
        </div>`;
    }).join('') || '<div class="empty-msg">Sin datos</div>';
}
