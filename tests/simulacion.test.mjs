// Pruebas de la simulación completa: estabilidad, variedad y divergencia.
// Ejecutar con: node tests/simulacion.test.mjs

import { Motor } from '../src/core/motor.js';
import { SISTEMAS } from '../src/sim/sistemas/index.js';
import { EVENTOS } from '../src/data/eventos/index.js';
import { indices, PRESETS } from '../src/core/estado.js';

let fallas = 0;
const mal = (m) => { console.error('  ✗', m); fallas++; };
const bien = (m) => console.log('  ✓', m);

function correr(config) {
  const m = new Motor({ añoFinal: 2050, ...config }, SISTEMAS, EVENTOS);
  let guardia = 0;
  while (!m.estado.terminada && guardia++ < 400) {
    if (m.estado.pendiente) m.delegar();
    m.paso();
  }
  return m.estado;
}

function buscarNaN(estado) {
  const malos = [];
  const rec = (o, r = '') => {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('_')) continue;
      if (typeof v === 'number' && !Number.isFinite(v)) malos.push(r + k);
      else if (v && typeof v === 'object' && !Array.isArray(v)) rec(v, `${r}${k}.`);
    }
  };
  rec(estado.nacion); rec(estado.regimen); rec(estado.presiones); rec(estado.actores);
  for (const p of estado.provincias) rec(p, `${p.id}.`);
  return malos;
}

// ---------------------------------------------------------------------------
console.log('\n== Estabilidad sobre 12 semillas ==');
const corridas = [];
for (let i = 0; i < 12; i++) {
  const s = correr({ semilla: `SEMILLA-${i}`, fidelidadHistorica: 0.75 });
  corridas.push(s);
  const nan = buscarNaN(s);
  if (nan.length) mal(`semilla ${i}: NaN en ${nan.slice(0, 4).join(', ')}`);
  if (s.año !== 2050) mal(`semilla ${i}: terminó en ${s.año}`);
  const pob = s.nacion.demografia.poblacion;
  if (!(pob > 1 && pob < 120)) mal(`semilla ${i}: población implausible (${pob.toFixed(1)} M)`);
  const suma = s.provincias.reduce((a, p) => a + p.poblacion, 0);
  if (Math.abs(suma - pob) > 0.05) mal(`semilla ${i}: provincias suman ${suma.toFixed(2)} y el total es ${pob.toFixed(2)}`);
  const comp = Object.values(s.nacion.demografia.composicion).reduce((a, b) => a + b, 0);
  if (Math.abs(comp - 1) > 0.02) mal(`semilla ${i}: la composición poblacional suma ${comp.toFixed(3)}`);
}
if (!fallas) bien('12 partidas completas, sin NaN ni valores absurdos');

// ---------------------------------------------------------------------------
console.log('\n== Variedad entre partidas (misma configuración) ==');
const idxs = corridas.map(indices);
for (const clave of ['soberania', 'equidad', 'desarrollo', 'democracia', 'bienestar']) {
  const vs = idxs.map((i) => i[clave]);
  const min = Math.min(...vs), max = Math.max(...vs);
  const media = vs.reduce((a, b) => a + b, 0) / vs.length;
  console.log(`  ${clave.padEnd(11)} min ${min.toFixed(2)}  media ${media.toFixed(2)}  max ${max.toFixed(2)}  rango ${(max - min).toFixed(2)}`);
  if (max - min < 0.05) mal(`${clave}: todas las partidas terminan igual (rango ${(max - min).toFixed(3)})`);
}
const eventos = corridas.map((s) => new Set(Object.keys(s.eventosDisparados)));
const comunes = [...eventos[0]].filter((e) => eventos.every((c) => c.has(e))).length;
const union = new Set(eventos.flatMap((c) => [...c])).size;
console.log(`  eventos: ${comunes} comunes a todas las partidas, ${union} distintos en total`);
if (union - comunes < 8) mal('las partidas disparan casi los mismos eventos');
if (!fallas) bien('las partidas divergen');

// ---------------------------------------------------------------------------
console.log('\n== Divergencia entre configuraciones iniciales ==');
const porPreset = {};
for (const [clave, p] of Object.entries(PRESETS)) {
  const muestras = [0, 1, 2].map((i) => indices(correr({
    semilla: `P-${i}`, fidelidadHistorica: 0.75, ...p.config,
  })));
  const prom = (k) => muestras.reduce((a, m) => a + m[k], 0) / muestras.length;
  porPreset[clave] = {
    soberania: prom('soberania'), equidad: prom('equidad'),
    desarrollo: prom('desarrollo'), democracia: prom('democracia'),
  };
  console.log(`  ${p.nombre.padEnd(28)} sob ${porPreset[clave].soberania.toFixed(2)}` +
    `  equi ${porPreset[clave].equidad.toFixed(2)}  des ${porPreset[clave].desarrollo.toFixed(2)}` +
    `  dem ${porPreset[clave].democracia.toFixed(2)}`);
}
// La configuración de reparto de tierras tiene que mover la equidad.
const eqHist = porPreset.historico.equidad;
const eqCol = porPreset.colonizadora.equidad;
if (eqCol <= eqHist) {
  mal(`repartir la tierra no mejora la equidad (histórico ${eqHist.toFixed(2)} vs colonizadora ${eqCol.toFixed(2)})`);
} else {
  bien(`repartir la tierra mejora la equidad (+${(eqCol - eqHist).toFixed(2)})`);
}
if (porPreset.soberanista.soberania <= porPreset.historico.soberania) {
  mal('la configuración soberanista no mejora la soberanía');
} else {
  bien('la configuración soberanista mejora la soberanía');
}

// ---------------------------------------------------------------------------
console.log('\n== Determinismo ==');
const a = correr({ semilla: 'IGUAL', fidelidadHistorica: 0.8 });
const b = correr({ semilla: 'IGUAL', fidelidadHistorica: 0.8 });
if (JSON.stringify(a.series.filas) !== JSON.stringify(b.series.filas)) {
  mal('la misma semilla produce partidas distintas');
} else bien('la misma semilla reproduce la misma partida');

console.log(fallas ? `\n${fallas} FALLAS\n` : '\nTodo en orden.\n');
process.exit(fallas ? 1 : 0);
