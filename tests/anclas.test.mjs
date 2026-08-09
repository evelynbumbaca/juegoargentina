// Calibración contra las anclas históricas de docs/CONTRATO.md.
// Ejecutar con: node tests/anclas.test.mjs
//
// Esto NO es una prueba de que el simulador "acierte" la historia: es una
// barrera contra regresiones. La línea base con fidelidad alta tiene que pasar
// razonablemente cerca de la serie real; si un cambio la manda lejos, salta acá.
//
// Las tolerancias son amplias a propósito y reflejan dónde está hoy el modelo.
// Bajarlas es trabajo de calibración pendiente, no un error de la prueba.
//
// LÍMITE CONOCIDO: el promedio de la serie de PBI da ~0.99, pero la FORMA está
// corrida. El modelo subestima el auge agroexportador de 1880-1914 (llega a
// poco más de la mitad del ingreso real de 1914) y sobreestima el período
// 1983-2022, donde la Argentina real tuvo un estancamiento relativo que acá no
// aparece con toda su fuerza. Falta que la expansión de la frontera agrícola y
// el ferrocarril multipliquen la capacidad exportadora en esas tres décadas.

import { Motor } from '../src/core/motor.js';
import { SISTEMAS } from '../src/sim/sistemas/index.js';
import { EVENTOS } from '../src/data/eventos/index.js';

/** año: [población en millones, PBI per cápita en int$ de 1990] */
const ANCLAS = {
  1869: [1.83, 1400], 1895: [4.05, 2500], 1914: [7.90, 3800],
  1930: [11.90, 4100], 1947: [15.90, 5000], 1960: [20.00, 5560],
  1974: [24.80, 7970], 1983: [28.50, 6500], 2001: [36.30, 8100],
  2010: [40.10, 10250], 2022: [46.00, 10000],
};

// Banda aceptada: el valor del modelo dividido por el real tiene que caer acá.
const BANDA_POBLACION = [0.55, 1.45];
const BANDA_PBI = [0.45, 1.95];
// Y el promedio de los cocientes tiene que estar cerca de 1: el modelo no puede
// estar sistemáticamente por debajo o por encima de toda la serie.
const BANDA_PROMEDIO = [0.70, 1.35];

const SEMILLAS = ['ANCLA-1', 'ANCLA-2', 'ANCLA-3', 'ANCLA-4', 'ANCLA-5'];

let fallas = 0;
const mal = (m) => { console.error('  ✗', m); fallas++; };
const bien = (m) => console.log('  ✓', m);

// Promedio de las corridas: una sola partida tiene demasiado azar.
const acumulado = {};
for (const semilla of SEMILLAS) {
  const m = new Motor({ semilla, añoFinal: 2050, fidelidadHistorica: 0.9 }, SISTEMAS, EVENTOS);
  while (!m.estado.terminada) {
    if (m.estado.pendiente) m.delegar();
    m.paso();
    const a = m.estado.año;
    if (!ANCLAS[a]) continue;
    acumulado[a] ??= { pob: [], pbi: [] };
    acumulado[a].pob.push(m.estado.nacion.demografia.poblacion);
    acumulado[a].pbi.push(m.estado.nacion.economia.pbiPerCapita);
  }
}

const media = (a) => a.reduce((x, y) => x + y, 0) / a.length;

console.log('\n== Línea base contra las anclas históricas ==');
console.log('  año   población (real)      PBI pc (real)          coc.pob  coc.pbi');
const cocPob = [], cocPbi = [];
for (const [año, [pobReal, pbiReal]] of Object.entries(ANCLAS)) {
  const d = acumulado[año];
  if (!d) { mal(`no se alcanzó el año ${año}`); continue; }
  const pob = media(d.pob), pbi = media(d.pbi);
  const cp = pob / pobReal, ce = pbi / pbiReal;
  cocPob.push(cp); cocPbi.push(ce);
  const marca = (v, [lo, hi]) => (v >= lo && v <= hi ? ' ' : '!');
  console.log(`  ${año}  ${pob.toFixed(1).padStart(5)} (${String(pobReal).padStart(5)})` +
    `       ${Math.round(pbi).toString().padStart(6)} (${String(pbiReal).padStart(5)})` +
    `        ${cp.toFixed(2)}${marca(cp, BANDA_POBLACION)}    ${ce.toFixed(2)}${marca(ce, BANDA_PBI)}`);
  if (cp < BANDA_POBLACION[0] || cp > BANDA_POBLACION[1]) {
    mal(`${año}: población fuera de banda (${pob.toFixed(1)} M contra ${pobReal} M reales)`);
  }
  if (ce < BANDA_PBI[0] || ce > BANDA_PBI[1]) {
    mal(`${año}: PBI per cápita fuera de banda (${Math.round(pbi)} contra ${pbiReal} reales)`);
  }
}

const mp = media(cocPob), me = media(cocPbi);
console.log(`\n  cociente medio  población ${mp.toFixed(2)}  ·  PBI per cápita ${me.toFixed(2)}`);
if (mp < BANDA_PROMEDIO[0] || mp > BANDA_PROMEDIO[1]) mal(`sesgo sistemático en población (${mp.toFixed(2)})`);
else bien('la serie de población no tiene sesgo sistemático');
if (me < BANDA_PROMEDIO[0] || me > BANDA_PROMEDIO[1]) mal(`sesgo sistemático en PBI (${me.toFixed(2)})`);
else bien('la serie de PBI no tiene sesgo sistemático');

// La serie tiene que ser creciente en el largo plazo, con crisis pero sin
// desplomarse: es el error más fácil de reintroducir al tocar la economía.
const pbi1869 = media(acumulado[1869].pbi);
const pbi2022 = media(acumulado[2022].pbi);
if (pbi2022 <= pbi1869 * 3) {
  mal(`el país no se desarrolla: PBI pc pasa de ${Math.round(pbi1869)} a ${Math.round(pbi2022)} en 150 años`);
} else bien(`el PBI per cápita se multiplica por ${(pbi2022 / pbi1869).toFixed(1)} entre 1869 y 2022`);

console.log(fallas ? `\n${fallas} FALLAS\n` : '\nTodo en orden.\n');
process.exit(fallas ? 1 : 0);
