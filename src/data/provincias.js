// Las 24 jurisdicciones actuales, usadas como unidades territoriales de la
// simulación desde 1810 (antes de existir como provincias representan la
// región geográfica correspondiente).
//
// `semillas` son puntos [lat, lon] que alimentan el Voronoi con que se pinta
// el mapa en pixel art (ver src/data/geo.js). Las provincias grandes e
// irregulares llevan varias para que el recorte se parezca al real.
//
// `aptitud` describe el potencial del suelo/subsuelo. Algunos recursos sólo se
// "activan" cuando un evento los descubre (petróleo 1907, litio 1990s...).

export const PROVINCIAS = [
  {
    id: 'caba', nombre: 'Ciudad de Buenos Aires', abrev: 'CABA', region: 'pampa',
    capital: 'Buenos Aires', lat: -34.60, lon: -58.38, semillas: [[-34.60, -58.42]], radio: 0.55,
    poblacion1810: 0.045, urbanizacion1810: 1.0, integracion1810: 1.0, desarrollo1810: 0.35,
    autonomismo1810: 0.2, controlOriginario1810: 0,
    aptitud: { agro: 0.1, ganaderia: 0.05, mineria: 0, petroleo: 0, gas: 0, litio: 0, pesca: 0.3, bosque: 0, agua: 0.8, puerto: 1.0 },
  },
  {
    id: 'bsas', nombre: 'Buenos Aires', abrev: 'BA', region: 'pampa',
    capital: 'La Plata', lat: -34.92, lon: -57.95,
    semillas: [[-36.4, -60.2], [-34.9, -59.4], [-38.2, -60.5], [-37.0, -57.9], [-35.6, -61.8], [-38.8, -62.2]],
    poblacion1810: 0.055, urbanizacion1810: 0.15, integracion1810: 0.85, desarrollo1810: 0.2,
    autonomismo1810: 0.3, controlOriginario1810: 0.35,
    aptitud: { agro: 1.0, ganaderia: 1.0, mineria: 0.05, petroleo: 0.05, gas: 0.05, litio: 0, pesca: 0.7, bosque: 0.05, agua: 0.8, puerto: 0.9 },
  },
  {
    id: 'santafe', nombre: 'Santa Fe', abrev: 'SF', region: 'litoral',
    capital: 'Santa Fe', lat: -31.63, lon: -60.70,
    semillas: [[-30.6, -60.8], [-32.5, -61.0], [-29.2, -60.3]],
    poblacion1810: 0.015, urbanizacion1810: 0.2, integracion1810: 0.7, desarrollo1810: 0.15,
    autonomismo1810: 0.6, controlOriginario1810: 0.3,
    aptitud: { agro: 0.95, ganaderia: 0.8, mineria: 0, petroleo: 0, gas: 0, litio: 0, pesca: 0.3, bosque: 0.3, agua: 0.9, puerto: 0.7 },
  },
  {
    id: 'entrerios', nombre: 'Entre Ríos', abrev: 'ER', region: 'litoral',
    capital: 'Paraná', lat: -31.73, lon: -60.53,
    semillas: [[-32.2, -59.2], [-30.8, -58.6]],
    poblacion1810: 0.020, urbanizacion1810: 0.12, integracion1810: 0.6, desarrollo1810: 0.12,
    autonomismo1810: 0.85, controlOriginario1810: 0.1,
    aptitud: { agro: 0.8, ganaderia: 0.85, mineria: 0, petroleo: 0, gas: 0, litio: 0, pesca: 0.4, bosque: 0.3, agua: 1.0, puerto: 0.6 },
  },
  {
    id: 'corrientes', nombre: 'Corrientes', abrev: 'CR', region: 'litoral',
    capital: 'Corrientes', lat: -27.47, lon: -58.83,
    semillas: [[-28.6, -57.9], [-27.6, -58.7], [-29.4, -58.0]],
    poblacion1810: 0.030, urbanizacion1810: 0.15, integracion1810: 0.6, desarrollo1810: 0.12,
    autonomismo1810: 0.8, controlOriginario1810: 0.2,
    aptitud: { agro: 0.6, ganaderia: 0.8, mineria: 0, petroleo: 0, gas: 0, litio: 0, pesca: 0.5, bosque: 0.5, agua: 1.0, puerto: 0.5 },
  },
  {
    id: 'misiones', nombre: 'Misiones', abrev: 'MI', region: 'litoral',
    capital: 'Posadas', lat: -27.37, lon: -55.90,
    semillas: [[-26.9, -54.6], [-27.4, -55.7]],
    poblacion1810: 0.010, urbanizacion1810: 0.1, integracion1810: 0.35, desarrollo1810: 0.08,
    autonomismo1810: 0.7, controlOriginario1810: 0.4,
    aptitud: { agro: 0.6, ganaderia: 0.3, mineria: 0, petroleo: 0, gas: 0, litio: 0, pesca: 0.3, bosque: 1.0, agua: 1.0, puerto: 0.3 },
  },
  {
    id: 'chaco', nombre: 'Chaco', abrev: 'CH', region: 'norte',
    capital: 'Resistencia', lat: -27.45, lon: -58.99,
    semillas: [[-26.4, -60.5], [-25.6, -61.5]],
    poblacion1810: 0.018, urbanizacion1810: 0.02, integracion1810: 0.05, desarrollo1810: 0.03,
    autonomismo1810: 0.5, controlOriginario1810: 0.9,
    aptitud: { agro: 0.5, ganaderia: 0.5, mineria: 0, petroleo: 0.05, gas: 0.05, litio: 0, pesca: 0.2, bosque: 0.9, agua: 0.6, puerto: 0.3 },
  },
  {
    id: 'formosa', nombre: 'Formosa', abrev: 'FO', region: 'norte',
    capital: 'Formosa', lat: -26.18, lon: -58.17,
    semillas: [[-24.9, -59.9], [-25.5, -58.4]],
    poblacion1810: 0.012, urbanizacion1810: 0.02, integracion1810: 0.03, desarrollo1810: 0.02,
    autonomismo1810: 0.5, controlOriginario1810: 0.92,
    aptitud: { agro: 0.4, ganaderia: 0.45, mineria: 0, petroleo: 0.05, gas: 0.05, litio: 0, pesca: 0.2, bosque: 0.85, agua: 0.7, puerto: 0.2 },
  },
  {
    id: 'santiago', nombre: 'Santiago del Estero', abrev: 'SE', region: 'norte',
    capital: 'Santiago del Estero', lat: -27.78, lon: -64.26,
    semillas: [[-27.6, -63.2], [-26.5, -62.6], [-28.8, -63.4]],
    poblacion1810: 0.040, urbanizacion1810: 0.08, integracion1810: 0.65, desarrollo1810: 0.08,
    autonomismo1810: 0.7, controlOriginario1810: 0.35,
    aptitud: { agro: 0.5, ganaderia: 0.5, mineria: 0.05, petroleo: 0, gas: 0, litio: 0, pesca: 0.1, bosque: 0.8, agua: 0.35, puerto: 0 },
  },
  {
    id: 'tucuman', nombre: 'Tucumán', abrev: 'TU', region: 'norte',
    capital: 'San Miguel de Tucumán', lat: -26.82, lon: -65.22,
    semillas: [[-26.9, -65.3]], radio: 0.9,
    poblacion1810: 0.042, urbanizacion1810: 0.18, integracion1810: 0.85, desarrollo1810: 0.18,
    autonomismo1810: 0.55, controlOriginario1810: 0.1,
    aptitud: { agro: 0.85, ganaderia: 0.3, mineria: 0.05, petroleo: 0, gas: 0, litio: 0, pesca: 0, bosque: 0.7, agua: 0.8, puerto: 0 },
  },
  {
    id: 'salta', nombre: 'Salta', abrev: 'SA', region: 'norte',
    capital: 'Salta', lat: -24.79, lon: -65.41,
    semillas: [[-24.6, -64.6], [-23.4, -63.6], [-24.6, -66.4], [-25.6, -64.4]],
    poblacion1810: 0.045, urbanizacion1810: 0.15, integracion1810: 0.8, desarrollo1810: 0.16,
    autonomismo1810: 0.6, controlOriginario1810: 0.3,
    aptitud: { agro: 0.6, ganaderia: 0.4, mineria: 0.5, petroleo: 0.5, gas: 0.6, litio: 0.8, pesca: 0, bosque: 0.7, agua: 0.5, puerto: 0 },
  },
  {
    id: 'jujuy', nombre: 'Jujuy', abrev: 'JU', region: 'norte',
    capital: 'San Salvador de Jujuy', lat: -24.19, lon: -65.30,
    semillas: [[-23.3, -65.6]], radio: 0.95,
    poblacion1810: 0.022, urbanizacion1810: 0.12, integracion1810: 0.75, desarrollo1810: 0.14,
    autonomismo1810: 0.5, controlOriginario1810: 0.45,
    aptitud: { agro: 0.4, ganaderia: 0.25, mineria: 0.7, petroleo: 0.2, gas: 0.2, litio: 0.95, pesca: 0, bosque: 0.5, agua: 0.4, puerto: 0 },
  },
  {
    id: 'catamarca', nombre: 'Catamarca', abrev: 'CT', region: 'cuyo',
    capital: 'San Fernando del Valle', lat: -28.47, lon: -65.79,
    semillas: [[-27.4, -66.9], [-28.9, -66.3]],
    poblacion1810: 0.025, urbanizacion1810: 0.1, integracion1810: 0.7, desarrollo1810: 0.1,
    autonomismo1810: 0.6, controlOriginario1810: 0.2,
    aptitud: { agro: 0.25, ganaderia: 0.3, mineria: 0.85, petroleo: 0, gas: 0, litio: 0.85, pesca: 0, bosque: 0.3, agua: 0.25, puerto: 0 },
  },
  {
    id: 'larioja', nombre: 'La Rioja', abrev: 'LR', region: 'cuyo',
    capital: 'La Rioja', lat: -29.41, lon: -66.85,
    semillas: [[-29.9, -67.2]], radio: 1.0,
    poblacion1810: 0.015, urbanizacion1810: 0.1, integracion1810: 0.65, desarrollo1810: 0.09,
    autonomismo1810: 0.8, controlOriginario1810: 0.2,
    aptitud: { agro: 0.25, ganaderia: 0.3, mineria: 0.7, petroleo: 0, gas: 0, litio: 0.3, pesca: 0, bosque: 0.2, agua: 0.2, puerto: 0 },
  },
  {
    id: 'sanjuan', nombre: 'San Juan', abrev: 'SJ', region: 'cuyo',
    capital: 'San Juan', lat: -31.54, lon: -68.53,
    semillas: [[-30.9, -68.9]], radio: 1.0,
    poblacion1810: 0.020, urbanizacion1810: 0.15, integracion1810: 0.7, desarrollo1810: 0.12,
    autonomismo1810: 0.65, controlOriginario1810: 0.15,
    aptitud: { agro: 0.45, ganaderia: 0.2, mineria: 0.9, petroleo: 0.05, gas: 0.05, litio: 0.2, pesca: 0, bosque: 0.1, agua: 0.25, puerto: 0 },
  },
  {
    id: 'mendoza', nombre: 'Mendoza', abrev: 'MZ', region: 'cuyo',
    capital: 'Mendoza', lat: -32.89, lon: -68.84,
    semillas: [[-33.2, -68.6], [-34.9, -68.4], [-35.3, -68.0]],
    poblacion1810: 0.028, urbanizacion1810: 0.18, integracion1810: 0.75, desarrollo1810: 0.15,
    autonomismo1810: 0.6, controlOriginario1810: 0.25,
    aptitud: { agro: 0.7, ganaderia: 0.3, mineria: 0.6, petroleo: 0.7, gas: 0.6, litio: 0.1, pesca: 0, bosque: 0.15, agua: 0.35, puerto: 0 },
  },
  {
    id: 'sanluis', nombre: 'San Luis', abrev: 'SL', region: 'cuyo',
    capital: 'San Luis', lat: -33.30, lon: -66.34,
    semillas: [[-33.7, -66.1]], radio: 1.0,
    poblacion1810: 0.015, urbanizacion1810: 0.1, integracion1810: 0.7, desarrollo1810: 0.09,
    autonomismo1810: 0.6, controlOriginario1810: 0.3,
    aptitud: { agro: 0.5, ganaderia: 0.55, mineria: 0.3, petroleo: 0, gas: 0, litio: 0, pesca: 0, bosque: 0.3, agua: 0.3, puerto: 0 },
  },
  {
    id: 'cordoba', nombre: 'Córdoba', abrev: 'CB', region: 'centro',
    capital: 'Córdoba', lat: -31.42, lon: -64.18,
    semillas: [[-31.8, -63.8], [-30.3, -63.5], [-33.3, -63.5]],
    poblacion1810: 0.060, urbanizacion1810: 0.22, integracion1810: 0.9, desarrollo1810: 0.22,
    autonomismo1810: 0.55, controlOriginario1810: 0.25,
    aptitud: { agro: 0.9, ganaderia: 0.85, mineria: 0.2, petroleo: 0, gas: 0, litio: 0, pesca: 0.1, bosque: 0.4, agua: 0.5, puerto: 0 },
  },
  {
    id: 'lapampa', nombre: 'La Pampa', abrev: 'LP', region: 'pampa',
    capital: 'Santa Rosa', lat: -36.62, lon: -64.29,
    semillas: [[-37.2, -65.6], [-35.8, -64.5]],
    poblacion1810: 0.020, urbanizacion1810: 0.01, integracion1810: 0.02, desarrollo1810: 0.02,
    autonomismo1810: 0.4, controlOriginario1810: 0.95,
    aptitud: { agro: 0.7, ganaderia: 0.8, mineria: 0.1, petroleo: 0.2, gas: 0.2, litio: 0, pesca: 0, bosque: 0.2, agua: 0.35, puerto: 0 },
  },
  {
    id: 'neuquen', nombre: 'Neuquén', abrev: 'NQ', region: 'patagonia',
    capital: 'Neuquén', lat: -38.95, lon: -68.06,
    semillas: [[-38.7, -70.0], [-37.5, -70.0], [-39.6, -70.9]],
    poblacion1810: 0.015, urbanizacion1810: 0.0, integracion1810: 0.0, desarrollo1810: 0.02,
    autonomismo1810: 0.3, controlOriginario1810: 1.0,
    aptitud: { agro: 0.3, ganaderia: 0.35, mineria: 0.3, petroleo: 0.95, gas: 1.0, litio: 0, pesca: 0.1, bosque: 0.6, agua: 0.7, puerto: 0 },
  },
  {
    id: 'rionegro', nombre: 'Río Negro', abrev: 'RN', region: 'patagonia',
    capital: 'Viedma', lat: -40.81, lon: -62.99,
    semillas: [[-40.4, -66.8], [-41.2, -70.2], [-40.6, -63.6]],
    poblacion1810: 0.018, urbanizacion1810: 0.0, integracion1810: 0.0, desarrollo1810: 0.02,
    autonomismo1810: 0.3, controlOriginario1810: 1.0,
    aptitud: { agro: 0.45, ganaderia: 0.5, mineria: 0.4, petroleo: 0.5, gas: 0.5, litio: 0, pesca: 0.5, bosque: 0.4, agua: 0.6, puerto: 0.4 },
  },
  {
    id: 'chubut', nombre: 'Chubut', abrev: 'CU', region: 'patagonia',
    capital: 'Rawson', lat: -43.30, lon: -65.10,
    semillas: [[-43.8, -68.5], [-45.1, -70.0], [-43.0, -66.0], [-44.9, -67.0]],
    poblacion1810: 0.010, urbanizacion1810: 0.0, integracion1810: 0.0, desarrollo1810: 0.01,
    autonomismo1810: 0.3, controlOriginario1810: 1.0,
    aptitud: { agro: 0.15, ganaderia: 0.55, mineria: 0.5, petroleo: 0.8, gas: 0.6, litio: 0, pesca: 0.85, bosque: 0.5, agua: 0.5, puerto: 0.6 },
  },
  {
    id: 'santacruz', nombre: 'Santa Cruz', abrev: 'SC', region: 'patagonia',
    capital: 'Río Gallegos', lat: -51.62, lon: -69.22,
    semillas: [[-48.5, -70.5], [-50.5, -71.5], [-47.4, -68.5], [-51.3, -69.5], [-49.5, -68.0]],
    poblacion1810: 0.006, urbanizacion1810: 0.0, integracion1810: 0.0, desarrollo1810: 0.01,
    autonomismo1810: 0.3, controlOriginario1810: 1.0,
    aptitud: { agro: 0.05, ganaderia: 0.5, mineria: 0.6, petroleo: 0.6, gas: 0.5, litio: 0, pesca: 0.9, bosque: 0.35, agua: 0.7, puerto: 0.5 },
  },
  {
    id: 'tierradelfuego', nombre: 'Tierra del Fuego', abrev: 'TF', region: 'patagonia',
    capital: 'Ushuaia', lat: -54.80, lon: -68.30,
    semillas: [[-53.8, -68.0], [-54.7, -67.5]],
    poblacion1810: 0.004, urbanizacion1810: 0.0, integracion1810: 0.0, desarrollo1810: 0.01,
    autonomismo1810: 0.3, controlOriginario1810: 1.0,
    aptitud: { agro: 0.02, ganaderia: 0.4, mineria: 0.3, petroleo: 0.55, gas: 0.6, litio: 0, pesca: 0.95, bosque: 0.6, agua: 0.9, puerto: 0.5 },
  },
];

export const PROV_POR_ID = Object.fromEntries(PROVINCIAS.map((p) => [p.id, p]));

/** Regiones para agregados narrativos y de interfaz. */
export const REGIONES = {
  pampa: { nombre: 'Región Pampeana', color: '#7fa650' },
  litoral: { nombre: 'Litoral', color: '#5f9e6e' },
  norte: { nombre: 'Norte Grande', color: '#b08a4a' },
  cuyo: { nombre: 'Cuyo', color: '#b06a45' },
  centro: { nombre: 'Centro', color: '#93a84f' },
  patagonia: { nombre: 'Patagonia', color: '#6b8fa3' },
};
