// Generador pseudoaleatorio determinista (mulberry32 + hash de semilla).
// Toda la aleatoriedad del juego pasa por acá: una misma semilla + una misma
// secuencia de decisiones reproduce exactamente la misma partida.

function hashCadena(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export class Rng {
  constructor(semilla = 'argentina') {
    this.semillaOriginal = String(semilla);
    this.s = hashCadena(this.semillaOriginal) || 1;
  }

  /** 0..1 */
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Real en [a, b). */
  rango(a, b) { return a + this.next() * (b - a); }

  /** Entero en [a, b] inclusive. */
  entero(a, b) { return Math.floor(this.rango(a, b + 1)); }

  /** true con probabilidad p. */
  chance(p) { return this.next() < p; }

  /** Ruido normal aproximado, media 0, desvío `sigma`. */
  normal(sigma = 1) {
    const u = Math.max(1e-9, this.next());
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma;
  }

  /** Elemento al azar de un array. */
  elegir(arr) { return arr[Math.floor(this.next() * arr.length)]; }

  /**
   * Elección ponderada. `items` es un array y `peso` una función item -> número.
   * Los pesos negativos se tratan como 0. Devuelve null si todo pesa 0.
   */
  ponderado(items, peso = (x) => x.peso ?? 1) {
    let total = 0;
    const pesos = items.map((it) => {
      const p = Math.max(0, Number(peso(it)) || 0);
      total += p;
      return p;
    });
    if (total <= 0) return null;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= pesos[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** Sub-generador derivado, para aislar flujos de azar sin desincronizar. */
  derivar(etiqueta) {
    return new Rng(`${this.semillaOriginal}::${etiqueta}::${this.s}`);
  }

  estado() { return this.s; }
  restaurar(s) { this.s = s >>> 0; }
}

/** Semilla legible al azar, tipo "PAMPA-4821". */
export function semillaAlAzar() {
  const palabras = ['PAMPA', 'ANDES', 'PARANA', 'CHACO', 'PATAGONIA', 'LITORAL',
    'PUNA', 'DELTA', 'CUYO', 'MESOPOTAMIA', 'SALADO', 'PILCOMAYO'];
  const p = palabras[Math.floor(Math.random() * palabras.length)];
  return `${p}-${Math.floor(1000 + Math.random() * 9000)}`;
}
