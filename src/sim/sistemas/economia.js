// Sistema económico: producción, precios, sector externo, fisco y distribución.
//
// Idea central: la economía argentina es una economía abierta y desequilibrada
// que produce sus divisas en un sector (el agro y, más tarde, la minería y la
// energía) y las gasta en otro (la industria, que importa insumos y bienes de
// capital). Nada acá está escrito "a mano": el ciclo de *stop and go* —crecer,
// quedarse sin dólares, devaluar, licuar salarios, enfriarse, recomponer el
// saldo y volver a arrancar— emerge de la interacción entre estas ecuaciones.
//
// Convenciones de escala (ver docs/CONTRATO.md):
//   - Todo campo 0..1 salvo pbiPerCapita (dólares internacionales de 1990),
//     crecimiento, inflacion, deficitFiscal (fracciones) y balanzaComercial
//     (-1..1).
//   - `crecimiento` es la variación del PBI *total*; el PBI per cápita crece
//     descontando el crecimiento vegetativo + migratorio de la población.
//   - `industrializacion` es un índice 0..1: el peso industrial real en el PBI
//     ronda la mitad de ese índice (0.55 ≈ 28% del PBI, el pico de 1974).
//   - `tipoCambioReal`: 0 apreciado (dólar barato), 1 depreciado (dólar caro).
//
// Este sistema escribe: nacion.economia.*, provincia.industria, provincia.agro,
// y suma a presiones.fiscal y presiones.inflacionaria. Todo lo demás lo lee.

import { clamp, clamp01, hacia, suave, sano } from '../../core/util.js';

// ---------------------------------------------------------------------------
// Parámetros de calibración. Se tocan todos desde acá: ninguna ecuación de más
// abajo tiene años ni valores históricos incrustados.
// ---------------------------------------------------------------------------
const P = {
  // --- Progreso técnico del mundo (contexto exógeno, no una decisión local) ---
  fronteraNivel1810: 0.16,   // nivel tecnológico mundial en 1810 (0..1)
  fronteraPaso: 1 / 330,     // avance anual de ese nivel
  fronteraPbi1810: 2000,     // PBI pc del país líder en 1810 (int$ de 1990)
  fronteraPbiTasa: 0.0132,   // crecimiento anual del líder
  gFrontera: 0.0182,         // techo de crecimiento por difusión tecnológica

  // --- Sector externo ---
  kExpAgro: 0.70,            // peso agroganadero en la canasta exportable
  kExpExtractivo: 0.50,      // minería, petróleo, gas, litio
  kExpIndustrial: 0.30,      // manufacturas de origen industrial
  impBase: 0.060,            // propensión a importar autónoma
  impSalario: 0.130,         // el salario alto se gasta en bienes importados
  impIndustria: 0.230,       // insumos y bienes de capital de la industria
  impIngreso: 0.070,         // variedad importada que trae el mayor ingreso
  impCiclo: 2.6,             // elasticidad de las importaciones al ciclo
  reservasPbi: 0.18,         // reservas = 1 equivale a 18% del PBI
  reservasCriticas: 0.22,    // por debajo de acá hay escasez de divisas
  usoReservas: 0.45,         // fracción de reservas gastable en un año
  entradaCredito: 0.055,     // financiamiento externo máximo (fracción del PBI)
  entradaIed: 0.090,
  salidaFuga: 0.075,

  // --- Tipo de cambio ---
  tcrBase: 0.30,             // tipo de cambio real de equilibrio sin tensión
  tcrPresion: 0.72,          // cuánto lo empuja la escasez de divisas
  kLicuacion: 0.38,          // caída del salario real por punto de devaluación

  // --- Precios ---
  inflacionPiso: 0.012,
  kPuja: 0.30,               // inflación por puja distributiva
  kEmision: 2.60,            // inflación por déficit monetizado
  kVelocidad: 5.0,           // huida del dinero cuando la inflación ya es alta
  passBase: 0.30,            // traslado a precios de la devaluación
  passApertura: 0.35,

  // --- Fisco ---
  techoTributario: 0.50,     // recaudación máxima por unidad de capacidad
  techoFormalidad: 0.25,     // extra recaudable si el trabajo es formal
  aduanaTasa: 0.28,          // arancel efectivo sobre lo importado
  retencionTasa: 0.14,       // derechos de exportación cuando hay retenciones
  gastoSobrePeso: 0.80,      // gasto público por unidad de "peso del Estado"

  // --- Crecimiento ---
  absorcionBase: 0.20,       // capacidad de absorber tecnología del mundo
  kCapital: 0.036,           // aporte de la acumulación de capital
  acumNeutra: 0.42,          // esfuerzo de inversión que sólo repone el desgaste
  kRestriccion: 0.30,        // caída del producto por racionamiento de importaciones
  kDemanda: 0.28,            // efecto del salario real sobre la demanda
  kToT: 0.16,                // efecto de los términos de intercambio
  sigmaPbi: 0.011,           // ruido anual del producto
  sigmaToT: 0.035,           // ruido de los términos de intercambio
  persistencia: 0.30,        // inercia del crecimiento

  // --- Inercias ---
  tasaLenta: 0.05,
  tasaMedia: 0.09,
  tasaRapida: 0.30,
};

// Ayudas locales: toda lectura del estado pasa por acá para que ningún campo
// ausente o corrupto de otro sistema pueda inyectar NaN en la economía.
const num = (v, d = 0) => sano(Number(v), d);
const c01 = (v, d = 0) => clamp01(num(v, d));
const pos = (v) => (v > 0 ? v : 0);

/** Índice 0..1 del tamaño del mercado interno (población × ingreso). */
function tamañoMercado(poblacion, pbi) {
  return clamp01(Math.log10(1 + (poblacion * pbi) / 1000) / 2.3);
}

// ---------------------------------------------------------------------------

export default {
  meta: {
    id: 'economia',
    nombre: 'Economía',
    orden: 30,
    descripcion: 'Producción, precios, restricción externa y distribución del ingreso.',
  },

  /** Ajusta las condiciones iniciales al modelo económico elegido. */
  init(estado) {
    const e = estado.nacion.economia;
    const cfg = estado.config ?? {};
    const modelo = cfg.modeloEconomico ?? 'agroexportador';

    if (modelo === 'proteccionista') {
      e.industrializacion = 0.09;
      e.productividadIndustrial = 0.14;
      e.diversificacion = 0.16;
      e.pesoEstado = clamp01(e.pesoEstado + 0.08);
      e.tipoCambioReal = 0.62;
    } else if (modelo === 'mixto') {
      e.industrializacion = 0.07;
      e.diversificacion = 0.13;
      e.tipoCambioReal = 0.55;
    } else {
      e.productividadAgro = clamp01(e.productividadAgro + 0.03);
      e.diversificacion = 0.08;
      e.tipoCambioReal = 0.46;
    }
    // Una aduana muy abierta arranca con más importación y menos reservas.
    e.reservas = clamp01(0.22 - 0.10 * c01(cfg.apertura, 0.75));
    e.capacidadFiscal = clamp01(0.10 + 0.25 * c01(estado.regimen?.capacidadEstatal, 0.15));
  },

  paso(estado, rng, ctx) {
    const n = estado.nacion;
    const e = n.economia;
    const cfg = estado.config ?? {};
    const F = estado.flags ?? {};
    const act = estado.actores ?? {};
    const reg = estado.regimen ?? {};
    const pres = estado.presiones ?? {};
    const año = num(ctx?.año, estado.año ?? 1810);
    const vol = clamp(num(cfg.volatilidad, 1), 0, 4);
    const azar = rng ?? { normal: () => 0, next: () => 0.5 };

    const rec = n.recursos ?? {};
    const inf = n.infraestructura ?? {};
    const edu = n.educacion ?? {};
    const soc = n.social ?? {};
    const ext = n.exterior ?? {};
    const deu = n.deuda ?? {};
    const tie = n.tierra ?? {};
    const dem = n.demografia ?? {};

    // Memoria del año anterior (todo lo que necesito ya vive en el estado).
    const pbiPrev = clamp(num(e.pbiPerCapita, 1100), 250, 250000);
    const inflPrev = clamp(num(e.inflacion, 0.02), -0.4, 60);
    const tcrPrev = clamp(num(e.tipoCambioReal, 0.5), 0.05, 1);
    const salPrev = c01(e.salarioReal, 0.25);
    const crecPrev = clamp(num(e.crecimiento, 0), -0.35, 0.25);

    // =====================================================================
    // A. Entorno: demografía, mundo y correlación de fuerzas
    // =====================================================================
    const poblacion = Math.max(0.05, num(dem.poblacion, 1));
    const urb = c01(dem.urbanizacion, 0.2);
    // Crecimiento poblacional deducido de los flujos vitales y migratorios.
    const gPob = clamp(
      num(dem.natalidad, 0.03) - num(dem.mortalidad, 0.025) +
      num(dem.migracionNeta, 0) / poblacion,
      -0.05, 0.07,
    );

    // Nivel tecnológico mundial e ingreso del país líder: el "techo" al que la
    // economía puede converger. Los shocks globales llegan por eventos.
    const frontera = clamp01(P.fronteraNivel1810 + (año - 1810) * P.fronteraPaso);
    const pbiFrontera = P.fronteraPbi1810 * Math.exp(P.fronteraPbiTasa * (año - 1810));
    const brecha = clamp01(1 - pbiPrev / Math.max(1, pbiFrontera));

    // Poder relativo del trabajo y del capital: nervio de la puja distributiva.
    const poderSindical = clamp01(
      (0.50 * c01(act.sindicatos) + 0.28 * c01(soc.derechosLaborales) +
       0.14 * c01(soc.sindicalizacion) + 0.08 * c01(soc.movilizacion)) *
      (F.paritarias ? 1.15 : 1) * (1 - 0.30 * c01(soc.represion, 0.3)),
    );
    const poderCapital = clamp01(
      0.30 + 0.28 * c01(e.concentracion) + 0.22 * c01(act.oligarquia) +
      0.16 * c01(act.burguesiaIndustrial) + 0.14 * c01(act.capitalExtranjero),
    );

    // =====================================================================
    // B. Términos de intercambio y apertura efectiva
    // =====================================================================
    // Canasta más primaria = precios más volátiles y más dependientes del mundo.
    const primarizacion = clamp01(0.55 + 0.30 * c01(rec.agro, 0.5) - 0.60 * c01(e.industrializacion));
    let tot = hacia(c01(e.terminosIntercambio, 0.5), 0.5 + 0.10 * (primarizacion - 0.5), 0.07);
    const totExterno = Number(ext.terminosIntercambio);
    if (Number.isFinite(totExterno)) tot = hacia(tot, clamp01(totExterno), 0.35);
    tot = clamp01(tot + azar.normal(P.sigmaToT * vol));
    e.terminosIntercambio = tot;

    // Apertura: política comercial + banderas + racionamiento de hecho. Cuando
    // faltan divisas la economía se cierra sola, aunque nadie lo decida.
    const escasezPrev = clamp01((P.reservasCriticas - c01(e.reservas)) / P.reservasCriticas);
    let apertura = c01(cfg.apertura, 0.6);
    if (F.librecambio) apertura += 0.20;
    if (F.convertibilidad) apertura += 0.12;
    if (F.privatizaciones) apertura += 0.05;
    if (F.mercosur) apertura += 0.05;
    if (F.proteccionismo) apertura -= 0.28;
    if (F.sustitucion_importaciones) apertura -= 0.22;
    if (F.iapi) apertura -= 0.10;
    if (F.retenciones) apertura -= 0.05;
    if (F.control_cambios) apertura -= 0.18;
    apertura += 0.10 * (0.5 - c01(ext.autonomia, 0.4));
    apertura -= 0.12 * c01(e.pesoEstado);
    apertura -= 0.30 * escasezPrev;
    apertura = clamp01(apertura);

    // Golpe de apertura: abrir de golpe con dólar barato es lo que destruye
    // tejido industrial, no la apertura en sí.
    const aperturaChoque = clamp01((apertura - 0.55) * 2.0) * clamp01((0.55 - tcrPrev) * 2.4);

    // =====================================================================
    // C. Sector externo: exportaciones, importaciones y divisas
    // =====================================================================
    const transporte = clamp01(
      0.22 + 0.40 * c01(inf.ferrocarril) + 0.25 * c01(inf.puertos) + 0.18 * c01(inf.rutas),
    );
    const baseAgro = clamp01(
      0.50 * c01(rec.agro) + 0.32 * c01(rec.ganaderia) + 0.18 * c01(tie.fronteraAgricola),
    );
    const capAgro = baseAgro *
      (0.30 + 0.70 * c01(e.productividadAgro)) *
      (0.35 + 0.65 * transporte);
    const capExtractiva = clamp01(
      0.40 * c01(rec.petroleo) + 0.22 * c01(rec.gas) +
      0.25 * c01(rec.mineria) + 0.13 * c01(rec.litio),
    ) * (0.35 + 0.65 * c01(rec.rentaExtractiva)) * (0.40 + 0.60 * transporte);
    const capIndustrial = c01(e.industrializacion) *
      (0.25 + 0.75 * c01(e.productividadIndustrial)) *
      (0.30 + 0.70 * c01(e.diversificacion));

    const factorToT = 0.55 + 0.90 * tot;      // 0.5 neutro → 1.0
    const factorTcrExp = 0.72 + 0.56 * tcrPrev; // dólar caro = más saldo exportable
    const expo = clamp(
      (P.kExpAgro * capAgro + P.kExpExtractivo * capExtractiva + P.kExpIndustrial * capIndustrial) *
      (0.55 + 0.55 * apertura) * factorToT * factorTcrExp,
      0.005, 0.60,
    );

    // Importaciones deseadas: crecen con el salario, con la industria (que
    // demanda insumos y máquinas) y con el nivel de actividad.
    const profundidad = clamp01(
      0.35 * c01(e.productividadIndustrial) + 0.40 * c01(e.diversificacion) + 0.25 * c01(inf.energia),
    );
    const intensidad =
      P.impBase +
      P.impSalario * salPrev +
      P.impIndustria * c01(e.industrializacion) * (1 - 0.55 * profundidad) +
      P.impIngreso * clamp01(Math.log10(1 + pbiPrev / 900) / 1.6);
    const impDeseadas = clamp(
      intensidad * (0.45 + 0.75 * apertura) * (1.35 - 0.70 * tcrPrev) *
      (1 + P.impCiclo * clamp(crecPrev - gPob, -0.08, 0.08)),
      0.005, 0.70,
    );

    // Cuenta financiera: crédito, inversión extranjera y fuga.
    const accesoCredito = clamp01(
      (1 - c01(deu.riesgoPais, 0.4)) *
      (F.default_deuda ? 0.15 : 1) *
      (F.acuerdo_fmi ? 1.15 : 1) *
      clamp(1.15 - 0.45 * num(deu.deudaPbi, 0), 0.2, 1.15) *
      (0.35 + 0.65 * apertura),
    );
    const desconfianza = clamp01(
      0.45 * suave(inflPrev, 0.15, 1.5) + 0.35 * escasezPrev +
      0.30 * (1 - c01(reg.estabilidad, 0.5)) + 0.40 * c01(deu.fugaCapitales) +
      (F.fuga_capitales ? 0.25 : 0),
    ) * (F.control_cambios ? 0.45 : 1) * (0.35 + 0.65 * apertura);
    const entrada = P.entradaCredito * accesoCredito + P.entradaIed * c01(ext.ied);
    const salida = P.salidaFuga * desconfianza;
    const financiero = entrada - salida;
    const servicio = clamp(num(deu.servicioDeuda, 0), 0, 4) * expo;

    // Restricción externa dura: no se importa más de lo que se puede pagar.
    const reservasPbi = c01(e.reservas) * P.reservasPbi;
    const disponible = Math.max(0, expo + financiero - servicio + P.usoReservas * reservasPbi);
    const impEfectivas = Math.min(impDeseadas, disponible);
    const racionamiento = clamp01((impDeseadas - impEfectivas) / Math.max(0.03, impDeseadas));

    const cuentaCorriente = expo - impEfectivas - servicio;
    const saldoTotal = cuentaCorriente + financiero;
    e.reservas = clamp01(c01(e.reservas) + saldoTotal / P.reservasPbi);
    e.balanzaComercial = clamp(
      sano((expo - impEfectivas) / Math.max(0.04, expo + impEfectivas), 0), -1, 1,
    );
    const escasez = clamp01((P.reservasCriticas - e.reservas) / P.reservasCriticas);

    // =====================================================================
    // D. Fisco: capacidad de recaudar, gasto y déficit
    // =====================================================================
    const capObj = clamp01(
      0.05 + 0.42 * c01(reg.capacidadEstatal, 0.15) + 0.18 * urb +
      0.20 * (1 - c01(e.informalidad, 0.6)) + 0.10 * c01(edu.alfabetizacion) +
      (F.banco_central ? 0.05 : 0) - 0.20 * suave(inflPrev, 0.3, 3), // efecto Olivera-Tanzi
    );
    e.capacidadFiscal = clamp01(hacia(c01(e.capacidadFiscal, 0.15), capObj, 0.07));

    // Cuánto Estado quiere y puede sostener la sociedad.
    const deseoEstado = clamp01(
      0.05 + 0.34 * c01(cfg.intervencionEstatal, 0.2) + 0.26 * c01(soc.derechosLaborales) +
      0.14 * urb + 0.12 * c01(reg.capacidadEstatal, 0.15) + 0.10 * c01(e.industrializacion) +
      0.10 * c01(pres.social) +
      (F.privatizaciones ? -0.10 : 0) + (F.reestatizaciones ? 0.08 : 0) +
      (F.industria_pesada ? 0.04 : 0) + (F.ypf_creada ? 0.03 : 0),
    );
    e.pesoEstado = clamp01(hacia(c01(e.pesoEstado, 0.2), deseoEstado, 0.06));

    const aduana = P.aduanaTasa * apertura * impEfectivas;
    const retenciones = F.retenciones ? P.retencionTasa * expo : 0;
    const techoRecaudacion = clamp01(
      (P.techoTributario + P.techoFormalidad * (1 - c01(e.informalidad, 0.6))) * e.capacidadFiscal +
      aduana + retenciones,
    );
    const gastoPbi = P.gastoSobrePeso * e.pesoEstado + 0.02 * c01(n.ffaa?.presupuesto, 0.2);
    e.presionFiscal = clamp01(hacia(
      c01(e.presionFiscal, 0.08), Math.min(techoRecaudacion, gastoPbi + 0.015), 0.10,
    ));
    const otrosIngresos = 0.20 * c01(rec.rentaExtractiva) * c01(rec.controlNacional, 0.5) +
      0.02 * e.pesoEstado;

    const deficitBruto = gastoPbi - e.presionFiscal - otrosIngresos;
    // La inflación alta licúa el gasto real: la hiperinflación "cierra" el
    // déficit por la peor vía posible, y por eso no es un estado estable.
    const licuacion = Math.min(0.75, 0.75 * suave(inflPrev, 0.30, 4.0));
    const financiableDeuda = (0.012 + 0.055 * accesoCredito) * (F.default_deuda ? 0.2 : 1);
    const deficitEfectivo = deficitBruto > 0 ? deficitBruto * (1 - licuacion) : deficitBruto;
    const emision = pos(deficitEfectivo - financiableDeuda) * (1 - 0.35 * accesoCredito);
    e.deficitFiscal = clamp(hacia(num(e.deficitFiscal, 0.03), deficitEfectivo, 0.5), -0.15, 0.35);

    // =====================================================================
    // E. Tipo de cambio real
    // =====================================================================
    const presionDeval = clamp01(
      0.55 * escasez + 0.45 * clamp01(-e.balanzaComercial * 2.2) + 0.35 * racionamiento +
      0.30 * desconfianza + 0.25 * clamp01((inflPrev - 0.15) / 1.5),
    );
    let rigidez = F.convertibilidad ? 0.88 : F.control_cambios ? 0.45 : 0.12;
    rigidez = clamp01(rigidez + 0.10 * c01(deu.condicionalidad));
    // El ancla se rompe cuando ya no hay reservas con qué defenderla.
    const colapsoAncla = e.reservas < 0.06 && presionDeval > 0.55;
    if (colapsoAncla) rigidez = 0.03;

    const objetivoTcr = clamp01(
      P.tcrBase + P.tcrPresion * presionDeval - 0.22 * clamp01((e.reservas - 0.35) / 0.5) -
      0.12 * c01(ext.ied) * 2,
    );
    let tcr = tcrPrev;
    if (objetivoTcr > tcr) {
      tcr = hacia(tcr, objetivoTcr, clamp01((0.12 + 0.70 * presionDeval) * (1 - rigidez)));
    } else {
      tcr = hacia(tcr, objetivoTcr, 0.10 + 0.20 * rigidez);
    }
    // Con el tipo de cambio nominal anclado, la inflación aprecia en términos
    // reales: el atraso cambiario se acumula hasta que algo se rompe.
    tcr -= rigidez * Math.min(0.6, pos(inflPrev)) * 0.45;
    tcr = clamp(tcr, 0.05, 1);
    const devalReal = sano((tcr - tcrPrev) / Math.max(0.12, tcrPrev), 0);
    e.tipoCambioReal = tcr;

    // =====================================================================
    // F. Inflación: puja distributiva + emisión + pass-through
    // =====================================================================
    const productividadGanada = clamp(crecPrev - gPob, -0.06, 0.06);
    const puja = clamp01(2.2 * poderSindical * poderCapital);
    const inflEstructural = P.kPuja * Math.pow(puja, 1.35) * (1 - 3 * productividadGanada);
    const velocidad = 1 + P.kVelocidad * suave(inflPrev, 0.35, 2.5);
    const inflFiscal = P.kEmision * emision * velocidad;
    const passThrough = clamp01(P.passBase + P.passApertura * apertura + 0.25 * suave(inflPrev, 0.2, 2));
    const inflCambiaria = passThrough * pos(devalReal);

    let objetivoInfl = P.inflacionPiso + inflEstructural + inflFiscal + inflCambiaria;
    if (F.convertibilidad && !colapsoAncla) objetivoInfl *= 0.12;
    if (F.banco_central) objetivoInfl *= 0.94;
    if (F.acuerdo_fmi) objetivoInfl *= 0.92;
    objetivoInfl += azar.normal(0.012 * vol) * (1 + Math.min(3, pos(inflPrev)));

    const sube = objetivoInfl > inflPrev;
    const tasaInfl = sube ? 0.55 : clamp01(0.22 + 0.45 * rigidez + 0.20 * c01(reg.capacidadEstatal, 0.2));
    e.inflacion = clamp(hacia(inflPrev, objetivoInfl, tasaInfl), -0.30, 60);

    // =====================================================================
    // G. Oferta: productividades e industrialización
    // =====================================================================
    const absorcion = clamp01(
      P.absorcionBase + 0.28 * c01(edu.alfabetizacion) + 0.22 * c01(edu.cienciaTecnica) +
      0.20 * c01(e.industrializacion) + 0.14 * c01(inf.energia) +
      0.12 * c01(e.productividadAgro) + 0.10 * c01(edu.superior),
    );

    const objAgro = clamp01(
      0.12 + 0.60 * frontera * (0.40 + 0.60 * absorcion) + 0.15 * c01(edu.cienciaTecnica) +
      0.12 * c01(inf.rutas) + 0.10 * c01(tie.sojizacion) +
      0.08 * (1 - c01(tie.giniTierra, 0.7)) - 0.10 * (1 - c01(rec.sostenibilidad, 0.8)),
    );
    e.productividadAgro = clamp01(hacia(c01(e.productividadAgro, 0.2), objAgro, P.tasaLenta));

    const objIndProd = clamp01(
      0.04 + 0.50 * frontera * absorcion + 0.20 * c01(edu.formacionTecnica) +
      0.15 * c01(e.industrializacion) + 0.12 * c01(inf.energia) +
      0.10 * c01(e.diversificacion) + (F.industria_pesada ? 0.06 : 0) -
      0.08 * (1 - c01(reg.estabilidad, 0.5)) - 0.10 * racionamiento,
    );
    e.productividadIndustrial = clamp01(
      hacia(c01(e.productividadIndustrial, 0.1), objIndProd, P.tasaLenta),
    );

    // Industria: no nace de un decreto. Necesita protección efectiva, mercado
    // interno que la sostenga, energía e infraestructura, y divisas para las
    // máquinas. Muere con apertura brusca y dólar barato.
    let proteccion = clamp01(0.10 + 0.80 * (1 - apertura));
    if (F.proteccionismo) proteccion = clamp01(proteccion + 0.15);
    if (F.sustitucion_importaciones) proteccion = clamp01(proteccion + 0.20);
    if (F.librecambio) proteccion = clamp01(proteccion - 0.20);
    const mercado = tamañoMercado(poblacion, pbiPrev) * (0.55 + 0.45 * salPrev);
    const insumos = clamp01(
      0.18 + 0.42 * c01(inf.energia) + 0.20 * transporte + 0.12 * c01(rec.petroleo) +
      0.12 * c01(inf.digital) + (F.industria_pesada ? 0.10 : 0),
    );
    const divisasCapital = clamp01(1 - 0.75 * racionamiento);
    const objIndustria = clamp01(
      1.05 * Math.pow(proteccion, 0.75) * Math.pow(mercado, 0.70) *
      Math.pow(insumos, 0.45) * (0.45 + 0.55 * divisasCapital) *
      (0.55 + 0.45 * c01(e.productividadIndustrial)),
    );
    const indPrev = c01(e.industrializacion, 0.05);
    const tasaInd = objIndustria >= indPrev
      ? 0.055 + 0.05 * c01(act.burguesiaIndustrial)
      : 0.06 + 0.30 * aperturaChoque + 0.10 * racionamiento;
    e.industrializacion = clamp01(hacia(indPrev, objIndustria, tasaInd));

    // =====================================================================
    // H. Salario real (se pacta antes de que se conozca el producto del año)
    // =====================================================================
    const salObj = clamp01(
      0.06 + 0.34 * poderSindical +
      0.16 * clamp01(1 - c01(e.desempleo, 0.05) / 0.18) +
      0.14 * clamp01(Math.log10(1 + pbiPrev / 900) / 1.5) +
      0.12 * (1 - c01(e.informalidad, 0.6)) +
      0.10 * c01(e.industrializacion) +
      0.08 * c01(soc.derechosLaborales) -
      0.18 * clamp01((tcr - 0.45) / 0.55),
    );
    let sal = hacia(salPrev, salObj, 0.10 + 0.12 * poderSindical);
    // La devaluación licúa el salario de una: es el mecanismo por el que el
    // ajuste externo lo paga el trabajo, salvo que los sindicatos lo resistan.
    sal -= P.kLicuacion * pos(devalReal) * (1 - 0.35 * poderSindical);
    sal -= 0.12 * pos(e.inflacion - inflPrev) / (1 + pos(e.inflacion));
    e.salarioReal = clamp01(sal);
    const deltaSalario = e.salarioReal - salPrev;

    // =====================================================================
    // I. Crecimiento
    // =====================================================================
    const acumulacion = clamp01(
      0.16 + 0.20 * (1 - c01(deu.riesgoPais, 0.4)) + 0.15 * c01(reg.estabilidad, 0.5) +
      0.14 * c01(e.industrializacion) + 0.12 * clamp01(c01(ext.ied) * 2) +
      0.10 * (1 - suave(inflPrev, 0.1, 1.5)) + 0.10 * c01(inf.energia) +
      0.06 * (1 - c01(e.gini, 0.5)) - 0.10 * clamp01(num(deu.servicioDeuda, 0) / 0.5),
    );

    const gTec = P.gFrontera * absorcion * (0.75 + 0.85 * brecha);
    const gCapital = P.kCapital * (acumulacion - P.acumNeutra);
    const gRestriccion = -P.kRestriccion * Math.pow(racionamiento, 1.15);
    const gPrecios = -0.06 * suave(e.inflacion, 0.35, 4) - 0.03 * suave(e.inflacion, 1.5, 8);
    // La inestabilidad frena la inversión y desorganiza la producción, pero no
    // destruye producto un año tras otro sin fondo: se acota para que no genere
    // una espiral irreversible. Un país puede estar mal gobernado durante
    // décadas sin desaparecer.
    // Sólo penaliza el EXCESO sobre la tensión de fondo que cualquier país
    // tiene siempre: en tiempos normales el término es casi cero, y muerde de
    // verdad cuando hay crisis institucional o conflicto social abierto.
    const gPolitico = clamp(
      0.050 * (c01(reg.estabilidad, 0.5) - 0.35) +
      0.030 * (c01(reg.legitimidad, 0.5) - 0.40) -
      0.050 * pos(c01(pres.social) - 0.35),
      -0.030, 0.020,
    );
    const gDemanda = P.kDemanda * clamp(deltaSalario, -0.3, 0.3);
    const gToT = P.kToT * (tot - 0.5) * 0.4;
    const ruido = azar.normal(P.sigmaPbi * vol);

    let gPerCapita = gTec + gCapital + gRestriccion + gPrecios + gPolitico + gToT + ruido + gDemanda;
    // Inercia: las recesiones y las expansiones duran más de un año.
    gPerCapita = P.persistencia * clamp(crecPrev - gPob, -0.2, 0.15) + (1 - P.persistencia) * gPerCapita;
    gPerCapita = clamp(gPerCapita, -0.22, 0.15);

    e.pbiPerCapita = clamp(pbiPrev * (1 + gPerCapita), 250, 250000);
    e.crecimiento = clamp(gPerCapita + gPob, -0.32, 0.24);

    // Descomposición del crecimiento: qué empuja y qué frena. La usa la
    // interfaz para explicar por qué la economía hace lo que hace.
    e.diagnostico = {
      tecnologia: gTec, capital: gCapital, restriccionExterna: gRestriccion,
      precios: gPrecios, politica: gPolitico, demanda: gDemanda,
      terminosIntercambio: gToT, acumulacion, absorcion, racionamiento,
      ruido, gPob, perCapita: gPerCapita,
    };

    // =====================================================================
    // J. Empleo, informalidad y desigualdad
    // =====================================================================
    const desObj = clamp(
      0.015 + (0.35 + 0.65 * urb) * (
        0.16 * clamp01(urb * (1 - 1.2 * c01(e.industrializacion))) +
        0.55 * pos(-gPerCapita) +
        0.14 * racionamiento +
        0.16 * aperturaChoque +
        0.07 * (1 - e.pesoEstado) -
        0.05 * poderSindical
      ),
      0.012, 0.35,
    );
    e.desempleo = clamp01(hacia(c01(e.desempleo, 0.05), desObj, P.tasaRapida));

    const infoObj = clamp01(
      0.90 - 0.58 * e.capacidadFiscal - 0.25 * c01(e.industrializacion) -
      0.18 * c01(soc.derechosLaborales) - 0.08 * urb +
      0.70 * e.desempleo + 0.10 * c01(e.gini, 0.5) + 0.10 * racionamiento,
    );
    e.informalidad = clamp01(hacia(c01(e.informalidad, 0.6), infoObj, P.tasaMedia));

    const giniObj = clamp01(
      0.26 + 0.20 * c01(tie.giniTierra, 0.7) + 0.16 * e.informalidad +
      0.14 * c01(e.concentracion) + 0.10 * clamp01(e.desempleo / 0.20) +
      0.08 * c01(act.capitalExtranjero) +
      0.06 * clamp01((tcr - 0.5) / 0.5) * (1 - poderSindical) -
      0.18 * poderSindical - 0.10 * c01(soc.derechosLaborales) -
      0.08 * c01(edu.alfabetizacion),
    );
    e.gini = clamp01(hacia(c01(e.gini, 0.5), giniObj, 0.07));

    // =====================================================================
    // J. Estructura productiva
    // =====================================================================
    const concObj = clamp01(
      0.20 + 0.22 * c01(tie.giniTierra, 0.7) + 0.20 * c01(act.capitalExtranjero) +
      0.15 * apertura * (1 - c01(e.industrializacion)) + 0.12 * (1 - c01(e.diversificacion)) +
      0.10 * c01(ext.dependenciaComercial, 0.6) - 0.15 * e.pesoEstado - 0.10 * poderSindical,
    );
    e.concentracion = clamp01(hacia(c01(e.concentracion, 0.5), concObj, P.tasaLenta));

    const divObj = clamp01(
      0.04 + 0.45 * c01(e.industrializacion) + 0.22 * c01(edu.cienciaTecnica) +
      0.15 * c01(e.productividadIndustrial) + 0.12 * (1 - c01(ext.dependenciaComercial, 0.6)) +
      0.10 * c01(rec.mineria),
    );
    e.diversificacion = clamp01(hacia(c01(e.diversificacion, 0.1), divObj, P.tasaLenta));

    // =====================================================================
    // K. Provincias: industria y agro
    // =====================================================================
    for (const p of estado.provincias ?? []) {
      const apt = p.aptitud ?? {};
      const integ = c01(p.integracion, 0.5);
      const aptInd = clamp01(
        0.15 + 0.35 * c01(p.urbanizacion) + 0.22 * c01(apt.puerto) +
        0.18 * c01(p.infraestructura) + 0.15 * c01(p.educacion) +
        0.15 * c01(apt.petroleo) * c01(rec.petroleo) + 0.10 * c01(apt.mineria) * c01(rec.mineria),
      );
      const objIndProv = clamp01(
        e.industrializacion * (0.20 + 0.80 * aptInd) * (0.35 + 0.65 * integ) *
        (0.55 + 0.45 * c01(inf.energia)),
      );
      p.industria = clamp01(hacia(c01(p.industria), objIndProv, 0.08));

      const objAgroProv = clamp01(
        c01(apt.agro) * 0.65 + c01(apt.ganaderia) * 0.35,
      ) * (0.30 + 0.70 * e.productividadAgro) * (0.35 + 0.65 * integ) *
        (0.55 + 0.45 * c01(tie.fronteraAgricola)) * (0.60 + 0.40 * transporte);
      p.agro = clamp01(hacia(c01(p.agro), clamp01(objAgroProv), 0.07));
    }

    // =====================================================================
    // L. Presiones (acumuladores que leen los eventos)
    // =====================================================================
    const aporteFiscal = clamp01(
      2.2 * pos(e.deficitFiscal - 0.02) + 0.9 * emision +
      0.20 * (1 - e.capacidadFiscal) * e.pesoEstado + 0.10 * racionamiento,
    ) * 0.30;
    pres.fiscal = clamp01(c01(pres.fiscal) + aporteFiscal);

    const aporteInfl = clamp01(
      0.90 * suave(e.inflacion, 0.12, 1.2) + 0.35 * pos(devalReal) + 0.25 * puja,
    ) * 0.30;
    pres.inflacionaria = clamp01(c01(pres.inflacionaria) + aporteInfl);

    // Movimientos lentos de los actores de la órbita económica (≤0.02/año).
    if (act.burguesiaIndustrial !== undefined) {
      const objBurg = clamp01(0.05 + 0.75 * e.industrializacion * (0.5 + 0.5 * e.diversificacion));
      act.burguesiaIndustrial = clamp01(
        act.burguesiaIndustrial + clamp(objBurg - act.burguesiaIndustrial, -0.02, 0.02),
      );
    }
    if (act.oligarquia !== undefined) {
      const objOli = clamp01(0.15 + 0.55 * c01(tie.giniTierra, 0.7) + 0.25 * (expo / 0.35) * (1 - e.industrializacion));
      act.oligarquia = clamp01(
        act.oligarquia + clamp(objOli - act.oligarquia, -0.012, 0.012),
      );
    }
  },

  indicadores(estado) {
    const e = estado.nacion.economia;
    const filas = estado.series?.filas ?? [];
    const prev = filas.length > 1 ? filas[filas.length - 2] : null;
    const dif = (actual, clave) => (prev && Number.isFinite(prev[clave]) ? sano(actual - prev[clave], 0) : 0);

    const restriccion = clamp01(
      0.55 * clamp01((0.22 - c01(e.reservas)) / 0.22) +
      0.45 * clamp01(-num(e.balanzaComercial) * 2),
    );

    return [
      {
        clave: 'pbi', etiqueta: 'PBI per cápita', valor: Math.round(num(e.pbiPerCapita, 0)),
        formato: 'usd', tendencia: sano(num(e.crecimiento) - 0, 0),
        ayuda: 'Dólares internacionales de 1990. Los shocks externos y la falta de divisas lo frenan.',
      },
      {
        clave: 'crecimiento', etiqueta: 'Crecimiento del PBI', valor: num(e.crecimiento),
        formato: 'porcentaje', tendencia: dif(num(e.pbiPerCapita), 'pbi') / Math.max(1, num(e.pbiPerCapita, 1)),
        ayuda: 'Variación anual del producto total, población incluida.',
      },
      {
        clave: 'inflacion', etiqueta: 'Inflación', valor: num(e.inflacion),
        formato: 'porcentaje', tendencia: dif(num(e.inflacion), 'inflacion'),
        ayuda: 'Puja distributiva, emisión para cubrir el déficit y traslado a precios de la devaluación.',
      },
      {
        clave: 'salario', etiqueta: 'Salario real', valor: c01(e.salarioReal),
        formato: 'indice', tendencia: 0,
        ayuda: 'Poder de compra del trabajo. Cada devaluación lo licúa; recuperarlo lleva años.',
      },
      {
        clave: 'desempleo', etiqueta: 'Desocupación', valor: c01(e.desempleo),
        formato: 'porcentaje', tendencia: 0,
        ayuda: 'Sube con la recesión, la apertura brusca y la falta de insumos importados.',
      },
      {
        clave: 'industria', etiqueta: 'Industrialización', valor: c01(e.industrializacion),
        formato: 'indice', tendencia: dif(c01(e.industrializacion), 'industria'),
        ayuda: 'Índice del peso industrial. Necesita protección, mercado interno y energía.',
      },
      {
        clave: 'gini', etiqueta: 'Desigualdad (Gini)', valor: c01(e.gini),
        formato: 'indice', tendencia: dif(c01(e.gini), 'gini'),
        ayuda: 'Correlación de fuerzas, empleo formal y tipo de cambio deciden el reparto.',
      },
      {
        clave: 'restriccion', etiqueta: 'Restricción externa', valor: restriccion,
        formato: 'indice', tendencia: 0,
        ayuda: 'Tensión de la balanza de pagos: cuanto más alta, más cerca está la devaluación.',
      },
      {
        clave: 'fiscal', etiqueta: 'Resultado fiscal', valor: -num(e.deficitFiscal),
        formato: 'porcentaje', tendencia: 0,
        ayuda: 'Positivo es superávit. Sin capacidad fiscal, el rojo se paga con emisión o deuda.',
      },
    ];
  },
};
