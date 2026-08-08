// ---------------------------------------------------------------------------
// INFRAESTRUCTURA
//
// Tesis del sistema: la forma de la red decide la forma del país.
//
// Una red en abanico que converge en un solo puerto abarata sacar materia
// prima al exterior y encarece el comercio entre provincias. Eso concentra
// población y actividad en el litoral, funde a las economías regionales y
// refuerza el modelo agroexportador: no hace falta ninguna política explícita
// de despoblamiento del interior, alcanza con la geometría de las vías y con
// quién decide el trazado.
//
// Una red mallada, que conecta provincias entre sí y no sólo cada provincia
// con el puerto, produce integración territorial, mercado interno y desarrollo
// distribuido. Cuesta más y rinde después; por eso casi nunca se construye.
//
// Los dos números que resumen todo esto son `centralismoPortuario` (cuánto del
// tráfico embudo hacia una sola boca) e `integracionTerritorial` (cuánta malla
// efectiva hay). De ellos salen dos precios publicados que el resto de la
// simulación lee: `costoExportacion` y `costoComercioInterno`.
//
// Segunda tesis: la infraestructura se degrada sola. Mantener es barato y
// reconstruir es carísimo, pero el costo de no mantener se paga diez años
// después de la decisión, así que el ajuste fiscal ataca siempre primero el
// mantenimiento. Ese es el mecanismo más importante y menos visible de acá.
//
// ---------------------------------------------------------------------------
// PROPIEDAD (ver docs/CONTRATO.md)
//
// Escribe:   estado.nacion.infraestructura.*   (dominio propio)
//            provincia.infraestructura         (campo propio)
//            provincia.desarrollo              (aporte parcial, tasa <= 0.05:
//                                               la infraestructura es un
//                                               insumo del desarrollo, no su
//                                               dueño)
//            estado.presiones.regional, estado.presiones.fiscal  (suma)
//            estado.flags.ramales_cerrados     (sólo como resultado físico
//                                               emergente del abandono)
//
// Publica (lectura para otros sistemas, todo 0..1):
//   costoExportacion, costoComercioInterno   -> economia
//   dependenciaEnergetica, cuelloBotellaEnergetico -> economia, deuda
//   giroUtilidades, garantiaFerroviaria      -> deuda, exterior
//   deficitHabitacional, riesgoSanitario     -> social, demografia
//   agua_saneamiento, salud, vivienda        -> demografia (mortalidad, EV)
//   territorio[idProvincia]                  -> demografia (migración interna),
//                                               economia (actividad regional)
// ---------------------------------------------------------------------------

import { clamp01, hacia, suave, sano } from '../../core/util.js';

// --- Geometría: dónde está cada provincia respecto de la boca del embudo -----

const PUERTO_PRINCIPAL = { lat: -34.60, lon: -58.38 }; // Buenos Aires
const DISTANCIA_MAXIMA = 2600; // km: Ushuaia queda en el extremo de la escala

/** Distancia aproximada al puerto principal, en km (proyección plana local). */
function distanciaAlPuerto(lat, lon) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat - PUERTO_PRINCIPAL.lat) * rad;
  const latMedia = ((lat + PUERTO_PRINCIPAL.lat) / 2) * rad;
  const dLon = (lon - PUERTO_PRINCIPAL.lon) * rad * Math.cos(latMedia);
  return R * Math.hypot(dLat, dLon);
}

const GEO = new Map();

/**
 * Coeficientes estáticos de cada provincia frente a los dos tipos de red.
 *
 *  - `pesoRadial`:   cuánto la beneficia el abanico exportador. Alto donde hay
 *                    algo embarcable cerca del puerto (pampa húmeda, litoral,
 *                    azúcar tucumana, vino mendocino). Casi nulo en Patagonia:
 *                    el abanico nunca llegó porque no había qué sacar.
 *  - `pesoMallado`:  cuánto la beneficia una red que une provincias entre sí.
 *                    Es el complemento del anterior, atenuado por la distancia
 *                    (mallar la Patagonia también cuesta más).
 *  - `costoObra`:    cuánto cuesta construir ahí (distancia, cordillera, agua).
 */
function geoDe(p) {
  const cache = GEO.get(p.id);
  if (cache) return cache;

  const lat = sano(p.lat, PUERTO_PRINCIPAL.lat);
  const lon = sano(p.lon, PUERTO_PRINCIPAL.lon);
  const ap = p.aptitud || {};
  const distNorm = clamp01(distanciaAlPuerto(lat, lon) / DISTANCIA_MAXIMA);

  // Lo que el abanico venía a buscar: granos, ganado o una boca de puerto.
  const exportable = Math.max(
    sano(ap.agro, 0),
    sano(ap.ganaderia, 0) * 0.9,
    sano(ap.puerto, 0),
  );

  const pesoRadial = clamp01(Math.pow(1 - distNorm, 1.3) * (0.25 + 0.75 * exportable));
  const perifericidad = clamp01(1 - pesoRadial);
  const pesoMallado = clamp01((0.35 + 0.65 * perifericidad) * (1 - 0.35 * distNorm));
  const costoObra = clamp01(0.20 + 0.50 * distNorm + 0.30 * (1 - sano(ap.agua, 0.5)));

  const g = {
    distNorm,
    pesoRadial,
    perifericidad,
    pesoMallado,
    costoObra,
    puerto: clamp01(sano(ap.puerto, 0)),
  };
  GEO.set(p.id, g);
  return g;
}

// --- Desgaste ---------------------------------------------------------------

// Cuán rápido se cae cada cosa si nadie la mantiene. El asfalto y la red
// digital se destruyen enseguida; un muelle de piedra aguanta décadas.
const SENSIBILIDAD_DESGASTE = {
  ferrocarril: 1.15,
  rutas: 1.35,
  puertos: 0.70,
  energia: 0.95,
  agua_saneamiento: 0.80,
  vivienda: 0.55,
  salud: 0.70,
  digital: 1.45,
};

/**
 * Evolución de un stock físico: primero se cae solo, después crece con lo que
 * efectivamente se invirtió. Nunca "vuelve" gratis: si el objetivo está por
 * encima, hay que pagar la obra; si está por debajo, converge lento (abandono).
 */
function evolucionarStock(actual, objetivo, tasaObra, desgaste) {
  const tras = actual * (1 - clamp01(desgaste));
  const t = objetivo > tras ? clamp01(tasaObra) : 0.06;
  return clamp01(sano(tras + (objetivo - tras) * t, tras));
}

const bandera = (flags, clave) => (flags && flags[clave] ? 1 : 0);

/** Crea los campos derivados del dominio si todavía no existen. */
function asegurar(inf) {
  if (!inf.matriz) {
    inf.matriz = { lena: 0.6, carbon: 0.02, termica: 0.0, hidro: 0.0, nuclear: 0.0, renovable: 0.0 };
  }
  if (!inf.territorio) inf.territorio = {};
  if (!inf.previo) inf.previo = {};
  const porDefecto = {
    deterioro: 0.15,               // mantenimiento diferido acumulado
    coberturaMantenimiento: 0.4,   // gasto de mantenimiento / stock a mantener
    eficienciaObra: 0.5,           // cuánto rinde un peso de obra nueva
    malla: 0.05,                   // red efectivamente mallada
    brechaTerritorial: 0.2,        // dispersión de infraestructura entre provincias
    costoExportacion: 0.85,        // precio de sacar una tonelada al exterior
    costoComercioInterno: 0.85,    // precio de moverla entre provincias
    demandaEnergia: 0.12,
    cuelloBotellaEnergetico: 0.1,  // demanda insatisfecha: techo de la industria
    autoabastecimientoEnergetico: 0.9,
    dependenciaEnergetica: 0.1,
    garantiaFerroviaria: 0.0,      // renta garantizada por el Estado al concesionario
    giroUtilidades: 0.0,           // utilidades de la infraestructura giradas afuera
    deficitHabitacional: 0.35,
    riesgoSanitario: 0.5,
    digitalFederal: 0.0,
    urbanizacionPrevia: 0.12,
  };
  for (const [k, v] of Object.entries(porDefecto)) {
    if (typeof inf[k] !== 'number') inf[k] = v;
  }
}

export default {
  meta: {
    id: 'infraestructura',
    nombre: 'Infraestructura',
    orden: 70,
    descripcion: 'Ferrocarril, puertos, rutas, energía e infraestructura social. La forma de la red decide la forma del país.',
  },

  init(estado) {
    asegurar(estado.nacion.infraestructura);
    for (const p of estado.provincias) geoDe(p);
    // La urbanización de arranque sirve de referencia para medir el salto.
    estado.nacion.infraestructura.urbanizacionPrevia = clamp01(estado.nacion.demografia.urbanizacion);
  },

  paso(estado, rng, ctx = {}) {
    const inf = estado.nacion.infraestructura;
    asegurar(inf);

    const n = estado.nacion;
    const f = estado.flags || {};
    const cfg = estado.config || {};
    const reg = estado.regimen || {};
    const act = estado.actores || {};
    const año = sano(ctx.año, estado.año);
    const volatilidad = sano(cfg.volatilidad, 1);

    // =====================================================================
    // 1. Ventanas tecnológicas
    // Nada se construye antes de que exista. Cada ventana abre despacio.
    // =====================================================================
    const dispFerro = suave(año, 1852, 1885);
    const dispVial = suave(año, 1920, 1962);
    const dispElectrica = suave(año, 1885, 1930);
    const dispCarbon = clamp01(suave(año, 1858, 1888) - suave(año, 1930, 1968));
    const dispPetroleo = suave(año, 1907, 1938);
    const dispGas = suave(año, 1945, 1978);
    const dispHidro = suave(año, 1950, 1988);
    const dispNuclear = suave(año, 1958, 1990);
    const dispRenovable = suave(año, 2002, 2030);
    const dispDigital = suave(año, 1990, 2016);

    // =====================================================================
    // 2. Materialidad fiscal: cuánta plata hay y cuánto la aprieta el ajuste
    // =====================================================================
    const eco = n.economia;
    const capacidadEstatal = clamp01(sano(reg.capacidadEstatal, 0.2));

    // El ajuste no es una decisión de este sistema: es la presión que llega
    // desde la deuda, el déficit y la condicionalidad externa.
    const ajuste = clamp01(
      0.50 * suave(sano(eco.deficitFiscal, 0), 0.01, 0.09)
      + 0.22 * clamp01(sano(n.deuda.condicionalidad, 0))
      + 0.18 * suave(sano(n.deuda.servicioDeuda, 0), 0.2, 0.9)
      + 0.14 * suave(sano(eco.inflacion, 0), 0.3, 2.0)
      + 0.16 * bandera(f, 'acuerdo_fmi')
      + 0.14 * bandera(f, 'default_deuda')
      + 0.10 * bandera(f, 'privatizaciones'),
    );

    const presupuesto = clamp01(
      (0.12 + 0.75 * clamp01(sano(eco.capacidadFiscal, 0.15)))
      * (0.35 + 0.65 * capacidadEstatal)
      * (0.55 + 0.55 * clamp01(sano(eco.pesoEstado, 0.2)))
    ) * (1 - 0.55 * ajuste);

    // Rentabilidad del negocio exportador: define si al capital privado le
    // conviene poner un riel y si le conviene después mantenerlo.
    const rentabilidadExportadora = clamp01(
      0.20
      + 0.45 * clamp01(sano(eco.terminosIntercambio, 0.5))
      + 0.25 * clamp01(sano(cfg.apertura, 0.6))
      + 0.20 * clamp01(sano(n.recursos.agro, 0.5))
      - 0.30 * suave(sano(eco.inflacion, 0), 0.25, 1.5),
    );

    // Apetito del capital extranjero por concesiones. La garantía de
    // rentabilidad — el Estado asegura la ganancia y asume el riesgo — es
    // justamente lo que lo dispara.
    const garantiaDisponible = clamp01(
      0.25 + 0.45 * clamp01(sano(cfg.apertura, 0.6))
      + 0.30 * clamp01(sano(act.oligarquia, 0.5))
      - 0.35 * clamp01(sano(cfg.intervencionEstatal, 0.2))
      - 0.30 * bandera(f, 'ferrocarriles_nacionalizados'),
    );

    const apetitoExtranjero = clamp01(
      0.08
      + 0.42 * clamp01(sano(cfg.apertura, 0.6))
      + 0.38 * clamp01(sano(act.capitalExtranjero, 0.2))
      + 0.25 * bandera(f, 'ferrocarril_britanico')
      + 0.15 * bandera(f, 'librecambio')
      + 0.18 * bandera(f, 'privatizaciones')
      + 0.20 * clamp01(sano(n.exterior.ied, 0.05))
      - 0.40 * bandera(f, 'ferrocarriles_nacionalizados')
      - 0.25 * bandera(f, 'reestatizaciones')
      - 0.18 * (cfg.alineamiento === 'autonomo' ? 1 : 0)
      - 0.18 * clamp01(sano(n.exterior.autonomia, 0.4)),
    ) * clamp01(0.20 + 0.80 * rentabilidadExportadora) * clamp01(0.35 + 0.65 * garantiaDisponible);

    // Capacidad del Estado para ejecutar obra propia (no sólo firmarla).
    const capacidadObraEstatal = clamp01(
      0.10
      + 0.55 * capacidadEstatal
      + 0.30 * clamp01(sano(cfg.intervencionEstatal, 0.2))
      + 0.20 * clamp01(sano(n.educacion.cienciaTecnica, 0.05))
      + 0.15 * bandera(f, 'industria_pesada')
      - 0.30 * ajuste
      - 0.20 * clamp01(sano(reg.corrupcion, 0.3)),
    );

    // =====================================================================
    // 3. Reparto del presupuesto y MANTENIMIENTO
    //
    // El ajuste corta primero acá porque la obra nueva se inaugura con cinta
    // y el mantenimiento no se ve hasta que algo se cae. Recortar mantenimiento
    // es gratis hoy y carísimo dentro de quince años.
    // =====================================================================
    const cuotaMantObjetivo = clamp01(
      0.52
      + 0.22 * capacidadEstatal
      + 0.10 * bandera(f, 'red_vial_nacional')
      + 0.08 * bandera(f, 'ferrocarriles_nacionalizados')
      - 0.48 * ajuste
      - 0.14 * bandera(f, 'privatizaciones')
      - 0.12 * clamp01(sano(reg.corrupcion, 0.3)),
    );

    // Cuánto stock hay que sostener. Una red enorme con presupuesto chico se
    // pudre aunque el presupuesto no baje: la deuda de mantenimiento crece
    // con los kilómetros construidos.
    const stock = clamp01(
      0.32 * inf.ferrocarril
      + 0.20 * inf.rutas
      + 0.11 * inf.puertos
      + 0.17 * inf.energia
      + 0.09 * inf.agua_saneamiento
      + 0.06 * inf.digital
      + 0.05 * inf.salud,
    );

    const gastoMantenimiento = presupuesto * cuotaMantObjetivo;
    const gastoRestante = presupuesto * (1 - cuotaMantObjetivo);

    // El concesionario privado mantiene su propia línea mientras el negocio
    // exportador le rinde. Cuando deja de rendir, la abandona antes que el
    // Estado: no tiene ninguna obligación con el territorio.
    const cuidadoPrivado = clamp01(1 - inf.controlNacionalFerrocarril)
      * rentabilidadExportadora
      * clamp01(inf.ferrocarril + inf.puertos * 0.4);

    const cobertura = clamp01(
      sano(gastoMantenimiento / (0.05 + 0.85 * stock), 0)
      + 0.32 * cuidadoPrivado,
    );
    inf.coberturaMantenimiento = cobertura;

    const mantObjetivo = clamp01(0.12 + 0.88 * cobertura);
    // Asimetría deliberada: el mantenimiento se destruye rápido (se firma un
    // decreto) y se recompone lento (hacen falta cuadrillas, talleres, oficio).
    inf.mantenimiento = clamp01(hacia(
      inf.mantenimiento,
      mantObjetivo,
      mantObjetivo < inf.mantenimiento ? 0.30 : 0.07,
    ));

    // Mantenimiento diferido acumulado: la factura que se paga después.
    inf.deterioro = clamp01(
      inf.deterioro
      + 0.070 * Math.pow(1 - inf.mantenimiento, 1.5) * (0.30 + 0.70 * stock)
      - 0.11 * Math.max(0, cobertura - 0.85) * inf.mantenimiento,
    );

    // Desgaste anual base. Con mantenimiento pleno ronda el 1,2%; sin nada,
    // supera el 10% y en cuarenta años no queda nada de lo construido.
    const desgasteBase = (0.012 + 0.100 * Math.pow(1 - inf.mantenimiento, 1.6))
      * (1 + 0.55 * inf.deterioro);

    // Reconstruir sobre ruina rinde una fracción de lo que rinde mantener.
    const eficiencia = clamp01(0.26 + 0.64 * inf.mantenimiento - 0.28 * inf.deterioro);
    inf.eficienciaObra = eficiencia;

    // Prioridad social del gasto: qué parte de la obra va a agua, salud y
    // vivienda en vez de a transporte y energía.
    const cuotaSocial = clamp01(
      0.18
      + 0.26 * clamp01(sano(reg.democracia, 0.15))
      + 0.20 * clamp01(sano(n.social.derechosLaborales, 0.05))
      + 0.14 * clamp01(sano(n.social.movilizacion, 0.15))
      + 0.16 * clamp01(sano(n.demografia.urbanizacion, 0.12))
      - 0.14 * ajuste,
    );

    const gastoSocial = gastoRestante * cuotaSocial;
    const gastoObra = gastoRestante * (1 - cuotaSocial);

    const tasaObraBase = clamp01((0.035 + 1.10 * gastoObra) * (0.35 + 0.65 * eficiencia));

    // =====================================================================
    // 4. FERROCARRIL: quién lo construye decide para dónde apunta
    // =====================================================================

    // Desde que aparece el camión, el Estado deja de poner rieles y pone
    // asfalto. Ahí empieza el problema de los ramales.
    const cuotaFerro = clamp01(
      0.88 - 0.55 * dispVial
      + 0.22 * bandera(f, 'ferrocarriles_nacionalizados')
      - 0.25 * bandera(f, 'ramales_cerrados'),
    );

    const demandaFerro = clamp01(
      0.35
      + 0.40 * clamp01(sano(n.recursos.agro, 0.5))
      + 0.30 * clamp01(sano(eco.industrializacion, 0.05))
      + 0.20 * clamp01(sano(n.demografia.poblacion / 25, 0.02)),
    );

    const obraFerroEstatal = gastoObra * cuotaFerro * capacidadObraEstatal * dispFerro;
    const obraFerroExtranjera = apetitoExtranjero * dispFerro * cuotaFerro
      * clamp01(0.30 + 0.70 * clamp01(sano(n.recursos.agro, 0.5)));

    const objFerro = clamp01(
      (obraFerroEstatal * 2.6 * eficiencia + obraFerroExtranjera * 1.15) * demandaFerro,
    );

    const desgasteFerro = desgasteBase * SENSIBILIDAD_DESGASTE.ferrocarril
      * (1 + 0.55 * bandera(f, 'ramales_cerrados'))
      * (1 + 0.25 * dispVial * (1 - inf.mantenimiento));

    const ferroAnterior = inf.ferrocarril;
    inf.ferrocarril = evolucionarStock(
      inf.ferrocarril, objFerro,
      tasaObraBase * (0.5 + 0.9 * (obraFerroEstatal + obraFerroExtranjera) / 0.25),
      desgasteFerro,
    );

    // --- Control nacional: se decide kilómetro a kilómetro -----------------
    // El control es la proporción de red construida o comprada por el Estado.
    // Se calcula sobre el stock, no por decreto: cada año de concesiones
    // extranjeras diluye lo que había.
    const nuevoEstatal = Math.max(0, obraFerroEstatal * 2.6 * eficiencia) * 0.35;
    const nuevoExtranjero = Math.max(0, obraFerroExtranjera * 1.15) * 0.35;
    const baseFerro = Math.max(0.02, ferroAnterior);
    let control = sano(
      (inf.controlNacionalFerrocarril * baseFerro + nuevoEstatal)
      / (baseFerro + nuevoEstatal + nuevoExtranjero),
      inf.controlNacionalFerrocarril,
    );

    // Compras y ventas del paquete accionario: los saltos vienen de eventos.
    if (f.ferrocarriles_nacionalizados) control = hacia(control, 0.94, 0.32);
    if (f.reestatizaciones) control = hacia(control, 0.80, 0.16);
    if (f.privatizaciones) control = hacia(control, 0.14, 0.26);
    if (f.ferrocarril_britanico && !f.ferrocarriles_nacionalizados) control = hacia(control, 0.10, 0.14);
    inf.controlNacionalFerrocarril = clamp01(control);

    // La garantía de rentabilidad: el Estado le asegura al concesionario un
    // porcentaje sobre el capital declarado. Si la línea pierde, paga el
    // Tesoro; si gana, gira la utilidad afuera.
    inf.garantiaFerroviaria = clamp01(hacia(
      inf.garantiaFerroviaria,
      clamp01((1 - inf.controlNacionalFerrocarril) * garantiaDisponible
        * clamp01(0.25 + 0.9 * inf.ferrocarril)),
      0.12,
    ));

    inf.giroUtilidades = clamp01(hacia(
      inf.giroUtilidades,
      clamp01(
        (1 - inf.controlNacionalFerrocarril) * (0.45 * inf.ferrocarril + 0.25 * inf.puertos)
        + 0.30 * clamp01(sano(n.exterior.ied, 0.05)) * (0.4 + 0.6 * inf.energia)
        + 0.20 * inf.garantiaFerroviaria,
      ),
      0.10,
    ));

    // =====================================================================
    // 5. RUTAS
    // El camión es mallador por naturaleza — no necesita una terminal única —
    // pero sólo si hay plan vial; si no, repite el abanico sobre asfalto.
    // =====================================================================
    const objRutas = clamp01(
      dispVial * (
        0.06
        + 2.4 * gastoObra * (1 - cuotaFerro * 0.6) * (0.35 + 0.65 * capacidadObraEstatal)
        + 0.26 * bandera(f, 'red_vial_nacional')
        + 0.14 * clamp01(sano(n.recursos.petroleo, 0))
        + 0.12 * clamp01(sano(eco.industrializacion, 0.05))
      ) * (0.6 + 0.4 * eficiencia),
    );
    inf.rutas = evolucionarStock(
      inf.rutas, objRutas,
      tasaObraBase * (0.7 + 0.8 * dispVial),
      desgasteBase * SENSIBILIDAD_DESGASTE.rutas,
    );

    // =====================================================================
    // 6. PUERTOS Y CENTRALISMO PORTUARIO
    // =====================================================================
    const comercioExterior = clamp01(
      0.30 + 0.45 * clamp01(sano(cfg.apertura, 0.6)) + 0.35 * clamp01(sano(n.recursos.agro, 0.5)),
    );
    const objPuertos = clamp01(
      0.10
      + 1.7 * gastoObra * 0.35
      + 0.45 * comercioExterior * (0.35 + 0.65 * (apetitoExtranjero + capacidadObraEstatal) / 2)
      + 0.18 * bandera(f, 'puerto_multiple'),
    );
    inf.puertos = evolucionarStock(
      inf.puertos, objPuertos, tasaObraBase * 0.9,
      desgasteBase * SENSIBILIDAD_DESGASTE.puertos,
    );

    // El embudo. Sube con red extranjera (el trazado lo decide el exportador),
    // con librecambio y con unitarismo; baja con red estatal, plan vial,
    // puertos múltiples, industria en el interior e integración regional.
    const objCentralismo = clamp01(
      0.34
      + 0.32 * (1 - inf.controlNacionalFerrocarril) * clamp01(0.25 + 0.9 * inf.ferrocarril)
      + 0.18 * clamp01(sano(cfg.apertura, 0.6))
      + 0.14 * bandera(f, 'librecambio')
      + 0.14 * (1 - clamp01(sano(cfg.federalismo, 0.4)))
      + 0.09 * bandera(f, 'capital_federalizada')
      + 0.12 * clamp01(sano(act.portuarios, 0.5))
      - 0.24 * bandera(f, 'puerto_multiple')
      - 0.18 * bandera(f, 'red_vial_nacional')
      - 0.16 * inf.rutas
      - 0.18 * clamp01(sano(eco.industrializacion, 0.05))
      - 0.10 * bandera(f, 'mercosur')
      - 0.12 * clamp01(sano(n.exterior.integracionRegional, 0.1)),
    );
    // Muy inercial: es cemento, no una ley. Cambiar el embudo lleva décadas.
    inf.centralismoPortuario = clamp01(hacia(inf.centralismoPortuario, objCentralismo, 0.055));

    // =====================================================================
    // 7. ENERGÍA: el cuello de botella del desarrollo
    // Sin energía no hay industria, por más aduana proteccionista que haya.
    // =====================================================================
    const m = inf.matriz;
    const petroleo = clamp01(sano(n.recursos.petroleo, 0));
    const gas = clamp01(sano(n.recursos.gas, 0));
    const propioFosil = clamp01((petroleo + gas) / 1.15);

    const demandaEnergia = clamp01(
      0.08
      + 0.46 * clamp01(sano(eco.industrializacion, 0.05))
      + 0.24 * clamp01(sano(n.demografia.urbanizacion, 0.12))
      + 0.22 * clamp01(sano(eco.pbiPerCapita / 14000, 0.08)),
    );
    inf.demandaEnergia = demandaEnergia;

    const inversionEnergia = gastoObra * 0.30 + apetitoExtranjero * 0.10;

    // Leña y carbón: la base preindustrial y la primera industria importada.
    m.lena = clamp01(hacia(m.lena, clamp01(
      (0.75 - 0.55 * dispElectrica) * clamp01(sano(n.recursos.bosques, 0.5))
      * (1 - 0.5 * clamp01(sano(n.demografia.urbanizacion, 0.12))),
    ), 0.08));

    m.carbon = clamp01(hacia(m.carbon, clamp01(
      dispCarbon * clamp01(sano(cfg.apertura, 0.6)) * (0.35 + 0.65 * demandaEnergia)
      * (1 - 0.6 * propioFosil),
    ), 0.10));

    // Térmica: primero con combustible importado, después con petróleo y gas
    // propios. YPF y Gas del Estado son lo que convierte oferta en soberanía.
    const empujeFosil = clamp01(
      0.25 * dispPetroleo * (0.3 + 0.7 * petroleo)
      + 0.40 * dispGas * (0.3 + 0.7 * gas)
      + 0.20 * bandera(f, 'ypf_creada')
      + 0.12 * bandera(f, 'gas_del_estado')
      + 0.20 * bandera(f, 'vaca_muerta') * suave(año, 2011, 2028)
      + 0.30 * clamp01(sano(cfg.apertura, 0.6)) * dispElectrica * (1 - propioFosil),
    );
    m.termica = clamp01(hacia(m.termica, clamp01(
      empujeFosil * (0.35 + 0.65 * demandaEnergia) * (0.45 + 0.55 * (0.5 + 2 * inversionEnergia)),
    ), 0.07));

    // Hidroelectricidad: salto de capacidad que tarda décadas y necesita
    // capacidad técnica y acuerdo con el vecino de enfrente.
    m.hidro = clamp01(hacia(m.hidro, clamp01(
      dispHidro * clamp01(sano(n.recursos.agua, 0.6)) * (
        0.20 * capacidadObraEstatal
        + 0.55 * bandera(f, 'hidroelectricas')
        + 0.20 * clamp01(sano(n.exterior.integracionRegional, 0.1))
      ),
    ), 0.035));

    // Nuclear: sólo con programa explícito y con ciencia propia detrás.
    m.nuclear = clamp01(hacia(m.nuclear, clamp01(
      dispNuclear * bandera(f, 'energia_nuclear')
      * clamp01(0.20 + 0.80 * clamp01(sano(n.educacion.cienciaTecnica, 0.05)))
      * (0.6 + 0.4 * capacidadObraEstatal) * 0.85,
    ), 0.028));

    m.renovable = clamp01(hacia(m.renovable, clamp01(
      dispRenovable * (
        0.30
        + 0.35 * clamp01(sano(n.educacion.cienciaTecnica, 0.05))
        + 0.25 * clamp01(sano(n.exterior.ied, 0.05))
        + 0.25 * capacidadObraEstatal
      ) * 0.8,
    ), 0.06));

    // Oferta agregada. Los coeficientes son "cuánta potencia aporta cada
    // fuente cuando está desarrollada al máximo".
    const ofertaBruta = clamp01(
      0.22 * m.lena + 0.34 * m.carbon + 0.85 * m.termica
      + 0.55 * m.hidro + 0.30 * m.nuclear + 0.32 * m.renovable,
    );

    const objEnergia = clamp01(
      ofertaBruta
      * (0.55 + 0.45 * inf.mantenimiento)          // la red de distribución
      * (0.60 + 0.40 * inf.integracionTerritorial) // interconexión entre regiones
    );
    inf.energia = evolucionarStock(
      inf.energia, objEnergia, clamp01(tasaObraBase + 0.04 + 0.4 * inversionEnergia),
      desgasteBase * SENSIBILIDAD_DESGASTE.energia,
    );

    const importada = 0.34 * m.carbon + 0.85 * m.termica * (1 - propioFosil);
    const propia = 0.22 * m.lena + 0.85 * m.termica * propioFosil
      + 0.55 * m.hidro + 0.30 * m.nuclear + 0.32 * m.renovable;
    inf.autoabastecimientoEnergetico = clamp01(sano(propia / Math.max(1e-6, propia + importada), 1));
    inf.dependenciaEnergetica = clamp01(1 - inf.autoabastecimientoEnergetico);
    inf.matrizRenovable = clamp01(sano(
      (0.55 * m.hidro + 0.32 * m.renovable) / Math.max(1e-6, ofertaBruta), 0.05,
    ));

    // Lo que la economía lee como techo: energía que la industria pide y no
    // encuentra. La energía importada además se paga en dólares.
    inf.cuelloBotellaEnergetico = clamp01(demandaEnergia - inf.energia);

    // =====================================================================
    // 8. INFRAESTRUCTURA SOCIAL
    // Determina mortalidad y esperanza de vida (las lee demografía). La
    // urbanización acelerada sin inversión produce villa y epidemia.
    // =====================================================================
    const urb = clamp01(sano(n.demografia.urbanizacion, 0.12));
    const urbAcelerada = clamp01((urb - inf.urbanizacionPrevia) * 14);
    inf.urbanizacionPrevia = urb;

    const gastoAgua = gastoSocial * 0.36;
    const gastoSalud = gastoSocial * 0.34;
    const gastoVivienda = gastoSocial * 0.30;

    // Las redes de agua y cloaca rinden más donde hay densidad, pero la
    // demanda crece más rápido que la obra cuando la ciudad estalla.
    const objAgua = clamp01(
      (0.04 + 3.4 * gastoAgua * (0.55 + 0.55 * urb))
      * (0.55 + 0.45 * capacidadEstatal)
      * (1 - 0.35 * urbAcelerada),
    );
    inf.agua_saneamiento = evolucionarStock(
      inf.agua_saneamiento, objAgua, clamp01(0.05 + 0.9 * gastoAgua * 6) * (0.4 + 0.6 * eficiencia),
      desgasteBase * SENSIBILIDAD_DESGASTE.agua_saneamiento,
    );

    const objSalud = clamp01(
      (0.03 + 3.6 * gastoSalud)
      * (0.45 + 0.55 * capacidadEstatal)
      * (0.60 + 0.40 * (1 + 2 * clamp01(sano(n.educacion.superior, 0.01)))),
    );
    inf.salud = evolucionarStock(
      inf.salud, objSalud, clamp01(0.05 + 0.9 * gastoSalud * 6) * (0.4 + 0.6 * eficiencia),
      desgasteBase * SENSIBILIDAD_DESGASTE.salud,
    );

    // La vivienda compite contra la llegada de gente. Si la ciudad crece más
    // rápido de lo que se construye, el saldo es asentamiento informal.
    const presionHabitacional = clamp01(0.25 * urb + 0.75 * urbAcelerada
      + 0.30 * clamp01(sano(n.social.pobreza, 0.4)));
    const objVivienda = clamp01(
      (0.12 + 3.2 * gastoVivienda + 0.20 * clamp01(1 - sano(n.social.pobreza, 0.4)))
      * (1 - 0.45 * presionHabitacional),
    );
    inf.vivienda = evolucionarStock(
      inf.vivienda, objVivienda, clamp01(0.05 + 0.9 * gastoVivienda * 6) * (0.4 + 0.6 * eficiencia),
      desgasteBase * SENSIBILIDAD_DESGASTE.vivienda,
    );

    inf.deficitHabitacional = clamp01(hacia(
      inf.deficitHabitacional,
      clamp01(0.10 + 0.85 * urb * (1 - inf.vivienda) + 0.40 * urbAcelerada - 0.30 * gastoVivienda * 6),
      0.14,
    ));

    inf.riesgoSanitario = clamp01(
      0.85 * (1 - inf.agua_saneamiento) * (0.35 + 0.65 * urb)
      + 0.30 * inf.deficitHabitacional * urb
      - 0.25 * inf.salud,
    );

    // =====================================================================
    // 9. DIGITAL
    // Misma pregunta de siempre: si la pone el privado sigue la densidad de
    // población y concentra; si hay política federal, mallado y alcance.
    // =====================================================================
    const objDigital = clamp01(
      dispDigital * (
        0.12
        + 0.42 * clamp01(sano(eco.pbiPerCapita / 12000, 0.1))
        + 0.28 * clamp01(sano(n.educacion.superior, 0.01) * 3)
        + 0.30 * clamp01(sano(n.exterior.ied, 0.05))
        + 0.30 * (gastoObra * 3)
        + 0.20 * bandera(f, 'conectividad_digital')
      ) * (0.55 + 0.45 * inf.energia),
    );
    inf.digital = evolucionarStock(
      inf.digital, objDigital, clamp01(0.10 + 1.4 * gastoObra + 0.25 * dispDigital),
      desgasteBase * SENSIBILIDAD_DESGASTE.digital,
    );

    inf.digitalFederal = clamp01(hacia(
      inf.digitalFederal,
      clamp01(
        inf.digital * (
          0.20
          + 0.40 * bandera(f, 'conectividad_digital')
          + 0.30 * capacidadEstatal
          + 0.25 * clamp01(sano(cfg.federalismo, 0.4))
          - 0.25 * bandera(f, 'privatizaciones')
        ),
      ),
      0.12,
    ));

    // =====================================================================
    // 10. INTEGRACIÓN TERRITORIAL
    // La malla efectiva: red construida, descontado el embudo y descontado
    // lo que se cayó por falta de mantenimiento.
    // =====================================================================
    const redEfectiva = clamp01(
      0.40 * inf.ferrocarril + 0.30 * inf.rutas
      + 0.16 * inf.energia + 0.14 * inf.digitalFederal,
    ) * (0.42 + 0.58 * inf.mantenimiento);

    inf.malla = clamp01(redEfectiva * (1 - 0.85 * inf.centralismoPortuario));

    const politicaFederal = clamp01(sano(cfg.federalismo, 0.4)) * capacidadEstatal;
    const objIntegracion = clamp01(
      0.06
      + 0.78 * inf.malla
      + 0.14 * politicaFederal
      + 0.08 * bandera(f, 'red_vial_nacional')
      + 0.06 * bandera(f, 'conectividad_digital')
      + 0.06 * bandera(f, 'ferrocarriles_nacionalizados')
      - 0.16 * bandera(f, 'ramales_cerrados')
      - 0.10 * inf.deterioro,
    );
    inf.integracionTerritorial = clamp01(hacia(inf.integracionTerritorial, objIntegracion, 0.09));

    // --- Los dos precios que explican el modelo ---------------------------
    // El abanico abarata sacar la materia prima y encarece mover mercadería
    // entre provincias. La malla hace exactamente lo contrario.
    const redExportadora = clamp01(
      0.50 * inf.ferrocarril * (0.45 + 0.55 * inf.centralismoPortuario)
      + 0.30 * inf.puertos
      + 0.20 * inf.rutas,
    ) * (0.5 + 0.5 * inf.mantenimiento);

    inf.costoExportacion = clamp01(0.92 - 0.62 * redExportadora);
    inf.costoComercioInterno = clamp01(
      0.92 - 0.60 * inf.integracionTerritorial + 0.20 * inf.centralismoPortuario - 0.14 * inf.rutas,
    );

    // =====================================================================
    // 11. REPARTO TERRITORIAL
    // Las provincias sobre el corredor mejoran; las periféricas quedan atrás
    // salvo que exista política federal deliberada que pague la diferencia.
    // =====================================================================
    const nivelNacional = clamp01(
      0.28 * inf.ferrocarril + 0.22 * inf.rutas + 0.16 * inf.energia
      + 0.14 * inf.agua_saneamiento + 0.10 * inf.puertos + 0.10 * inf.digital,
    );
    const radial = inf.centralismoPortuario;
    const empujeFederalObra = clamp01(
      politicaFederal * (1 + 0.5 * bandera(f, 'red_vial_nacional'))
      * (1 - 0.5 * ajuste) * (0.4 + 0.6 * inf.controlNacionalFerrocarril),
    );

    let sumaInfra = 0;
    let cuenta = 0;
    const atracciones = [];

    for (const p of estado.provincias) {
      const g = geoDe(p);
      const integracionProv = clamp01(sano(p.integracion, 0));

      // A quién sirve la red construida.
      const beneficio = clamp01(g.pesoRadial * radial + g.pesoMallado * (1 - radial));
      // El Estado sólo construye donde efectivamente llega.
      const alcance = 0.22 + 0.78 * integracionProv;
      // Construir lejos y en la cordillera cuesta más por kilómetro.
      const castigoCosto = 1 - 0.35 * g.costoObra * (1 - empujeFederalObra);

      const prioridad = clamp01(
        (beneficio * (0.52 + 0.48 * alcance) + 0.30 * empujeFederalObra * g.pesoMallado)
        * castigoCosto,
      );

      const objetivoProv = clamp01(nivelNacional * (0.32 + 0.95 * prioridad));

      // El abandono se cobra primero en la periferia: los ramales que se
      // cierran son siempre los de menor tráfico, nunca los del corredor.
      const desgasteProv = desgasteBase
        * (0.70 + 0.70 * g.perifericidad)
        * (1 + 0.45 * bandera(f, 'ramales_cerrados') * g.perifericidad);

      const tasaProv = clamp01(tasaObraBase * (0.55 + 0.75 * prioridad));
      p.infraestructura = evolucionarStock(
        clamp01(sano(p.infraestructura, 0)), objetivoProv, tasaProv, desgasteProv,
      );

      // Aporte parcial al desarrollo provincial: la infraestructura es un
      // insumo, no el dueño del campo. Tasa deliberadamente baja.
      const techoDesarrollo = clamp01(
        0.10
        + 0.52 * p.infraestructura
        + 0.24 * clamp01(sano(eco.pbiPerCapita / 12000, 0.1))
        + 0.14 * (1 - inf.costoComercioInterno) * g.perifericidad
      );
      p.desarrollo = clamp01(hacia(clamp01(sano(p.desarrollo, 0)), techoDesarrollo, 0.045));

      // Señal de migración interna: adónde tira la red. Con abanico, todo
      // tira al puerto; con malla, el interior retiene su gente.
      const atraccion = clamp01(
        0.10
        + 0.42 * p.infraestructura
        + 0.22 * clamp01(sano(p.desarrollo, 0))
        + 0.30 * g.pesoRadial * radial
        - 0.22 * g.perifericidad * (1 - inf.integracionTerritorial),
      );

      const accesibilidad = clamp01(
        0.15 + 0.55 * p.infraestructura + 0.30 * inf.integracionTerritorial - 0.20 * g.distNorm,
      );

      inf.territorio[p.id] = {
        infraestructura: p.infraestructura,
        prioridad,
        atraccion,
        accesibilidad,
        costoInterno: clamp01(
          inf.costoComercioInterno * (0.55 + 0.75 * (1 - p.infraestructura))
          * (0.70 + 0.55 * g.perifericidad),
        ),
      };

      atracciones.push(atraccion);
      sumaInfra += p.infraestructura;
      cuenta += 1;
    }

    // Brecha territorial: dispersión de la infraestructura entre provincias.
    const media = cuenta ? sumaInfra / cuenta : 0;
    let varianza = 0;
    for (const p of estado.provincias) varianza += (p.infraestructura - media) ** 2;
    varianza = cuenta ? varianza / cuenta : 0;
    inf.brechaTerritorial = clamp01(sano(Math.sqrt(varianza) / Math.max(0.06, media), 0));

    // Concentración de la atracción migratoria: cuánto se lleva el que más
    // tira respecto del promedio.
    const maxAtraccion = atracciones.length ? Math.max(...atracciones) : 0;
    const mediaAtraccion = atracciones.length
      ? atracciones.reduce((a, b) => a + b, 0) / atracciones.length : 0;
    inf.concentracionMigratoria = clamp01(sano(
      (maxAtraccion - mediaAtraccion) / Math.max(0.05, maxAtraccion), 0,
    ));

    // =====================================================================
    // 12. RAMALES CERRADOS COMO HECHO FÍSICO
    // Normalmente lo enciende un evento (Plan Larkin, 1961; concesiones de
    // 1992). Pero si la red se abandona lo suficiente, pasa igual: no hace
    // falta firmar nada para que un ramal deje de existir.
    // =====================================================================
    if (!f.ramales_cerrados && año > 1930
        && inf.ferrocarril > 0.20 && inf.mantenimiento < 0.28 && inf.deterioro > 0.62) {
      estado.flags.ramales_cerrados = true;
      if (typeof ctx.log === 'function') {
        ctx.log('Se levantan los ramales de menor tráfico: sin mantenimiento, la vía dejó de existir antes que el decreto.',
          ['infraestructura', 'ferrocarril']);
      }
    }

    // =====================================================================
    // 13. PRESIONES
    // =====================================================================
    const aporteRegional = clamp01(
      0.012
      + 0.095 * inf.brechaTerritorial
      + 0.075 * inf.centralismoPortuario * (1 - inf.integracionTerritorial)
      + 0.055 * bandera(f, 'ramales_cerrados') * (1 - inf.mantenimiento)
      + 0.045 * clamp01(sano(cfg.federalismo, 0.4)) * (1 - inf.integracionTerritorial)
      + 0.030 * inf.concentracionMigratoria * (1 - inf.integracionTerritorial),
    );

    const aporteFiscal = clamp01(
      0.045 * inf.garantiaFerroviaria
      + 0.045 * inf.deterioro                                   // la factura diferida
      + 0.040 * inf.dependenciaEnergetica * inf.demandaEnergia  // combustible importado
      + 0.030 * gastoObra * 3
      + 0.030 * inf.deficitHabitacional * urb,
    );

    const ruido = 1 + (rng && typeof rng.normal === 'function'
      ? rng.normal(0.12) * clamp01(volatilidad) : 0);

    estado.presiones.regional = clamp01(
      sano(estado.presiones.regional, 0) + aporteRegional * Math.max(0.3, ruido),
    );
    estado.presiones.fiscal = clamp01(
      sano(estado.presiones.fiscal, 0) + aporteFiscal * Math.max(0.3, ruido),
    );

    // =====================================================================
    // 14. Instantánea para calcular tendencias en la interfaz
    // =====================================================================
    inf.previo = {
      ferrocarril: inf.ferrocarril,
      control: inf.controlNacionalFerrocarril,
      integracion: inf.integracionTerritorial,
      centralismo: inf.centralismoPortuario,
      energia: inf.energia,
      mantenimiento: inf.mantenimiento,
      agua: inf.agua_saneamiento,
      brecha: inf.brechaTerritorial,
    };
  },

  indicadores(estado) {
    const inf = estado.nacion.infraestructura;
    asegurar(inf);
    const prev = inf.previo || {};
    const d = (v, k) => sano(v - sano(prev[k], v), 0);

    return [
      {
        clave: 'ferrocarril',
        etiqueta: 'Red ferroviaria',
        valor: inf.ferrocarril,
        formato: 'indice',
        tendencia: d(inf.ferrocarril, 'ferrocarril'),
        ayuda: 'Kilómetros de vía en servicio, en índice 0..1. Se cae sola si nadie la mantiene.',
      },
      {
        clave: 'control_ferroviario',
        etiqueta: 'Red en manos nacionales',
        valor: inf.controlNacionalFerrocarril,
        formato: 'porcentaje',
        tendencia: d(inf.controlNacionalFerrocarril, 'control'),
        ayuda: 'Proporción de la red construida o comprada por el Estado. El resto se trazó según la conveniencia exportadora del concesionario y gira utilidades al exterior.',
      },
      {
        clave: 'integracion_territorial',
        etiqueta: 'Integración territorial',
        valor: inf.integracionTerritorial,
        formato: 'indice',
        tendencia: d(inf.integracionTerritorial, 'integracion'),
        ayuda: 'Cuánta red conecta provincias entre sí y no sólo cada provincia con el puerto. Es lo que hace posible un mercado interno.',
      },
      {
        clave: 'centralismo_portuario',
        etiqueta: 'Centralismo portuario',
        valor: inf.centralismoPortuario,
        formato: 'porcentaje',
        tendencia: d(inf.centralismoPortuario, 'centralismo'),
        ayuda: 'Cuánto del tráfico embudo hacia una sola boca. Alto abarata exportar materia prima y encarece el comercio entre provincias.',
      },
      {
        clave: 'energia',
        etiqueta: 'Capacidad energética',
        valor: inf.energia,
        formato: 'indice',
        tendencia: d(inf.energia, 'energia'),
        ayuda: `Sin energía no hay industria. Demanda insatisfecha: ${(inf.cuelloBotellaEnergetico * 100).toFixed(0)}%. Autoabastecimiento: ${(inf.autoabastecimientoEnergetico * 100).toFixed(0)}%.`,
      },
      {
        clave: 'mantenimiento',
        etiqueta: 'Mantenimiento',
        valor: inf.mantenimiento,
        formato: 'porcentaje',
        tendencia: d(inf.mantenimiento, 'mantenimiento'),
        ayuda: `Cobertura del gasto de conservación sobre el stock a conservar. Mantenimiento diferido acumulado: ${(inf.deterioro * 100).toFixed(0)}%. Reconstruir cuesta varias veces lo que cuesta mantener.`,
      },
      {
        clave: 'agua_saneamiento',
        etiqueta: 'Agua y saneamiento',
        valor: inf.agua_saneamiento,
        formato: 'porcentaje',
        tendencia: d(inf.agua_saneamiento, 'agua'),
        ayuda: `Determina mortalidad y esperanza de vida. Déficit habitacional urbano: ${(inf.deficitHabitacional * 100).toFixed(0)}%.`,
      },
      {
        clave: 'brecha_territorial',
        etiqueta: 'Brecha entre provincias',
        valor: inf.brechaTerritorial,
        formato: 'indice',
        tendencia: d(inf.brechaTerritorial, 'brecha'),
        ayuda: 'Dispersión de la infraestructura provincial. Sube cuando la red sirve al corredor exportador y deja afuera al resto.',
      },
    ];
  },
};
