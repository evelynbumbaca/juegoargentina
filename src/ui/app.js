// Aplicación: pantalla de inicio, bucle de juego, paneles y decisiones.

import { Motor, eraDe } from '../core/motor.js';
import { SISTEMAS } from '../sim/sistemas/index.js';
import { EVENTOS } from '../data/eventos/index.js';
import { indices, PRESETS, CONFIG_POR_DEFECTO } from '../core/estado.js';
import { semillaAlAzar } from '../core/rng.js';
import { fmt, pct } from '../core/util.js';
import { RenderMapa, VISTAS } from '../render/mapa.js';
import { PROVINCIAS, REGIONES } from '../data/provincias.js';

const $ = (s) => document.querySelector(s);
const crear = (tag, clase, html) => {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (html != null) el.innerHTML = html;
  return el;
};

const estadoUI = {
  motor: null, render: null, corriendo: false, velocidad: 1,
  modo: 'observador', acumulador: 0, ultimo: 0, preset: 'historico',
};

// ---------------------------------------------------------------------------
// Pantalla de inicio
// ---------------------------------------------------------------------------

function montarInicio() {
  const cont = $('#presets');
  for (const [clave, p] of Object.entries(PRESETS)) {
    const t = crear('div', 'tarjeta' + (clave === 'historico' ? ' sel' : ''),
      `<h3>${p.nombre}</h3><p class="suave" style="margin:0">${p.descripcion}</p>`);
    t.onclick = () => {
      document.querySelectorAll('#presets .tarjeta').forEach((x) => x.classList.remove('sel'));
      t.classList.add('sel');
      estadoUI.preset = clave;
      aplicarPreset(p.config);
    };
    cont.appendChild(t);
  }

  const rangos = [
    ['#cfg-apertura', '#v-apertura'], ['#cfg-estado', '#v-estado'],
    ['#cfg-federalismo', '#v-federalismo'], ['#cfg-inmigracion', '#v-inmigracion'],
    ['#cfg-fidelidad', '#v-fidelidad'], ['#cfg-volatilidad', '#v-volatilidad'],
  ];
  for (const [r, v] of rangos) {
    const act = () => { $(v).textContent = $(r).value + '%'; };
    $(r).addEventListener('input', act); act();
  }

  document.querySelectorAll('.tarjeta[data-modo]').forEach((t) => {
    t.onclick = () => {
      document.querySelectorAll('.tarjeta[data-modo]').forEach((x) => x.classList.remove('sel'));
      t.classList.add('sel');
      estadoUI.modo = t.dataset.modo;
    };
  });

  $('#cfg-semilla').value = semillaAlAzar();
  $('#azar').onclick = () => { $('#cfg-semilla').value = semillaAlAzar(); };
  $('#empezar').onclick = empezar;
}

function aplicarPreset(cfg) {
  const c = { ...CONFIG_POR_DEFECTO, ...cfg };
  $('#cfg-tierra').value = c.repartoTierras;
  $('#cfg-modelo').value = c.modeloEconomico;
  $('#cfg-alineamiento').value = c.alineamiento;
  $('#cfg-frontera').value = c.fronteraIndigena;
  $('#cfg-apertura').value = Math.round(c.apertura * 100);
  $('#cfg-estado').value = Math.round(c.intervencionEstatal * 100);
  $('#cfg-federalismo').value = Math.round(c.federalismo * 100);
  $('#cfg-inmigracion').value = Math.round(c.inmigracion * 100);
  document.querySelectorAll('input[type=range]').forEach((r) => r.dispatchEvent(new Event('input')));
}

function leerConfig() {
  return {
    semilla: $('#cfg-semilla').value || semillaAlAzar(),
    modo: estadoUI.modo,
    repartoTierras: $('#cfg-tierra').value,
    modeloEconomico: $('#cfg-modelo').value,
    alineamiento: $('#cfg-alineamiento').value,
    fronteraIndigena: $('#cfg-frontera').value,
    apertura: +$('#cfg-apertura').value / 100,
    intervencionEstatal: +$('#cfg-estado').value / 100,
    federalismo: +$('#cfg-federalismo').value / 100,
    inmigracion: +$('#cfg-inmigracion').value / 100,
    fidelidadHistorica: +$('#cfg-fidelidad').value / 100,
    volatilidad: +$('#cfg-volatilidad').value / 100,
    añoFinal: +$('#cfg-final').value,
  };
}

// ---------------------------------------------------------------------------
// Arranque de la partida
// ---------------------------------------------------------------------------

function empezar() {
  const cfg = leerConfig();
  estadoUI.motor = new Motor(cfg, SISTEMAS, EVENTOS);
  $('#inicio').style.display = 'none';
  $('#juego').classList.add('visible');

  if (!estadoUI.render) {
    estadoUI.render = new RenderMapa($('#lienzo'));
    montarVistas();
    montarInteraccion();
  }
  estadoUI.render.encuadrar();
  estadoUI.corriendo = false;
  $('#pausa').textContent = '▶ Correr';

  estadoUI.motor.suscribir((tipo) => { if (tipo === 'decision') pausar(); });

  refrescar();
  requestAnimationFrame(bucle);
}

function montarVistas() {
  const cont = $('#vistas');
  cont.innerHTML = '';
  for (const [clave, v] of Object.entries(VISTAS)) {
    const b = crear('button', clave === 'fisica' ? 'activo' : '', v.nombre);
    b.title = v.ayuda;
    b.onclick = () => {
      estadoUI.render.vista = clave;
      cont.querySelectorAll('button').forEach((x) => x.classList.remove('activo'));
      b.classList.add('activo');
    };
    cont.appendChild(b);
  }
}

function montarInteraccion() {
  const lienzo = $('#lienzo');
  const tip = $('#tooltip');

  lienzo.addEventListener('mousemove', (ev) => {
    const i = estadoUI.render.provinciaEn(ev.clientX, ev.clientY);
    estadoUI.render.provinciaResaltada = i;
    if (i < 0) { tip.style.display = 'none'; return; }
    const p = estadoUI.motor.estado.provincias[i];
    const meta = PROVINCIAS[i];
    tip.innerHTML = `<b style="color:var(--oro)">${meta.nombre}</b><br>
      <span class="suave">${REGIONES[meta.region].nombre}</span><br>
      Población: <b>${fmt(p.poblacion * 1e6, 0)}</b><br>
      Urbanización: <b>${pct(p.urbanizacion)}</b> · Desarrollo: <b>${pct(p.desarrollo)}</b><br>
      Pobreza: <b>${pct(p.pobreza)}</b> · Descontento: <b>${pct(p.descontento)}</b><br>
      ${p.controlOriginario > 0.05 ? `Territorio originario: <b>${pct(p.controlOriginario)}</b><br>` : ''}
      Integración al Estado: <b>${pct(p.integracion)}</b>`;
    const r = lienzo.getBoundingClientRect();
    tip.style.display = 'block';
    tip.style.left = Math.min(ev.clientX - r.left + 14, r.width - 270) + 'px';
    tip.style.top = Math.min(ev.clientY - r.top + 14, r.height - 120) + 'px';
  });
  lienzo.addEventListener('mouseleave', () => {
    tip.style.display = 'none';
    estadoUI.render.provinciaResaltada = -1;
  });

  $('#pausa').onclick = () => (estadoUI.corriendo ? pausar() : arrancar());
  $('#paso1').onclick = () => { pausar(); avanzar(); };
  $('#reiniciar').onclick = () => {
    pausar();
    $('#juego').classList.remove('visible');
    $('#inicio').style.display = 'flex';
  };
  document.querySelectorAll('.vel').forEach((b) => {
    b.onclick = () => {
      estadoUI.velocidad = +b.dataset.vel;
      document.querySelectorAll('.vel').forEach((x) => x.classList.remove('activo'));
      b.classList.add('activo');
    };
  });
  window.addEventListener('resize', () => estadoUI.render.encuadrar());
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); estadoUI.corriendo ? pausar() : arrancar(); }
  });
}

const arrancar = () => { estadoUI.corriendo = true; $('#pausa').textContent = '❚❚ Pausa'; };
const pausar = () => { estadoUI.corriendo = false; $('#pausa').textContent = '▶ Correr'; };

// ---------------------------------------------------------------------------
// Bucle
// ---------------------------------------------------------------------------

function avanzar() {
  const m = estadoUI.motor;
  if (!m || m.estado.terminada) return;
  const r = m.paso();
  if (r === 'pendiente') { pausar(); mostrarDecision(); }
  if (r === 'fin') { pausar(); mostrarFinal(); }
  refrescar();
}

function bucle(t) {
  const dt = t - (estadoUI.ultimo || t);
  estadoUI.ultimo = t;
  if (estadoUI.corriendo && estadoUI.motor && !estadoUI.motor.estado.pendiente) {
    estadoUI.acumulador += dt * estadoUI.velocidad;
    const intervalo = 420;
    let guardia = 0;
    while (estadoUI.acumulador > intervalo && guardia++ < 20) {
      estadoUI.acumulador -= intervalo;
      avanzar();
      if (!estadoUI.corriendo) break;
    }
  }
  if (estadoUI.motor && estadoUI.render) estadoUI.render.dibujar(estadoUI.motor.estado);
  requestAnimationFrame(bucle);
}

// ---------------------------------------------------------------------------
// Paneles
// ---------------------------------------------------------------------------

const NOMBRES_REGIMEN = {
  revolucionario: 'Gobierno revolucionario', caudillista: 'Poder caudillista',
  anarquia: 'Sin poder central', oligarquico: 'República oligárquica',
  democracia: 'Democracia', democracia_restringida: 'Democracia restringida',
  dictadura: 'Dictadura', populismo: 'Democracia de masas', tecnocratico: 'Gobierno tecnocrático',
};

function formatear(valor, formato) {
  if (typeof valor === 'string') return valor;
  if (!Number.isFinite(valor)) return '—';
  switch (formato) {
    case 'porcentaje': return pct(valor, 0);
    case 'usd': return 'US$ ' + Math.round(valor).toLocaleString('es-AR');
    case 'millones': return valor.toFixed(1) + ' M';
    case 'indice': return (valor * 100).toFixed(0);
    case 'numero': return Math.abs(valor) >= 1000 ? fmt(valor, 0) : valor.toFixed(1);
    default: return String(valor);
  }
}

function refrescar() {
  const m = estadoUI.motor;
  if (!m) return;
  const s = m.estado;

  $('#anio').textContent = s.año;
  $('#era').textContent = eraDe(s.año).nombre;
  $('#regimen').textContent = NOMBRES_REGIMEN[s.regimen.tipo] ?? s.regimen.tipo;

  // --- Panel izquierdo: índices + sistemas ---
  const izq = $('#izquierda');
  const abiertos = new Set([...izq.querySelectorAll('details[open]')].map((d) => d.dataset.id));
  izq.innerHTML = '';

  const idx = indices(s);
  const cab = crear('div');
  cab.appendChild(crear('h2', null, 'Estado del país'));
  const etiquetas = {
    soberania: 'Soberanía', equidad: 'Equidad', desarrollo: 'Desarrollo',
    democracia: 'Democracia', bienestar: 'Bienestar',
  };
  for (const [k, v] of Object.entries(idx)) {
    const color = v > 0.6 ? 'var(--bien)' : v > 0.35 ? 'var(--alerta)' : 'var(--mal)';
    cab.appendChild(crear('div', 'indice',
      `<div class="cab"><span>${etiquetas[k]}</span><b>${pct(v, 0)}</b></div>
       <div class="barra"><i style="width:${(v * 100).toFixed(0)}%;background:${color}"></i></div>`));
  }
  izq.appendChild(cab);

  const graf = crear('canvas', 'spark');
  izq.appendChild(graf);
  dibujarSeries(graf, s);

  for (const sis of m.sistemas) {
    if (typeof sis.indicadores !== 'function') continue;
    let datos = [];
    try { datos = sis.indicadores(s) ?? []; } catch { datos = []; }
    if (!datos.length) continue;
    const d = crear('details', 'grupo');
    d.dataset.id = sis.meta.id;
    if (abiertos.has(sis.meta.id) || abiertos.size === 0 && ['economia', 'deuda'].includes(sis.meta.id)) {
      d.open = true;
    }
    d.appendChild(crear('summary', null, sis.meta.nombre));
    const cuerpo = crear('div', 'cuerpo');
    for (const ind of datos) {
      const flecha = Number.isFinite(ind.tendencia) && Math.abs(ind.tendencia) > 1e-4
        ? `<span class="${ind.tendencia > 0 ? 'up' : 'down'}">${ind.tendencia > 0 ? '▲' : '▼'}</span>` : '';
      const fila = crear('div', 'dato',
        `<span>${ind.etiqueta}</span><b>${formatear(ind.valor, ind.formato)} ${flecha}</b>`);
      if (ind.ayuda) fila.title = ind.ayuda;
      cuerpo.appendChild(fila);
    }
    d.appendChild(cuerpo);
    izq.appendChild(d);
  }

  // --- Panel derecho: crónica ---
  const reg = $('#registro');
  const ultimas = s.historia.slice(-60).reverse();
  reg.innerHTML = ultimas.map((h) => {
    const clase = h.tipo === 'evento' ? 'evento' : h.tipo === 'decision' ? 'decision'
      : h.tipo === 'relato' ? 'relato' : '';
    return `<div class="ent ${clase}"><span class="a">${h.año}</span>${h.texto}</div>`;
  }).join('');
}

/** Gráfico compacto de la evolución de los índices. */
function dibujarSeries(canvas, s) {
  const filas = s.series.filas ?? [];
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 280, h = 46;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#0e1319'; c.fillRect(0, 0, w, h);
  if (filas.length < 2) return;

  const series = [
    ['soberania', '#6fb1d8'], ['equidad', '#7fc98a'],
    ['desarrollo', '#f0d38a'], ['democracia', '#c08fd0'],
  ];
  for (const [clave, color] of series) {
    c.strokeStyle = color; c.lineWidth = 1.5; c.beginPath();
    filas.forEach((f, i) => {
      const x = (i / (filas.length - 1)) * w;
      const y = h - (f[clave] ?? 0) * (h - 4) - 2;
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    });
    c.stroke();
  }
  c.fillStyle = '#8fa0b5'; c.font = '9px monospace';
  c.fillText(String(filas[0].año), 2, h - 2);
  c.textAlign = 'right';
  c.fillText(String(filas[filas.length - 1].año), w - 2, h - 2);
  c.textAlign = 'left';
}

// ---------------------------------------------------------------------------
// Decisiones (modo interventor)
// ---------------------------------------------------------------------------

const NOMBRES_ACTOR = {
  oligarquia: 'terratenientes', burguesiaIndustrial: 'industriales',
  capitalExtranjero: 'capital extranjero', sindicatos: 'sindicatos',
  clasesMedias: 'clases medias', ffaa: 'Fuerzas Armadas', iglesia: 'Iglesia',
  movimientosPopulares: 'movimientos populares', puebloOriginario: 'pueblos originarios',
  organismosInternacionales: 'organismos internacionales',
  caudillosProvinciales: 'poderes provinciales', portuarios: 'intereses del puerto',
};

function mostrarDecision() {
  const m = estadoUI.motor;
  const p = m.estado.pendiente;
  if (!p) return;
  const ev = m.eventosPorId[p.eventoId];
  const s = m.estado;

  const titulo = typeof ev.titulo === 'function' ? ev.titulo(s) : ev.titulo;
  const narrativa = ev.narrativa
    ? (typeof ev.narrativa === 'function' ? ev.narrativa(s) : ev.narrativa) : '';

  const d = $('#dialogo');
  d.innerHTML = `<div class="suave" style="font-size:11px">${s.año} · ${eraDe(s.año).nombre}</div>
    <h2 style="color:var(--oro); font-size:18px">${titulo}</h2>
    <p style="margin-top:0">${narrativa}</p>`;

  for (const o of p.opciones) {
    const apoyos = o.actores
      ? Object.entries(o.actores)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${v > 0 ? '+' : '−'} ${NOMBRES_ACTOR[k] ?? k}`)
        .slice(0, 5).join('  ')
      : '';
    const b = crear('button', 'opcion',
      `<b>${o.texto}</b>${o.resumen ? `<div class="r">${o.resumen}</div>` : ''}
       ${apoyos ? `<div class="ap">${apoyos}</div>` : ''}`);
    b.onclick = () => {
      $('#modal').classList.remove('visible');
      m.decidir(o.id);
      refrescar();
      arrancar();
    };
    d.appendChild(b);
  }

  const delegar = crear('button', 'opcion',
    '<b>Dejar que se resuelva solo</b><div class="r">Decide la correlación de fuerzas del momento.</div>');
  delegar.onclick = () => {
    $('#modal').classList.remove('visible');
    m.delegar();
    refrescar();
    arrancar();
  };
  d.appendChild(delegar);

  $('#modal').classList.add('visible');
}

// ---------------------------------------------------------------------------
// Cierre de partida
// ---------------------------------------------------------------------------

function mostrarFinal() {
  const s = estadoUI.motor.estado;
  const idx = indices(s);
  const n = s.nacion;

  const juicio = (v) => (v > 0.65 ? '<span class="up">alto</span>'
    : v > 0.4 ? '<span style="color:var(--alerta)">medio</span>' : '<span class="down">bajo</span>');

  const hitos = s.decisiones.filter((d) => d.porJugador || Math.random() < 1)
    .slice(-14)
    .map((d) => `<div class="dato"><span>${d.año}</span><b style="text-align:right">${d.texto}</b></div>`)
    .join('');

  $('#dialogo').innerHTML = `
    <h2 style="color:var(--oro); font-size:18px">La Argentina de ${s.año}</h2>
    <p class="suave" style="margin-top:0">Semilla <b>${s.config.semilla}</b> ·
      ${s.decisiones.length} decisiones · ${Object.keys(s.eventosDisparados).length} eventos</p>
    <div class="grupo"><div class="cuerpo">
      <div class="dato"><span>Población</span><b>${fmt(n.demografia.poblacion * 1e6, 1)}</b></div>
      <div class="dato"><span>PBI per cápita</span><b>US$ ${Math.round(n.economia.pbiPerCapita).toLocaleString('es-AR')}</b></div>
      <div class="dato"><span>Pobreza</span><b>${pct(n.social.pobreza)}</b></div>
      <div class="dato"><span>Deuda externa</span><b>US$ ${n.deuda.deudaExterna.toFixed(1)} mil M</b></div>
      <div class="dato"><span>Alfabetización</span><b>${pct(n.educacion.alfabetizacion)}</b></div>
      <div class="dato"><span>Industria</span><b>${pct(n.economia.industrializacion)}</b></div>
    </div></div>
    <div class="grupo"><div class="cuerpo">
      <div class="dato"><span>Soberanía</span><b>${juicio(idx.soberania)} · ${pct(idx.soberania)}</b></div>
      <div class="dato"><span>Equidad</span><b>${juicio(idx.equidad)} · ${pct(idx.equidad)}</b></div>
      <div class="dato"><span>Desarrollo</span><b>${juicio(idx.desarrollo)} · ${pct(idx.desarrollo)}</b></div>
      <div class="dato"><span>Democracia</span><b>${juicio(idx.democracia)} · ${pct(idx.democracia)}</b></div>
      <div class="dato"><span>Bienestar</span><b>${juicio(idx.bienestar)} · ${pct(idx.bienestar)}</b></div>
    </div></div>
    <details class="grupo"><summary>Últimas decisiones</summary><div class="cuerpo">${hitos}</div></details>
    <button class="opcion" id="cerrar-final"><b>Volver al inicio</b></button>`;

  $('#modal').classList.add('visible');
  $('#cerrar-final').onclick = () => {
    $('#modal').classList.remove('visible');
    $('#juego').classList.remove('visible');
    $('#inicio').style.display = 'flex';
  };
}

montarInicio();
