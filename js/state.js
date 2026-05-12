/**
 * Gestión centralizada del estado de la aplicación
 */
export const state = {
  rawData: [],
  columns: [],
  classifiedData: [],
  districtPolys: [],   // { name, province, rings, feature, bbox }
  map: null,
  markersLayer: null,
  polyLayers: {},      // district name -> leaflet layer
  selectedDist: null,
  fileName: '',
  
  // Setters
  setRawData(data) { this.rawData = data; },
  setColumns(cols) { this.columns = cols; },
  setClassifiedData(data) { this.classifiedData = data; },
  setDistrictPolys(polys) { this.districtPolys = polys; },
  setFileName(name) { this.fileName = name; },
  setSelectedDist(dist) { this.selectedDist = dist; },
  
  // Getters & Helpers
  getDistrictsCount() {
    return new Set(this.classifiedData
      .filter(c => c._district !== 'NO IDENTIFICADO' && c._district !== 'SIN COORDENADAS')
      .map(c => c._district)).size;
  },
  
  getProvincesCount() {
    return new Set(this.classifiedData
      .filter(c => c._province !== '—')
      .map(c => c._province)).size;
  }
};
