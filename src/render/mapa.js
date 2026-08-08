// Render del mapa en pixel art sobre canvas.
//
// El terreno se dibuja una sola vez en un canvas fuera de pantalla y después se
// copia; encima van las capas que cambian año a año (color temático, sprites de
// asentamientos y actividad, red ferroviaria, conflictos).

import { construirMapa, CLAVES_BIOMA, BIOMAS, aGrilla } from '../data/geo.js';
import { PROVINCIAS } from '../data/provincias.js';
import { UI, COLORES_PROVINCIA, RAMPA_FRIA, RAMPA_ROJA, deRampa, dibujarSprite } from './paleta.js';

/** Vistas disponibles del mapa. */
export const VISTAS = {
  fisica: { nombre: 'Física', ayuda: 'Ecorregiones, ríos y relieve.' },
  politica: { nombre: 'Política', ayuda: 'Jurisdicciones provinciales.' },
  poblacion: { nombre: 'Población', ayuda: 'Densidad de habitantes.' },
  desarrollo: { nombre: 'Desarrollo', ayuda: 'Industria, infraestructura y educación.' },
  pobreza: { nombre: 'Pobreza', ayuda: 'Proporción de población bajo la línea.' },
  tierra: { nombre: 'Tierra', ayuda: 'Concentración de la propiedad y extranjerización.' },
  originarios: { nombre: 'Territorio originario', ayuda: 'Control efectivo de los pueblos originarios.' },
  conflicto: { nombre: 'Conflicto', ayuda: 'Descontento y conflicto abierto.' },
};

export class RenderMapa {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.mapa = construirMapa();
    this.vista = 'fisica';
    this.provinciaResaltada = -1;
    this.esc = 1;
    this.offX = 0;
    this.offY = 0;
    this._terreno = null;
    this._pulso = 0;
    this.prepararTerreno();
  }

  /** Pinta el terreno base (biomas, ríos, costa) en un canvas propio. */
  prepararTerreno() {
    const m = this.mapa;
    const off = document.createElement('canvas');
    off.width = m.columnas;
    off.height = m.filas;
    const c = off.getContext('2d');

    c.fillStyle = BIOMAS.oceano.color;
    c.fillRect(0, 0, m.columnas, m.filas);

    for (let f = 0; f < m.filas; f++) {
      for (let col = 0; col < m.columnas; col++) {
        const i = f * m.columnas + col;
        if (!m.tierra[i]) {
          // Trama sutil del océano para que no quede plano.
          c.fillStyle = (f + col) % 7 === 0 ? BIOMAS.oceano.color2 : BIOMAS.oceano.color;
          c.fillRect(col, f, 1, 1);
          continue;
        }
        const b = BIOMAS[CLAVES_BIOMA[m.bioma[i]]];
        // Dithering por elevación: da textura de relieve sin sombreado suave.
        const alto = m.elevacion[i] > 0.55 && (f + col) % 2 === 0;
        c.fillStyle = m.rio[i] ? BIOMAS.agua.color : (alto ? b.color2 : b.color);
        c.fillRect(col, f, 1, 1);
      }
    }
    // Línea de costa un tono más oscuro
    for (let i = 0; i < m.costa.length; i++) {
      if (!m.costa[i] || !m.tierra[i]) continue;
      const f = Math.floor(i / m.columnas), col = i % m.columnas;
      c.fillStyle = '#1d3550';
      c.fillRect(col, f, 1, 1);
    }
    this._terreno = off;
  }

  /** Ajusta escala y desplazamiento al tamaño disponible. */
  encuadrar() {
    const m = this.mapa;
    const dpr = window.devicePixelRatio || 1;
    const anchoCss = this.canvas.clientWidth;
    const altoCss = this.canvas.clientHeight;
    this.canvas.width = Math.floor(anchoCss * dpr);
    this.canvas.height = Math.floor(altoCss * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    this.esc = Math.max(2, Math.floor(Math.min(anchoCss / m.columnas, altoCss / m.filas)));
    this.offX = Math.floor((anchoCss - m.columnas * this.esc) / 2);
    this.offY = Math.floor((altoCss - m.filas * this.esc) / 2);
  }

  /** Valor 0..1 de una provincia según la vista activa. */
  valorProvincia(p, estado) {
    switch (this.vista) {
      case 'poblacion': {
        const max = Math.max(...estado.provincias.map((q) => q.poblacion));
        return Math.min(1, Math.sqrt(p.poblacion / (max || 1)));
      }
      case 'desarrollo': return p.desarrollo;
      case 'pobreza': return 1 - p.pobreza;
      case 'tierra': return 1 - Math.min(1, estado.nacion.tierra.giniTierra * 0.7 + p.extranjerizacionTierra * 0.6);
      case 'originarios': return p.controlOriginario;
      case 'conflicto': return 1 - Math.min(1, p.descontento * 0.6 + p.conflicto * 0.8);
      default: return 0.5;
    }
  }

  dibujar(estado) {
    const ctx = this.ctx;
    const m = this.mapa;
    const e = this.esc;
    this._pulso = (this._pulso + 1) % 60;

    ctx.fillStyle = UI.fondo;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Terreno base
    ctx.drawImage(this._terreno, this.offX, this.offY, m.columnas * e, m.filas * e);

    // Capa temática
    if (this.vista !== 'fisica') {
      for (let f = 0; f < m.filas; f++) {
        for (let col = 0; col < m.columnas; col++) {
          const i = f * m.columnas + col;
          const pi = m.provincia[i];
          if (!m.tierra[i] || pi < 0) continue;
          const p = estado.provincias[pi];
          let color;
          if (this.vista === 'politica') {
            color = COLORES_PROVINCIA[pi % COLORES_PROVINCIA.length];
          } else if (this.vista === 'conflicto' || this.vista === 'pobreza') {
            color = deRampa(RAMPA_ROJA, this.valorProvincia(p, estado));
          } else {
            color = deRampa(RAMPA_FRIA, this.valorProvincia(p, estado));
          }
          ctx.globalAlpha = this.vista === 'politica' ? 0.62 : 0.72;
          ctx.fillStyle = color;
          ctx.fillRect(this.offX + col * e, this.offY + f * e, e, e);
        }
      }
      ctx.globalAlpha = 1;
    }

    // Bordes provinciales
    ctx.fillStyle = 'rgba(10,14,20,0.55)';
    for (let f = 0; f < m.filas; f++) {
      for (let col = 0; col < m.columnas; col++) {
        const i = f * m.columnas + col;
        if (!m.tierra[i] || m.provincia[i] < 0) continue;
        const der = col + 1 < m.columnas ? m.provincia[i + 1] : -2;
        const abj = f + 1 < m.filas ? m.provincia[i + m.columnas] : -2;
        if (der !== m.provincia[i] || abj !== m.provincia[i]) {
          ctx.fillRect(this.offX + col * e, this.offY + f * e, e, e);
        }
      }
    }

    // Resaltado de la provincia bajo el cursor
    if (this.provinciaResaltada >= 0) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = UI.acento2;
      for (const i of m.celdasPorProvincia[this.provinciaResaltada]) {
        const f = Math.floor(i / m.columnas), col = i % m.columnas;
        ctx.fillRect(this.offX + col * e, this.offY + f * e, e, e);
      }
      ctx.globalAlpha = 1;
    }

    this.dibujarActividad(estado);
  }

  /** Sprites de asentamientos y actividad económica. */
  dibujarActividad(estado) {
    const ctx = this.ctx;
    const m = this.mapa;
    const e = this.esc;
    const escSprite = Math.max(1, Math.floor(e / 2.2));
    const n = estado.nacion;

    const poner = (clave, lat, lon, desfX = 0, desfY = 0, alfa = 1) => {
      const g = aGrilla(lat, lon);
      const x = this.offX + (g.col + desfX) * e;
      const y = this.offY + (g.fila + desfY) * e;
      dibujarSprite(ctx, clave, x, y, escSprite, alfa);
    };

    for (let idx = 0; idx < PROVINCIAS.length; idx++) {
      const meta = PROVINCIAS[idx];
      const p = estado.provincias[idx];

      // Asentamiento principal, según población urbana
      const urbanos = p.poblacion * p.urbanizacion;
      let sprite = null;
      if (urbanos > 2.2) sprite = 'metropoli';
      else if (urbanos > 0.35) sprite = 'ciudad';
      else if (p.poblacion > 0.02) sprite = 'poblado';
      if (sprite) poner(sprite, meta.lat, meta.lon, -1, -1.5);

      // Actividad rural dominante: chacra si la tierra está repartida,
      // estancia si está concentrada.
      if (p.agro > 0.25) {
        const chacarera = n.tierra.chacras > 0.4;
        poner(chacarera ? 'chacra' : 'estancia', meta.lat - 1.0, meta.lon + 0.9, -1, 0, 0.9);
      }
      // Industria
      if (p.industria > 0.22) poner('fabrica', meta.lat + 0.9, meta.lon - 1.0, -1, -1, 0.95);
      // Extractivo
      if (meta.aptitud.petroleo > 0.5 && n.recursos.petroleo > 0.15) {
        poner('pozo', meta.lat - 1.6, meta.lon - 1.2, 0, 0, 0.95);
      } else if (meta.aptitud.mineria > 0.6 && n.recursos.mineria > 0.25) {
        poner('mina', meta.lat - 1.5, meta.lon - 1.1, 0, 0, 0.95);
      } else if (meta.aptitud.litio > 0.7 && n.recursos.litio > 0.15) {
        poner('mina', meta.lat - 1.5, meta.lon - 1.1, 0, 0, 0.95);
      }
      // Puerto
      if (meta.aptitud.puerto > 0.5 && n.infraestructura.puertos > 0.2) {
        poner('puerto', meta.lat + 0.6, meta.lon + 1.0, 0, 0, 0.9);
      }
      // Territorio originario
      if (p.controlOriginario > 0.35) {
        poner('tolderia', meta.lat + 1.4, meta.lon + 1.2, 0, 0, 0.85);
      }
      // Universidad
      if (p.educacion > 0.45 && n.educacion.superior > 0.08 && p.desarrollo > 0.3) {
        poner('universidad', meta.lat + 1.6, meta.lon - 1.4, 0, 0, 0.9);
      }
      // Conflicto abierto: parpadea
      if (p.conflicto > 0.25 && this._pulso < 36) {
        poner('conflicto', meta.lat - 0.4, meta.lon - 0.4, 0, -1);
      }
    }

    // Red ferroviaria: se dibuja como radios desde el puerto o como malla,
    // según quién la construyó y con qué criterio.
    const ferro = n.infraestructura.ferrocarril;
    if (ferro > 0.05) {
      const centro = n.infraestructura.centralismoPortuario;
      ctx.strokeStyle = `rgba(90,74,58,${Math.min(0.9, 0.25 + ferro)})`;
      ctx.lineWidth = Math.max(1, Math.floor(e / 3));
      const puerto = aGrilla(-34.6, -58.4);
      const px = this.offX + puerto.col * e, py = this.offY + puerto.fila * e;
      ctx.beginPath();
      for (let i = 0; i < PROVINCIAS.length; i++) {
        const meta = PROVINCIAS[i];
        if (estado.provincias[i].integracion < 0.25) continue;
        const g = aGrilla(meta.lat, meta.lon);
        const x = this.offX + g.col * e, y = this.offY + g.fila * e;
        if (centro > 0.5) {
          // Abanico: todo converge al puerto.
          ctx.moveTo(px, py); ctx.lineTo(x, y);
        } else {
          // Malla: cada provincia se une con su vecina más cercana.
          const vecina = PROVINCIAS
            .map((q, j) => ({ q, j, d: Math.hypot(q.lat - meta.lat, q.lon - meta.lon) }))
            .filter((v) => v.j !== i && v.d > 0)
            .sort((a, b) => a.d - b.d)[0];
          if (vecina) {
            const gv = aGrilla(vecina.q.lat, vecina.q.lon);
            ctx.moveTo(x, y);
            ctx.lineTo(this.offX + gv.col * e, this.offY + gv.fila * e);
          }
        }
      }
      ctx.stroke();
    }
  }

  /** Índice de provincia bajo un punto del canvas, o -1. */
  provinciaEn(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const col = Math.floor((clientX - r.left - this.offX) / this.esc);
    const fila = Math.floor((clientY - r.top - this.offY) / this.esc);
    const m = this.mapa;
    if (col < 0 || fila < 0 || col >= m.columnas || fila >= m.filas) return -1;
    return m.provincia[fila * m.columnas + col];
  }
}
