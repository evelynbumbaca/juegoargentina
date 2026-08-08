// ---------------------------------------------------------------------------
// SISTEMA 20 — TIERRA
// ---------------------------------------------------------------------------
// Dueño de `estado.nacion.tierra`, de `provincia.extranjerizacionTierra` y de
// `provincia.controlOriginario`. Aporta a `estado.presiones.social` y
// `estado.presiones.regional`.
//
// POR QUÉ ESTE SISTEMA DECIDE EL DESTINO DEL PAÍS
// -----------------------------------------------
// La pampa húmeda produce una renta diferencial enorme: el mismo trabajo rinde
// mucho más acá que en la frontera agrícola del mundo. Esa renta existe
// cualquiera sea el régimen de propiedad. Lo que cambia con la estructura de
// tenencia es QUIÉN LA CAPTA, y de ahí sale casi todo lo demás:
//
//   · Renta en pocas manos (latifundio). Se consume en bienes importados, se
//     coloca afuera o se vuelve más tierra. No genera mercado interno: cuatro
//     mil familias no compran zapatos, heladeras ni libros para millones. La
//     industria no encuentra demanda, el Estado no encuentra base imponible
//     (el impuesto a la tierra siempre lo bloquea quien la tiene) y la escuela
//     rural no encuentra alumnos porque el peón vive de prestado.
//   · Renta distribuida (chacras). Se convierte en consumo local, en pueblo
//     con almacén y herrería, en demanda de arados, alambre y maquinaria, en
//     impuestos provinciales y en escuelas. Es el circuito por el que la renta
//     agraria financia industrialización y educación en vez de fugarse.
//
// Por eso `rentaTerrateniente` y `rentaDistribuida` se exponen por separado:
// economía debe leer la segunda como demanda interna y la primera como
// propensión a importar suntuario y a fugar.
//
// LOS TRES MODELOS DE REPARTO (`config.repartoTierras`)
// ----------------------------------------------------
// 1) 'latifundio' — ENFITEUSIS Y GRANDES ESTANCIAS. Lo que efectivamente pasó.
//    La enfiteusis rivadaviana (1826) entrega tierra pública en usufructo sin
//    límite de superficie ni catastro serio; las leyes de premios militares,
//    los remates de 1836-1840 y sobre todo la liquidación de la tierra ganada
//    en la Conquista del Desierto la consolidan. Resultado: Gini de la tierra
//    de arranque ~0.86, oligarquía fuerte desde el primer día, ESCALA
//    EXPORTADORA MÁXIMA (la estancia grande puede alambrar, refinar el ganado,
//    poner molino y mandar el saldo al puerto), mercado interno raquítico,
//    arrendamiento alto y población rural sin arraigo.
// 2) 'mixto' — ESTANCIA Y CHACRA CONVIVIENDO. Santa Fe y Entre Ríos con
//    colonias (Esperanza 1856, San Carlos, San José) al lado de la estancia
//    bonaerense. Gini ~0.72. Es el escenario más inestable de los tres: hay
//    burguesía agraria con capacidad de disputa política, y la puja entre
//    colono y estanciero se dirime en cada coyuntura. Escala exportadora alta
//    pero no máxima.
// 3) 'colonizacion' — CHACRAS FAMILIARES tipo Homestead Act. Gini ~0.55,
//    oligarquía débil, mercado interno grande, más gente en el campo, más
//    escuelas. NO ES GRATIS: la chacra familiar tiene menos escala, menos
//    capital, más costo logístico por tonelada y menos poder de negociación
//    frente al ferrocarril y al frigorífico. Al principio EXPORTA MENOS (la
//    `escalaExportadora` arranca ~22% por debajo), o sea que hay menos divisas
//    justo en las décadas en que se importan rieles y máquinas. La apuesta es
//    a mediano plazo: menos divisas hoy, más industria y más ciencia mañana.
//
// EL AUTORREFUERZO DE LA CONCENTRACIÓN
// ------------------------------------
// El Gini de la tierra SUBE SOLO. No hace falta ninguna conspiración: quien
// tiene tierra tiene colateral, y con colateral tiene crédito; con crédito
// compra en la crisis lo que el chacarero endeudado tiene que vender; con más
// tierra tiene más renta y más peso en la legislatura provincial, que es la
// que fija el catastro, el impuesto inmobiliario y las leyes de arrendamiento.
// El ciclo se cierra: tierra → crédito → compra → renta → poder político →
// menos impuesto a la tierra → más tierra. Acá eso está escrito como un
// término de deriva positivo (`empuje`) que sólo se detiene con intervención
// estatal deliberada, y como un lazo explícito con `estado.actores.oligarquia`.
//
// Los cuatro frenos posibles, con su costo político:
//   · reforma agraria      — el más potente y el más caro: la oligarquía no se
//                            retira, se defiende; sube el conflicto rural y la
//                            reforma se revierte sola si el Estado no tiene
//                            capacidad para sostenerla.
//   · impuesto a la renta potencial de la tierra — barato de administrar,
//                            imposible de sancionar con oligarquía fuerte.
//   · colonización         — no toca la tierra ya repartida, sólo cambia el
//                            destino de la nueva: hay que hacerlo ANTES de que
//                            se cierre la frontera o no sirve.
//   · regulación de arrendamientos — alivia al chacarero sin cambiar la
//                            propiedad; frena el conflicto, no la concentración.
//
// Campos del contrato: giniTierra, latifundio, chacras, extranjerizacion,
// reformaAgraria, territorioOriginario, fronteraAgricola, arrendamiento,
// concentracionSemillas, sojizacion.
//
// Campos derivados que este sistema agrega y otros pueden LEER:
//   rentaAgraria, rentaTerrateniente, rentaDistribuida, rentaCaptadaEstado,
//   escalaExportadora, medianaPropiedad, arraigoRural, conflictoRural,
//   impuestoTierra, titulacionOriginaria, despojoAnual,
//   concentracionPampeana, previo{}
// ---------------------------------------------------------------------------

import { clamp, clamp01, hacia, suave, logistica, sano } from '../../core/util.js';

/**
 * Parámetros estructurales de cada modelo de reparto.
 *   colonizacion: propensión institucional a que la tierra NUEVA (frontera,
 *                 tierra pública) termine en manos de familias y no de pocos.
 *   escala:       capacidad exportadora relativa de la estructura agraria.
 */
const REPARTO = {
  latifundio: { colonizacion: 0.08, escala: 1.00 },
  mixto: { colonizacion: 0.45, escala: 0.90 },
  colonizacion: { colonizacion: 0.85, escala: 0.78 },
};

/** Territorio bajo control originario en 1810 (referencia para el índice relativo). */
const TERRITORIO_ORIGINARIO_1810 = 0.55;

/** Techo y piso técnicos del Gini de la tierra. Ni comunismo ni feudo puro. */
const GINI_TECHO = 0.95;
const GINI_PISO = 0.22;

/** Frontera técnica mundial: alambrado, molino, ferrocarril, siembra directa. */
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

const REGIONES_NUCLEO = new Set(['pampa', 'litoral', 'centro']);

export default {
  meta: {
    id: 'tierra',
    nombre: 'Tierra',
    orden: 20,
    descripcion: 'Tenencia, renta agraria, frontera, pueblos originarios y extranjerización.',
  },

  init(estado) {
    const t = estado.nacion.tierra;
    const cfg = estado.config;
    const rep = REPARTO[cfg.repartoTierras] || REPARTO.latifundio;

    t.medianaPropiedad = clamp01(1 - t.latifundio - t.chacras);
    t.escalaExportadora = clamp01((0.18 + 0.45 * t.latifundio + 0.12) * rep.escala);
    t.rentaAgraria = 0.10;
    t.rentaTerrateniente = 0.06;
    t.rentaDistribuida = 0.03;
    t.rentaCaptadaEstado = 0.01;
    t.impuestoTierra = 0.02;
    t.titulacionOriginaria = cfg.fronteraIndigena === 'tratados' ? 0.10 : 0.03;
    t.arraigoRural = 0.85;
    t.conflictoRural = 0.05;
    t.despojoAnual = 0;
    t.concentracionPampeana = 0.5;
    t.previo = {
      gini: t.giniTierra, chacras: t.chacras, extranjerizacion: t.extranjerizacion,
      territorio: t.territorioOriginario, renta: t.rentaAgraria, distribuida: t.rentaDistribuida,
    };
  },

  paso(estado, rng, ctx) {
    const n = estado.nacion;
    const t = n.tierra;
    const r = n.recursos;
    const f = estado.flags || {};
    const cfg = estado.config;
    const año = ctx.año;
    const rep = REPARTO[cfg.repartoTierras] || REPARTO.latifundio;
    const mundial = tecnologiaMundial(año);
    if (!t.previo) {
      t.previo = { gini: t.giniTierra, chacras: t.chacras, extranjerizacion: t.extranjerizacion,
        territorio: t.territorioOriginario, renta: sano(t.rentaAgraria, 0), distribuida: sano(t.rentaDistribuida, 0) };
    }

    // =====================================================================
    // 1. RÉGIMEN DE REPARTO EFECTIVO
    // ---------------------------------------------------------------------
    // La configuración inicial fija la institución de base; las leyes que
    // sancionen los eventos la corrigen. Importa sobre todo para la tierra
    // NUEVA: la frontera se reparte según lo que esté vigente cuando avanza.
    // =====================================================================
    let colonizacion = rep.colonizacion;
    if (f.ley_colonizacion) colonizacion += 0.30;
    if (f.reforma_agraria) colonizacion += 0.28;
    if (f.arrendamientos_regulados) colonizacion += 0.08;
    if (f.enfiteusis) colonizacion -= 0.12;
    // El remate de la tierra ganada en la campaña financió la campaña misma:
    // se vendió en bloques enormes, por adelantado y a quien podía pagarlos.
    if (f.conquista_desierto) colonizacion -= 0.22;
    colonizacion = clamp01(colonizacion);

    const regulado = f.arrendamientos_regulados ? 1 : 0;

    // =====================================================================
    // 2. FRONTERA AGRÍCOLA
    // ---------------------------------------------------------------------
    // Se expande con técnica (alambrado, molino, aguada), transporte
    // (ferrocarril y después ruta), población, demanda externa y, desde los
    // noventa, con el paquete soja + siembra directa que hace rentable el
    // monte chaqueño. La frena el control efectivo del territorio por parte
    // de los pueblos originarios: mientras haya frontera, hay malón y hay
    // tratado, y la tierra no se puede vender en Londres.
    // =====================================================================
    const demandaExterna = clamp01(0.30 + 0.45 * cfg.apertura + 0.40 * n.economia.terminosIntercambio);
    const empujeFrontera = clamp01(
      0.22 * mundial +
      0.30 * n.infraestructura.ferrocarril +
      0.16 * n.infraestructura.rutas +
      0.22 * suave(n.demografia.poblacion, 0.5, 22) +
      0.26 * demandaExterna +
      0.35 * t.sojizacion
    );
    const resistenciaOriginaria = t.territorioOriginario *
      (cfg.fronteraIndigena === 'tratados' ? 1.0 : cfg.fronteraIndigena === 'integracion' ? 0.75 : 0.5);
    const objFrontera = clamp01(empujeFrontera * (1 - 0.60 * resistenciaOriginaria));
    const fronteraAntes = t.fronteraAgricola;
    t.fronteraAgricola = clamp01(hacia(t.fronteraAgricola, objFrontera,
      0.04 + (f.conquista_desierto ? 0.05 : 0) + 0.03 * t.sojizacion));
    const avanceFrontera = Math.max(0, t.fronteraAgricola - fronteraAntes);

    // =====================================================================
    // 3. TERRITORIO DE LOS PUEBLOS ORIGINARIOS
    // ---------------------------------------------------------------------
    // Sin eufemismos: la frontera agrícola se expande sobre territorio
    // habitado. La Conquista del Desierto (1878-1885) y la campaña del Chaco
    // (1884-1917) fueron operaciones militares de despojo que incorporaron
    // unos 41 millones de hectáreas, repartidas entre poco más de 1.800
    // beneficiarios mediante la ley de empréstito de 1878, que financió la
    // campaña vendiendo por adelantado la tierra que todavía no se había
    // tomado. La concentración no fue un efecto colateral: fue el mecanismo
    // de financiamiento. Con tratados, la incorporación es más lenta, más
    // negociada y —clave— menos concentrada, porque no hay un remate único
    // de millones de hectáreas para pagar una guerra.
    // =====================================================================
    let objTerritorio, tasaTerritorio;
    if (f.conquista_desierto) {
      objTerritorio = 0.02; tasaTerritorio = 0.30;
    } else if (f.tratados_originarios) {
      objTerritorio = clamp01(0.34 - 0.28 * t.fronteraAgricola + 0.15 * t.titulacionOriginaria);
      tasaTerritorio = 0.03;
    } else if (cfg.fronteraIndigena === 'tratados') {
      objTerritorio = clamp01(0.42 - 0.34 * t.fronteraAgricola + 0.12 * t.titulacionOriginaria);
      tasaTerritorio = 0.025;
    } else if (cfg.fronteraIndigena === 'integracion') {
      objTerritorio = clamp01(0.32 - 0.36 * t.fronteraAgricola + 0.18 * t.titulacionOriginaria);
      tasaTerritorio = 0.035;
    } else {
      // 'conquista' por configuración: aunque el evento militar no se haya
      // disparado, el avance de la frontera es de hecho una ocupación armada.
      const campaña = año >= 1875 && t.fronteraAgricola > 0.28 ? 1 : 0;
      objTerritorio = clamp01(0.45 - 0.90 * t.fronteraAgricola);
      tasaTerritorio = 0.035 + 0.08 * campaña;
    }
    const territorioAntes = t.territorioOriginario;
    t.territorioOriginario = clamp01(hacia(territorioAntes, objTerritorio, tasaTerritorio));
    const despojo = Math.max(0, territorioAntes - t.territorioOriginario);
    t.despojoAnual = clamp01(despojo * 8);

    // Titulación comunitaria: reconocimiento legal de la posesión (ley 26.160
    // de 2006 y sus prórrogas). No devuelve territorio, pero frena el desalojo.
    const objTitulacion = clamp01(
      0.02 + 0.40 * (f.tratados_originarios ? 1 : 0) +
      0.35 * n.social.derechosOriginarios +
      0.28 * suave(año, 1998, 2015) * estado.regimen.democracia +
      0.18 * (cfg.fronteraIndigena === 'integracion' ? 1 : 0)
    );
    t.titulacionOriginaria = clamp01(hacia(sano(t.titulacionOriginaria, 0), objTitulacion, 0.05));

    // Reparto provincial del despojo: la pampa húmeda se ocupa primero
    // porque es la que rinde; el monte chaqueño y la cordillera resisten más.
    const relTerritorio = clamp01(sano(t.territorioOriginario / TERRITORIO_ORIGINARIO_1810, 0));
    for (const p of estado.provincias) {
      const base = sano(p.controlOriginario1810, 0);
      if (base <= 0) { p.controlOriginario = clamp01(hacia(sano(p.controlOriginario, 0), 0, 0.1)); continue; }
      const a = p.aptitud || {};
      const facilidadOcupacion = clamp01(0.30 + 0.70 * sano(a.agro, 0) - 0.25 * sano(a.bosque, 0));
      const objetivo = clamp01(
        base * relTerritorio * (1 - 0.45 * t.fronteraAgricola * facilidadOcupacion) +
        0.10 * t.titulacionOriginaria * base
      );
      p.controlOriginario = clamp01(hacia(sano(p.controlOriginario, 0), objetivo, tasaTerritorio * 0.9));
    }

    // =====================================================================
    // 4. SOJIZACIÓN (desde 1996)
    // ---------------------------------------------------------------------
    // La soja RR se aprueba en marzo de 1996 y en veinte años pasa de 6 a 20
    // millones de hectáreas. Dispara productividad y exportaciones, y a la vez:
    //   · concentra la PRODUCCIÓN sin concentrar necesariamente la propiedad
    //     (el pool de siembra alquila: se puede sembrar 100.000 ha sin poseer
    //     una sola), lo que se ve en `arrendamiento` más que en `latifundio`;
    //   · expulsa población rural: un ingeniero y dos fumigadoras hacen lo que
    //     antes hacían treinta familias;
    //   · empuja la frontera sobre el monte del Chaco y del norte santafesino;
    //   · deja la semilla en manos de un puñado de empresas, con regalía
    //     extendida y dependencia tecnológica (`concentracionSemillas`).
    // =====================================================================
    const habilitaSoja = f.sojizacion ? 1 : suave(año, 1996, 2008);
    const tecnicaAgro = clamp01(0.5 * n.educacion.cienciaTecnica + 0.3 * n.educacion.formacionTecnica + 0.4 * mundial);
    const objSoja = clamp01(
      (0.12 + 0.38 * cfg.apertura + 0.32 * tecnicaAgro +
        0.28 * n.economia.terminosIntercambio + 0.22 * t.arrendamiento) * habilitaSoja
    );
    t.sojizacion = clamp01(hacia(t.sojizacion, objSoja, 0.10));

    const semillaPropia = clamp01(0.6 * n.educacion.cienciaTecnica + 0.4 * n.economia.pesoEstado);
    t.concentracionSemillas = clamp01(hacia(t.concentracionSemillas,
      clamp01(0.04 + 0.88 * t.sojizacion - 0.40 * semillaPropia), 0.08));

    // =====================================================================
    // 5. ARRENDAMIENTO
    // ---------------------------------------------------------------------
    // El chacarero que no es dueño paga renta al dueño: es la correa que
    // transmite la renta agraria hacia arriba. Alto arrendamiento + alta
    // concentración = Grito de Alcorta (1912), Ligas Agrarias (1970s).
    // =====================================================================
    t.arrendamiento = clamp01(hacia(t.arrendamiento, clamp01(
      0.26 + 0.30 * t.giniTierra + 0.34 * t.sojizacion +
      0.10 * t.extranjerizacion - 0.34 * regulado - 0.20 * t.reformaAgraria - 0.15 * t.chacras
    ), 0.06));

    // =====================================================================
    // 6. RENTA AGRARIA Y SU REPARTO
    // ---------------------------------------------------------------------
    // La producción viene del sistema de recursos (orden 10, ya corrió este
    // año): es aptitud del mapa × tecnología × clima × salud del suelo.
    // Acá se decide en qué bolsillos cae.
    // =====================================================================
    let prod = 0, peso = 0, prodNucleo = 0;
    for (const p of estado.provincias) {
      const a = p.aptitud || {};
      const w = sano(a.agro, 0) + 0.4 * sano(a.ganaderia, 0);
      if (w <= 0) continue;
      const aporte = sano(p.agro, 0) * w;
      prod += aporte; peso += w;
      if (REGIONES_NUCLEO.has(p.region)) prodNucleo += aporte;
    }
    const produccion = clamp01(sano(prod / peso, 0));
    t.concentracionPampeana = clamp01(hacia(sano(t.concentracionPampeana, 0.5), clamp01(sano(prodNucleo / prod, 0.5)), 0.1));

    t.escalaExportadora = clamp01(hacia(t.escalaExportadora, clamp01(
      (0.16 + 0.48 * t.latifundio + 0.34 * t.sojizacion +
        0.26 * n.infraestructura.ferrocarril + 0.22 * n.infraestructura.puertos -
        0.18 * t.chacras) * rep.escala
    ), 0.06));

    const precios = 0.45 + 0.90 * clamp01(n.economia.terminosIntercambio);
    const climaOk = 1 - 0.6 * clamp01(sano(r.mermaExportable, 0));
    t.rentaAgraria = clamp01(hacia(sano(t.rentaAgraria, 0), clamp01(
      produccion * precios * (0.45 + 0.55 * t.escalaExportadora) * climaOk
    ), 0.15));

    // Impuesto a la renta potencial de la tierra: técnicamente el mejor
    // impuesto que existe (no distorsiona, castiga la tierra ociosa) y
    // políticamente el más difícil. Nunca se sanciona con oligarquía fuerte.
    const objImpuesto = clamp01(
      0.38 * estado.regimen.capacidadEstatal + 0.25 * estado.regimen.democracia +
      0.30 * estado.actores.movimientosPopulares + 0.20 * estado.actores.clasesMedias +
      0.25 * (f.retenciones ? 1 : 0) - 0.50 * estado.actores.oligarquia
    );
    t.impuestoTierra = clamp01(hacia(sano(t.impuestoTierra, 0), objImpuesto, 0.05));

    const captacion = clamp01(
      (0.55 * t.impuestoTierra + 0.42 * (f.retenciones ? 1 : 0) + 0.28 * (f.iapi ? 1 : 0) +
        0.10 * (f.aduana_nacionalizada ? 1 : 0)) * (0.30 + 0.70 * estado.regimen.capacidadEstatal)
    );
    t.rentaCaptadaEstado = clamp01(t.rentaAgraria * captacion);

    const resto = Math.max(0, t.rentaAgraria - t.rentaCaptadaEstado);
    const cuotaTerrateniente = clamp01(
      0.16 + 0.62 * t.giniTierra + 0.22 * t.arrendamiento * t.latifundio -
      0.25 * t.reformaAgraria - 0.12 * regulado
    );
    t.rentaTerrateniente = clamp01(resto * cuotaTerrateniente);
    t.rentaDistribuida = clamp01(resto - t.rentaTerrateniente);

    // =====================================================================
    // 7. CONCENTRACIÓN: LA DINÁMICA CENTRAL
    // ---------------------------------------------------------------------
    // dGini = empuje autorreforzante − freno institucional + reparto de la
    //         tierra nueva + shock de despojo.
    // El empuje no necesita que pase nada: basta con que exista propiedad
    // privada de la tierra, crédito hipotecario y ciclos de precios. En cada
    // mala cosecha el chacarero endeudado vende y el estanciero compra.
    // =====================================================================
    const credito = 0.25 + 0.75 * t.giniTierra;               // el colateral es la tierra
    const capacidadCompra = credito * (0.35 + 0.90 * t.rentaTerrateniente);
    const poderPolitico = estado.actores.oligarquia * (1 - 0.45 * estado.regimen.democracia);
    const ciclo = 1 + 0.6 * clamp01(sano(r.mermaExportable, 0));  // las crisis concentran
    const pools = 0.5 * t.sojizacion * t.arrendamiento;           // el pool de siembra concentra la escala

    const empuje = (0.30 + 0.60 * capacidadCompra + 0.80 * poderPolitico + 0.45 * pools) * ciclo;
    const freno =
      1.25 * t.reformaAgraria +
      0.85 * t.impuestoTierra +
      0.45 * regulado +
      0.40 * estado.regimen.democracia * estado.regimen.capacidadEstatal +
      0.30 * estado.actores.movimientosPopulares +
      0.25 * estado.actores.sindicatos;

    let dGini =
      0.0040 * empuje * (GINI_TECHO - t.giniTierra) -
      0.0175 * freno * (t.giniTierra - GINI_PISO);

    // La tierra nueva se reparte según la institución vigente: con remate en
    // bloques concentra, con colonización diluye.
    dGini += avanceFrontera * (0.90 - 1.60 * colonizacion) * 0.20;
    // El despojo entrega de golpe millones de hectáreas a pocas manos.
    dGini += despojo * (0.70 - 1.00 * colonizacion);

    t.giniTierra = clamp01(t.giniTierra + clamp(sano(dGini, 0), -0.12, 0.12));

    // Latifundio, chacras y mediana propiedad se derivan del Gini y de las
    // instituciones. `chacras` nunca puede pasarse de lo que sobra.
    const objLatifundio = clamp01(
      t.giniTierra * 1.02 - 0.06 + 0.22 * t.extranjerizacion +
      0.10 * t.arrendamiento * t.sojizacion - 0.35 * t.reformaAgraria - 0.12 * t.impuestoTierra
    );
    t.latifundio = clamp01(hacia(t.latifundio, objLatifundio, 0.08));

    const fraccionFamiliar = clamp01(
      0.45 + 0.50 * colonizacion + 0.35 * t.reformaAgraria + 0.18 * regulado -
      0.45 * t.sojizacion * t.arrendamiento - 0.20 * t.extranjerizacion
    );
    t.chacras = clamp01(hacia(t.chacras, clamp01((1 - t.latifundio) * fraccionFamiliar), 0.07));
    t.medianaPropiedad = clamp01(1 - t.latifundio - t.chacras);

    // Reforma agraria: sólo aparece si hay fuerza social que la empuje Y
    // Estado que la ejecute; y se revierte si alguna de las dos se cae.
    const presionReforma = clamp01(
      0.45 * estado.actores.movimientosPopulares + 0.35 * estado.actores.sindicatos +
      0.30 * t.conflictoRural + 0.35 * clamp01((t.giniTierra - 0.70) / 0.25)
    ) * clamp01(0.25 + 0.75 * estado.regimen.democracia);
    const objReforma = clamp01(
      presionReforma * (0.35 + 0.65 * estado.regimen.capacidadEstatal) -
      0.50 * estado.actores.oligarquia - 0.35 * n.ffaa.tutelaje
    );
    t.reformaAgraria = clamp01(hacia(t.reformaAgraria, objReforma, objReforma > t.reformaAgraria ? 0.05 : 0.09));

    // =====================================================================
    // 8. EXTRANJERIZACIÓN
    // ---------------------------------------------------------------------
    // Sube con apertura, con deuda alta (se paga entregando activos) y con
    // inversión extranjera directa; baja con la ley de tierras (26.737, 2011)
    // que puso un techo del 15% y prohibió la propiedad extranjera sobre
    // costas de cuerpos de agua. Alta extranjerización recorta soberanía:
    // `indices()` la descuenta directamente del índice de soberanía, y acá
    // alimenta la presión regional, porque el conflicto es territorial antes
    // que nacional (Lago Escondido, Benetton en Chubut, forestales en Corrientes).
    // =====================================================================
    const leyTierras = f.ley_tierras_extranjeras ? 1 : 0;
    const objExtranjerizacion = clamp01(
      0.02 + 0.11 * cfg.apertura + 0.09 * suave(sano(n.deuda.deudaPbi, 0), 0.3, 1.2) +
      0.11 * n.exterior.ied + 0.07 * t.sojizacion + 0.06 * r.mineria +
      0.05 * clamp01(1 - estado.regimen.capacidadEstatal) - 0.28 * leyTierras
    );
    t.extranjerizacion = clamp01(hacia(t.extranjerizacion, objExtranjerizacion, leyTierras ? 0.09 : 0.05));

    for (const p of estado.provincias) {
      const a = p.aptitud || {};
      // Lo que compra el capital extranjero: campo bueno, monte barato,
      // cordillera con mina y Patagonia con agua, costa y baja densidad.
      const atractivo = clamp01(
        0.30 + 0.42 * sano(a.agro, 0) + 0.30 * sano(a.mineria, 0) + 0.22 * sano(a.petroleo, 0) +
        0.20 * sano(a.bosque, 0) + 0.25 * (p.region === 'patagonia' ? 1 : 0) -
        0.55 * sano(p.urbanizacion, 0)
      );
      p.extranjerizacionTierra = clamp01(hacia(sano(p.extranjerizacionTierra, 0),
        clamp01(t.extranjerizacion * (0.35 + 1.25 * atractivo)), 0.05));
    }

    // =====================================================================
    // 9. ARRAIGO RURAL Y CONFLICTO
    // ---------------------------------------------------------------------
    // La chacra sostiene familias, pueblo, escuela y almacén. El latifundio
    // ganadero sostiene un puestero cada varias leguas; el pool de siembra,
    // ninguno. La expulsión rural no es urbanización virtuosa: es villa
    // miseria en el conurbano.
    // =====================================================================
    t.arraigoRural = clamp01(hacia(sano(t.arraigoRural, 0.85), clamp01(
      0.18 + 0.55 * t.chacras + 0.30 * t.medianaPropiedad + 0.20 * t.reformaAgraria +
      0.12 * (1 - t.arrendamiento) - 0.32 * t.sojizacion - 0.22 * t.latifundio
    ), 0.03));

    t.conflictoRural = clamp01(hacia(sano(t.conflictoRural, 0.05), clamp01(
      0.08 + 0.45 * t.arrendamiento * t.giniTierra + 0.35 * t.despojoAnual +
      0.25 * (1 - t.arraigoRural) * t.sojizacion + 0.20 * t.extranjerizacion +
      0.25 * estado.actores.movimientosPopulares * clamp01((t.giniTierra - 0.6) / 0.35) -
      0.30 * t.reformaAgraria - 0.28 * regulado
    ), 0.08));

    // =====================================================================
    // 10. CORRELACIÓN DE FUERZAS Y PRESIONES
    // ---------------------------------------------------------------------
    // Acá se cierra el lazo: la tierra concentrada FABRICA la oligarquía que
    // después bloquea el impuesto a la tierra y la reforma agraria, lo que
    // permite que la tierra se concentre más. Es el motor de la historia
    // argentina puesto en cuatro líneas.
    // =====================================================================
    const objOligarquia = clamp01(
      0.20 + 0.55 * t.latifundio + 0.40 * t.rentaTerrateniente + 0.20 * t.escalaExportadora +
      0.15 * t.extranjerizacion - 0.25 * t.chacras - 0.45 * t.reformaAgraria - 0.30 * t.impuestoTierra
    );
    moverActor(estado.actores, 'oligarquia', objOligarquia, 0.02);

    const objOriginario = clamp01(
      0.06 + 0.62 * t.territorioOriginario + 0.30 * t.titulacionOriginaria +
      0.25 * n.social.derechosOriginarios
    );
    moverActor(estado.actores, 'puebloOriginario', objOriginario, 0.02);

    aportar(estado.presiones, 'social', clamp01(
      0.45 * t.conflictoRural +
      0.40 * clamp01((t.giniTierra - 0.55) / 0.40) +
      0.30 * t.despojoAnual +
      0.25 * (1 - t.arraigoRural) * t.sojizacion
    ), 0.20, t.despojoAnual * 0.05);

    aportar(estado.presiones, 'regional', clamp01(
      0.45 * t.extranjerizacion * 2 +
      0.35 * t.despojoAnual +
      0.35 * clamp01((t.concentracionPampeana - 0.45) / 0.4) +
      0.20 * t.sojizacion * t.giniTierra
    ), 0.18);

    t.previo = {
      gini: t.giniTierra, chacras: t.chacras, extranjerizacion: t.extranjerizacion,
      territorio: t.territorioOriginario, renta: t.rentaAgraria, distribuida: t.rentaDistribuida,
    };
  },

  indicadores(estado) {
    const t = estado.nacion.tierra;
    const prev = t.previo || {};
    const rentaTotal = Math.max(1e-6, sano(t.rentaAgraria, 0));
    const partDistribuida = clamp01(sano((sano(t.rentaDistribuida, 0) + sano(t.rentaCaptadaEstado, 0)) / rentaTotal, 0));
    return [
      {
        clave: 'giniTierra', etiqueta: 'Gini de la tierra',
        valor: t.giniTierra, formato: 'indice',
        tendencia: sano(t.giniTierra - sano(prev.gini, t.giniTierra), 0),
        ayuda: 'Concentración de la propiedad rural. Sube sola si nadie interviene.',
      },
      {
        clave: 'latifundio', etiqueta: 'Tierra en grandes estancias',
        valor: t.latifundio, formato: 'porcentaje',
        tendencia: 0,
        ayuda: 'Superficie en manos de la gran propiedad.',
      },
      {
        clave: 'chacras', etiqueta: 'Chacras familiares',
        valor: t.chacras, formato: 'porcentaje',
        tendencia: sano(t.chacras - sano(prev.chacras, t.chacras), 0),
        ayuda: 'Superficie en explotaciones familiares: la base del mercado interno.',
      },
      {
        clave: 'rentaDistribuida', etiqueta: 'Renta agraria que no va al terrateniente',
        valor: partDistribuida, formato: 'porcentaje',
        tendencia: sano(sano(t.rentaDistribuida, 0) - sano(prev.distribuida, 0), 0),
        ayuda: 'Parte de la renta que queda en chacareros y en el Estado, y puede financiar industria y escuelas.',
      },
      {
        clave: 'extranjerizacion', etiqueta: 'Tierra en manos extranjeras',
        valor: t.extranjerizacion, formato: 'porcentaje',
        tendencia: sano(t.extranjerizacion - sano(prev.extranjerizacion, t.extranjerizacion), 0),
        ayuda: 'Recorta soberanía: entra directo en el índice y en la presión regional.',
      },
      {
        clave: 'territorioOriginario', etiqueta: 'Territorio bajo control originario',
        valor: t.territorioOriginario, formato: 'porcentaje',
        tendencia: sano(t.territorioOriginario - sano(prev.territorio, t.territorioOriginario), 0),
        ayuda: 'Se desploma con la campaña militar; retrocede despacio con tratados.',
      },
      {
        clave: 'sojizacion', etiqueta: 'Sojización',
        valor: t.sojizacion, formato: 'porcentaje',
        tendencia: 0,
        ayuda: 'Más rinde y más exportación; también más arrendamiento, más desmonte y menos gente en el campo.',
      },
      {
        clave: 'conflictoRural', etiqueta: 'Conflicto rural',
        valor: t.conflictoRural, formato: 'indice',
        tendencia: 0,
        ayuda: 'Arrendatarios, ocupantes y comunidades contra la estructura de tenencia.',
      },
    ];
  },
};
