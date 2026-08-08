// Catálogo completo de eventos, unificado y validado.

import fundacion from './fundacion.js';
import agroexportador from './agroexportador.js';
import industrializacion from './industrializacion.js';
import democracia from './democracia.js';
import estructurales from './estructurales.js';

export const PAQUETES = {
  fundacion: { nombre: '1810-1880 · Fundación y organización', eventos: fundacion },
  agroexportador: { nombre: '1880-1943 · Modelo agroexportador', eventos: agroexportador },
  industrializacion: { nombre: '1943-1983 · Industrialización y rupturas', eventos: industrializacion },
  democracia: { nombre: '1983-2100 · Democracia y futuros', eventos: democracia },
  estructurales: { nombre: 'Estructurales (recurrentes)', eventos: estructurales },
};

export const EVENTOS = Object.values(PAQUETES).flatMap((p) => p.eventos);

/** Detecta ids repetidos entre paquetes. Lo usan las pruebas. */
export function idsDuplicados() {
  const vistos = new Set();
  const dup = [];
  for (const e of EVENTOS) {
    if (vistos.has(e.id)) dup.push(e.id);
    vistos.add(e.id);
  }
  return dup;
}

export default EVENTOS;
