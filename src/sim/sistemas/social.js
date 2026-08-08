// Movimientos sociales: clase, organización, derechos, represión y pobreza.
//
// Idea rectora: la organización popular no se decreta, se produce. Nace de una
// estructura material —ciudad, fábrica, puerto, ferrocarril— que junta gente
// que comparte una condición. Sin esa concentración no hay sindicato aunque
// haya ley, y con esa concentración hay sindicato aunque la ley lo prohíba.
//
// Por eso el módulo se ordena en capas:
//
//   1. Estructura      urbanización + industria + nodos de transporte
//                      -> concentración obrera -> techo de sindicalización.
//   2. Expectativas    la gente no se moviliza por su nivel de vida sino por
//                      su variación. Quien pierde lo que tenía sale a la calle;
//                      quien nunca tuvo, en general, aguanta. La frustración
//                      relativa (caída del salario real y de derechos contra
//                      una referencia adaptativa) es el disparador más fuerte.
//   3. Conquista       la movilización sostenida, con correlación de fuerzas
//                      favorable, se cristaliza en derechos.
//   4. Reflujo         la represión y el autoritarismo los retroceden. Los
//                      derechos no son un cliquet.
//   5. Trauma          el terrorismo de Estado no es un año malo: destruye la
//                      trama organizativa y esa destrucción dura una generación.
//
// Dominio propio (único que escribe este sistema):
//   - estado.nacion.social.*  (incluida la submemoria `memoria`)
//   - provincia.descontento, provincia.pobreza, provincia.conflicto
//   - suma a estado.presiones.social
//   - mueve lentamente (<= 0.02/año) a los actores: sindicatos,
//     movimientosPopulares, clasesMedias, puebloOriginario
//
// Lee (nunca escribe) de otros dominios:
//   economia (industrializacion, salarioReal, desempleo, informalidad,
//   inflacion, gini, pbiPerCapita, pesoEstado, capacidadFiscal, crecimiento,
//   diversificacion), demografia (urbanizacion, poblacionActiva, composicion),
//   educacion (alfabetizacion, secundaria, superior, brechaRegional),
//   ffaa (poderPolitico, golpismo, doctrina), tierra (territorioOriginario,
//   fronteraAgricola), infraestructura (puertos, ferrocarril,
//   integracionTerritorial), cultura (prensaLibre, identidad, memoriaHistorica,
//   culturaPopular), regimen y actores.
//
// Banderas que lee: terrorismo_estado, golpe_militar, proscripcion,
//   voto_secreto, voto_femenino, derechos_humanos, juicio_juntas,
//   memoria_verdad_justicia, matrimonio_igualitario, ley_aborto,
//   ley_identidad_genero, paritarias, sustitucion_importaciones,
//   privatizaciones, convertibilidad, guerra_civil, estado_federal,
//   conquista_desierto, tratados_originarios, reforma_agraria, sojizacion,
//   mineria_cielo_abierto, litio_concesionado.
//
// Condiciones de disparo pensadas para los eventos (todo legible del estado):
//   huelga general   sindicalizacion > 0.22 && conflictividad > 0.5
//   estallido        presiones.social > 0.65 && social.memoria.frustracion > 0.5
//                    && pobreza > 0.35
//   insurrección     presiones.social > 0.8 && organizacionPopular > 0.5
//                    && memoria.canalizacion < 0.3
//   reforma social   presiones.social > 0.45 && memoria.correlacion > 0.55
//                    && regimen.democracia > 0.4
//   voto femenino    social.genero > 0.32 && regimen.democracia > 0.35
//   represión abierta conflictividad > 0.55 && ffaa.poderPolitico > 0.5

import { clamp, clamp01, hacia, suave, promedio, sano } from '../../core/util.js';

// ---------------------------------------------------------------------------
// Tablas
// ---------------------------------------------------------------------------

/** Cuánta violencia estatal habilita cada tipo de régimen (0..1). */
const AUTORITARISMO_POR_TIPO = {
  revolucionario: 0.45, caudillista: 0.55, anarquia: 0.45, oligarquico: 0.55,
  democracia: 0.05, democracia_restringida: 0.28, dictadura: 0.95,
  populismo: 0.18, tecnocratico: 0.45,
};

/**
 * Sesgo regional histórico de la pobreza. El Norte Grande arrastra una
 * estructura productiva de baja productividad, salarios de subsistencia y
 * Estado provincial pobre; la Pampa concentró la renta agraria y después la
 * industria. El sesgo se atenúa con política federal explícita.
 */
const SESGO_REGIONAL = {
  norte: 0.13, cuyo: 0.04, litoral: 0.03, centro: -0.01,
  pampa: -0.07, patagonia: -0.02,
};

const bandera = (flags, clave) => (flags && flags[clave] ? 1 : 0);

/** Mueve un actor con tope duro por año (regla del contrato: <= 0.02). */
function moverActor(estado, id, objetivo, tope = 0.02) {
  const actual = estado.actores[id] ?? 0;
  const paso = clamp(clamp01(sano(objetivo, actual)) - actual, -tope, tope);
  estado.actores[id] = clamp01(sano(actual + paso, actual));
}

/**
 * Erosión del ingreso por inflación, en escala 0..1. Logarítmica: pasar de 2%
 * a 25% duele mucho más que pasar de 300% a 400%, porque a esa altura ya se
 * indexó todo lo indexable.
 */
const licuacion = (inflacion) =>
  clamp01(Math.log10(1 + Math.max(0, sano(inflacion, 0)) * 10) / 2.2);

/** Memoria interna del sistema. Vive dentro de nacion.social, todo en 0..1. */
function asegurarMemoria(estado) {
  const soc = estado.nacion.social;
  if (soc.memoria) return soc.memoria;
  const derechos = clamp01(
    soc.derechosLaborales * 0.38 + soc.derechosCiviles * 0.32 + soc.derechosPoliticos * 0.30
  );
  soc.memoria = {
    // Referencias adaptativas contra las que la sociedad mide su situación.
    salarioRef: clamp01(estado.nacion.economia.salarioReal),
    derechosRef: derechos,
    indiceDerechos: derechos,
    // Estructura de clase.
    concentracionObrera: 0,
    // Dinámica de lucha.
    luchaAcumulada: 0,
    frustracion: 0,
    latente: 0,
    correlacion: 0.5,
    canalizacion: 0,
    // Daño de largo plazo.
    traumaRepresivo: 0,
    // Territorio.
    brechaRegional: 0,
    // Snapshot del año anterior, para las tendencias de la interfaz.
    previo: {
      pobreza: soc.pobreza, sindicalizacion: soc.sindicalizacion,
      conflictividad: soc.conflictividad, derechos, represion: soc.represion,
      genero: soc.genero, originarios: soc.derechosOriginarios, brecha: 0,
    },
    avisos: {},
  };
  return soc.memoria;
}

export default {
  meta: {
    id: 'social',
    nombre: 'Movimientos sociales',
    orden: 90,
    descripcion: 'Clase, organización, conquista y pérdida de derechos, represión y pobreza.',
  },

  init(estado) {
    const mem = asegurarMemoria(estado);
    const cfg = estado.config;

    // La frontera sur define desde el arranque la relación con los pueblos
    // originarios: guerra de exterminio, tratados o integración.
    if (cfg.fronteraIndigena === 'tratados') {
      estado.nacion.social.derechosOriginarios = 0.16;
    } else if (cfg.fronteraIndigena === 'integracion') {
      estado.nacion.social.derechosOriginarios = 0.12;
    }

    // Reparto inicial de la pobreza: el Interior ya arrancaba peor que el
    // puerto en 1810, con economías de subsistencia y sin renta aduanera.
    repartirPobreza(estado, estado.nacion.social.pobreza, mem, 1);
  },

  paso(estado, rng, ctx) {
    const n = estado.nacion;
    const soc = n.social;
    const eco = n.economia;
    const dem = n.demografia;
    const edu = n.educacion;
    const ffaa = n.ffaa;
    const infra = n.infraestructura;
    const cult = n.cultura;
    const reg = estado.regimen;
    const act = estado.actores;
    const f = estado.flags || {};
    const mem = asegurarMemoria(estado);
    const vol = clamp(sano(estado.config.volatilidad, 1), 0, 3);

    const urb = clamp01(dem.urbanizacion);
    const ind = clamp01(eco.industrializacion);
    const esDictadura = reg.tipo === 'dictadura';
    const dsn = ffaa.doctrina === 'seguridadInterior' ? 1 : 0; // doctrina de "seguridad interior"

    // Snapshot para las tendencias de los indicadores.
    mem.previo = {
      pobreza: soc.pobreza, sindicalizacion: soc.sindicalizacion,
      conflictividad: soc.conflictividad, derechos: mem.indiceDerechos,
      represion: soc.represion, genero: soc.genero,
      originarios: soc.derechosOriginarios, brecha: mem.brechaRegional,
    };

    // Brecha territorial vigente (la del año anterior): alimenta cohesión y
    // conflicto antes de recalcularse al final del paso.
    mem.brechaRegional = brechaProvincial(estado);

    // =====================================================================
    // 1. ESTRUCTURA: dónde se concentra la gente que trabaja
    // =====================================================================
    // Antes de la fábrica hubo puerto, ferrocarril, frigorífico y taller: ahí
    // se organizaron los anarquistas y socialistas inmigrantes de la FORA y
    // la UGT, con huelgas duras pero sin peso decisivo sobre el Estado, porque
    // el bloque social que enfrentaban vivía de la renta agraria y podía
    // reemplazarlos con más inmigración.
    const nucleosPrevios = clamp01(0.55 * infra.puertos + 0.45 * infra.ferrocarril) * urb;
    // La fábrica sólo concentra obreros si además hay ciudad que los aloje.
    const fabrica = ind * suave(urb, 0.20, 0.65);
    const objConcentracion = clamp01(0.35 * nucleosPrevios + 0.95 * fabrica + 0.10 * ind * urb);
    mem.concentracionObrera = hacia(mem.concentracionObrera, objConcentracion, 0.18);

    // Tradición organizativa importada: los inmigrantes europeos traen
    // sociedades de resistencia, prensa obrera y experiencia de huelga.
    const tradicionInmigrante = clamp01((dem.composicion?.inmigranteEuropeo ?? 0) * 1.6);

    // =====================================================================
    // 2. MEMORIA REPRESIVA DE LARGO PLAZO
    // =====================================================================
    // El terrorismo de Estado —desaparición forzada, centros clandestinos de
    // detención, secuestro de delegados en la puerta de la fábrica, apropiación
    // de niños— no es un año de represión intensa. Es un plan de
    // disciplinamiento social y, muy específicamente, del mundo del trabajo:
    // más de la mitad de las víctimas eran trabajadores y delegados. Su
    // función económica es hacer viable una reestructuración regresiva
    // (apertura, valorización financiera, caída del salario) que con el
    // movimiento obrero en pie no se podía imponer. Acá eso se modela como
    // destrucción de la trama organizativa —comisiones internas, cuerpos de
    // delegados, agrupaciones barriales— con vida media de una generación.
    if (f.terrorismo_estado) {
      mem.traumaRepresivo = hacia(mem.traumaRepresivo, clamp01(0.75 + 0.25 * ffaa.poderPolitico), 0.50);
    } else if (soc.represion > 0.70 && esDictadura) {
      mem.traumaRepresivo = hacia(mem.traumaRepresivo, 0.45, 0.15);
    }
    // El movimiento de derechos humanos es lo que rehace el tejido después:
    // juicio, memoria y verdad aceleran la recomposición organizativa.
    const reparacion = clamp01(
      0.40 * bandera(f, 'juicio_juntas') +
      0.30 * bandera(f, 'memoria_verdad_justicia') +
      0.30 * bandera(f, 'derechos_humanos')
    );
    if (!f.terrorismo_estado) {
      // 2.8% anual => vida media ~25 años. Con política de DDHH plena, ~12.
      mem.traumaRepresivo = clamp01(mem.traumaRepresivo * (1 - 0.028 - 0.030 * reparacion));
    }

    // =====================================================================
    // 3. CORRELACIÓN DE FUERZAS Y CANALIZACIÓN INSTITUCIONAL
    // =====================================================================
    const fuerzaPopular = clamp01(
      0.34 * act.sindicatos + 0.26 * act.movimientosPopulares + 0.22 * act.clasesMedias +
      0.10 * act.puebloOriginario + 0.08 * act.burguesiaIndustrial
    );
    const fuerzaConservadora = clamp01(
      0.36 * act.oligarquia + 0.30 * act.ffaa + 0.20 * act.capitalExtranjero + 0.14 * act.iglesia
    );
    mem.correlacion = clamp01(0.5 + 0.85 * (fuerzaPopular - fuerzaConservadora));

    // Un país puede procesar el conflicto por adentro (paritarias, convenios,
    // elecciones) o dejarlo afuera. La proscripción de una fuerza mayoritaria
    // rompe la canalización: obliga a que todo se dirima en la calle o en el
    // cuartel, y ese es el mecanismo de la inestabilidad 1955-1973.
    mem.canalizacion = clamp01(
      (0.30 * bandera(f, 'paritarias') + 0.26 * soc.derechosLaborales + 0.22 * reg.democracia +
       0.12 * reg.capacidadEstatal + 0.10 * soc.derechosPoliticos) *
      (f.proscripcion ? 0.35 : 1)
    );

    // =====================================================================
    // 4. EXPECTATIVAS FRUSTRADAS
    // =====================================================================
    // Referencias adaptativas: lo ganado se naturaliza rápido (una conquista
    // se vuelve piso en pocos años) y lo perdido se olvida despacio. Esa
    // asimetría es lo que hace que perder derechos duela mucho más de lo que
    // ganarlos alegra, y es lo que separa una crisis con estallido de una
    // crisis con resignación.
    const salReal = clamp01(eco.salarioReal);
    const infLic = licuacion(eco.inflacion);
    mem.salarioRef = salReal > mem.salarioRef
      ? hacia(mem.salarioRef, salReal, 0.28)
      : hacia(mem.salarioRef, salReal, 0.07);

    const derechosIdx = clamp01(
      0.38 * soc.derechosLaborales + 0.32 * soc.derechosCiviles + 0.30 * soc.derechosPoliticos
    );
    mem.indiceDerechos = derechosIdx;
    mem.derechosRef = derechosIdx > mem.derechosRef
      ? hacia(mem.derechosRef, derechosIdx, 0.30)
      : hacia(mem.derechosRef, derechosIdx, 0.05);

    const caidaSalario = clamp01((mem.salarioRef - salReal) / Math.max(0.12, mem.salarioRef));
    const caidaDerechos = clamp01((mem.derechosRef - derechosIdx) / Math.max(0.12, mem.derechosRef));
    const recesion = clamp01(-sano(eco.crecimiento, 0) * 4);

    mem.frustracion = clamp01(
      1.05 * caidaSalario + 0.85 * caidaDerechos +
      0.30 * recesion + 0.35 * clamp01(infLic - 0.35)
    );

    // Miseria estructural. Sola no moviliza: necesita quién la organice.
    const miseria = clamp01(
      0.42 * soc.pobreza + 0.28 * clamp01(eco.desempleo * 3.2) +
      0.18 * clamp01((eco.gini - 0.35) * 2.5) + 0.12 * eco.informalidad
    );
    const capacidadLucha = clamp01(
      0.34 * soc.organizacionPopular + 0.30 * soc.sindicalizacion +
      0.20 * soc.derechosCiviles + 0.16 * urb
    );

    // =====================================================================
    // 5. POBREZA
    // =====================================================================
    const desarrolloRel = clamp01(sano(eco.pbiPerCapita, 1000) / 25000);
    // Cuánto de la inflación absorbe la negociación colectiva. Con sindicatos
    // fuertes y paritarias, el salario sigue a los precios; sin eso, la
    // inflación es una transferencia directa desde los ingresos fijos.
    const indexacion = clamp01(
      0.45 * soc.derechosLaborales + 0.40 * soc.sindicalizacion + 0.22 * bandera(f, 'paritarias')
    );
    const erosionInflacion = infLic * (1 - 0.55 * indexacion);
    const transferencias = clamp01(
      0.36 * eco.pesoEstado + 0.26 * eco.capacidadFiscal +
      0.24 * soc.derechosLaborales + 0.14 * reg.democracia
    );

    // Ingreso real del hogar popular, 0..1.
    const ingresoPopular = clamp01(
      0.50 * salReal +
      0.16 * (1 - clamp01(eco.desempleo * 3.2)) +
      0.12 * (1 - eco.informalidad) +
      0.12 * transferencias +
      0.10 * desarrolloRel +
      0.09 * (1 - urb)                       // autoconsumo rural: amortigua, no enriquece
    ) * (1 - 0.30 * erosionInflacion) * (1 - 0.25 * clamp01(eco.gini - 0.40));

    // Anclas calibradas: ~5% en 1974, ~47% en 1989, ~54% en 2002, ~35-40%
    // desde 2016, ~60% en la sociedad colonial de 1810.
    const objPobreza = clamp01(1.16 - 1.55 * ingresoPopular);
    // La pobreza sube más rápido de lo que baja: una devaluación empobrece en
    // meses, recomponer el ingreso lleva años.
    const tasaPobreza = objPobreza > soc.pobreza
      ? 0.30 + 0.20 * clamp01(caidaSalario * 1.5)
      : 0.16 + 0.10 * clamp01(soc.derechosLaborales);
    soc.pobreza = clamp01(hacia(soc.pobreza, objPobreza, tasaPobreza));

    // =====================================================================
    // 6. CONFLICTIVIDAD
    // =====================================================================
    // Eficacia represiva del año anterior (evita la circularidad de calcular
    // represión con la conflictividad que la represión produce).
    const eficaciaRepPrev = clamp01(
      soc.represion * (0.30 + 0.70 * ffaa.poderPolitico) * (0.55 + 0.45 * dsn) *
      (1 - 0.35 * soc.derechosCiviles * reg.democracia)
    );
    const supresion = f.terrorismo_estado
      ? clamp01(0.55 + 0.42 * eficaciaRepPrev)
      : 0.50 * eficaciaRepPrev;

    const objConflicto = clamp01(
      (0.40 * mem.frustracion +
       0.22 * miseria * (0.30 + 0.70 * capacidadLucha) +   // miseria sin organización = resignación
       0.16 * soc.movilizacion +
       0.10 * clamp01((eco.gini - 0.40) * 2.5) +
       0.08 * bandera(f, 'proscripcion') +
       0.06 * mem.brechaRegional) *
      (1 - 0.55 * mem.canalizacion) *
      (1 - supresion) *
      (1 - 0.35 * mem.traumaRepresivo)
    );
    soc.conflictividad = clamp01(
      hacia(soc.conflictividad, objConflicto, 0.30) + rng.normal(0.022 * vol)
    );

    // Lo que la represión tapa no desaparece: se acumula.
    mem.latente = clamp01(
      mem.latente * 0.90 + 0.35 * mem.frustracion * supresion + 0.12 * miseria * supresion
    );

    // Estallido. Cuando el control afloja —o cuando el hartazgo desborda al
    // operativo— la bronca contenida sale de golpe. Es el Cordobazo, el
    // Santiagueñazo, diciembre de 2001. No ocurre bajo terrorismo de Estado:
    // ahí el costo de salir a la calle es la vida.
    if (!f.terrorismo_estado && mem.latente > 0.42 && eficaciaRepPrev < 0.78 &&
        rng.chance(0.05 + 0.30 * clamp01(mem.latente - eficaciaRepPrev))) {
      const salto = 0.18 + 0.45 * mem.latente;
      soc.conflictividad = clamp01(soc.conflictividad + salto);
      soc.movilizacion = clamp01(soc.movilizacion + salto * 0.7);
      mem.luchaAcumulada = clamp01(mem.luchaAcumulada + 0.08);
      mem.latente = clamp01(mem.latente * 0.35);
      ctx.log('Estalla la protesta contenida: la calle desborda al operativo.', ['social', 'estallido']);
    }

    // =====================================================================
    // 7. MOVILIZACIÓN, ORGANIZACIÓN Y SINDICALIZACIÓN
    // =====================================================================
    const objMovilizacion = clamp01(
      (0.30 * soc.organizacionPopular + 0.24 * soc.conflictividad + 0.16 * soc.sindicalizacion +
       0.12 * soc.derechosCiviles + 0.10 * urb + 0.08 * mem.frustracion) *
      (1 - 0.60 * supresion) * (1 - 0.45 * mem.traumaRepresivo)
    );
    soc.movilizacion = clamp01(hacia(soc.movilizacion, objMovilizacion, 0.22));

    // Lucha acumulada: movilización sostenida con correlación favorable. Es lo
    // que convierte protesta en conquista. Se pierde si el empuje se corta.
    const empuje = clamp01(soc.movilizacion * 1.1) * clamp01(mem.correlacion * 1.3) *
      (0.35 + 0.65 * soc.organizacionPopular);
    mem.luchaAcumulada = clamp01(mem.luchaAcumulada * 0.93 + 0.16 * empuje);

    // Organización popular: el stock lento. Sindicatos, sociedades de fomento,
    // clubes, parroquias, comisiones vecinales, organismos de DDHH, movimiento
    // de desocupados. La proscripción, paradójicamente, la empuja hacia formas
    // clandestinas: la resistencia se organiza porque no le queda otra vía.
    const objOrganizacion = clamp01(
      (0.30 * soc.sindicalizacion +
       0.18 * urb +
       0.14 * soc.derechosCiviles +
       0.12 * clamp01(edu.alfabetizacion * 0.6 + edu.secundaria * 0.4) +
       0.10 * mem.luchaAcumulada +
       0.08 * bandera(f, 'proscripcion') +
       0.08 * clamp01(act.iglesia * 0.4 + cult.culturaPopular * 0.6) +
       0.06 * reparacion) *
      (1 - 0.80 * mem.traumaRepresivo)
    );
    soc.organizacionPopular = clamp01(hacia(soc.organizacionPopular, objOrganizacion, 0.10));

    // Sindicalización. El techo lo pone la estructura, no la voluntad: sin
    // concentración obrera no hay sindicato de masas. El reconocimiento legal
    // y estatal decide cuánto de ese techo se realiza — por eso el salto es
    // 1943-1948, cuando coinciden industria sustitutiva, ciudad y un Estado
    // que homologa convenios, y no 1904 ni 1919, cuando hay huelgas heroicas
    // pero ninguna estructura que las sostenga.
    const reconocimiento = clamp01(
      0.34 * soc.derechosLaborales +
      0.20 * bandera(f, 'paritarias') +
      0.16 * reg.democracia +
      0.14 * reg.capacidadEstatal +
      0.10 * clamp01(act.burguesiaIndustrial + act.movimientosPopulares) +
      0.06 * bandera(f, 'sustitucion_importaciones')
    );
    const techoSindical = clamp01(mem.concentracionObrera * 1.15 + tradicionInmigrante * 0.10 * urb);
    const objSindicalizacion = clamp01(
      techoSindical * (0.28 + 0.72 * reconocimiento) * (1 - 0.75 * mem.traumaRepresivo)
    );
    const tasaSindical = objSindicalizacion > soc.sindicalizacion
      ? 0.09 + 0.16 * clamp01(reconocimiento * mem.concentracionObrera * 3)  // se construye despacio
      : 0.12 + 0.35 * eficaciaRepPrev;                                       // se destruye rápido
    soc.sindicalizacion = clamp01(hacia(soc.sindicalizacion, objSindicalizacion, tasaSindical));

    // =====================================================================
    // 8. DERECHOS: SE CONQUISTAN Y SE PIERDEN
    // =====================================================================
    const autoritarismo = clamp01(
      0.45 * (AUTORITARISMO_POR_TIPO[reg.tipo] ?? 0.4) +
      0.18 * bandera(f, 'golpe_militar') +
      0.22 * ffaa.poderPolitico +
      0.15 * (1 - reg.democracia)
    );

    // --- Derechos laborales -------------------------------------------------
    // Convenio colectivo, jornada, indemnización, jubilación, obra social.
    // Se sostienen sobre sindicalización real: una ley sin quién la haga
    // cumplir en el lugar de trabajo es letra muerta, y la informalidad la
    // vacía por abajo.
    const objLaborales = clamp01(
      (0.34 * mem.luchaAcumulada +
       0.26 * soc.sindicalizacion +
       0.14 * reg.democracia +
       0.10 * reg.capacidadEstatal +
       0.10 * bandera(f, 'paritarias') +
       0.06 * act.burguesiaIndustrial) *
      (1 - 0.45 * clamp01((eco.informalidad - 0.30) * 1.4)) *
      (1 - 0.22 * bandera(f, 'privatizaciones')) *
      (1 - 0.18 * bandera(f, 'convertibilidad'))
    );
    soc.derechosLaborales = clamp01(hacia(
      soc.derechosLaborales, objLaborales,
      objLaborales > soc.derechosLaborales
        ? 0.07 + 0.10 * clamp01(empuje * 1.5)
        : 0.10 + 0.30 * clamp01(autoritarismo * eficaciaRepPrev * 1.4)
    ));

    // --- Derechos civiles ---------------------------------------------------
    const objCiviles = clamp01(
      (0.30 * reg.democracia +
       0.20 * cult.prensaLibre +
       0.16 * mem.luchaAcumulada +
       0.12 * soc.organizacionPopular +
       0.10 * edu.alfabetizacion +
       0.12 * reparacion) *
      (1 - 0.75 * eficaciaRepPrev)
    );
    soc.derechosCiviles = clamp01(hacia(
      soc.derechosCiviles, objCiviles,
      objCiviles > soc.derechosCiviles ? 0.10 : 0.18 + 0.25 * eficaciaRepPrev
    ));

    // --- Derechos políticos -------------------------------------------------
    // La proscripción de una fuerza mayoritaria vacía el sufragio aunque haya
    // elecciones: se vota, pero no se puede votar lo que la mayoría quiere.
    const objPoliticos = clamp01(
      (0.34 * reg.democracia +
       0.18 * reg.participacion +
       0.14 * bandera(f, 'voto_secreto') +
       0.12 * bandera(f, 'voto_femenino') +
       0.10 * mem.luchaAcumulada +
       0.12 * soc.derechosCiviles) *
      (f.proscripcion ? 0.45 : 1) *
      (1 - 0.85 * (esDictadura ? 1 : 0))
    );
    soc.derechosPoliticos = clamp01(hacia(
      soc.derechosPoliticos, objPoliticos,
      objPoliticos > soc.derechosPoliticos ? 0.14 : 0.28
    ));

    // =====================================================================
    // 9. GÉNERO
    // =====================================================================
    // La base material es la secundaria femenina, la ciudad y el trabajo
    // asalariado fuera del servicio doméstico; la organización (sufragistas
    // socialistas, sindicatos, movimiento de mujeres) es la que convierte esa
    // base en derecho. Umbral de habilitación del voto femenino: 0.32.
    const baseGenero = clamp01(
      0.24 * edu.secundaria +
      0.16 * clamp01(edu.superior * 1.4) +
      0.18 * urb +
      0.16 * clamp01(dem.poblacionActiva * 0.6 + (ind + eco.diversificacion) * 0.5) +
      0.16 * soc.organizacionPopular +
      0.10 * soc.derechosCiviles
    );
    const conquistasGenero =
      0.10 * bandera(f, 'voto_femenino') +
      0.05 * bandera(f, 'matrimonio_igualitario') +
      0.06 * bandera(f, 'ley_aborto') +
      0.05 * bandera(f, 'ley_identidad_genero');
    const frenoGenero = clamp01(
      0.45 * act.iglesia * (1 - 0.5 * reg.democracia) +
      0.35 * (esDictadura ? 1 : 0) +
      0.20 * eficaciaRepPrev
    );
    const objGenero = clamp01((baseGenero + conquistasGenero) * (1 - 0.40 * frenoGenero));
    soc.genero = clamp01(hacia(soc.genero, objGenero, objGenero > soc.genero ? 0.09 : 0.06));

    // =====================================================================
    // 10. PUEBLOS ORIGINARIOS
    // =====================================================================
    // El punto de partida no es cultural sino territorial: si la frontera se
    // resolvió por campaña militar, las comunidades pierden la base material
    // (tierra, ganado, autonomía política) y son repartidas como mano de obra;
    // si se resolvió por tratados, conservan territorio y capacidad de
    // negociación. Sobre esa base pesan después la organización comunitaria y
    // el reconocimiento jurídico de la preexistencia.
    const controlOriginarioMedio = promedio(estado.provincias.map((p) => [p.controlOriginario, 1]));
    const conquista = f.conquista_desierto
      ? 1
      : (estado.config.fronteraIndigena === 'conquista' ? 0.35 : 0);
    const tratados = f.tratados_originarios
      ? 1
      : (estado.config.fronteraIndigena === 'tratados' ? 0.5
        : estado.config.fronteraIndigena === 'integracion' ? 0.35 : 0);
    const baseTerritorial = clamp01(0.55 * n.tierra.territorioOriginario + 0.45 * controlOriginarioMedio);
    const organizacionComunitaria = clamp01(0.55 * act.puebloOriginario + 0.36 * soc.organizacionPopular);
    const reconocimientoJuridico = clamp01(
      0.40 * soc.derechosCiviles + 0.30 * reg.democracia +
      0.30 * clamp01(0.40 * bandera(f, 'derechos_humanos') +
                     0.30 * bandera(f, 'memoria_verdad_justicia') +
                     0.30 * cult.memoriaHistorica)
    );
    // Frontera extractiva: soja, megaminería y litio concesionado avanzan sobre
    // territorio comunitario. Recortan derechos y, a la vez, obligan a
    // organizarse: el conflicto territorial es lo que pone el tema en agenda.
    const presionExtractiva = clamp01(
      0.30 * bandera(f, 'sojizacion') + 0.28 * bandera(f, 'mineria_cielo_abierto') +
      0.22 * bandera(f, 'litio_concesionado') + 0.20 * n.tierra.fronteraAgricola
    );
    const objOriginarios = clamp01(
      (0.30 * baseTerritorial + 0.26 * organizacionComunitaria +
       0.34 * reconocimientoJuridico + 0.10 * tratados) *
      (1 - 0.55 * conquista) * (1 - 0.30 * presionExtractiva)
    );
    soc.derechosOriginarios = clamp01(hacia(
      soc.derechosOriginarios, objOriginarios,
      objOriginarios > soc.derechosOriginarios ? 0.07 : 0.14
    ));

    // =====================================================================
    // 11. COHESIÓN
    // =====================================================================
    const objCohesion = clamp01(
      (0.24 * (1 - clamp01(eco.gini * 1.15)) +
       0.18 * derechosIdx +
       0.14 * (1 - soc.pobreza) +
       0.12 * cult.identidad +
       0.10 * edu.alfabetizacion +
       0.10 * (1 - mem.brechaRegional) +
       0.12 * reg.legitimidad) *
      (1 - 0.45 * eficaciaRepPrev) *
      (1 - 0.30 * clamp01((soc.conflictividad - 0.55) * 2.2)) *
      (1 - 0.25 * mem.traumaRepresivo) *
      (f.guerra_civil ? 0.60 : 1)
    );
    soc.cohesion = clamp01(hacia(soc.cohesion, objCohesion, 0.10));

    // =====================================================================
    // 12. REPRESIÓN
    // =====================================================================
    // Sube cuando el conflicto amenaza el orden y hay quién tenga poder y
    // doctrina para reprimirlo. Un Estado sin capacidad institucional también
    // reprime, pero de otra forma: leva, partida, mazorca.
    const amenazaOrden = clamp01(
      0.42 * soc.conflictividad +
      0.24 * soc.movilizacion * (0.40 + 0.60 * soc.organizacionPopular) +
      0.18 * clamp01(estado.presiones.social) +
      0.16 * bandera(f, 'guerra_civil')
    );
    const disposicionRepresiva = clamp01(
      0.30 * ffaa.poderPolitico +
      0.18 * ffaa.golpismo +
      0.16 * (AUTORITARISMO_POR_TIPO[reg.tipo] ?? 0.4) +
      0.14 * dsn +
      0.12 * act.oligarquia * (1 - reg.democracia) +
      0.10 * (1 - reg.democracia) +
      0.20 * (1 - reg.capacidadEstatal) * (1 - reg.democracia)
    );
    const objRepresion = clamp01(
      (0.25 + 0.75 * amenazaOrden) * disposicionRepresiva * 1.25 *
      (1 - 0.45 * soc.derechosCiviles * reg.democracia)
    );
    soc.represion = clamp01(hacia(
      soc.represion, objRepresion, objRepresion > soc.represion ? 0.28 : 0.14
    ));
    if (f.terrorismo_estado) soc.represion = clamp01(Math.max(soc.represion, 0.82));

    // --- Costo de reprimir --------------------------------------------------
    const eficaciaRep = clamp01(
      soc.represion * (0.30 + 0.70 * ffaa.poderPolitico) * (0.55 + 0.45 * dsn)
    );
    soc.cohesion = clamp01(soc.cohesion - 0.045 * eficaciaRep);
    soc.derechosCiviles = clamp01(soc.derechosCiviles - 0.05 * eficaciaRep);

    if (f.terrorismo_estado) {
      // Golpe directo y anual mientras dura el plan sistemático.
      soc.derechosCiviles = clamp01(soc.derechosCiviles - 0.10);
      soc.derechosPoliticos = clamp01(soc.derechosPoliticos - 0.10);
      soc.derechosLaborales = clamp01(soc.derechosLaborales - 0.06 - 0.05 * eficaciaRep);
      soc.organizacionPopular = clamp01(soc.organizacionPopular * 0.80 - 0.03);
      soc.sindicalizacion = clamp01(soc.sindicalizacion * 0.88 - 0.02);
      soc.movilizacion = clamp01(soc.movilizacion * 0.60);
      soc.cohesion = clamp01(soc.cohesion - 0.06);
      if (!mem.avisos.terrorismo) {
        mem.avisos.terrorismo = true;
        ctx.log('Desaparición forzada y campos clandestinos: el disciplinamiento social se vuelve política de Estado.',
          ['social', 'represion', 'ddhh']);
      }
    }

    // =====================================================================
    // 13. TERRITORIO: pobreza, descontento y conflicto provincia por provincia
    // =====================================================================
    const politicaFederal = clamp01(
      0.30 * infra.integracionTerritorial +
      0.24 * (1 - edu.brechaRegional) +
      0.20 * reg.capacidadEstatal +
      0.14 * bandera(f, 'estado_federal') +
      0.12 * eco.pesoEstado
    );
    repartirPobreza(estado, soc.pobreza, mem, politicaFederal);

    for (const p of estado.provincias) {
      // Agravio comparativo: no es lo mismo ser pobre que ser el más pobre.
      const agravio = clamp01((p.pobreza - soc.pobreza) * 2.2);
      const objDescontento = clamp01(
        (0.30 * p.pobreza +
         0.16 * agravio +
         0.16 * soc.conflictividad +
         0.14 * p.autonomismo * (1 - p.integracion) +
         0.12 * (1 - p.desarrollo) +
         0.12 * soc.represion * (1 - soc.derechosCiviles)) *
        (1 - 0.30 * mem.canalizacion)
      );
      p.descontento = clamp01(hacia(p.descontento, objDescontento, 0.20));

      // Para que el descontento se vuelva conflicto hace falta con qué:
      // ciudad, fábrica, sindicato, comunidad organizada.
      const capacidadProv = clamp01(
        0.35 * p.urbanizacion + 0.25 * clamp01(p.industria * 2) +
        0.25 * soc.organizacionPopular + 0.15 * soc.sindicalizacion
      );
      const ap = p.aptitud || {};
      const conflictoExtractivo = clamp01(
        0.30 * bandera(f, 'mineria_cielo_abierto') * (ap.mineria ?? 0) +
        0.25 * bandera(f, 'litio_concesionado') * (ap.litio ?? 0) +
        0.25 * bandera(f, 'sojizacion') * (ap.agro ?? 0) +
        0.20 * p.extranjerizacionTierra
      );
      // Frontera: territorio en disputa donde no hay derechos reconocidos.
      const conflictoFrontera = clamp01(
        p.controlOriginario * (1 - soc.derechosOriginarios) * (0.40 + 0.60 * conquista)
      );
      const objConflictoProv = clamp01(
        (0.42 * p.descontento * (0.30 + 0.70 * capacidadProv) +
         0.22 * conflictoExtractivo +
         0.20 * conflictoFrontera +
         0.16 * bandera(f, 'guerra_civil')) *
        (1 - 0.45 * supresion)
      );
      p.conflicto = clamp01(hacia(p.conflicto, objConflictoProv, 0.22));
    }
    mem.brechaRegional = brechaProvincial(estado);

    // =====================================================================
    // 14. PRESIÓN SOCIAL (la leen los eventos)
    // =====================================================================
    const conflictoMax = estado.provincias.reduce((a, p) => Math.max(a, p.conflicto), 0);
    const aporte = clamp01(
      0.28 * soc.conflictividad +
      0.18 * mem.frustracion +
      0.14 * mem.latente +
      0.12 * clamp01((soc.pobreza - 0.25) * 2) +
      0.12 * soc.movilizacion * (0.35 + 0.65 * soc.organizacionPopular) +
      0.10 * conflictoMax +
      0.06 * clamp01(soc.represion - soc.derechosCiviles)
    );
    // Suma autolimitada: el sistema regimen/motor es quien decae la presión.
    estado.presiones.social = clamp01(
      estado.presiones.social + aporte * 0.38 * (1 - 0.55 * estado.presiones.social)
    );

    // =====================================================================
    // 15. ACTORES (deriva lenta, tope 0.02/año)
    // =====================================================================
    moverActor(estado, 'sindicatos', clamp01(
      (0.62 * soc.sindicalizacion + 0.22 * soc.derechosLaborales + 0.16 * soc.organizacionPopular) * 1.35
    ) * (1 - 0.50 * mem.traumaRepresivo));

    moverActor(estado, 'movimientosPopulares', clamp01(
      (0.42 * soc.organizacionPopular + 0.26 * soc.movilizacion +
       0.16 * soc.derechosCiviles + 0.16 * clamp01(soc.pobreza * 0.8)) * 1.15
    ) * (1 - 0.55 * mem.traumaRepresivo));

    moverActor(estado, 'clasesMedias', clamp01(
      0.30 * urb + 0.24 * clamp01(edu.secundaria * 1.2) + 0.18 * clamp01(edu.superior * 2.5) +
      0.14 * clamp01(sano(eco.pbiPerCapita, 1000) / 15000) + 0.14 * soc.derechosCiviles
    ), 0.012);

    moverActor(estado, 'puebloOriginario', clamp01(
      0.30 * clamp01(n.tierra.territorioOriginario * 1.4) +
      0.25 * clamp01(controlOriginarioMedio * 1.3) +
      0.25 * soc.derechosOriginarios +
      0.20 * soc.organizacionPopular
    ));

    // =====================================================================
    // 16. Avisos narrativos (una sola vez cada uno)
    // =====================================================================
    avisar(mem, ctx, 'sindicato_masas', soc.sindicalizacion > 0.25,
      'El sindicalismo deja de ser cosa de minorías militantes: se vuelve un actor con el que hay que negociar.',
      ['social', 'trabajo']);
    avisar(mem, ctx, 'voto_femenino_maduro',
      !f.voto_femenino && soc.genero > 0.32 && reg.democracia > 0.35,
      'Las mujeres son ya media fuerza laboral urbana y educada: negarles el voto es cada vez más insostenible.',
      ['social', 'genero']);
    avisar(mem, ctx, 'pobreza_masiva', soc.pobreza > 0.45,
      'La pobreza deja de ser un margen y pasa a ser la condición de la mitad del país.',
      ['social', 'pobreza']);
    avisar(mem, ctx, 'organizacion_arrasada',
      mem.traumaRepresivo > 0.6 && soc.organizacionPopular < 0.15,
      'La trama organizativa quedó desarmada: sin delegados ni comisiones internas, el mundo del trabajo negocia solo.',
      ['social', 'represion']);
    avisar(mem, ctx, 'derechos_originarios',
      soc.derechosOriginarios > 0.45,
      'El reconocimiento de la preexistencia de los pueblos originarios entra en el derecho positivo.',
      ['social', 'originarios']);

    // Saneo final del dominio propio.
    for (const k of Object.keys(soc)) {
      if (typeof soc[k] === 'number') soc[k] = clamp01(sano(soc[k], 0));
    }
    for (const k of Object.keys(mem)) {
      if (typeof mem[k] === 'number') mem[k] = clamp01(sano(mem[k], 0));
    }
  },

  indicadores(estado) {
    const soc = estado.nacion.social;
    const mem = soc.memoria || asegurarMemoria(estado);
    const prev = mem.previo || {};
    const derechos = clamp01(
      0.38 * soc.derechosLaborales + 0.32 * soc.derechosCiviles + 0.30 * soc.derechosPoliticos
    );
    const d = (v, p) => sano(v - (p ?? v), 0);

    return [
      {
        clave: 'pobreza', etiqueta: 'Pobreza', valor: soc.pobreza, formato: 'porcentaje',
        tendencia: d(soc.pobreza, prev.pobreza),
        ayuda: 'Hogares bajo la línea. Depende del salario real, el desempleo, la informalidad, la inflación y las transferencias del Estado.',
      },
      {
        clave: 'brecha_regional', etiqueta: 'Brecha territorial', valor: mem.brechaRegional,
        formato: 'porcentaje', tendencia: d(mem.brechaRegional, prev.brecha),
        ayuda: 'Distancia entre la provincia más pobre y la más rica. Se achica sólo con política federal sostenida.',
      },
      {
        clave: 'sindicalizacion', etiqueta: 'Sindicalización', valor: soc.sindicalizacion,
        formato: 'porcentaje', tendencia: d(soc.sindicalizacion, prev.sindicalizacion),
        ayuda: 'Asalariados organizados. Su techo lo pone la concentración obrera: sin ciudad ni industria no despega.',
      },
      {
        clave: 'conflictividad', etiqueta: 'Conflictividad social', valor: soc.conflictividad,
        formato: 'indice', tendencia: d(soc.conflictividad, prev.conflictividad),
        ayuda: `Huelgas, cortes, protesta. Organización popular ${(soc.organizacionPopular * 100).toFixed(0)}%, movilización ${(soc.movilizacion * 100).toFixed(0)}%.`,
      },
      {
        clave: 'derechos', etiqueta: 'Derechos conquistados', valor: derechos, formato: 'indice',
        tendencia: d(derechos, prev.derechos),
        ayuda: 'Promedio de derechos laborales, civiles y políticos. Se ganan con lucha sostenida y se pierden bajo autoritarismo.',
      },
      {
        clave: 'represion', etiqueta: 'Represión estatal', valor: soc.represion, formato: 'indice',
        tendencia: d(soc.represion, prev.represion),
        ayuda: `Coerción del Estado sobre la protesta. Daño organizativo heredado: ${(mem.traumaRepresivo * 100).toFixed(0)}%.`,
      },
      {
        clave: 'genero', etiqueta: 'Derechos de las mujeres', valor: soc.genero, formato: 'indice',
        tendencia: d(soc.genero, prev.genero),
        ayuda: 'Avanza con educación secundaria, ciudad, trabajo asalariado y organización; habilita el voto femenino y la ampliación posterior de derechos.',
      },
      {
        clave: 'originarios', etiqueta: 'Derechos originarios', valor: soc.derechosOriginarios,
        formato: 'indice', tendencia: d(soc.derechosOriginarios, prev.originarios),
        ayuda: 'Depende de si la frontera se resolvió por conquista o por tratados, de la organización comunitaria y del reconocimiento jurídico.',
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

/**
 * Reparte la pobreza nacional entre provincias según su desarrollo relativo,
 * más un sesgo regional histórico. La media ponderada por población se
 * renormaliza para que coincida con el valor nacional: el reparto redistribuye,
 * no inventa pobres. `politicaFederal` (0..1) comprime la dispersión — es el
 * canal por el que la brecha norte/pampa puede efectivamente cerrarse.
 */
function repartirPobreza(estado, pobrezaNacional, mem, politicaFederal) {
  const provs = estado.provincias;
  if (!provs || provs.length === 0) return;
  const pf = clamp01(sano(politicaFederal, 0));
  const dispersion = 1.35 * (1 - 0.60 * pf);

  const desventajas = provs.map((p) => clamp01(
    0.42 * (1 - p.desarrollo) + 0.24 * (1 - p.educacion) +
    0.18 * (1 - p.infraestructura) + 0.16 * (1 - p.integracion)
  ));
  const desventajaMedia = promedio(provs.map((p, i) => [desventajas[i], Math.max(1e-6, p.poblacion)]));

  let pesoTotal = 0;
  let acumulado = 0;
  const brutos = provs.map((p, i) => {
    const sesgo = (SESGO_REGIONAL[p.region] ?? 0) * (1 - 0.60 * pf);
    const bruto = Math.max(0.20, 1 + (desventajas[i] - desventajaMedia) * dispersion + sesgo);
    const peso = Math.max(1e-6, p.poblacion);
    pesoTotal += peso;
    acumulado += bruto * peso;
    return bruto;
  });
  const media = acumulado / Math.max(1e-9, pesoTotal) || 1;

  for (let i = 0; i < provs.length; i++) {
    const objetivo = clamp01(sano(pobrezaNacional * (brutos[i] / media), pobrezaNacional));
    provs[i].pobreza = clamp01(hacia(provs[i].pobreza, objetivo, 0.25));
  }
  if (mem) mem.brechaRegional = brechaProvincial(estado);
}

/** Distancia entre la provincia más pobre y la menos pobre (0..1). */
function brechaProvincial(estado) {
  let min = 1, max = 0;
  for (const p of estado.provincias) {
    const v = clamp01(sano(p.pobreza, 0));
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return clamp01(max - min);
}

/** Log de una sola vez por partida. */
function avisar(mem, ctx, clave, condicion, texto, etiquetas) {
  if (!condicion || mem.avisos[clave]) return;
  mem.avisos[clave] = true;
  if (ctx && typeof ctx.log === 'function') ctx.log(texto, etiquetas);
}
