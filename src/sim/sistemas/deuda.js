// ============================================================================
// SISTEMA DE DEUDA EXTERNA  (orden 40, corre después de economía)
// ============================================================================
//
// La deuda externa no se explica por "un Estado que gasta de más". Se explica
// por la posición del país en el sistema financiero internacional. Este sistema
// modela cinco canales de endeudamiento que operan en simultáneo y que pueden
// dominar en distintos momentos:
//
//   1. RESTRICCIÓN EXTERNA. Faltan dólares para pagar importaciones, girar
//      utilidades y atender vencimientos. La brecha se cubre con deuda nueva.
//      (Es el canal dominante en casi toda la historia: el cuello de botella
//      recurrente no es fiscal, es de divisas.)
//   2. EMPUJE DE LA LIQUIDEZ INTERNACIONAL. Cuando el capital sobra en el
//      centro, la tasa baja y el crédito busca colocación en la periferia.
//      El país se endeuda porque le ofrecen, no porque le falte: 1824, 1880s,
//      1976-81, 1993-98, 2016-18.
//   3. FUGA DE CAPITALES. La deuda entra y sale por la ventanilla de al lado.
//      Queda el pasivo, no queda el activo. Ver `fugaCapitales`.
//   4. ESTATIZACIÓN DE DEUDA PRIVADA. Las empresas se endeudan afuera en la
//      euforia; cuando estalla la crisis el Estado se hace cargo (seguros de
//      cambio, avales, licuación). El pasivo cambia de dueño, no desaparece.
//   5. DÉFICIT FISCAL SIN FINANCIAMIENTO INTERNO. Sólo se convierte en deuda
//      externa cuando no hay mercado local que lo absorba y no se puede
//      monetizar (el caso puro: convertibilidad).
//
// Además:
//   - BOLA DE NIEVE: si la tasa real supera el crecimiento, el stock crece solo
//     aunque haya superávit primario. Acá no está escrito a mano: emerge de que
//     los intereses no pagados con recursos genuinos se capitalizan.
//   - CONDICIONALIDAD: la deuda se convierte en pérdida de soberanía. Ver §9.
//   - DESENDEUDAMIENTO: superávit comercial sostenido + deuda en moneda propia
//     + quita + crecimiento. Es alcanzable y no es gratis.
//
// UNIDADES
//   `deudaExterna` está en miles de millones de USD **corrientes**, mientras que
//   `economia.pbiPerCapita` está en dólares internacionales de 1990. Para
//   compararlos hay que convertir; eso lo hace `pbiEnDolares()` con tres
//   factores: nivel de precios mundial, brecha PPA/mercado y tipo de cambio
//   real. De ahí sale que una devaluación aumente `deudaPbi` sin que se haya
//   tomado un peso de deuda nueva — que es exactamente lo que pasa.
//
// PROPIEDAD DEL ESTADO (docs/CONTRATO.md §2)
//   Escribe: `nacion.deuda.*`, `presiones.deuda`, `presiones.externa` y empuja
//   muy lentamente a los actores de su órbita (organismosInternacionales,
//   capitalExtranjero).
//   NO escribe `economia.reservas` ni `economia.tipoCambioReal` (dueño:
//   economía). La fuga y la brecha se publican en `fugaCapitales`,
//   `presiones.externa` y `d.brechaDivisas` para que economía las consuma.
// ============================================================================

import { clamp, clamp01, hacia, suave, sano, red, lerp } from '../../core/util.js';

// ---------------------------------------------------------------------------
// Tablas exógenas del sistema-mundo. No son "años hardcodeados" de la historia
// argentina: son el contexto internacional (precios y frontera tecnológica)
// dentro del cual el país se endeuda. Se interpolan en logaritmo.
// ---------------------------------------------------------------------------

/** Nivel de precios internacional, base 1990 = 1. Convierte USD corrientes. */
const NIVEL_PRECIOS = [
  [1810, 0.115], [1830, 0.085], [1850, 0.072], [1870, 0.098], [1890, 0.068],
  [1900, 0.065], [1914, 0.077], [1920, 0.150], [1930, 0.128], [1940, 0.108],
  [1950, 0.185], [1960, 0.226], [1970, 0.296], [1980, 0.628], [1990, 1.000],
  [2000, 1.320], [2010, 1.670], [2022, 2.240], [2050, 3.600], [2100, 7.000],
];

/** PBI per cápita de la economía líder (1990 int$). Marca la brecha PPA. */
const FRONTERA = [
  [1810, 1250], [1850, 1800], [1870, 2445], [1900, 4091], [1913, 5301],
  [1930, 6213], [1950, 9561], [1973, 16689], [1990, 23201], [2000, 28467],
  [2010, 30500], [2022, 34000], [2050, 50000], [2100, 80000],
];

/** Parámetros del ciclo de liquidez internacional (ver §1). */
const CICLO = {
  periodo: 17.7, fase: 1817.5, amp: 0.30,   // onda principal ~18 años
  periodoLargo: 43.3, faseLargo: 1806, ampLargo: 0.13, // hegemonía / onda larga
  periodoCorto: 7.9, faseCorto: 1830, ampCorto: 0.06,  // coyuntura financiera
};

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

/** Interpolación logarítmica sobre una tabla [[x, y], ...] creciente en x. */
function interpolarLog(tabla, x) {
  if (!Number.isFinite(x)) return tabla[0][1];
  if (x <= tabla[0][0]) return tabla[0][1];
  const ult = tabla[tabla.length - 1];
  if (x >= ult[0]) return ult[1];
  for (let i = 1; i < tabla.length; i++) {
    const [x1, y1] = tabla[i];
    if (x <= x1) {
      const [x0, y0] = tabla[i - 1];
      const t = (x - x0) / (x1 - x0 || 1);
      return Math.exp(lerp(Math.log(y0), Math.log(y1), t));
    }
  }
  return ult[1];
}

/** División blindada: nunca devuelve NaN ni Infinity. */
const div = (a, b, reserva = 0) => sano(b > 1e-9 || b < -1e-9 ? a / b : reserva, reserva);

const bool = (v) => (v ? 1 : 0);

/** Nivel de precios internacional del año (1990 = 1). */
const precios = (año) => interpolarLog(NIVEL_PRECIOS, año);

/** Inflación internacional implícita: derivada del nivel de precios. */
function inflacionMundial(año) {
  const a = precios(año - 0.5);
  const b = precios(año + 0.5);
  return clamp(sano(b / a - 1, 0.02), -0.05, 0.20);
}

/**
 * §1. CICLO DE LIQUIDEZ INTERNACIONAL (exógeno).
 * 1 = lluvia de capitales barata; 0 = sequía y corte del financiamiento.
 * Es la suma de tres armónicas: la onda principal de ~18 años (que es la que
 * marca los grandes cortes: 1825, 1890, 1914, 1930, 1982, 2001, 2018), una
 * onda larga de hegemonía y una coyuntural. Se expone en
 * `nacion.deuda.cicloInternacional` para que economía y los eventos lo lean.
 */
function cicloBase(año) {
  const t = (x, p, f) => Math.cos((2 * Math.PI * (año - f)) / p);
  return clamp01(
    0.5
    + CICLO.amp * t(año, CICLO.periodo, CICLO.fase)
    + CICLO.ampLargo * t(año, CICLO.periodoLargo, CICLO.faseLargo)
    + CICLO.ampCorto * t(año, CICLO.periodoCorto, CICLO.faseCorto)
  );
}

/**
 * PBI anual medido en USD corrientes (miles de millones), que es la unidad en
 * que vive la deuda. Tres correcciones sobre el PBI en dólares de 1990:
 *   - nivel de precios internacional (inflación mundial acumulada),
 *   - brecha PPA/mercado: cuanto más atrás queda el país respecto de la
 *     frontera, más sobreestima el PBI en paridad al PBI en dólares de mercado,
 *   - tipo de cambio real: con la moneda apreciada el país "vale" más dólares
 *     y la deuda parece chica; al devaluar, el mismo stock salta como ratio.
 */
function pbiEnDolares(estado, año) {
  const eco = estado.nacion.economia;
  const pobl = Math.max(0.01, sano(estado.nacion.demografia.poblacion, 0.5));
  const pc = Math.max(100, sano(eco.pbiPerCapita, 1000));
  const brechaPpa = clamp(0.55 + 0.45 * clamp01(div(pc, interpolarLog(FRONTERA, año), 0.5)), 0.5, 1.0);
  const factorTc = clamp(1.28 - 0.56 * clamp01(sano(eco.tipoCambioReal, 0.5)), 0.70, 1.25);
  return Math.max(0.001, (pc * pobl * precios(año) * brechaPpa * factorTc) / 1000);
}

/**
 * Apertura financiera efectiva: la facilidad con que el capital entra y sale.
 * El control de cambios es, de lejos, el factor que más la reduce.
 */
function aperturaFinanciera(estado) {
  const f = estado.flags || {};
  let a = clamp01(sano(estado.config?.apertura, 0.5));
  if (f.privatizaciones) a += 0.15;
  if (f.convertibilidad) a += 0.12;
  if (f.librecambio) a += 0.10;
  if (f.proteccionismo) a -= 0.10;
  if (f.banco_central) a -= 0.05;
  if (f.bicameral_deuda) a -= 0.08;
  if (f.iapi) a -= 0.10;
  if (f.control_cambios) a -= 0.45;
  return clamp01(a);
}

/** Exportaciones del año en USD corrientes (miles de millones). */
function exportacionesUsd(estado, pbiUsd) {
  const eco = estado.nacion.economia;
  const f = estado.flags || {};
  let ap = clamp01(sano(estado.config?.apertura, 0.5));
  if (f.librecambio) ap += 0.15;
  if (f.proteccionismo) ap -= 0.15;
  if (f.mercosur) ap += 0.05;
  ap = clamp01(ap);
  const base = 0.045
    + 0.19 * ap
    + 0.05 * clamp01(sano(eco.diversificacion, 0.1))
    + 0.05 * clamp01(sano(eco.terminosIntercambio, 0.5))
    + 0.03 * clamp01(sano(estado.nacion.recursos?.rentaExtractiva, 0));
  // Con la moneda depreciada el PBI en dólares se achica: las exportaciones
  // pesan más sobre él aunque el volumen físico no cambie.
  const coef = clamp(base * (0.75 + 0.5 * clamp01(sano(eco.tipoCambioReal, 0.5))), 0.03, 0.45);
  return Math.max(0.0005, pbiUsd * coef);
}

/** Normaliza `defaults`: los eventos pueden haber empujado años sueltos. */
function normalizarDefaults(d) {
  if (!Array.isArray(d.defaults)) { d.defaults = []; return; }
  d.defaults = d.defaults
    .map((e) => {
      if (typeof e === 'number') return { desde: e, hasta: e + 3, monto: 0, quita: 0 };
      if (e && typeof e === 'object') return e;
      return null;
    })
    .filter(Boolean)
    .slice(-12);
}

/** Años transcurridos desde que se cerró el último default (0 si sigue abierto). */
function añosDesdeDefault(d, año) {
  if (!d.defaults.length) return 999;
  const ult = d.defaults[d.defaults.length - 1];
  if (ult.hasta == null) return 0;
  return Math.max(0, año - ult.hasta);
}

// ---------------------------------------------------------------------------
// Sistema
// ---------------------------------------------------------------------------

export default {
  meta: {
    id: 'deuda',
    nombre: 'Deuda externa',
    orden: 40,
    descripcion: 'Endeudamiento, fuga de capitales, default y condicionalidad externa.',
  },

  init(estado) {
    const d = estado.nacion.deuda;
    const año = estado.año;
    d.cicloInternacional = cicloBase(año);
    d.accesoCredito = 0.15;      // en 1810 no hay mercado: nadie le presta a la revolución
    d.capacidadPago = 0.5;
    d.bolaNieve = 0.5;           // 0.5 = tasa real igual al crecimiento
    d.deudaPrivada = 0;          // deuda externa privada, fracción del PBI
    d.brechaDivisas = 0;         // brecha externa no cubierta, fracción del PBI
    d.quitaAcumulada = 0;
    d.entradaBruta = 0;          // deuda nueva del año, fracción del PBI
    d.fugaFinanciada = 0;        // parte de la fuga pagada con deuda nueva
    d.fase = 'sin_deuda';
    d.historial = [];
    normalizarDefaults(d);
  },

  paso(estado, rng, ctx) {
    const n = estado.nacion;
    const d = n.deuda;
    const eco = n.economia;
    const ext = n.exterior;
    const flags = estado.flags || {};
    const cfg = ctx?.config || estado.config || {};
    const año = ctx?.año ?? estado.año;
    const vol = clamp(sano(cfg.volatilidad, 1), 0, 3);

    if (!Array.isArray(d.historial)) d.historial = [];
    normalizarDefaults(d);
    const previo = d.historial[d.historial.length - 1] || null;

    // =====================================================================
    // 1. CICLO INTERNACIONAL DE LIQUIDEZ  (exógeno, período ~18 años)
    // =====================================================================
    const objCiclo = clamp01(cicloBase(año) + rng.normal(0.055) * vol);
    d.cicloInternacional = clamp01(hacia(sano(d.cicloInternacional, 0.5), objCiclo, 0.5));
    const ciclo = d.cicloInternacional;
    const piMundial = inflacionMundial(año);

    // =====================================================================
    // 2. MAGNITUDES EN DÓLARES
    // =====================================================================
    const pbiUsd = pbiEnDolares(estado, año);
    const exportUsd = exportacionesUsd(estado, pbiUsd);
    const apFin = aperturaFinanciera(estado);
    const deuda0 = Math.max(0, sano(d.deudaExterna, 0));
    const reservas = clamp01(sano(eco.reservas, 0.15));
    const balanza = clamp(sano(eco.balanzaComercial, 0), -1, 1);
    const inflacion = clamp(sano(eco.inflacion, 0.02), -0.4, 60);
    const tcr = clamp01(sano(eco.tipoCambioReal, 0.5));

    const defaultActivo = !!flags.default_deuda;
    const desdeDefault = añosDesdeDefault(d, año);
    const memoriaDefault = clamp01(1 - desdeDefault / 25);  // el mercado no perdona rápido

    // El mercado internacional de crédito no está siempre abierto: hace falta
    // un Estado reconocido que pueda firmar (o haber firmado ya alguna vez).
    const mercadoAbierto = !!flags.emprestito_baring
      || deuda0 > 0.002
      || (sano(estado.regimen.capacidadEstatal, 0.15) > 0.3 && !!flags.constitucion_sancionada);

    // =====================================================================
    // 3. ACCESO AL CRÉDITO
    //    El default de ayer y la sequía internacional de hoy cierran la puerta;
    //    el acuerdo con el FMI la abre a cambio de condicionalidad (§9).
    // =====================================================================
    const objAcceso = clamp01(bool(mercadoAbierto) * (
      0.10
      + 0.42 * ciclo
      + 0.26 * (1 - clamp01(sano(d.riesgoPais, 0.4)))
      + 0.12 * bool(d.acuerdoFMI)
      + 0.10 * clamp01(sano(estado.regimen.capacidadEstatal, 0.15))
      + 0.06 * clamp01(sano(ext.prestigio, 0.2))
      - 0.55 * memoriaDefault
      - 0.35 * bool(defaultActivo)
    ));
    d.accesoCredito = clamp01(hacia(sano(d.accesoCredito, 0.2), objAcceso, defaultActivo ? 0.6 : 0.30));

    // =====================================================================
    // 4. FUGA DE CAPITALES
    //    Crece con la expectativa de devaluación, la apertura financiera, la
    //    tasa local negativa y la desconfianza. El control de cambios la corta.
    //    Es el canal por el que la deuda entra y se va: queda el pasivo.
    // =====================================================================
    const atrasoCambiario = clamp01((0.55 - tcr) * 2);
    const inflacionRel = clamp01(div(inflacion, 0.5, 0));
    const desconfianza = clamp01(
      0.35 * (1 - clamp01(sano(estado.regimen.estabilidad, 0.4)))
      + 0.25 * (1 - clamp01(sano(estado.regimen.legitimidad, 0.5)))
      + 0.20 * clamp01(sano(estado.regimen.corrupcion, 0.3))
      + 0.20 * clamp01(sano(estado.presiones.social, 0))
    );
    const expectativaDeval = clamp01(
      0.40 * atrasoCambiario
      + 0.22 * inflacionRel
      + 0.20 * (1 - reservas)
      + 0.24 * clamp01(sano(d.riesgoPais, 0.4))
      + 0.16 * clamp01(-balanza * 2)
      + 0.14 * desconfianza
      - 0.10 * bool(flags.convertibilidad)   // el ancla calma… mientras aguanta
    );
    // Tasa local real negativa: con inflación alta y sin instrumentos, el ahorro
    // se va al dólar aunque no se espere una devaluación inminente.
    const tasaLocalNegativa = clamp01(inflacionRel * 0.9 - 0.35 * bool(flags.banco_central));
    const entradaPrevia = clamp01(sano(previo?.entrada, 0) * 12); // deuda que entró el año pasado

    const objFuga = clamp01(
      0.42 * expectativaDeval * (0.35 + 0.65 * apFin)
      + 0.20 * apFin * (0.4 + 0.6 * ciclo)
      + 0.16 * tasaLocalNegativa
      + 0.14 * desconfianza
      + 0.14 * entradaPrevia * apFin          // entra deuda → se fuga
      + 0.06 * clamp01(sano(estado.actores.oligarquia, 0.5)) * apFin
      - 0.30 * bool(flags.control_cambios)
      - 0.08 * bool(flags.desendeudamiento)
    );
    d.fugaCapitales = clamp01(hacia(
      sano(d.fugaCapitales, 0), objFuga,
      flags.control_cambios ? 0.35 : 0.24
    ));

    // =====================================================================
    // 5. BALANCE DE PAGOS: DE DÓNDE SALE LA NECESIDAD DE DEUDA
    // =====================================================================
    const saldoComercial = balanza * exportUsd * 0.5;
    const ied = clamp01(sano(ext.ied, 0.05));
    const rentaGirada = ied * pbiUsd * 0.035;                       // utilidades remitidas
    const iedEntrada = ied * pbiUsd * 0.020 * (0.35 + 0.65 * ciclo);
    const fugaUsd = d.fugaCapitales * pbiUsd * 0.07;
    const intereses = deuda0 * clamp(sano(d.tasaInteres, 0.06), 0, 0.9);

    // Recursos genuinos: lo que queda del comercio y la IED después de la renta
    // girada y de la fuga. Si es negativo, hay brecha de divisas.
    const recursosGenuinos = Math.max(0, saldoComercial + iedEntrada - rentaGirada - fugaUsd);
    const brechaDivisas = Math.max(0, rentaGirada + fugaUsd - saldoComercial - iedEntrada);

    // (b) DÉFICIT FISCAL. Sólo se vuelve deuda externa si no se puede monetizar
    //     ni colocar adentro. Con convertibilidad no hay emisión posible: todo
    //     déficit va al mercado externo.
    const monetizacion = clamp01(
      0.30 + 0.50 * inflacionRel + 0.15 * bool(flags.control_cambios)
      - 0.45 * bool(flags.convertibilidad)
      - 0.15 * bool(flags.banco_central) * (1 - inflacionRel)
    );
    const mercadoInterno = clamp01(
      0.08 + 0.45 * clamp01(sano(eco.capacidadFiscal, 0.15))
      + 0.22 * (1 - clamp01(sano(eco.informalidad, 0.6)))
      + 0.20 * clamp01(sano(d.acreedores?.local, 0))
    );
    const fraccionExterna = clamp01(1 - monetizacion - 0.7 * mercadoInterno) * (0.35 + 0.65 * apFin);
    const deficitExterno = Math.max(0, clamp(sano(eco.deficitFiscal, 0), -0.15, 0.35)) * pbiUsd * fraccionExterna;

    // (c) EMPUJE DE LA OFERTA. En la abundancia la deuda se ofrece, no se pide.
    const apetito = clamp01(
      0.22
      + 0.42 * apFin
      + 0.18 * bool(flags.privatizaciones)
      + 0.18 * (1 - clamp01(sano(eco.capacidadFiscal, 0.15)))
      + 0.10 * clamp01(sano(estado.actores.capitalExtranjero, 0.3))
      - 0.30 * bool(flags.desendeudamiento)
      - 0.15 * bool(flags.bicameral_deuda)
      - 0.10 * clamp01(sano(ext.autonomia, 0.4))
    );
    const empuje = pbiUsd * 0.065 * Math.pow(ciclo, 1.8) * apetito
      * (1 - clamp01(sano(d.riesgoPais, 0.4))) * d.accesoCredito;

    // (d) ESTATIZACIÓN DE DEUDA PRIVADA.
    const objPrivada = clamp01(0.55 * apFin * ciclo * (1 - clamp01(sano(d.riesgoPais, 0.4))));
    d.deudaPrivada = clamp01(hacia(sano(d.deudaPrivada, 0), objPrivada, 0.12));
    const crisisCambiaria = clamp01(
      0.45 * expectativaDeval + 0.35 * d.fugaCapitales
      + 0.35 * (1 - ciclo) * clamp01(sano(d.riesgoPais, 0.4))
      + 0.25 * clamp01(-balanza * 2)
    );
    let estatizacion = 0;
    if (crisisCambiaria > 0.55 && d.deudaPrivada > 0.04) {
      // Cuánto se estatiza depende de quién manda: con el capital concentrado
      // fuerte y poca soberanía, el pasivo privado pasa a ser público.
      const captura = clamp01(
        0.20 + 0.45 * clamp01(sano(estado.actores.capitalExtranjero, 0.3))
        + 0.30 * clamp01(sano(estado.actores.oligarquia, 0.5))
        - 0.45 * clamp01(sano(ext.soberania, 0.5))
        - 0.25 * clamp01(sano(estado.regimen.democracia, 0.2))
      );
      const traspaso = d.deudaPrivada * 0.35 * captura;
      estatizacion = traspaso * pbiUsd;
      d.deudaPrivada = clamp01(d.deudaPrivada - traspaso);
    }

    // =====================================================================
    // 6. OFERTA DE FINANCIAMIENTO Y RACIONAMIENTO
    // =====================================================================
    const ofertaMax = pbiUsd * (0.02 + 0.17 * d.accesoCredito * (0.35 + 0.65 * ciclo));
    const demandaIntereses = Math.max(0, intereses - recursosGenuinos);
    const demandaTotal = demandaIntereses + brechaDivisas + deficitExterno + empuje + estatizacion;
    const financiado = Math.min(demandaTotal, Math.max(0, ofertaMax));
    // Lo que no se consigue se paga con reservas o con ajuste recesivo: es la
    // señal de crisis que leen los eventos.
    const faltanteBruto = Math.max(0, demandaTotal - financiado);
    const faltante = Math.max(0, faltanteBruto - reservas * pbiUsd * 0.03);

    // Reparto del financiamiento por prioridad: primero los acreedores.
    let disp = financiado;
    const aIntereses = Math.min(disp, demandaIntereses); disp -= aIntereses;
    const aBrecha = Math.min(disp, brechaDivisas); disp -= aBrecha;
    const aFiscal = Math.min(disp, deficitExterno); disp -= aFiscal;
    const aColocaciones = Math.min(disp, empuje); disp -= aColocaciones;
    const aEstatizacion = Math.min(disp, estatizacion);

    // Los intereses que no se pagan con recursos genuinos aumentan el stock,
    // se hayan refinanciado (deuda nueva) o no (mora). Ese es el mecanismo de
    // la BOLA DE NIEVE: no está escrito a mano, sale de la contabilidad.
    const interesesCapitalizados = demandaIntereses * (defaultActivo ? 0.75 : 1);

    // Cancelación genuina: sólo si sobra después de pagar intereses y hay
    // voluntad política de usar el superávit para desendeudarse.
    const sobrante = Math.max(0, recursosGenuinos - intereses);
    const voluntadCancelar = clamp01(
      0.20 + 0.35 * bool(flags.desendeudamiento) + 0.20 * clamp01(sano(ext.soberania, 0.5))
      + 0.20 * bool(flags.control_cambios) + 0.15 * bool(flags.iapi)
      - 0.30 * apetito
    );
    const cancelacion = sobrante * voluntadCancelar;

    // Licuación de la parte emitida en moneda propia: se erosiona con inflación.
    // Es la contracara del riesgo de la deuda en moneda dura.
    const monLocal = 1 - clamp01(sano(d.monedaExtranjera, 0.9));
    const licuacion = deuda0 * monLocal * clamp(inflacion * 0.35, 0, 0.30) * 0.6;

    // =====================================================================
    // 7. DEFAULT, MORA Y REESTRUCTURACIÓN
    // =====================================================================
    let quita = 0;
    const ultimoDefault = d.defaults[d.defaults.length - 1] || null;
    if (defaultActivo && (!ultimoDefault || ultimoDefault.hasta != null)) {
      d.defaults.push({ desde: año, hasta: null, monto: red(deuda0, 3), quita: 0 });
      ctx?.log?.(`Cesación de pagos: la deuda externa entra en default con ${red(deuda0, 1)} mil MM de dólares.`, ['deuda', 'default']);
    }
    if (!defaultActivo && ultimoDefault && ultimoDefault.hasta == null) {
      ultimoDefault.hasta = año;
    }
    const abierto = d.defaults[d.defaults.length - 1] || null;
    if (flags.deuda_reestructurada && abierto && !abierto.quitaAplicada) {
      // La quita depende del tiempo en default (desgasta al acreedor), de la
      // capacidad de negociación y, en contra, de la condicionalidad ya aceptada.
      const duracion = clamp01((año - (abierto.desde ?? año)) / 6);
      const q = clamp(
        0.12 + 0.32 * duracion
        + 0.22 * clamp01(sano(ext.soberania, 0.5))
        + 0.12 * clamp01(sano(estado.regimen.capacidadEstatal, 0.2))
        - 0.25 * clamp01(sano(d.condicionalidad, 0)),
        0.05, 0.60
      );
      // La quita alcanza a la deuda con privados, no a la de organismos.
      const alcance = clamp01(1 - 0.85 * clamp01(sano(d.acreedores?.organismos, 0)));
      quita = deuda0 * q * alcance;
      abierto.quita = red(q, 3);
      abierto.quitaAplicada = true;
      d.quitaAcumulada = clamp01(sano(d.quitaAcumulada, 0) + q * 0.5);
      ctx?.log?.(`Reestructuración con quita del ${Math.round(q * 100)}% sobre la deuda con acreedores privados.`, ['deuda', 'reestructuracion']);
    }

    // =====================================================================
    // 8. ACTUALIZACIÓN DEL STOCK
    // =====================================================================
    const entradaBruta = aIntereses + aBrecha + aFiscal + aColocaciones + aEstatizacion;
    const aumento = interesesCapitalizados + aBrecha + aFiscal + aColocaciones + aEstatizacion;
    let deuda1 = deuda0 + aumento - cancelacion - quita - licuacion;
    deuda1 = clamp(sano(deuda1, deuda0), 0, 5000);
    d.deudaExterna = deuda1;
    d.deudaPbi = clamp(div(deuda1, pbiUsd, 0), 0, 6);
    d.entradaBruta = clamp01(div(entradaBruta, pbiUsd, 0));
    d.brechaDivisas = clamp01(div(faltante, pbiUsd, 0) * 8);

    // La secuencia "entra deuda → se fuga → queda el pasivo", explícita.
    d.fugaFinanciada = clamp01(div(Math.min(entradaBruta, fugaUsd), Math.max(entradaBruta, 1e-9), 0));

    // =====================================================================
    // 9. PRECIO DEL CRÉDITO: TASA Y RIESGO PAÍS
    // =====================================================================
    const objRiesgo = clamp01(
      0.08
      + 0.26 * suave(d.deudaPbi, 0.15, 0.95)
      + 0.20 * suave(clamp(sano(d.servicioDeuda, 0), 0, 5), 0.15, 0.85)
      + 0.12 * clamp01(sano(d.monedaExtranjera, 0.9)) * suave(d.deudaPbi, 0.20, 0.80)
      + 0.18 * (1 - ciclo)
      + 0.28 * bool(defaultActivo)
      + 0.20 * memoriaDefault
      + 0.10 * (1 - reservas)
      + 0.10 * (1 - clamp01(sano(estado.regimen.estabilidad, 0.4)))
      + 0.10 * d.fugaCapitales
      - 0.10 * bool(d.acuerdoFMI)
      - 0.12 * clamp01(balanza)
    );
    const shock = crisisCambiaria > 0.6 || defaultActivo;
    d.riesgoPais = clamp01(hacia(sano(d.riesgoPais, 0.4), objRiesgo, shock ? 0.45 : 0.20));

    const tasaBase = clamp(0.020 + 0.035 * (1 - ciclo) + piMundial, 0.008, 0.25);
    const tasaMarginal = clamp(tasaBase + 0.30 * Math.pow(d.riesgoPais, 2.2) + (defaultActivo ? 0.06 : 0), 0.008, 0.60);
    // La tasa que importa es la promedio del stock: se mueve despacio porque
    // el stock se renueva de a pedazos.
    d.tasaInteres = clamp(hacia(sano(d.tasaInteres, 0.06), tasaMarginal, 0.25), 0.005, 0.9);

    // Perfil de vencimientos: cuanto peor el crédito, más corto el plazo.
    const perfil = clamp(0.05 + 0.10 * d.riesgoPais + 0.04 * (1 - ciclo), 0.04, 0.22);
    const servicioExigible = div(d.deudaExterna * (d.tasaInteres + perfil), exportUsd, 0);
    // El default alivia el servicio efectivo: es exactamente por eso que existe.
    const servicioEfectivo = servicioExigible * (defaultActivo ? 0.15 : 1);
    d.servicioDeuda = clamp(hacia(sano(d.servicioDeuda, 0), sano(servicioEfectivo, 0), 0.40), 0, 5);

    d.capacidadPago = clamp01(
      0.85
      - 0.55 * suave(d.servicioDeuda, 0.15, 0.95)
      - 0.20 * (1 - reservas)
      - 0.15 * d.fugaCapitales
      + 0.20 * clamp01(balanza)
      + 0.10 * (1 - clamp01(sano(d.monedaExtranjera, 0.9)))
    );

    // BOLA DE NIEVE, visible: tasa real en dólares menos crecimiento. 0.5 es el
    // punto de equilibrio; por encima, el stock crece solo aunque haya superávit.
    const tasaReal = d.tasaInteres - piMundial;
    const difBola = tasaReal - clamp(sano(eco.crecimiento, 0.01), -0.35, 0.25);
    d.bolaNieve = clamp01(0.5 + difBola * 4);

    // =====================================================================
    // 10. CONDICIONALIDAD  —  la deuda convertida en pérdida de soberanía
    //
    // `condicionalidad` mide qué parte de la política económica la decide un
    // acreedor externo y no el país. Sube con el acuerdo con el FMI (metas
    // fiscales, monetarias y de reservas auditadas trimestralmente), con la
    // deuda alta emitida en moneda que el país no emite (no se puede licuar:
    // hay que conseguir los dólares o pedir permiso) y con el riesgo país alto
    // (sin acceso al mercado, el único prestamista pone condiciones).
    //
    // Los eventos la leen para BLOQUEAR opciones de política: con
    // condicionalidad alta no se puede subir el gasto, ni poner retenciones,
    // ni nacionalizar, ni sostener un tipo de cambio administrado, porque la
    // firma del programa lo prohíbe. `indices()` en core/estado.js ya la
    // descuenta del índice de soberanía.
    //
    // Baja cuando el país deja de necesitar al acreedor: default aislado (no
    // hay a quién obedecer), desendeudamiento, deuda en moneda propia,
    // control de cambios, superávit externo.
    // =====================================================================
    const objCondicionalidad = clamp01(
      0.40 * bool(d.acuerdoFMI)
      + 0.20 * clamp01(sano(d.acreedores?.organismos, 0))
      + 0.20 * suave(d.deudaPbi, 0.25, 1.0) * clamp01(sano(d.monedaExtranjera, 0.9))
      + 0.15 * suave(d.riesgoPais, 0.45, 0.92)
      + 0.10 * suave(clamp(sano(d.servicioDeuda, 0), 0, 5), 0.30, 1.0)
      + 0.08 * (1 - clamp01(sano(ext.soberania, 0.5)))
      + 0.06 * bool(flags.convertibilidad)
      + 0.05 * clamp01(sano(estado.actores.organismosInternacionales, 0))
      - 0.22 * bool(defaultActivo && !d.acuerdoFMI)
      - 0.15 * bool(flags.desendeudamiento)
      - 0.10 * bool(flags.control_cambios)
      - 0.08 * bool(flags.bicameral_deuda)
      - 0.10 * clamp01(sano(ext.autonomia, 0.4))
    );
    d.condicionalidad = clamp01(hacia(sano(d.condicionalidad, 0), objCondicionalidad, 0.18));

    // El acuerdo con el FMI lo firman los eventos; el sistema lo respeta y sólo
    // lo da de baja cuando el programa se cae.
    if (flags.acuerdo_fmi) d.acuerdoFMI = true;
    else if (d.acuerdoFMI && (flags.desendeudamiento || defaultActivo)) d.acuerdoFMI = false;

    // =====================================================================
    // 11. MONEDA DE EMISIÓN Y COMPOSICIÓN DE ACREEDORES
    // =====================================================================
    const objMoneda = clamp(
      0.93
      - 0.18 * bool(flags.banco_central) * (1 - inflacionRel)
      - 0.14 * bool(flags.control_cambios)
      - 0.12 * bool(flags.desendeudamiento)
      - 0.20 * clamp01(sano(eco.capacidadFiscal, 0.15))
      - 0.08 * (1 - apFin)
      + 0.07 * bool(flags.convertibilidad)
      + 0.06 * d.riesgoPais,
      0.40, 0.98
    );
    d.monedaExtranjera = clamp(hacia(sano(d.monedaExtranjera, 0.9), objMoneda, 0.08), 0.40, 0.98);

    if (d.deudaExterna > 0.002) {
      // El acreedor cambia con la hegemonía del sistema-mundo, no con la
      // política argentina: Londres hasta la Primera Guerra, Nueva York
      // después, los organismos multilaterales desde mediados de siglo.
      const eraBrit = 1 - suave(año, 1914, 1955);
      const eraEeuu = suave(año, 1918, 1955) * (1 - 0.30 * suave(año, 1995, 2020));
      const eraOrg = suave(año, 1950, 1975);
      const eraChina = suave(año, 2005, 2028);
      const alineado = bool((ext.alineamiento || cfg.alineamiento) === 'britanico');
      const objAcre = {
        britanico: eraBrit * (0.55 + 0.55 * alineado),
        eeuu: eraEeuu * (0.50 + 0.60 * alineado),
        organismos: eraOrg * (0.15 + 0.85 * bool(d.acuerdoFMI) + 0.35 * bool(flags.fmi_miembro) + 0.55 * d.condicionalidad),
        local: 0.12 + 0.95 * (1 - clamp01(sano(d.monedaExtranjera, 0.9))) + 0.25 * bool(flags.control_cambios) + 0.20 * bool(flags.desendeudamiento),
        china: eraChina * (0.12 + 0.55 * (1 - alineado) + 0.45 * (1 - d.accesoCredito)),
      };
      let tot = 0;
      for (const k of Object.keys(objAcre)) { objAcre[k] = Math.max(0, sano(objAcre[k], 0)); tot += objAcre[k]; }
      if (tot > 1e-6) {
        for (const k of Object.keys(objAcre)) {
          d.acreedores[k] = clamp01(hacia(sano(d.acreedores[k], 0), objAcre[k] / tot, 0.10));
        }
      }
    }

    // =====================================================================
    // 12. PRESIONES  (las suman los sistemas, las decae `regimen`)
    // =====================================================================
    const faltanteRel = clamp01(div(faltante, pbiUsd, 0) / 0.045);
    const intensidadBola = clamp01((d.bolaNieve - 0.5) * 4);

    const aporteDeuda = clamp01(
      0.075 * suave(d.servicioDeuda, 0.25, 0.80)
      + 0.065 * suave(d.deudaPbi, 0.35, 1.00)
      + 0.060 * faltanteRel
      + 0.040 * suave(d.riesgoPais, 0.55, 0.95)
      + 0.035 * intensidadBola * suave(d.deudaPbi, 0.20, 0.65)
      + 0.030 * bool(defaultActivo && !flags.deuda_reestructurada)
      + 0.025 * suave(d.condicionalidad, 0.45, 0.90)
    );
    estado.presiones.deuda = clamp01(sano(estado.presiones.deuda, 0) + aporteDeuda);

    const aporteExterna = clamp01(
      0.070 * faltanteRel
      + 0.055 * d.fugaCapitales
      + 0.050 * suave(d.servicioDeuda, 0.30, 0.95)
      + 0.040 * clamp01(-balanza * 2)
      + 0.030 * (1 - reservas) * apFin
      + 0.025 * (1 - ciclo) * suave(d.deudaPbi, 0.25, 0.80)
    );
    estado.presiones.externa = clamp01(sano(estado.presiones.externa, 0) + aporteExterna);

    // =====================================================================
    // 13. ACTORES DE LA ÓRBITA (≤0.02/año, según el contrato)
    // =====================================================================
    const mover = (id, objetivo, paso = 0.02) => {
      const a = clamp01(sano(estado.actores[id], 0));
      estado.actores[id] = clamp01(a + clamp(clamp01(objetivo) - a, -paso, paso));
    };
    mover('organismosInternacionales', 0.10 + 0.55 * d.condicionalidad + 0.30 * bool(d.acuerdoFMI) + 0.20 * clamp01(sano(d.acreedores?.organismos, 0)));
    mover('capitalExtranjero', 0.15 + 0.40 * apFin * ciclo + 0.25 * d.accesoCredito + 0.20 * clamp01(sano(ext.ied, 0.05)) - 0.30 * bool(defaultActivo), 0.015);

    // =====================================================================
    // 14. FASE Y RELATO
    // =====================================================================
    const faseAnterior = d.fase;
    d.fase = defaultActivo ? 'default'
      : d.deudaExterna < 0.001 ? 'sin_deuda'
        : faltanteRel > 0.55 || crisisCambiaria > 0.72 ? 'crisis'
          : d.entradaBruta > 0.030 && ciclo > 0.6 ? 'lluvia'
            : (cancelacion > 0 && d.deudaPbi < (previo?.deudaPbi ?? 9) - 0.004) ? 'desendeudamiento'
              : ciclo < 0.30 ? 'sequia' : 'normal';

    if (d.fase !== faseAnterior && d.deudaExterna > 0.002) {
      const textos = {
        lluvia: 'Sobran dólares en el mundo: los bancos hacen cola para colocar crédito en el país.',
        sequia: 'Se corta el crédito internacional: renovar los vencimientos se vuelve caro y difícil.',
        crisis: 'No alcanzan las divisas para cubrir los compromisos externos.',
        desendeudamiento: 'El superávit externo se usa para bajar el stock de deuda.',
        default: 'La deuda deja de pagarse.',
        normal: 'El frente financiero externo se estabiliza.',
      };
      if (textos[d.fase]) ctx?.log?.(textos[d.fase], ['deuda', d.fase]);
    }
    if (intensidadBola > 0.45 && d.deudaPbi > 0.35 && rng.chance(0.22)) {
      ctx?.log?.(
        `La tasa real (${Math.round(tasaReal * 1000) / 10}%) supera al crecimiento: la deuda crece sola.`,
        ['deuda', 'bola_nieve']
      );
    }
    if (d.fugaFinanciada > 0.6 && d.entradaBruta > 0.02 && rng.chance(0.25)) {
      ctx?.log?.('La deuda que entra se va casi entera al dólar: queda el pasivo, no el activo.', ['deuda', 'fuga']);
    }

    // =====================================================================
    // 15. HISTORIAL (para tendencias de la interfaz)
    // =====================================================================
    d.historial.push({
      año,
      deuda: red(d.deudaExterna, 3),
      deudaPbi: red(d.deudaPbi, 3),
      pbiUsd: red(pbiUsd, 3),
      exportUsd: red(exportUsd, 3),
      entrada: red(div(entradaBruta, pbiUsd, 0), 4),
      fuga: red(div(fugaUsd, pbiUsd, 0), 4),
      servicio: red(d.servicioDeuda, 3),
      riesgo: red(d.riesgoPais, 3),
      ciclo: red(ciclo, 3),
      condicionalidad: red(d.condicionalidad, 3),
    });
    if (d.historial.length > 24) d.historial.splice(0, d.historial.length - 24);
  },

  indicadores(estado) {
    return indicadores(estado);
  },
};

// ---------------------------------------------------------------------------
// Indicadores legibles para los paneles
// ---------------------------------------------------------------------------

/** Tendencia relativa de una clave del historial en los últimos `n` años. */
function tendencia(d, clave, n = 5) {
  const h = Array.isArray(d.historial) ? d.historial : [];
  if (h.length < 2) return 0;
  const fin = h[h.length - 1];
  const ini = h[Math.max(0, h.length - 1 - n)];
  const a = sano(ini?.[clave], 0);
  const b = sano(fin?.[clave], 0);
  if (Math.abs(a) < 1e-6) return clamp(b > 0 ? 1 : 0, -1, 1);
  return clamp(sano((b - a) / Math.abs(a), 0), -1, 1);
}

/** Frase que traduce la condicionalidad a lenguaje corriente. */
function fraseCondicionalidad(d) {
  const c = clamp01(sano(d.condicionalidad, 0));
  if (c < 0.12) return 'La política económica se decide adentro';
  if (c < 0.30) return 'Los acreedores opinan, el país decide';
  if (c < 0.50) return 'Hay compromisos externos que limitan el presupuesto';
  if (c < 0.70) return d.acuerdoFMI
    ? 'Programa con el FMI: metas fiscales y monetarias auditadas'
    : 'Los acreedores fijan el rumbo fiscal y cambiario';
  if (c < 0.85) return 'El acreedor externo veta las decisiones de política económica';
  return 'La política económica se escribe afuera';
}

function fraseCiclo(d) {
  const c = clamp01(sano(d.cicloInternacional, 0.5));
  if (c > 0.78) return 'Lluvia de capitales: el crédito sobra y es barato';
  if (c > 0.58) return 'Financiamiento internacional accesible';
  if (c > 0.40) return 'Mercados internacionales neutrales';
  if (c > 0.22) return 'El crédito se encarece y se acorta';
  return 'Sequía de capitales: el financiamiento se corta';
}

export function indicadores(estado) {
  const d = estado.nacion.deuda;
  const h = Array.isArray(d.historial) ? d.historial : [];
  const ult = h[h.length - 1] || {};
  const bola = clamp01(sano(d.bolaNieve, 0.5));
  const enDefault = !!estado.flags?.default_deuda;

  return [
    {
      clave: 'deudaExterna',
      etiqueta: 'Deuda externa',
      valor: red(sano(d.deudaExterna, 0), 2),
      formato: 'numero',
      tendencia: tendencia(d, 'deuda'),
      ayuda: 'Miles de millones de dólares corrientes. Pasivo externo bajo responsabilidad del Estado.',
    },
    {
      clave: 'deudaPbi',
      etiqueta: 'Deuda sobre PBI',
      valor: red(sano(d.deudaPbi, 0), 3),
      formato: 'porcentaje',
      tendencia: tendencia(d, 'deudaPbi'),
      ayuda: 'Una devaluación sube este número sin que se haya tomado un peso de deuda nueva.',
    },
    {
      clave: 'servicioDeuda',
      etiqueta: 'Servicio sobre exportaciones',
      valor: red(sano(d.servicioDeuda, 0), 3),
      formato: 'porcentaje',
      tendencia: tendencia(d, 'servicio'),
      ayuda: 'Intereses y amortizaciones del año medidos contra los dólares que entran por exportar. Arriba del 40% el país vive al borde de la cesación de pagos.',
    },
    {
      clave: 'riesgoPais',
      etiqueta: 'Riesgo país',
      valor: red(sano(d.riesgoPais, 0.4), 3),
      formato: 'indice',
      tendencia: tendencia(d, 'riesgo'),
      ayuda: `Sobretasa que exige el mercado. Tasa promedio del stock: ${Math.round(sano(d.tasaInteres, 0) * 1000) / 10}%.`,
    },
    {
      clave: 'condicionalidad',
      etiqueta: '¿Quién decide la política económica?',
      valor: fraseCondicionalidad(d),
      formato: 'texto',
      tendencia: tendencia(d, 'condicionalidad'),
      ayuda: 'Grado en que un acreedor externo decide el presupuesto, la política monetaria y la cambiaria. Bloquea opciones de política cuando es alto.',
    },
    {
      clave: 'fugaCapitales',
      etiqueta: 'Fuga de capitales',
      valor: red(sano(d.fugaCapitales, 0), 3),
      formato: 'indice',
      tendencia: tendencia(d, 'fuga'),
      ayuda: sano(d.fugaFinanciada, 0) > 0.5
        ? 'Buena parte de la deuda que entra se va al dólar en el mismo año.'
        : 'Salida de divisas al exterior por atesoramiento y remisión de activos.',
    },
    {
      clave: 'cicloInternacional',
      etiqueta: 'Crédito internacional',
      valor: fraseCiclo(d),
      formato: 'texto',
      tendencia: tendencia(d, 'ciclo'),
      ayuda: 'Ciclo mundial de abundancia y escasez de capitales, de unos 18 años. No depende de lo que haga el país.',
    },
    {
      clave: 'bolaNieve',
      etiqueta: 'Dinámica del stock',
      valor: enDefault ? 'En default: el stock acumula intereses impagos'
        : bola > 0.62 ? 'Bola de nieve: la deuda crece sola'
          : bola > 0.53 ? 'La deuda crece un poco más rápido que la economía'
            : bola < 0.42 ? 'La economía crece más rápido que la deuda: el peso baja solo'
              : 'Tasa y crecimiento en equilibrio',
      formato: 'texto',
      tendencia: red((bola - 0.5) * 2, 3),
      ayuda: 'Compara la tasa real en dólares con el crecimiento. Si la tasa gana, el stock crece aunque haya superávit primario.',
    },
  ];
}
