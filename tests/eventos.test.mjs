// Validación estructural del catálogo de eventos.
// Ejecutar con: node tests/eventos.test.mjs

import { EVENTOS, PAQUETES, idsDuplicados } from '../src/data/eventos/index.js';
import { crearEstado } from '../src/core/estado.js';
import { Motor } from '../src/core/motor.js';
import { SISTEMAS } from '../src/sim/sistemas/index.js';
import { Rng } from '../src/core/rng.js';

let fallas = 0;
const mal = (msg) => { console.error('  ✗', msg); fallas++; };
const bien = (msg) => console.log('  ✓', msg);

console.log('\n== Catálogo de eventos ==');
for (const [clave, p] of Object.entries(PAQUETES)) {
  console.log(`  ${clave}: ${p.eventos.length} eventos`);
}
console.log(`  total: ${EVENTOS.length}`);

// --- ids únicos ---
const dup = idsDuplicados();
if (dup.length) mal(`ids duplicados: ${dup.join(', ')}`);
else bien('todos los ids son únicos');

// --- estructura ---
console.log('\n== Estructura ==');
for (const ev of EVENTOS) {
  if (!ev.id || !ev.titulo) { mal(`evento sin id o título: ${JSON.stringify(ev).slice(0, 80)}`); continue; }
  if (!Array.isArray(ev.opciones) || ev.opciones.length === 0) {
    mal(`${ev.id}: sin opciones`); continue;
  }
  const ids = new Set();
  for (const o of ev.opciones) {
    if (!o.id || !o.texto) mal(`${ev.id}: opción sin id o texto`);
    if (ids.has(o.id)) mal(`${ev.id}: opción duplicada ${o.id}`);
    ids.add(o.id);
    if (o.aplicar && typeof o.aplicar !== 'function') mal(`${ev.id}/${o.id}: aplicar no es función`);
  }
  if (ev.canonico) {
    const hist = ev.opciones.filter((o) => o.historica);
    if (hist.length !== 1) mal(`${ev.id}: canónico con ${hist.length} opciones históricas (debe ser 1)`);
  }
  if (ev.unaVez === false && !ev.enfriamiento) {
    mal(`${ev.id}: recurrente sin enfriamiento`);
  }
  const [a, b] = ev.ventana ?? [ev.año, ev.año];
  if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) mal(`${ev.id}: ventana inválida`);
}
if (!fallas) bien('todos los eventos están bien formados');

// --- rutas de estado válidas ---
console.log('\n== Rutas de estado ==');
const base = crearEstado();
const existe = (ruta) => {
  const partes = ruta.split('.');
  let o = base;
  for (const k of partes) {
    if (o == null || typeof o !== 'object' || !(k in o)) return false;
    o = o[k];
  }
  return true;
};
const fuentes = Object.values(PAQUETES).map((p) => p.eventos);
const rutasMalas = new Set();
for (const ev of EVENTOS) {
  const texto = JSON.stringify(ev, (k, v) => (typeof v === 'function' ? v.toString() : v));
  for (const m of texto.matchAll(/'((?:nacion|regimen|presiones|actores|config|flags)\.[a-zA-Z0-9_.]+)'/g)) {
    const ruta = m[1];
    if (ruta.startsWith('flags.')) continue;
    if (!existe(ruta)) rutasMalas.add(`${ev.id}: ${ruta}`);
  }
}
if (rutasMalas.size) {
  for (const r of rutasMalas) mal(`ruta inexistente -> ${r}`);
} else bien('todas las rutas de estado usadas existen');

// --- aplicar() no explota ---
console.log('\n== Ejecución de cada opción ==');
let ejecutadas = 0;
for (const ev of EVENTOS) {
  for (const o of ev.opciones) {
    const motor = new Motor({ semilla: 'PRUEBA', añoFinal: 2050 }, SISTEMAS, []);
    // Un estado ya avanzado hace las condiciones más realistas.
    motor.correrHasta(1900);
    const api = motor.apiEvento();
    try {
      if (o.requiere) o.requiere(motor.estado);
      if (o.peso) typeof o.peso === 'function' && o.peso(motor.estado);
      if (ev.requiere) ev.requiere(motor.estado);
      if (ev.narrativa && typeof ev.narrativa === 'function') ev.narrativa(motor.estado);
      if (o.aplicar) o.aplicar(motor.estado, new Rng('x'), api);
      if (o.efectos) api.efectos(o.efectos);
      motor.sanear();
      ejecutadas++;
    } catch (err) {
      mal(`${ev.id}/${o.id}: ${err.message}`);
    }
    // NaN
    const nan = [];
    const rec = (obj, r = '') => {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'number' && !Number.isFinite(v)) nan.push(r + k);
        else if (v && typeof v === 'object' && !Array.isArray(v)) rec(v, `${r}${k}.`);
      }
    };
    rec(motor.estado.nacion); rec(motor.estado.regimen);
    if (nan.length) mal(`${ev.id}/${o.id}: produce NaN en ${nan.join(', ')}`);
  }
}
bien(`${ejecutadas} opciones ejecutadas sin excepciones`);

console.log(fallas ? `\n${fallas} FALLAS\n` : '\nTodo en orden.\n');
process.exit(fallas ? 1 : 0);
