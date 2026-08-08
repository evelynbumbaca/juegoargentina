// Geografía: contorno del territorio, biomas, ríos y asignación provincial.
//
// El mapa de juego es una grilla de píxeles obtenida rasterizando polígonos en
// coordenadas reales (lat/lon). La celda es levemente más ancha en longitud que
// en latitud para que un píxel cuadrado en pantalla respete la proporción
// geográfica del país (1° de longitud a 38°S ≈ 0,79° de latitud en km).

import { PROVINCIAS } from './provincias.js';

export const LAT_N = -21.7;
export const LAT_S = -55.3;
export const LON_O = -73.8;
export const LON_E = -53.3;
export const FILAS = 120;
export const COLUMNAS = 58;

export const PASO_LAT = (LAT_N - LAT_S) / FILAS;   // ≈ 0.28
export const PASO_LON = (LON_E - LON_O) / COLUMNAS; // ≈ 0.353

export const latDeFila = (f) => LAT_N - (f + 0.5) * PASO_LAT;
export const lonDeCol = (c) => LON_O + (c + 0.5) * PASO_LON;

// ---------------------------------------------------------------------------
// Contornos
// ---------------------------------------------------------------------------

/** Argentina continental, en sentido horario desde el extremo noroeste. */
export const CONTORNO_CONTINENTAL = [
  // Frontera con Bolivia
  [-22.05, -67.18], [-22.30, -66.30], [-22.10, -65.60], [-22.00, -64.50],
  [-22.05, -63.70], [-22.00, -62.80],
  // Pilcomayo hacia el sudeste (frontera con Paraguay)
  [-22.50, -62.30], [-23.20, -61.40], [-24.00, -60.30], [-24.80, -59.20],
  [-25.20, -58.20], [-25.30, -57.75],
  // Río Paraguay al sur y Paraná aguas arriba
  [-26.00, -58.20], [-26.90, -58.30], [-27.30, -58.60], [-27.45, -58.60],
  [-27.30, -57.60], [-27.45, -56.50], [-27.35, -55.90], [-27.20, -55.30],
  [-26.60, -54.70], [-25.95, -54.60], [-25.60, -54.55],
  // Misiones y río Uruguay (frontera con Brasil y Uruguay)
  [-26.25, -53.63], [-26.95, -53.85], [-27.55, -54.55], [-28.10, -55.30],
  [-28.55, -56.05], [-29.10, -56.55], [-29.71, -57.09], [-30.40, -57.65],
  [-31.39, -58.02], [-32.30, -58.15], [-33.10, -58.35], [-33.90, -58.40],
  // Río de la Plata y costa atlántica bonaerense
  [-34.55, -58.45], [-35.00, -57.55], [-35.45, -57.15], [-36.31, -56.75],
  [-37.10, -56.85], [-37.75, -57.45], [-38.10, -57.55], [-38.55, -58.74],
  [-38.98, -60.10], [-39.05, -61.30], [-38.85, -62.30], [-39.20, -62.00],
  // Golfo San Matías, península Valdés y golfos patagónicos
  [-40.30, -62.20], [-40.85, -62.90], [-40.75, -64.60], [-41.60, -65.05],
  [-42.10, -64.90], [-42.35, -63.65], [-42.90, -64.35], [-43.30, -65.05],
  [-44.00, -65.35], [-45.00, -65.70], [-45.85, -67.45], [-46.40, -67.05],
  [-47.00, -65.90], [-47.75, -65.90], [-48.50, -67.00], [-49.31, -67.72],
  [-50.10, -68.40], [-50.90, -69.00], [-51.60, -69.05], [-52.10, -68.60],
  [-52.40, -68.43],
  // Frontera cordillerana con Chile, de sur a norte
  [-52.15, -69.50], [-52.00, -70.50], [-51.60, -72.30], [-50.80, -72.60],
  [-50.30, -73.30], [-49.60, -73.20], [-48.80, -72.70], [-48.00, -72.60],
  [-47.20, -72.00], [-46.50, -71.70], [-45.80, -71.60], [-45.00, -71.70],
  [-44.20, -71.50], [-43.40, -71.75], [-42.60, -71.70], [-41.80, -71.85],
  [-41.00, -71.90], [-40.20, -71.65], [-39.40, -71.45], [-38.60, -70.90],
  [-37.80, -70.95], [-37.00, -70.75], [-36.20, -70.45], [-35.40, -70.40],
  [-34.60, -70.05], [-33.80, -69.80], [-33.00, -70.10], [-32.20, -70.40],
  [-31.40, -70.55], [-30.60, -70.20], [-29.80, -69.85], [-29.00, -69.75],
  [-28.20, -69.40], [-27.40, -69.05], [-26.60, -68.65], [-25.80, -68.55],
  [-25.00, -68.40], [-24.20, -67.40], [-23.40, -67.05], [-22.70, -67.00],
];

/** Sector argentino de la Isla Grande de Tierra del Fuego. */
export const CONTORNO_FUEGO = [
  [-52.65, -68.62], [-53.15, -68.15], [-53.60, -67.85], [-54.00, -66.90],
  [-54.55, -65.30], [-54.90, -66.60], [-54.95, -67.60], [-54.85, -68.35],
  [-54.20, -68.62], [-53.40, -68.62],
];

/** Malvinas: territorio reclamado, ocupado desde 1833. */
export const CONTORNO_MALVINAS = [
  [[-51.30, -58.40], [-51.20, -57.80], [-51.60, -57.75], [-52.00, -58.40], [-51.85, -59.00], [-51.50, -58.95]],
  [[-51.20, -60.60], [-51.30, -59.60], [-51.85, -59.55], [-51.90, -60.30], [-51.55, -60.75]],
];

/** Ríos principales, como polilíneas [lat, lon]. */
export const RIOS = [
  { id: 'parana', nombre: 'Paraná', caudal: 3, puntos: [[-27.30, -58.60], [-28.50, -59.00], [-29.50, -59.60], [-30.50, -60.05], [-31.60, -60.50], [-32.50, -60.70], [-33.30, -59.60], [-34.00, -58.60]] },
  { id: 'paraguay', nombre: 'Paraguay', caudal: 2, puntos: [[-23.00, -58.20], [-24.20, -58.15], [-25.30, -57.80], [-26.50, -58.20], [-27.30, -58.60]] },
  { id: 'bermejo', nombre: 'Bermejo', caudal: 1, puntos: [[-22.70, -64.30], [-23.50, -63.00], [-24.50, -61.50], [-25.50, -60.00], [-26.90, -58.50]] },
  { id: 'salado_norte', nombre: 'Salado del Norte', caudal: 1, puntos: [[-25.00, -65.50], [-26.00, -64.50], [-27.50, -63.00], [-29.00, -61.20], [-30.60, -60.35]] },
  { id: 'salado_sur', nombre: 'Salado del Sur', caudal: 1, puntos: [[-34.60, -62.20], [-35.30, -60.50], [-35.80, -58.60], [-36.31, -56.90]] },
  { id: 'colorado', nombre: 'Colorado', caudal: 2, puntos: [[-36.50, -69.50], [-37.00, -67.50], [-38.00, -65.50], [-39.10, -63.50], [-39.80, -62.10]] },
  { id: 'negro', nombre: 'Negro', caudal: 2, puntos: [[-38.90, -70.10], [-39.20, -68.20], [-39.90, -66.00], [-40.85, -62.95]] },
  { id: 'chubut', nombre: 'Chubut', caudal: 1, puntos: [[-42.50, -71.20], [-43.10, -69.00], [-43.30, -66.50], [-43.30, -65.10]] },
  { id: 'santacruz', nombre: 'Santa Cruz', caudal: 1, puntos: [[-50.30, -72.60], [-50.10, -70.50], [-50.10, -68.60]] },
  { id: 'uruguay', nombre: 'Uruguay', caudal: 3, puntos: [[-27.20, -54.30], [-28.55, -56.05], [-29.71, -57.09], [-31.39, -58.02], [-33.10, -58.35], [-34.20, -58.45]] },
];

/** Lagos y salares reconocibles: [lat, lon, radio en grados]. */
export const LAGOS = [
  { nombre: 'Mar Chiquita', lat: -30.60, lon: -62.60, r: 0.45 },
  { nombre: 'Nahuel Huapi', lat: -40.95, lon: -71.40, r: 0.28 },
  { nombre: 'Lago Argentino', lat: -50.30, lon: -72.60, r: 0.35 },
  { nombre: 'Lago Musters', lat: -45.45, lon: -69.20, r: 0.22 },
  { nombre: 'Salinas Grandes', lat: -23.60, lon: -66.20, r: 0.30, salar: true },
  { nombre: 'Salar del Hombre Muerto', lat: -25.40, lon: -67.05, r: 0.22, salar: true },
  { nombre: 'Laguna Mar Chiquita bonaerense', lat: -37.70, lon: -57.40, r: 0.15 },
  { nombre: 'Esteros del Iberá', lat: -28.40, lon: -57.30, r: 0.55, estero: true },
];

// ---------------------------------------------------------------------------
// Biomas
// ---------------------------------------------------------------------------

export const BIOMAS = {
  puna:        { nombre: 'Puna', color: '#a9895f', color2: '#94764f' },
  altoandino:  { nombre: 'Alta cordillera', color: '#cfd4d8', color2: '#aab3ba' },
  monte:       { nombre: 'Monte', color: '#b8925c', color2: '#a37f4d' },
  yunga:       { nombre: 'Yungas', color: '#3f7a3f', color2: '#356a37' },
  chaco:       { nombre: 'Chaco', color: '#8a9a4a', color2: '#77873f' },
  selva:       { nombre: 'Selva misionera', color: '#2f6b34', color2: '#285c2e' },
  estero:      { nombre: 'Esteros', color: '#5e9464', color2: '#4f8257' },
  espinal:     { nombre: 'Espinal', color: '#9aa855', color2: '#87944a' },
  pampa:       { nombre: 'Pampa', color: '#93b25c', color2: '#7f9e4e' },
  delta:       { nombre: 'Delta', color: '#6fa06a', color2: '#5d8c5b' },
  estepa:      { nombre: 'Estepa patagónica', color: '#a89b74', color2: '#948864' },
  bosqueandino:{ nombre: 'Bosque andino patagónico', color: '#3a6b4e', color2: '#325c44' },
  hielo:       { nombre: 'Campos de hielo', color: '#e2ecf2', color2: '#c6d6e0' },
  costa:       { nombre: 'Costa', color: '#c2b98a', color2: '#ada477' },
  agua:        { nombre: 'Agua', color: '#3f6f9c', color2: '#35608a' },
  oceano:      { nombre: 'Océano', color: '#2b4f74', color2: '#24435f' },
};

export const CLAVES_BIOMA = Object.keys(BIOMAS);

/**
 * Borde occidental (frontera con Chile), ordenado de norte a sur. Se usa para
 * saber a qué distancia de la cordillera está cada celda, que es lo que define
 * la mayoría de las ecorregiones argentinas.
 */
export const BORDE_OESTE = [
  [-22.05, -67.18], [-22.70, -67.00], [-23.40, -67.05], [-24.20, -67.40],
  [-25.00, -68.40], [-25.80, -68.55], [-26.60, -68.65], [-27.40, -69.05],
  [-28.20, -69.40], [-29.00, -69.75], [-29.80, -69.85], [-30.60, -70.20],
  [-31.40, -70.55], [-32.20, -70.40], [-33.00, -70.10], [-33.80, -69.80],
  [-34.60, -70.05], [-35.40, -70.40], [-36.20, -70.45], [-37.00, -70.75],
  [-37.80, -70.95], [-38.60, -70.90], [-39.40, -71.45], [-40.20, -71.65],
  [-41.00, -71.90], [-41.80, -71.85], [-42.60, -71.70], [-43.40, -71.75],
  [-44.20, -71.50], [-45.00, -71.70], [-45.80, -71.60], [-46.50, -71.70],
  [-47.20, -72.00], [-48.00, -72.60], [-48.80, -72.70], [-49.60, -73.20],
  [-50.30, -73.30], [-50.80, -72.60], [-51.60, -72.30], [-52.00, -70.50],
  [-52.15, -69.50], [-52.40, -68.43],
];

/** Longitud de la cordillera para una latitud dada, interpolada linealmente. */
function lonCordillera(lat) {
  const b = BORDE_OESTE;
  if (lat >= b[0][0]) return b[0][1];
  for (let i = 0; i < b.length - 1; i++) {
    const [la1, lo1] = b[i];
    const [la2, lo2] = b[i + 1];
    if (lat <= la1 && lat >= la2) {
      const t = (la1 - lat) / (la1 - la2 || 1e-9);
      return lo1 + (lo2 - lo1) * t;
    }
  }
  return b[b.length - 1][1];
}

/** Ruido de valor suave y determinista, para bordes orgánicos entre biomas. */
function ruido(x, y, s = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Determina el bioma de una celda a partir de su posición y su distancia a la
 * cordillera. La lógica sigue las ecorregiones reales de forma simplificada.
 */
export function biomaDe(lat, lon) {
  const cord = lonCordillera(lat);
  const d = lon - cord;                 // grados al este de la cordillera
  const r = ruido(lon * 3, lat * 3) * 0.6 - 0.3;

  // Cordillera y altiplano
  if (lat > -27.0 && d < 2.3 + r) return lat > -24.5 && d > 0.7 ? 'puna' : 'altoandino';
  if (lat > -34.0 && d < 0.9 + r * 0.5) return 'altoandino';
  if (lat <= -46.0 && d < 0.8 + r * 0.4) return 'hielo';
  if (lat <= -37.0 && d < 1.5 + r) return 'bosqueandino';

  // Norte
  if (lat > -24.8 && d > 2.0 && d < 3.9 + r) return 'yunga';
  if (lat > -30.0 && lon > -64.5 + r) return lon > -56.5 && lat > -28.2 ? 'selva' : 'chaco';
  if (lat > -25.5) return 'chaco';

  // Litoral y esteros
  if (lat > -30.5 && lon > -59.5 + r) return 'estero';
  if (lat > -32.5 && lon > -58.9 + r) return 'espinal';
  if (lat > -34.5 && lat < -32.0 && lon > -59.6 && lon < -58.2) return 'delta';

  // Centro
  if (lat > -33.5) return d < 5.5 ? 'monte' : 'espinal';
  if (lat > -39.5) {
    if (d < 3.2 + r) return 'monte';
    return lon > -63.5 + r ? 'pampa' : 'espinal';
  }

  // Sur
  return 'estepa';
}

// ---------------------------------------------------------------------------
// Rasterizado
// ---------------------------------------------------------------------------

function dentroDePoligono(lat, lon, poli) {
  let dentro = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [lai, loi] = poli[i];
    const [laj, loj] = poli[j];
    if ((loi > lon) !== (loj > lon)) {
      const t = (lon - loi) / (loj - loi);
      if (lat < lai + t * (laj - lai)) dentro = !dentro;
    }
  }
  return dentro;
}

function distanciaASegmento(lat, lon, a, b) {
  const dy = b[0] - a[0], dx = b[1] - a[1];
  const len2 = dy * dy + dx * dx;
  let t = len2 === 0 ? 0 : ((lat - a[0]) * dy + (lon - a[1]) * dx) / len2;
  t = Math.max(0, Math.min(1, t));
  const py = a[0] + t * dy, px = a[1] + t * dx;
  return Math.hypot(lat - py, lon - px);
}

/**
 * Construye la grilla del mapa. Devuelve arrays paralelos indexados por
 * `fila * COLUMNAS + col`.
 */
export function construirMapa() {
  const n = FILAS * COLUMNAS;
  const tierra = new Uint8Array(n);      // 0 océano, 1 continental, 2 isla, 3 malvinas
  const bioma = new Uint8Array(n);
  const provincia = new Int8Array(n).fill(-1);
  const rio = new Uint8Array(n);         // 0 no, 1..3 caudal
  const costa = new Uint8Array(n);
  const elevacion = new Float32Array(n);

  const semillas = [];
  PROVINCIAS.forEach((p, idx) => {
    for (const [la, lo] of p.semillas) {
      semillas.push({ idx, la, lo, radio: p.radio ?? 1 });
    }
  });

  for (let f = 0; f < FILAS; f++) {
    const lat = latDeFila(f);
    for (let c = 0; c < COLUMNAS; c++) {
      const lon = lonDeCol(c);
      const i = f * COLUMNAS + c;

      let clase = 0;
      if (dentroDePoligono(lat, lon, CONTORNO_CONTINENTAL)) clase = 1;
      else if (dentroDePoligono(lat, lon, CONTORNO_FUEGO)) clase = 2;
      else if (CONTORNO_MALVINAS.some((poli) => dentroDePoligono(lat, lon, poli))) clase = 3;
      tierra[i] = clase;

      if (clase === 0) {
        bioma[i] = CLAVES_BIOMA.indexOf('oceano');
        continue;
      }

      // Bioma
      let b = clase === 3 ? 'estepa' : biomaDe(lat, lon);
      if (clase === 2) b = lat < -54.3 ? 'bosqueandino' : 'estepa';

      // Lagos, salares y esteros pisan el bioma
      for (const lg of LAGOS) {
        if (Math.hypot(lat - lg.lat, (lon - lg.lon) * 0.8) < lg.r) {
          b = lg.salar ? 'altoandino' : lg.estero ? 'estero' : 'agua';
        }
      }
      bioma[i] = CLAVES_BIOMA.indexOf(b);

      // Ríos
      for (const r of RIOS) {
        for (let k = 0; k < r.puntos.length - 1; k++) {
          if (distanciaASegmento(lat, lon, r.puntos[k], r.puntos[k + 1]) < 0.20) {
            rio[i] = Math.max(rio[i], r.caudal);
          }
        }
      }

      // Elevación aproximada (0 llanura, 1 alta cordillera)
      const d = lon - lonCordillera(lat);
      const base = Math.max(0, 1 - d / (lat > -30 ? 7 : 4.5));
      elevacion[i] = Math.min(1, base * (lat > -30 ? 1.0 : 0.8) + ruido(lon * 5, lat * 5, 2) * 0.08);

      // Provincia por Voronoi ponderado
      if (clase === 3) { provincia[i] = -1; continue; }
      let mejor = -1, mejorD = Infinity;
      for (const s of semillas) {
        const dd = Math.hypot((lat - s.la), (lon - s.lo) * 0.79) / s.radio;
        if (dd < mejorD) { mejorD = dd; mejor = s.idx; }
      }
      provincia[i] = mejor;
    }
  }

  // Marca de costa: tierra con al menos un vecino de océano
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLUMNAS; c++) {
      const i = f * COLUMNAS + c;
      if (!tierra[i]) continue;
      const vecinos = [[f - 1, c], [f + 1, c], [f, c - 1], [f, c + 1]];
      for (const [vf, vc] of vecinos) {
        if (vf < 0 || vf >= FILAS || vc < 0 || vc >= COLUMNAS) { costa[i] = 1; break; }
        if (!tierra[vf * COLUMNAS + vc]) { costa[i] = 1; break; }
      }
    }
  }

  // Celdas por provincia, para repartir población y dibujar sprites
  const celdasPorProvincia = PROVINCIAS.map(() => []);
  for (let i = 0; i < n; i++) {
    if (provincia[i] >= 0) celdasPorProvincia[provincia[i]].push(i);
  }

  return {
    filas: FILAS, columnas: COLUMNAS,
    tierra, bioma, provincia, rio, costa, elevacion,
    celdasPorProvincia,
    latDeFila, lonDeCol,
    indice: (f, c) => f * COLUMNAS + c,
  };
}

/** Convierte lat/lon a coordenadas de grilla (puede caer fuera del mapa). */
export function aGrilla(lat, lon) {
  return {
    fila: Math.round((LAT_N - lat) / PASO_LAT - 0.5),
    col: Math.round((lon - LON_O) / PASO_LON - 0.5),
  };
}
