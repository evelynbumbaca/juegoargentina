// Motor de la simulación: orquesta sistemas, eventos y el paso del tiempo.
//
// Un tick = un año. El orden de ejecución importa y está fijado por
// `orden` en la metadata de cada sistema (ver docs/CONTRATO.md).

import { Rng } from './rng.js';
import { crearEstado, indices, AÑO_INICIAL } from './estado.js';
import { clamp, clamp01, sano, red } from './util.js';

/** Eras históricas: contexto que leen sistemas y eventos. */
export const ERAS = [
  { id: 'revolucion', desde: 1810, hasta: 1820, nombre: 'Revolución y guerras de independencia' },
  { id: 'anarquia', desde: 1820, hasta: 1835, nombre: 'Autonomías provinciales' },
  { id: 'rosismo', desde: 1835, hasta: 1852, nombre: 'Confederación y bloqueos' },
  { id: 'organizacion', desde: 1852, hasta: 1880, nombre: 'Organización nacional' },
  { id: 'agroexportador', desde: 1880, hasta: 1916, nombre: 'Orden conservador y modelo agroexportador' },
  { id: 'radicalismo', desde: 1916, hasta: 1930, nombre: 'Democracia ampliada' },
  { id: 'infame', desde: 1930, hasta: 1943, nombre: 'Restauración conservadora' },
  { id: 'peronismo', desde: 1943, hasta: 1955, nombre: 'Estado de bienestar e industrialización' },
  { id: 'proscripcion', desde: 1955, hasta: 1976, nombre: 'Proscripción, desarrollismo e inestabilidad' },
  { id: 'dictadura', desde: 1976, hasta: 1983, nombre: 'Terrorismo de Estado y endeudamiento' },
  { id: 'democracia', desde: 1983, hasta: 1991, nombre: 'Transición democrática' },
  { id: 'neoliberal', desde: 1991, hasta: 2002, nombre: 'Convertibilidad y privatizaciones' },
  { id: 'posconvertibilidad', desde: 2002, hasta: 2016, nombre: 'Posconvertibilidad' },
  { id: 'contemporanea', desde: 2016, hasta: 2035, nombre: 'Argentina contemporánea' },
  { id: 'futuro', desde: 2035, hasta: 2200, nombre: 'Futuro abierto' },
];

export function eraDe(año) {
  for (let i = ERAS.length - 1; i >= 0; i--) if (año >= ERAS[i].desde) return ERAS[i];
  return ERAS[0];
}

/** Lee un valor del estado por ruta ('nacion.economia.gini'). */
export function leer(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Escribe un valor del estado por ruta. */
export function escribir(obj, ruta, valor) {
  const partes = ruta.split('.');
  const ultima = partes.pop();
  const destino = partes.reduce((o, k) => (o == null ? undefined : o[k]), obj);
  if (destino) destino[ultima] = valor;
}

/**
 * Aplica un delta a una ruta numérica. Por defecto recorta a 0..1; las rutas
 * listadas en SIN_LIMITE conservan su escala natural.
 */
const SIN_LIMITE = new Set([
  'nacion.demografia.poblacion', 'nacion.demografia.migracionNeta',
  'nacion.economia.pbiPerCapita', 'nacion.economia.crecimiento',
  'nacion.economia.inflacion', 'nacion.economia.balanzaComercial',
  'nacion.economia.deficitFiscal', 'nacion.deuda.deudaExterna',
  'nacion.deuda.deudaPbi', 'nacion.deuda.tasaInteres',
  'nacion.deuda.servicioDeuda',
]);

export function aplicarDelta(estado, ruta, delta) {
  const actual = leer(estado, ruta);
  if (typeof actual !== 'number') return;
  const bruto = actual + delta;
  escribir(estado, ruta, SIN_LIMITE.has(ruta) ? sano(bruto, actual) : clamp01(sano(bruto, actual)));
}

/** Aplica un objeto { ruta: delta } de una sola vez. */
export function aplicarEfectos(estado, efectos) {
  for (const [ruta, delta] of Object.entries(efectos || {})) aplicarDelta(estado, ruta, delta);
}

export class Motor {
  /**
   * @param {object} config condiciones iniciales
   * @param {Array} sistemas módulos de sistema (ver docs/CONTRATO.md)
   * @param {Array} eventos catálogo de eventos
   */
  constructor(config = {}, sistemas = [], eventos = []) {
    this.estado = crearEstado(config);
    this.rng = new Rng(this.estado.config.semilla);
    this.sistemas = [...sistemas].sort((a, b) => (a.meta.orden ?? 50) - (b.meta.orden ?? 50));
    this.eventos = eventos;
    this.eventosPorId = Object.fromEntries(eventos.map((e) => [e.id, e]));
    this.oyentes = [];
    this.maxEventosPorAño = 3;

    for (const sis of this.sistemas) {
      if (typeof sis.init === 'function') sis.init(this.estado, this.rng.derivar(sis.meta.id));
    }
    this.registrarSerie();
  }

  suscribir(fn) { this.oyentes.push(fn); return () => { this.oyentes = this.oyentes.filter((f) => f !== fn); }; }
  emitir(tipo, datos) { for (const fn of this.oyentes) fn(tipo, datos, this.estado); }

  /** Contexto que reciben los sistemas en cada paso. */
  contexto() {
    const s = this.estado;
    return {
      año: s.año,
      era: eraDe(s.año),
      dt: 1,
      config: s.config,
      rng: this.rng,
      flags: s.flags,
      indices: indices(s),
      log: (texto, etiquetas = []) => this.registrar(texto, etiquetas),
      provincia: (id) => s.provincias.find((p) => p.id === id),
    };
  }

  registrar(texto, etiquetas = [], tipo = 'sistema') {
    this.estado.historia.push({ año: this.estado.año, texto, etiquetas, tipo });
    if (this.estado.historia.length > 4000) this.estado.historia.splice(0, 500);
  }

  /** API que reciben los eventos al aplicar una opción. */
  apiEvento() {
    const s = this.estado;
    const motor = this;
    return {
      estado: s,
      rng: this.rng,
      año: s.año,
      era: eraDe(s.año),
      log: (texto, etiquetas = []) => motor.registrar(texto, etiquetas, 'evento'),
      efectos: (obj) => aplicarEfectos(s, obj),
      delta: (ruta, d) => aplicarDelta(s, ruta, d),
      flag: (k, v = true) => { s.flags[k] = v; },
      tiene: (k) => !!s.flags[k],
      provincia: (id) => s.provincias.find((p) => p.id === id),
      provincias: (filtro) => s.provincias.filter(filtro || (() => true)),
      actor: (id, d) => { s.actores[id] = clamp01((s.actores[id] ?? 0) + d); },
      /** Efecto temporal que se aplica cada año durante `años`. */
      modificador: ({ id, etiqueta, años, efectos }) => {
        s.modificadores.push({ id, etiqueta, restantes: años, efectos });
      },
      regimen: (cambios) => Object.assign(s.regimen, cambios),
    };
  }

  /** Aplica y envejece los modificadores temporales. */
  procesarModificadores() {
    const s = this.estado;
    const vivos = [];
    for (const m of s.modificadores) {
      aplicarEfectos(s, m.efectos);
      m.restantes -= 1;
      if (m.restantes > 0) vivos.push(m);
    }
    s.modificadores = vivos;
  }

  /** Eventos elegibles este año, con su peso. */
  candidatos() {
    const s = this.estado;
    const año = s.año;
    const out = [];
    for (const ev of this.eventos) {
      if (ev.unaVez !== false && s.eventosDisparados[ev.id]) continue;
      const [a, b] = ev.ventana ?? [ev.año ?? -Infinity, ev.año ?? Infinity];
      if (año < a || año > b) continue;
      if (typeof ev.requiere === 'function') {
        let ok = false;
        try { ok = !!ev.requiere(s); } catch { ok = false; }
        if (!ok) continue;
      }
      let peso = ev.peso ?? 1;
      if (typeof peso === 'function') { try { peso = peso(s); } catch { peso = 0; } }
      // Los eventos canónicos se vuelven muy probables al llegar su año exacto.
      if (ev.canonico) {
        const objetivo = ev.año ?? a;
        const cerca = Math.max(0, 1 - Math.abs(año - objetivo) / 4);
        peso *= 1 + cerca * 8 * s.config.fidelidadHistorica;
      }
      if (peso > 0) out.push({ ev, peso });
    }
    return out;
  }

  /** Elige la opción que se impone según la correlación de fuerzas. */
  elegirOpcion(ev) {
    const s = this.estado;
    const disponibles = ev.opciones.filter((o) => {
      if (typeof o.requiere !== 'function') return true;
      try { return !!o.requiere(s); } catch { return false; }
    });
    if (disponibles.length === 0) return null;

    const fid = s.config.fidelidadHistorica;
    return this.rng.ponderado(disponibles, (o) => {
      let p = 1;
      if (typeof o.peso === 'function') { try { p = Math.max(0, o.peso(s)); } catch { p = 0; } }
      else if (typeof o.peso === 'number') p = o.peso;

      // Respaldo de actores: la opción pesa más si la empujan los poderosos.
      if (o.actores) {
        let apoyo = 0, total = 0;
        for (const [actor, afinidad] of Object.entries(o.actores)) {
          const fuerza = s.actores[actor] ?? 0;
          apoyo += fuerza * afinidad;
          total += Math.abs(afinidad);
        }
        if (total > 0) p *= 0.25 + 1.75 * clamp01(0.5 + apoyo / total);
      }
      // Sesgo hacia el camino realmente ocurrido.
      if (o.historica) p *= 1 + 3.5 * fid;
      return p;
    });
  }

  /** Ejecuta una opción concreta de un evento. */
  resolverEvento(ev, opcion, porJugador = false) {
    const s = this.estado;
    s.eventosDisparados[ev.id] = s.año;
    const api = this.apiEvento();

    const titulo = typeof ev.titulo === 'function' ? ev.titulo(s) : ev.titulo;
    this.registrar(titulo, ev.etiquetas ?? [], 'evento');
    if (ev.narrativa) {
      const txt = typeof ev.narrativa === 'function' ? ev.narrativa(s) : ev.narrativa;
      if (txt) this.registrar(txt, ['relato'], 'relato');
    }

    if (opcion) {
      s.decisiones.push({
        año: s.año, evento: ev.id, opcion: opcion.id,
        texto: opcion.texto, porJugador,
      });
      if (typeof opcion.aplicar === 'function') {
        try { opcion.aplicar(s, this.rng, api); }
        catch (err) { console.error(`Error aplicando ${ev.id}/${opcion.id}:`, err); }
      }
      if (opcion.efectos) aplicarEfectos(s, opcion.efectos);
      this.registrar(`→ ${opcion.texto}`, ['decision'], 'decision');
      if (opcion.consecuencia) this.registrar(opcion.consecuencia, ['consecuencia'], 'relato');
    } else if (typeof ev.aplicar === 'function') {
      try { ev.aplicar(s, this.rng, api); }
      catch (err) { console.error(`Error aplicando ${ev.id}:`, err); }
    }

    this.emitir('evento', { evento: ev, opcion, porJugador });
  }

  /**
   * Avanza un año. Si `interactivo` y hay un evento con opciones para el
   * jugador, la simulación queda en pausa con `estado.pendiente` cargado y
   * devuelve 'pendiente'.
   */
  paso() {
    const s = this.estado;
    if (s.terminada) return 'fin';
    if (s.pendiente) return 'pendiente';

    s.año += 1;
    s.tick += 1;
    s.regimen.añosEnPoder += 1;

    // 1. Efectos temporales heredados
    this.procesarModificadores();

    // 2. Sistemas
    const ctx = this.contexto();
    for (const sis of this.sistemas) {
      try { sis.paso(s, this.rng.derivar(sis.meta.id + s.año), ctx); }
      catch (err) { console.error(`Error en sistema ${sis.meta.id} (${s.año}):`, err); }
    }
    this.sanear();

    // 3. Eventos
    const cands = this.candidatos();
    let disparados = 0;
    const yaVistos = new Set();
    while (disparados < this.maxEventosPorAño && cands.length) {
      const elegido = this.rng.ponderado(
        cands.filter((c) => !yaVistos.has(c.ev.id)), (c) => c.peso
      );
      if (!elegido) break;
      yaVistos.add(elegido.ev.id);

      const ev = elegido.ev;
      // Umbral: un evento no canónico puede no dispararse este año.
      const prob = ev.canonico
        ? clamp01(0.35 + 0.65 * s.config.fidelidadHistorica)
        : clamp01((ev.probabilidad ?? 0.35) * s.config.volatilidad);
      if (!this.rng.chance(prob)) continue;

      if (s.config.modo === 'interventor' && ev.opciones?.length > 1 && ev.interactivo !== false) {
        s.pendiente = {
          eventoId: ev.id,
          opciones: ev.opciones
            .filter((o) => (typeof o.requiere === 'function' ? o.requiere(s) : true))
            .map((o) => ({
              id: o.id, texto: o.texto, resumen: o.resumen,
              consecuencia: o.consecuencia, actores: o.actores,
            })),
        };
        this.emitir('decision', { evento: ev });
        return 'pendiente';
      }

      const opcion = ev.opciones?.length ? this.elegirOpcion(ev) : null;
      this.resolverEvento(ev, opcion, false);
      disparados += 1;
    }

    // 4. Cierre del año
    this.sanear();
    this.registrarSerie();
    this.emitir('año', { año: s.año });

    if (s.año >= s.config.añoFinal) {
      s.terminada = true;
      s.causaFin = 'fin_periodo';
      this.emitir('fin', { causa: s.causaFin });
      return 'fin';
    }
    return 'ok';
  }

  /** Resuelve el evento pendiente con la opción elegida por el jugador. */
  decidir(opcionId) {
    const s = this.estado;
    if (!s.pendiente) return false;
    const ev = this.eventosPorId[s.pendiente.eventoId];
    const opcion = ev?.opciones.find((o) => o.id === opcionId);
    s.pendiente = null;
    if (!ev) return false;
    this.resolverEvento(ev, opcion ?? this.elegirOpcion(ev), true);
    this.sanear();
    this.registrarSerie();
    return true;
  }

  /** Deja que la correlación de fuerzas resuelva el evento pendiente. */
  delegar() {
    const s = this.estado;
    if (!s.pendiente) return false;
    const ev = this.eventosPorId[s.pendiente.eventoId];
    s.pendiente = null;
    if (!ev) return false;
    this.resolverEvento(ev, this.elegirOpcion(ev), false);
    this.sanear();
    this.registrarSerie();
    return true;
  }

  /** Barrera anti-NaN y anti-valores absurdos: la simulación nunca explota. */
  sanear() {
    const s = this.estado;
    const recorrer = (obj, ruta) => {
      for (const [k, v] of Object.entries(obj)) {
        const r = ruta ? `${ruta}.${k}` : k;
        if (typeof v === 'number') {
          if (!Number.isFinite(v)) obj[k] = 0;
          else if (!SIN_LIMITE.has(`nacion.${r}`)) obj[k] = clamp01(v);
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
          recorrer(v, r);
        }
      }
    };
    for (const [dominio, obj] of Object.entries(s.nacion)) recorrer(obj, dominio);

    const n = s.nacion;
    n.demografia.poblacion = clamp(sano(n.demografia.poblacion, 0.5), 0.05, 300);
    n.economia.pbiPerCapita = clamp(sano(n.economia.pbiPerCapita, 1000), 250, 250000);
    n.economia.inflacion = clamp(sano(n.economia.inflacion, 0), -0.4, 60);
    n.economia.crecimiento = clamp(sano(n.economia.crecimiento, 0), -0.35, 0.25);
    n.economia.deficitFiscal = clamp(sano(n.economia.deficitFiscal, 0), -0.15, 0.35);
    n.economia.balanzaComercial = clamp(sano(n.economia.balanzaComercial, 0), -1, 1);
    n.deuda.deudaExterna = clamp(sano(n.deuda.deudaExterna, 0), 0, 5000);
    n.deuda.deudaPbi = clamp(sano(n.deuda.deudaPbi, 0), 0, 6);
    n.deuda.tasaInteres = clamp(sano(n.deuda.tasaInteres, 0.05), 0, 0.9);
    n.deuda.servicioDeuda = clamp(sano(n.deuda.servicioDeuda, 0), 0, 5);

    for (const a of Object.keys(s.actores)) s.actores[a] = clamp01(sano(s.actores[a], 0));
    for (const p of Object.keys(s.presiones)) s.presiones[p] = clamp01(sano(s.presiones[p], 0));
    for (const p of s.provincias) {
      p.poblacion = clamp(sano(p.poblacion, 0.001), 0.0001, 120);
      for (const k of ['urbanizacion', 'integracion', 'desarrollo', 'industria', 'agro',
        'infraestructura', 'educacion', 'descontento', 'autonomismo', 'pobreza',
        'controlOriginario', 'extranjerizacionTierra', 'conflicto']) {
        p[k] = clamp01(sano(p[k], 0));
      }
    }
  }

  registrarSerie() {
    const s = this.estado;
    const idx = indices(s);
    const n = s.nacion;
    const fila = {
      año: s.año,
      poblacion: red(n.demografia.poblacion, 3),
      pbi: Math.round(n.economia.pbiPerCapita),
      gini: red(n.economia.gini, 3),
      pobreza: red(n.social.pobreza, 3),
      inflacion: red(n.economia.inflacion, 3),
      deuda: red(n.deuda.deudaPbi, 3),
      industria: red(n.economia.industrializacion, 3),
      alfabetizacion: red(n.educacion.alfabetizacion, 3),
      democracia: red(s.regimen.democracia, 3),
      ...Object.fromEntries(Object.entries(idx).map(([k, v]) => [k, red(v, 3)])),
    };
    if (!s.series.filas) s.series.filas = [];
    s.series.filas.push(fila);
  }

  /** Corre hasta el final o hasta que aparezca una decisión pendiente. */
  correrHasta(año) {
    let guardia = 0;
    while (this.estado.año < año && !this.estado.terminada && !this.estado.pendiente && guardia++ < 1000) {
      this.paso();
    }
    return this.estado;
  }
}

export { AÑO_INICIAL };
