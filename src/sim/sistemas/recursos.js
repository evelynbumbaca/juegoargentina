// ---------------------------------------------------------------------------
// SISTEMA 10 — RECURSOS NATURALES
// ---------------------------------------------------------------------------
// Dueño de `estado.nacion.recursos` y del campo `agro` de cada provincia.
// Aporta a `estado.presiones.ecologica` y (cuando el clima o la fuga de renta
// castigan las divisas) a `estado.presiones.externa`.
//
// Dos escalas conviven en este dominio y conviene no confundirlas:
//
//   · STOCK / SALUD del recurso renovable — `agro` (fertilidad disponible),
//     `ganaderia`, `bosques`, `agua`, `biodiversidad`. Empiezan altos en 1810
//     porque el país todavía no tocó casi nada, y sólo bajan por degradación.
//   · NIVEL DE EXPLOTACIÓN efectiva del recurso no renovable o extractivo —
//     `petroleo`, `gas`, `litio`, `mineria`, `pesca`. Empiezan en ~0 porque
//     el recurso existe pero nadie lo saca todavía: hace falta que alguien lo
//     descubra y que haya técnica, energía y capital para extraerlo.
//
// El techo de cada recurso NO es un número inventado: sale de sumar el campo
// `aptitud` de las 24 provincias. El mapa manda. La Patagonia (Neuquén 0.95 de
// petróleo, 1.0 de gas) define el potencial hidrocarburífero; la Puna (Jujuy
// 0.95, Catamarca 0.85, Salta 0.8) el de litio; la cordillera (San Juan 0.9,
// Catamarca 0.85) el minero; el mar patagónico (Tierra del Fuego 0.95, Santa
// Cruz 0.9, Chubut 0.85) el pesquero; la pampa húmeda el agrícola. Una partida
// jugada sobre otro mapa daría otra economía.
//
// Campos del contrato: agro, ganaderia, petroleo, gas, litio, mineria, pesca,
// bosques, agua, biodiversidad, sostenibilidad, controlNacional,
// rentaExtractiva, descubiertos.
//
// Campos derivados que este sistema agrega y que otros sistemas pueden LEER:
//   potencial{}            techos por recurso derivados del mapa (0..1)
//   exploracion            capacidad exploratoria acumulada
//   agotamiento            declino de los yacimientos convencionales
//   rentaFugada            parte de la renta extractiva girada al exterior
//   rentaRetenida          parte que se queda en el país
//   erosion                pérdida de fertilidad por monocultivo
//   estresHidrico          presión sobre el agua (riego + megaminería)
//   sobrepesca             sobreexplotación del caladero
//   deforestacion          fracción acumulada de bosque nativo perdida
//   sequia                 intensidad del shock climático del año (0..1)
//   mermaExportable        fracción del saldo agroexportable que se pierde
//   productividadPotencial factor 0..1 que economía debe aplicar al agro
//   previo{}               memoria de un año para calcular tendencias
//
// CONTRATO DE LECTURA PARA OTROS SISTEMAS
//   economia: exportaciones agrarias = f(producción) × (1 - mermaExportable),
//             y productividadAgro no puede superar `productividadPotencial`.
//   deuda:    `rentaFugada` es giro de utilidades: sale del país en divisas y
//             agrava la restricción externa aunque el PBI crezca.
// ---------------------------------------------------------------------------

import { clamp, clamp01, hacia, suave, logistica, sano } from '../../core/util.js';

/**
 * Divisores que convierten la suma de aptitudes provinciales en un techo 0..1.
 * Están calibrados para que Argentina quede donde le corresponde en el mundo:
 * potencia agropecuaria y litífera de primer orden, gasífera importante,
 * petrolera y minera mediana-alta, pesquera considerable.
 */
const ESCALA_POTENCIAL = {
  agro: 13.5, ganaderia: 13.5, petroleo: 8.5, gas: 7.0, litio: 3.8,
  mineria: 10.0, pesca: 9.0, bosques: 13.0, agua: 17.0,
};

/** La aptitud provincial llama `bosque` a lo que el estado nacional llama `bosques`. */
const APTITUD_DE = { bosques: 'bosque' };

/** Suma las aptitudes del mapa y devuelve el techo de cada recurso. */
function calcularPotencial(estado) {
  const suma = {};
  for (const k of Object.keys(ESCALA_POTENCIAL)) suma[k] = 0;
  for (const p of estado.provincias || []) {
    const a = p.aptitud || {};
    for (const k of Object.keys(ESCALA_POTENCIAL)) {
      suma[k] += sano(Number(a[APTITUD_DE[k] || k]), 0);
    }
  }
  const pot = {};
  for (const k of Object.keys(ESCALA_POTENCIAL)) {
    pot[k] = clamp01(sano(suma[k] / ESCALA_POTENCIAL[k], 0));
  }
  estado.nacion.recursos.potencial = pot;
  return pot;
}

/**
 * Frontera técnica mundial (0..1). No depende del país: el mundo inventa la
 * perforación rotativa, el gasoducto, la siembra directa y la batería de litio
 * con o sin nosotros. Lo que sí depende del país es qué hace con eso.
 * ~0.19 en 1900, ~0.45 en 1930, ~0.74 en 1960, ~0.94 en 2000.
 */
const tecnologiaMundial = (año) => clamp01(logistica(año, 1935, 0.042));

/** Aporte a una presión: empuja hacia un objetivo y suma shocks puntuales. */
function aportar(presiones, clave, objetivo, fuerza = 0.2, shock = 0) {
  const actual = sano(presiones[clave], 0);
  const aporte = Math.max(0, clamp01(objetivo) - actual) * clamp01(fuerza) + Math.max(0, shock);
  presiones[clave] = clamp01(actual + aporte);
}

/** Mueve un actor lentamente hacia un objetivo (tope del contrato: 0.02/año). */
function moverActor(actores, id, objetivo, maxPaso = 0.02) {
  const actual = sano(actores[id], 0);
  const d = clamp((clamp01(objetivo) - actual) * 0.15, -maxPaso, maxPaso);
  actores[id] = clamp01(actual + d);
}

/** Marca un recurso como descubierto una sola vez y lo cuenta en la historia. */
function descubrir(estado, ctx, clave, texto) {
  const r = estado.nacion.recursos;
  if (!Array.isArray(r.descubiertos)) r.descubiertos = [];
  if (r.descubiertos.includes(clave)) return false;
  r.descubiertos.push(clave);
  if (texto && ctx?.log) ctx.log(texto, ['recursos', 'descubrimiento']);
  return true;
}

export default {
  meta: {
    id: 'recursos',
    nombre: 'Recursos naturales',
    orden: 10,
    descripcion: 'Suelo, bosque, agua y subsuelo: descubrimiento, renta, control nacional y degradación.',
  },

  init(estado) {
    const r = estado.nacion.recursos;
    calcularPotencial(estado);
    if (!Array.isArray(r.descubiertos)) r.descubiertos = [];

    // Ningún stock puede arrancar por encima de lo que el mapa permite.
    r.agro = Math.min(r.agro, r.potencial.agro + 0.05);
    r.ganaderia = Math.min(r.ganaderia, r.potencial.ganaderia + 0.05);
    r.bosques = Math.min(r.bosques, r.potencial.bosques + 0.1);
    r.pesca = Math.min(r.pesca, r.potencial.pesca);

    r.exploracion = 0.02;
    r.agotamiento = 0;
    r.rentaFugada = 0;
    r.rentaRetenida = 0;
    r.erosion = 0.02;
    r.estresHidrico = 0.02;
    r.sobrepesca = 0;
    r.deforestacion = 0;
    r.sequia = 0;
    r.mermaExportable = 0;
    r.productividadPotencial = 1;
    r.previo = {
      sostenibilidad: r.sostenibilidad,
      renta: r.rentaExtractiva,
      control: r.controlNacional,
      bosques: r.bosques,
      hidrocarburos: 0,
      fuga: 0,
    };
  },

  paso(estado, rng, ctx) {
    const n = estado.nacion;
    const r = n.recursos;
    const f = estado.flags || {};
    const cfg = estado.config;
    const año = ctx.año;
    if (!r.potencial) calcularPotencial(estado);
    if (!Array.isArray(r.descubiertos)) r.descubiertos = [];
    if (!r.previo) r.previo = { sostenibilidad: r.sostenibilidad, renta: 0, control: r.controlNacional, bosques: r.bosques, hidrocarburos: 0, fuga: 0 };

    const pot = r.potencial;
    const mundial = tecnologiaMundial(año);
    const vol = clamp(sano(cfg.volatilidad, 1), 0, 3);

    // =====================================================================
    // 1. CAPACIDAD TÉCNICA Y EXPLORATORIA
    // ---------------------------------------------------------------------
    // Un recurso enterrado no es riqueza: es geología. Para que se vuelva
    // riqueza hacen falta geólogos, torres, energía y plata. Un país sin
    // ciencia técnica ni energía sólo puede esperar que venga otro a sacarlo,
    // y entonces el recurso aparece igual pero la renta se va.
    // =====================================================================
    const tecnica = clamp01(
      n.educacion.cienciaTecnica * 0.45 +
      n.educacion.formacionTecnica * 0.2 +
      n.economia.productividadIndustrial * 0.15 +
      n.infraestructura.energia * 0.25
    );
    const capitalExterno = clamp01(n.exterior.ied * 0.9 + estado.actores.capitalExtranjero * 0.35);
    const capitalEstatal = clamp01(n.economia.pesoEstado * 0.6 + estado.regimen.capacidadEstatal * 0.5);
    const capital = clamp01(capitalExterno * 0.55 + capitalEstatal * 0.55);

    const objetivoExploracion = clamp01(0.55 * mundial * (0.35 + 0.65 * (tecnica + capital) / 1.4));
    r.exploracion = clamp01(hacia(sano(r.exploracion, 0), objetivoExploracion, 0.09));

    // Capacidad de extraer, distinta de la de descubrir: se apoya en la
    // técnica mundial (que llega igual), en la propia y en el capital.
    const capacidadExtractiva = clamp01(
      0.30 * mundial + 0.34 * tecnica + 0.38 * capital + 0.16 * n.infraestructura.energia
    );

    // =====================================================================
    // 2. CLIMA: SEQUÍAS COMO SHOCK ESTOCÁSTICO
    // ---------------------------------------------------------------------
    // Las secas argentinas vienen encadenadas (1949-52, 1962, 1988-89,
    // 2008-09, 2011-12, 2017-18, 2022-23) y pegan donde más duele: el saldo
    // exportable. La 2008-09 se llevó un tercio de la cosecha; la 2022-23,
    // unos 20.000 millones de dólares de exportaciones. Acá eso no es color
    // local: alimenta `mermaExportable` y `presiones.externa`.
    // La deforestación y el estrés hídrico suben la probabilidad: menos monte
    // y menos agua es más variabilidad climática.
    // =====================================================================
    const secaPrevia = sano(r.sequia, 0);
    const probSeca = clamp01(
      (0.10 +
        0.05 * suave(año, 1980, 2040) +          // clima cambiante
        0.09 * clamp01(1 - r.agua) +
        0.07 * sano(r.deforestacion, 0) +
        (secaPrevia > 0.3 ? 0.22 : 0)) * vol      // persistencia interanual
    );
    if (rng.chance(probSeca)) {
      r.sequia = clamp01(0.30 + Math.abs(rng.normal(0.30)) * (0.8 + 0.4 * vol));
      if (r.sequia > 0.65 && ctx.log) {
        ctx.log('Sequía severa: se seca la cosecha gruesa y se cae el saldo exportable del año.', ['clima', 'sequia']);
      }
    } else {
      r.sequia = clamp01(secaPrevia * 0.22);
    }

    // =====================================================================
    // 3. DESCUBRIMIENTO Y ACTIVACIÓN DEL SUBSUELO
    // ---------------------------------------------------------------------
    // Dos caminos: lo enciende un evento (banderas) o lo enciende la
    // capacidad propia. En 1907 el pozo de Comodoro buscaba agua: la
    // probabilidad endógena existe aun con un Estado pobre, pero es baja y
    // tardía. Con ciencia y energía se adelanta décadas.
    // =====================================================================
    if (f.petroleo_descubierto || f.ypf_creada) {
      descubrir(estado, ctx, 'petroleo', 'Se confirma petróleo en el subsuelo nacional.');
    } else if (año >= 1885 && !r.descubiertos.includes('petroleo')) {
      const p = clamp01(0.05 * suave(mundial, 0.12, 0.5) * (0.4 + 1.6 * r.exploracion) * vol);
      if (rng.chance(p)) descubrir(estado, ctx, 'petroleo', 'Una perforación da con petróleo: el subsuelo entra en la economía.');
    }
    const hayPetroleo = r.descubiertos.includes('petroleo');

    if (hayPetroleo && (f.gas_del_estado || año >= 1945)) {
      // El gas aparece asociado al petróleo, pero sin gasoductos no vale nada.
      if (n.infraestructura.energia > 0.05 || f.gas_del_estado || año >= 1960) {
        descubrir(estado, ctx, 'gas', 'El gas asociado deja de quemarse en antorcha y empieza a transportarse.');
      }
    }
    const hayGas = r.descubiertos.includes('gas');

    // No convencionales: shale. Necesita fractura hidráulica, o sea técnica
    // mundial madura y capacidad propia o capital de afuera dispuesto.
    if (f.vaca_muerta) descubrir(estado, ctx, 'no_convencionales', 'Vaca Muerta entra en producción: el techo hidrocarburífero se corre hacia arriba.');
    else if (hayPetroleo && año >= 2011 && (tecnica > 0.4 || capitalExterno > 0.35)) {
      if (rng.chance(0.16 * vol)) descubrir(estado, ctx, 'no_convencionales', 'Los no convencionales de Neuquén empiezan a producir.');
    }
    const noConvencional = r.descubiertos.includes('no_convencionales');

    // Litio: existe desde siempre, vale desde que el mundo hace baterías.
    if (f.litio_estatal || f.litio_concesionado) descubrir(estado, ctx, 'litio', 'Los salares de la Puna entran en producción.');
    else if (año >= 1992 && rng.chance(clamp01(0.10 * suave(mundial, 0.85, 0.99) + 0.10 * r.exploracion) * vol)) {
      descubrir(estado, ctx, 'litio', 'El litio del altiplano deja de ser una curiosidad química.');
    }
    const hayLitio = r.descubiertos.includes('litio');

    // Minería metalífera de escala: la megaminería a cielo abierto es un
    // salto discreto, no una continuidad de la minería artesanal.
    if (f.mineria_cielo_abierto) descubrir(estado, ctx, 'mineria_metalifera', 'La megaminería a cielo abierto se habilita en la cordillera.');
    else if (año >= 1993 && cfg.apertura > 0.5 && rng.chance(0.07 * vol)) {
      descubrir(estado, ctx, 'mineria_metalifera', 'Grandes proyectos metalíferos se instalan en la cordillera.');
    }
    const megamineria = r.descubiertos.includes('mineria_metalifera') || !!f.mineria_cielo_abierto;

    if (!r.descubiertos.includes('pesca_industrial') && año >= 1960 && n.infraestructura.puertos > 0.25) {
      descubrir(estado, ctx, 'pesca_industrial', 'La flota de altura industrializa el caladero.');
    }

    // =====================================================================
    // 4. NIVELES DE EXPLOTACIÓN
    // ---------------------------------------------------------------------
    // Cada recurso converge hacia su techo (potencial del mapa × capacidad),
    // corregido por agotamiento. Los convencionales declinan: el pico de
    // producción petrolera argentina fue 1998 y de ahí para abajo hasta que
    // los no convencionales corrieron el techo.
    // =====================================================================
    const consumoHidrocarburos = (r.petroleo + r.gas) * 0.5;
    r.agotamiento = clamp01(sano(r.agotamiento, 0) + consumoHidrocarburos * 0.0055 - (noConvencional ? 0.012 : 0));

    const techoPetroleo = clamp01(
      pot.petroleo * (0.20 + 0.80 * capacidadExtractiva) *
      (1 - 0.55 * r.agotamiento) * (1 + (noConvencional ? 0.45 : 0))
    );
    r.petroleo = clamp01(hacia(r.petroleo, hayPetroleo ? techoPetroleo : 0, hayPetroleo ? 0.10 : 0.25));

    const techoGas = clamp01(
      pot.gas * (0.15 + 0.85 * capacidadExtractiva) *
      (0.55 + 0.45 * n.infraestructura.energia) *
      (1 - 0.4 * r.agotamiento) * (1 + (noConvencional ? 0.55 : 0))
    );
    r.gas = clamp01(hacia(r.gas, hayGas ? techoGas : 0, hayGas ? 0.09 : 0.25));

    const techoLitio = clamp01(pot.litio * (0.10 + 0.70 * capacidadExtractiva) * (0.5 + 0.5 * suave(año, 2005, 2035)));
    r.litio = clamp01(hacia(r.litio, hayLitio ? techoLitio : 0, hayLitio ? 0.12 : 0.2));

    const techoMineria = clamp01(
      pot.mineria * (0.08 + 0.55 * capacidadExtractiva) * (megamineria ? 1.6 : 0.45)
    );
    r.mineria = clamp01(hacia(r.mineria, techoMineria, 0.07));

    // Pesca: el caladero es renovable hasta que se lo sobreexplota. El techo
    // efectivo cae con la sobrepesca (merluza hubbsi, años 90).
    const esfuerzoPesquero = clamp01(
      (0.15 + 0.55 * n.infraestructura.puertos + 0.45 * capitalExterno + 0.3 * mundial) *
      (r.descubiertos.includes('pesca_industrial') ? 1.25 : 0.55)
    );
    const techoPesca = clamp01(pot.pesca * esfuerzoPesquero * (1 - 0.65 * sano(r.sobrepesca, 0)));
    r.pesca = clamp01(hacia(r.pesca, techoPesca, 0.08));
    const excesoPesca = Math.max(0, r.pesca - pot.pesca * 0.62);
    r.sobrepesca = clamp01(sano(r.sobrepesca, 0) + excesoPesca * 0.09 - 0.008);

    // =====================================================================
    // 5. CONTROL NACIONAL Y RENTA EXTRACTIVA
    // ---------------------------------------------------------------------
    // La pregunta soberana no es cuánto se saca sino quién se queda con la
    // renta. `controlNacional` sube con empresa estatal (YPF 1922, Gas del
    // Estado 1945, reestatización 2012, litio provincial-estatal) y baja con
    // concesión, privatización, deuda que se paga entregando yacimientos y
    // condicionalidad externa. Lo que no se controla se gira al exterior:
    // `rentaFugada` sale en divisas y agrava la restricción externa.
    // =====================================================================
    let objControl = 0.5
      + 0.28 * n.economia.pesoEstado
      + 0.18 * estado.regimen.capacidadEstatal
      - 0.30 * clamp01(cfg.apertura)
      - 0.22 * n.exterior.ied
      - 0.18 * n.deuda.condicionalidad
      - 0.12 * suave(sano(n.deuda.deudaPbi, 0), 0.35, 1.3);
    if (f.ypf_creada) objControl += 0.22;
    if (f.gas_del_estado) objControl += 0.08;
    if (f.ypf_reestatizada) objControl += 0.20;
    if (f.litio_estatal) objControl += 0.08;
    if (f.reestatizaciones) objControl += 0.10;
    if (f.ypf_privatizada) objControl -= 0.30;
    if (f.privatizaciones) objControl -= 0.14;
    if (f.litio_concesionado) objControl -= 0.10;
    if (megamineria) objControl -= 0.12;   // la megaminería es casi toda de afuera
    if (f.control_cambios) objControl += 0.05;
    r.controlNacional = clamp01(hacia(r.controlNacional, clamp01(objControl), 0.08));

    // Valor relativo de cada recurso en la canasta extractiva.
    const volumen = clamp01(
      r.petroleo * 0.34 + r.gas * 0.20 + r.mineria * 0.20 + r.litio * 0.12 + r.pesca * 0.14
    );
    const precios = 0.55 + 0.9 * clamp01(n.economia.terminosIntercambio);
    r.rentaExtractiva = clamp01(hacia(r.rentaExtractiva, clamp01(volumen * precios), 0.18));

    const aperturaFinanciera = clamp01(0.35 + 0.55 * cfg.apertura - 0.3 * (f.control_cambios ? 1 : 0));
    r.rentaFugada = clamp01(r.rentaExtractiva * (1 - r.controlNacional) * (0.45 + 0.55 * aperturaFinanciera));
    r.rentaRetenida = clamp01(r.rentaExtractiva - r.rentaFugada);

    // La renta que se va es un problema de divisas, no una nota al pie.
    aportar(estado.presiones, 'externa', clamp01(r.rentaFugada * 1.5), 0.10);

    // El capital extranjero se fortalece donde hay renta que girar.
    moverActor(estado.actores, 'capitalExtranjero',
      clamp01(estado.actores.capitalExtranjero + (r.rentaFugada - r.rentaRetenida) * 0.6), 0.015);

    // =====================================================================
    // 6. DEGRADACIÓN AMBIENTAL ENDÓGENA
    // ---------------------------------------------------------------------
    // Nada de esto es decorativo: baja la productividad futura del agro y
    // sube la presión ecológica que los eventos leen.
    //
    // a) Deforestación. El Chaco pierde monte al ritmo de la frontera
    //    agrícola y de la soja. Argentina perdió cerca de dos tercios de su
    //    bosque nativo en el siglo XX; el pico fue 1998-2010, con picos de
    //    300.000 ha/año en Santiago, Salta y Chaco.
    // b) Erosión. El monocultivo sin rotación se come la materia orgánica.
    //    Menos fertilidad hoy es menos rinde mañana, aunque la tecnología
    //    disimule la pérdida durante un tiempo.
    // c) Estrés hídrico. Riego en zonas secas y megaminería a cielo abierto
    //    (Veladero, Bajo de la Alumbrera) sobre cuencas de montaña.
    // d) Sobrepesca. Ya calculada arriba.
    // =====================================================================
    const frontera = clamp01(sano(n.tierra.fronteraAgricola, 0));
    const soja = clamp01(sano(n.tierra.sojizacion, 0));
    const latifundio = clamp01(sano(n.tierra.latifundio, 0));

    // Presión de la frontera sobre el monte. Con latifundio y con soja el
    // desmonte es más rápido: son topadoras, no hachas.
    const presionDesmonte = clamp01(
      0.10 * frontera * (0.45 + 0.75 * latifundio) +
      0.55 * soja +
      0.10 * clamp01(n.demografia.poblacion / 45)
    );
    const proteccion = clamp01(
      0.35 * estado.regimen.capacidadEstatal * suave(año, 1990, 2015) +
      0.25 * n.educacion.superior + 0.2 * n.cultura.memoriaHistorica
    );
    const tasaDesmonte = clamp01((0.0022 + 0.019 * presionDesmonte) * (1 - 0.55 * proteccion));
    const bosquesAntes = r.bosques;
    r.bosques = clamp01(r.bosques * (1 - tasaDesmonte));
    r.deforestacion = clamp01(sano(r.deforestacion, 0) + (bosquesAntes - r.bosques));

    // Erosión y pérdida de fertilidad.
    const conservacion = clamp01(
      0.30 * n.educacion.formacionTecnica + 0.25 * n.economia.productividadAgro * mundial +
      0.25 * clamp01(n.tierra.chacras) +          // la chacra rota cultivos; el pool de siembra no
      0.20 * suave(año, 1990, 2010) * soja        // siembra directa: mitiga, no cancela
    );
    const objErosion = clamp01(0.55 * soja + 0.30 * frontera + 0.25 * sano(r.deforestacion, 0) - 0.45 * conservacion);
    r.erosion = clamp01(hacia(sano(r.erosion, 0), objErosion, 0.05));

    // Estrés hídrico.
    const riego = clamp01(0.35 * frontera + 0.4 * soja + 0.3 * (1 - r.potencial.agua));
    const objEstres = clamp01(
      0.35 * riego + 0.30 * r.mineria * (megamineria ? 1.5 : 0.6) +
      0.20 * sano(r.deforestacion, 0) + 0.25 * r.sequia - 0.25 * proteccion
    );
    r.estresHidrico = clamp01(hacia(sano(r.estresHidrico, 0), objEstres, 0.06));
    r.agua = clamp01(hacia(r.agua, clamp01(r.potencial.agua * (1 - 0.55 * r.estresHidrico)), 0.05));

    // Biodiversidad: es el resultado de todo lo anterior.
    const objBio = clamp01(
      0.42 * (r.bosques / Math.max(0.05, r.potencial.bosques)) +
      0.22 * r.agua + 0.18 * (1 - r.erosion) + 0.18 * (1 - r.sobrepesca)
    );
    r.biodiversidad = clamp01(hacia(r.biodiversidad, objBio, 0.05));

    // Sostenibilidad: índice compuesto con inercia. Cae despacio y se
    // recupera todavía más despacio.
    const objSost = clamp01(
      0.24 * (r.bosques / Math.max(0.05, r.potencial.bosques)) +
      0.20 * r.agua + 0.20 * (1 - r.erosion) +
      0.14 * r.biodiversidad + 0.10 * (1 - r.sobrepesca) +
      0.12 * (1 - r.estresHidrico)
    );
    const subeSost = objSost > r.sostenibilidad;
    r.sostenibilidad = clamp01(hacia(r.sostenibilidad, objSost, subeSost ? 0.04 : 0.07));

    // Consecuencia económica directa: menos sostenibilidad, menos rinde.
    r.productividadPotencial = clamp01(0.45 + 0.55 * r.sostenibilidad - 0.15 * r.erosion);

    // =====================================================================
    // 7. AGRO PROVINCIAL Y STOCKS AGROPECUARIOS
    // ---------------------------------------------------------------------
    // `provincia.agro` es ACTIVIDAD agropecuaria: aptitud × tecnología ×
    // acceso (integración al mercado, ferrocarril, frontera) × clima ×
    // salud del suelo. `nacion.recursos.agro` es la BASE de recursos: la
    // fertilidad disponible, que se degrada.
    // =====================================================================
    const tecnologiaAgro = clamp01(
      0.28 * mundial + 0.34 * n.economia.productividadAgro +
      0.20 * n.educacion.formacionTecnica + 0.22 * n.infraestructura.ferrocarril +
      0.18 * soja
    );
    let prodPonderada = 0, pesoTotal = 0;
    for (const p of estado.provincias) {
      const a = p.aptitud || {};
      const aptAgro = sano(a.agro, 0);
      const aptAgua = sano(a.agua, 0.5);
      if (aptAgro <= 0) { p.agro = clamp01(hacia(sano(p.agro, 0), 0, 0.1)); continue; }

      // Acceso: sin integración al Estado nacional ni ferrocarril no hay
      // agricultura comercial, hay subsistencia. Y sobre territorio bajo
      // control originario efectivo no hay frontera agrícola.
      const acceso = clamp01(0.20 + 0.55 * p.integracion + 0.35 * n.infraestructura.ferrocarril) *
        (1 - 0.75 * clamp01(p.controlOriginario));
      const alcanceFrontera = clamp01(0.35 + 0.85 * frontera);
      const bonoSoja = soja * (aptAgro > 0.45 ? 0.22 : 0.10);
      const salud = clamp01(0.45 + 0.55 * r.productividadPotencial);

      const objetivo = clamp01((aptAgro * (0.45 + 0.75 * tecnologiaAgro) + bonoSoja) * acceso * alcanceFrontera * salud);
      // Sensibilidad a la seca: el secano pampeano sufre más que el oasis
      // bajo riego cuyano.
      const sensibilidad = 0.42 * (1 - 0.5 * aptAgua);
      p.agro = clamp01(hacia(sano(p.agro, 0), objetivo, 0.06) * (1 - r.sequia * sensibilidad));

      prodPonderada += p.agro * (aptAgro + 0.4 * sano(a.ganaderia, 0));
      pesoTotal += aptAgro + 0.4 * sano(a.ganaderia, 0);
    }
    const produccionAgro = clamp01(sano(prodPonderada / pesoTotal, 0));

    // Stock de fertilidad y capacidad ganadera.
    r.agro = clamp01(hacia(r.agro, clamp01(r.potencial.agro * (1 - 0.45 * r.erosion) * (0.75 + 0.25 * r.agua)), 0.05));
    // La soja empuja la ganadería al feedlot y al monte del norte: menos
    // pastura, más cabezas por hectárea, más desmonte.
    r.ganaderia = clamp01(hacia(r.ganaderia,
      clamp01(r.potencial.ganaderia * (1 - 0.30 * soja) * (1 - 0.20 * r.erosion) + 0.08 * frontera), 0.05));

    // =====================================================================
    // 8. CONSECUENCIAS: SALDO EXPORTABLE Y PRESIONES
    // ---------------------------------------------------------------------
    // La merma exportable es la traducción del clima y de la degradación a
    // dólares. Economía la resta del saldo comercial; deuda la sufre.
    // =====================================================================
    const dependenciaAgro = clamp01(0.75 - 0.5 * n.economia.industrializacion - 0.25 * n.economia.diversificacion);
    r.mermaExportable = clamp01(
      r.sequia * (0.30 + 0.45 * dependenciaAgro) +
      0.18 * r.erosion * dependenciaAgro +
      0.10 * r.sobrepesca
    );
    aportar(estado.presiones, 'externa', clamp01(r.mermaExportable * 1.2), 0.08, r.sequia > 0.6 ? 0.05 : 0);

    const objEcologica = clamp01(
      0.45 * (1 - r.sostenibilidad) + 0.30 * sano(r.deforestacion, 0) * 1.4 +
      0.25 * r.estresHidrico + 0.20 * r.erosion + 0.15 * r.sobrepesca +
      (megamineria ? 0.10 : 0)
    );
    aportar(estado.presiones, 'ecologica', objEcologica, 0.22, tasaDesmonte * 2.5 + r.sequia * 0.03);

    // Memoria de un año, para las tendencias de la interfaz.
    r.previo = {
      sostenibilidad: r.sostenibilidad,
      renta: r.rentaExtractiva,
      control: r.controlNacional,
      bosques: r.bosques,
      hidrocarburos: clamp01((r.petroleo + r.gas) * 0.5),
      fuga: r.rentaFugada,
    };
  },

  indicadores(estado) {
    const r = estado.nacion.recursos;
    const prev = r.previo || {};
    const pot = r.potencial || {};
    const hidro = clamp01((r.petroleo + r.gas) * 0.5);
    const bosqueRelativo = clamp01(sano(r.bosques / Math.max(0.05, pot.bosques || 1), 0));
    return [
      {
        clave: 'sostenibilidad', etiqueta: 'Sostenibilidad ambiental',
        valor: r.sostenibilidad, formato: 'porcentaje',
        tendencia: sano(r.sostenibilidad - sano(prev.sostenibilidad, r.sostenibilidad), 0),
        ayuda: 'Suelo, agua, monte y biodiversidad. Cuando cae, cae el rinde agrícola futuro.',
      },
      {
        clave: 'controlNacional', etiqueta: 'Control nacional del subsuelo',
        valor: r.controlNacional, formato: 'porcentaje',
        tendencia: sano(r.controlNacional - sano(prev.control, r.controlNacional), 0),
        ayuda: 'Qué parte de la renta extractiva decide el país. Sube con empresa estatal, baja con concesión.',
      },
      {
        clave: 'rentaExtractiva', etiqueta: 'Renta extractiva',
        valor: r.rentaExtractiva, formato: 'indice',
        tendencia: sano(r.rentaExtractiva - sano(prev.renta, r.rentaExtractiva), 0),
        ayuda: 'Renta anual del petróleo, el gas, el litio, la minería y la pesca.',
      },
      {
        clave: 'rentaFugada', etiqueta: 'Renta girada al exterior',
        valor: r.rentaFugada, formato: 'indice',
        tendencia: sano(r.rentaFugada - sano(prev.fuga, r.rentaFugada), 0),
        ayuda: 'La parte de la renta que sale del país en divisas y aprieta la restricción externa.',
      },
      {
        clave: 'hidrocarburos', etiqueta: 'Producción de hidrocarburos',
        valor: hidro, formato: 'indice',
        tendencia: sano(hidro - sano(prev.hidrocarburos, hidro), 0),
        ayuda: r.descubiertos?.includes('no_convencionales')
          ? 'Convencionales en declino más no convencionales.'
          : 'Sobre un potencial que fija el mapa: Neuquén, Chubut, Santa Cruz, Mendoza, Salta.',
      },
      {
        clave: 'bosques', etiqueta: 'Bosque nativo restante',
        valor: bosqueRelativo, formato: 'porcentaje',
        tendencia: sano(r.bosques - sano(prev.bosques, r.bosques), 0),
        ayuda: 'Proporción del monte original en pie. Lo come la frontera agrícola.',
      },
      {
        clave: 'sequia', etiqueta: 'Estrés climático del año',
        valor: r.sequia, formato: 'indice',
        tendencia: 0,
        ayuda: 'Intensidad de la seca. Las fuertes se llevan buena parte del saldo exportable.',
      },
      {
        clave: 'mermaExportable', etiqueta: 'Pérdida del saldo exportable',
        valor: r.mermaExportable, formato: 'porcentaje',
        tendencia: 0,
        ayuda: 'Cuánto del excedente agroexportable se pierde por clima y degradación.',
      },
    ];
  },
};
