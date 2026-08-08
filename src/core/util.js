// Utilidades numéricas compartidas por todos los sistemas de la simulación.
// Regla general del proyecto: casi todas las variables de estado viven en 0..1.
// Las excepciones (población en millones, PBI per cápita, deuda en miles de
// millones de USD) están documentadas en docs/CONTRATO.md.

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const clamp01 = (v) => clamp(v, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (v) => 1 - clamp01(v);

/** Mueve `actual` hacia `objetivo` una fracción `tasa` (inercia estructural). */
export const hacia = (actual, objetivo, tasa) => actual + (objetivo - actual) * clamp01(tasa);

/** Curva suave 0..1, útil para umbrales sin saltos bruscos. */
export function suave(v, a = 0, b = 1) {
  const t = clamp01((v - a) / (b - a || 1e-9));
  return t * t * (3 - 2 * t);
}

/** Logística centrada en `centro` con pendiente `k`. Devuelve 0..1. */
export const logistica = (v, centro = 0.5, k = 10) => 1 / (1 + Math.exp(-k * (v - centro)));

/** Media ponderada: promedio([[valor, peso], ...]). */
export function promedio(pares) {
  let s = 0, p = 0;
  for (const [v, w] of pares) { s += v * w; p += w; }
  return p === 0 ? 0 : s / p;
}

/** Redondeo a n decimales, para que el estado serializado no explote. */
export const red = (v, n = 4) => {
  const f = 10 ** n;
  return Math.round(v * f) / f;
};

/** Saneo defensivo: convierte NaN/Infinity en un valor de reserva. */
export const sano = (v, reserva = 0) => (Number.isFinite(v) ? v : reserva);

/** Formatea números grandes para la interfaz. */
export function fmt(v, dec = 1) {
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v / 1e12).toFixed(dec) + ' B';
  if (abs >= 1e9) return (v / 1e9).toFixed(dec) + ' MM';
  if (abs >= 1e6) return (v / 1e6).toFixed(dec) + ' M';
  if (abs >= 1e3) return (v / 1e3).toFixed(dec) + ' mil';
  return v.toFixed(dec);
}

export const pct = (v, dec = 0) => (clamp01(v) * 100).toFixed(dec) + '%';
