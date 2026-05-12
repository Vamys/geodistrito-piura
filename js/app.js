/**
 * Orquestador principal de la aplicación
 */
import { state } from './state.js';
import { GEOJSON_URL, PROVINCE_COLORS } from './config.js';
import { sleep, escapeId } from './utils.js';
import { prepareDistrictPolys, processAndClassify } from './processor.js';
import { initMap, renderMapLayers } from './map-engine.js';
import { 
  updateHeader, renderDistrictTree, renderClientList, 
  buildStats, buildLegend 
} from './ui-manager.js';

/**
 * Inicialización
 */
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  
  // Exponer funciones globales necesarias para el HTML (onclick inline)
  // Nota: En una app senior real usaríamos addEventListener, 
  // pero para mantener compatibilidad con el sistema de templates del usuario:
  window.app = {
    toggleProv,
    selectDistrict,
    switchTab,
    flyToClient,
    filterByProvince
  };
});

function setupEventListeners() {
  // Archivo
  document.getElementById('fileInput').addEventListener('change', handleFileSelect);
  document.getElementById('btnLaunch').addEventListener('click', launchApp);
  document.getElementById('btnReset').addEventListener('click', resetApp);
  document.getElementById('btnExport').addEventListener('click', exportExcel);

  // Drag & Drop
  const dz = document.getElementById('dropzone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('over');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });

  // Buscadores y filtros
  document.getElementById('searchDist').addEventListener('input', filterDistritos);
  document.getElementById('filterProv').addEventListener('change', filterDistritos);
  document.getElementById('searchCliente').addEventListener('input', filterClientes);
  document.getElementById('filterDistCliente').addEventListener('change', filterClientes);

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Eventos personalizados
  window.addEventListener('districtSelected', (e) => selectDistrict(e.detail));
}

/**
 * Lógica de Carga de Archivos
 */
function handleFileSelect(e) {
  if (e.target.files[0]) loadFile(e.target.files[0]);
}

function loadFile(file) {
  state.setFileName(file.name);
  const progWrap = document.getElementById('uploadProgress');
  const progFill = document.getElementById('progFill');
  const progText = document.getElementById('progText');

  progWrap.style.display = 'block';
  progFill.style.width = '30%';
  progText.textContent = 'Leyendo archivo...';

  const reader = new FileReader();
  reader.onload = ev => {
    const wb = XLSX.read(ev.target.result, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(ws, { defval: null });
    
    if (!rawData.length) {
      alert('El archivo está vacío.');
      return;
    }

    state.setRawData(rawData);
    state.setColumns(Object.keys(rawData[0] || {}));

    progFill.style.width = '100%';
    progText.textContent = `✓ ${rawData.length} filas detectadas`;

    populateSelects();
    document.getElementById('colConfig').style.display = 'block';
  };
  reader.readAsArrayBuffer(file);
}

function populateSelects() {
  const ids = ['selLat', 'selLon', 'selName', 'selDist'];
  const columns = state.columns;
  
  ids.forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = columns.map(c => `<option value="${c}">${c}</option>`).join('');
  });

  // Auto-detección inteligente
  const guess = (patterns) => columns.find(c => patterns.some(p => p.test(c))) || columns[0];
  document.getElementById('selLat').value = guess([/^lat/i, /latitud/i]);
  document.getElementById('selLon').value = guess([/^lon/i, /^lng/i, /longitud/i]);
  document.getElementById('selName').value = guess([/^name$/i, /nombre/i, /^name/i]);
  document.getElementById('selDist').value = guess([/distrit/i]);
}

/**
 * Lanzamiento de la Aplicación
 */
async function launchApp() {
  const btn = document.getElementById('btnLaunch');
  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');

  btn.disabled = true;
  overlay.classList.add('show');
  loadingText.textContent = 'Descargando cartografía oficial (GeoJSON)...';

  try {
    const resp = await fetch(GEOJSON_URL);
    if (!resp.ok) throw new Error(`Error HTTP: ${resp.status}`);
    
    loadingText.textContent = 'Procesando polígonos de Piura...';
    const geojson = await resp.json();
    prepareDistrictPolys(geojson);

    loadingText.textContent = `Clasificando ${state.rawData.length} clientes...`;
    await sleep(50); // Dejar respirar al UI
    processAndClassify();

    loadingText.textContent = 'Renderizando mapa interactivo...';
    await sleep(50);
    
    initMap();
    renderMapLayers((client) => {
      switchTab('clientes');
      setTimeout(() => scrollToClient(client._idx), 100);
    });

    // Actualizar UI
    updateHeader();
    buildLegend();
    buildStats();
    
    // Poblar filtros de provincia y distrito
    const provs = [...new Set(state.classifiedData.filter(c => c._province !== '—').map(c => c._province))].sort();
    document.getElementById('filterProv').innerHTML = '<option value="">Todas las provincias</option>' 
      + provs.map(p => `<option value="${p}">${p}</option>`).join('');

    const dists = [...new Set(state.classifiedData.map(c => c._district))].sort();
    document.getElementById('filterDistCliente').innerHTML = '<option value="">Todos los distritos</option>' 
      + dists.map(d => `<option value="${d}">${d}</option>`).join('');

    renderDistrictTree(state.classifiedData);
    renderClientList(state.classifiedData);

    overlay.classList.remove('show');
    document.getElementById('uploadScreen').style.display = 'none';
    document.getElementById('app').classList.add('visible');

    // Forzar actualización de tamaño de Leaflet una vez que el contenedor es visible
    if (state.map) {
      setTimeout(() => {
        state.map.invalidateSize();
      }, 100);
    }

  } catch (e) {
    overlay.classList.remove('show');
    btn.disabled = false;
    console.error(e);
    alert('Error crítico al cargar la aplicación: ' + e.message);
  }
}

/**
 * Acciones de Usuario
 */
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-content').forEach(t => {
    t.classList.toggle('active', t.id === `tab-${name}`);
  });
}

function toggleProv(el) {
  const body = el.nextElementSibling;
  const chev = el.querySelector('.prov-chevron');
  body.classList.toggle('open');
  chev.classList.toggle('open');
}

function selectDistrict(name) {
  // Limpiar selección previa
  if (state.selectedDist && state.polyLayers[state.selectedDist]) {
    const dp = state.districtPolys.find(d => d.name === state.selectedDist);
    const color = PROVINCE_COLORS[dp.province] || '#94a3b8';
    const cnt = state.classifiedData.filter(c => c._district === state.selectedDist).length;
    state.polyLayers[state.selectedDist].setStyle({ 
      weight: 1.2, 
      fillOpacity: cnt > 0 ? 0.22 : 0.06 
    });
  }

  document.querySelectorAll('.dist-row').forEach(r => r.classList.remove('active'));
  state.setSelectedDist(name);

  // Resaltar en mapa
  if (state.polyLayers[name]) {
    state.polyLayers[name].setStyle({ weight: 2.5, fillOpacity: 0.45 });
    try { 
      state.map.fitBounds(state.polyLayers[name].getBounds(), { padding: [60, 60], maxZoom: 13 }); 
    } catch(e) {}
  }

  // Resaltar en panel
  const rowId = 'dr-' + escapeId(name);
  const row = document.getElementById(rowId);
  if (row) {
    row.classList.add('active');
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const body = row.closest('.prov-districts');
    if (body && !body.classList.contains('open')) {
      body.classList.add('open');
      body.previousElementSibling.querySelector('.prov-chevron').classList.add('open');
    }
  }

  // Filtrar tab de clientes
  document.getElementById('filterDistCliente').value = name;
  filterClientes();
}

function filterDistritos() {
  const q = document.getElementById('searchDist').value.toLowerCase();
  const prov = document.getElementById('filterProv').value;
  const filtered = state.classifiedData.filter(c =>
    (!q || c._district.toLowerCase().includes(q) || c._province.toLowerCase().includes(q)) &&
    (!prov || c._province === prov)
  );
  renderDistrictTree(filtered);
}

function filterClientes() {
  const q = document.getElementById('searchCliente').value.toLowerCase();
  const dist = document.getElementById('filterDistCliente').value;
  const filtered = state.classifiedData.filter(c =>
    (!q || c._name.toLowerCase().includes(q)) &&
    (!dist || c._district === dist)
  );
  renderClientList(filtered);
}

function flyToClient(idx) {
  const c = state.classifiedData[idx];
  if (isNaN(c._lat)) return;
  state.map.flyTo([c._lat, c._lon], 16, { duration: 1 });
}

function scrollToClient(idx) {
  const el = document.getElementById(`ci-${idx}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function filterByProvince(prov) {
  document.getElementById('filterProv').value = prov;
  switchTab('distritos');
  filterDistritos();
}

function exportExcel() {
  const colDist = document.getElementById('selDist').value;
  const exportData = state.classifiedData.map(c => {
    const out = {};
    state.columns.forEach(col => out[col] = c[col]);
    out[colDist] = c._district;
    out['PROVINCIA'] = c._province;
    return out;
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clasificado');
  XLSX.writeFile(wb, `GeoDistrito_${state.fileName}`);
}

function resetApp() {
  if (!confirm('¿Cargar un nuevo archivo? Todos los cambios actuales se perderán.')) return;
  location.reload(); // Recarga limpia para resetear todo el estado
}
