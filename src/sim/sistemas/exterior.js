// Política exterior y soberanía.
//
// CAMPOS QUE ESTE SISTEMA EXPONE PARA LOS DEMÁS (documentados acá porque otros
// sistemas los leen):
//   nacion.exterior.terminosIntercambio  contexto mundial de precios (0..1,
//                                        0.5 neutro). Economía lo mezcla con su
//                                        propia canasta para formar sus ToT.
//   nacion.exterior.giroUtilidades       utilidades de la IED giradas al
//                                        exterior; drena divisas.
//   nacion.exterior.cicloHegemonico      potencia dominante del período.
//
// La tesis del sistema: la soberanía no es una declaración sino una lista de
// cosas concretas. Quién fija el precio de lo que se vende, quién es dueño de
// lo que se extrae, en qué moneda y bajo qué jurisdicción está la deuda, quién
// decide la política económica. Un país puede tener himno, bandera y selección
// nacional y estar tomando decisiones que decide otro.

import { clamp01, hacia, lerp, promedio, sano } from '../../core/util.js';

/**
 * Precios internacionales de las materias primas. Es contexto mundial: guerras,
 * crisis y auges ajenos. Lo que el país hace con cada ventana es la partida.
 */
const PRECIOS_MUNDO = [
  [1810, 0.55], [1825, 0.45], [1850, 0.60], [1873, 0.72], [1880, 0.45],
  [1890, 0.38], [1900, 0.55], [1913, 0.62], [1918, 0.78], [1921, 0.45],
  [1928, 0.60], [1932, 0.18], [1939, 0.35], [1946, 0.72], [1951, 0.80],
  [1960, 0.45], [1972, 0.50], [1974, 0.82], [1980, 0.68], [1986, 0.28],
  [1995, 0.40], [2002, 0.32], [2008, 0.78], [2011, 0.85], [2016, 0.48],
  [2022, 0.62], [2035, 0.55], [2060, 0.55], [2100, 0.55],
];

function precioMundial(año) {
  for (let i = 0; i < PRECIOS_MUNDO.length - 1; i++) {
    const [a1, v1] = PRECIOS_MUNDO[i];
    const [a2, v2] = PRECIOS_MUNDO[i + 1];
    if (año >= a1 && año <= a2) return lerp(v1, v2, (año - a1) / (a2 - a1));
  }
  return 0.55;
}

/** Potencia dominante del sistema mundial en cada período. */
function hegemonia(año) {
  if (año < 1945) return 'britanico';
  if (año < 2000) return 'eeuu';
  return 'multipolar';
}

export default {
  meta: {
    id: 'exterior',
    nombre: 'Política exterior',
    orden: 100,
    descripcion: 'Soberanía efectiva, alineamiento, inserción comercial e inversión extranjera.',
  },

  init(estado) {
    const e = estado.nacion.exterior;
    e.terminosIntercambio = precioMundial(1810);
    e.giroUtilidades = 0;
    e.cicloHegemonico = 'britanico';
  },

  paso(estado, rng, ctx) {
    const n = estado.nacion;
    const e = n.exterior;
    const F = estado.flags;
    const año = ctx.año;

    // -------------------------------------------------------------------
    // 1. Contexto mundial
    // -------------------------------------------------------------------
    e.cicloHegemonico = hegemonia(año);
    e.terminosIntercambio = clamp01(hacia(
      sano(e.terminosIntercambio, 0.5), precioMundial(año), 0.45
    ) + rng.normal(0.035 * ctx.config.volatilidad));

    // -------------------------------------------------------------------
    // 2. Alineamiento. La órbita cambia cuando cambia la potencia dominante,
    //    salvo que exista una política deliberada de autonomía.
    // -------------------------------------------------------------------
    const autonomiaPolitica = clamp01(
      e.autonomia * 0.5 + n.economia.diversificacion * 0.2
      + n.educacion.cienciaTecnica * 0.15 + e.integracionRegional * 0.15
    );
    if (autonomiaPolitica < 0.45 && rng.chance(0.08)) {
      e.alineamiento = e.cicloHegemonico;
      e.socioPrincipal = e.cicloHegemonico;
    }

    // La autonomía se construye con capacidades, no con discursos. Y se pierde
    // sobre todo por una vía: la condicionalidad de los acreedores.
    const objetivoAutonomia = clamp01(
      0.15
      + 0.22 * n.economia.diversificacion
      + 0.18 * n.educacion.cienciaTecnica
      + 0.16 * e.integracionRegional
      + 0.12 * n.recursos.controlNacional
      + 0.10 * n.ffaa.capacidadMilitar
      - 0.42 * n.deuda.condicionalidad
      - 0.18 * e.dependenciaComercial
      + (e.alineamiento === 'autonomo' ? 0.12 : 0)
      + (F.alca_rechazado ? 0.05 : 0)
      - (F.base_extranjera ? 0.08 : 0)
    );
    e.autonomia = clamp01(hacia(e.autonomia, objetivoAutonomia, 0.08));

    // -------------------------------------------------------------------
    // 3. Inversión extranjera directa. Ni bendición ni maldición: capital y
    //    tecnología que entran, utilidades y control que salen.
    // -------------------------------------------------------------------
    const clima = clamp01(
      0.30 * ctx.config.apertura
      + 0.22 * (1 - n.deuda.riesgoPais)
      + 0.16 * estado.regimen.estabilidad
      + 0.14 * n.infraestructura.energia
      + 0.10 * sano(n.recursos.potencial, 0.2)
      + (F.privatizaciones ? 0.15 : 0)
      + (F.convertibilidad ? 0.10 : 0)
      - (F.control_cambios ? 0.12 : 0)
      - (F.default_deuda ? 0.15 : 0)
    );
    e.ied = clamp01(hacia(e.ied, clamp01(clima * 0.55), 0.10));

    // Las utilidades giradas crecen con el stock invertido y con la libertad
    // para remitirlas. Son divisas que salen sin contrapartida comercial.
    e.giroUtilidades = clamp01(
      e.ied * (F.control_cambios ? 0.35 : 0.75) * (0.5 + 0.5 * ctx.config.apertura)
    );

    e.controlExtranjeroRecursos = clamp01(hacia(e.controlExtranjeroRecursos,
      clamp01(1 - n.recursos.controlNacional), 0.12));

    // -------------------------------------------------------------------
    // 4. Inserción comercial
    // -------------------------------------------------------------------
    const objetivoDependencia = clamp01(
      0.30
      + 0.35 * (1 - n.economia.diversificacion)
      + 0.20 * (1 - e.integracionRegional)
      + 0.15 * ctx.config.apertura
      - 0.20 * n.economia.industrializacion
    );
    e.dependenciaComercial = clamp01(hacia(e.dependenciaComercial, objetivoDependencia, 0.07));

    const objetivoIntegracion = clamp01(
      (F.mercosur ? 0.45 : 0.05)
      + (F.unasur ? 0.15 : 0)
      + 0.20 * e.autonomia
      + 0.15 * n.infraestructura.integracionTerritorial
      + (e.alineamiento === 'americanista' ? 0.15 : 0)
      - 0.15 * e.conflictoLimitrofe
    );
    e.integracionRegional = clamp01(hacia(e.integracionRegional, objetivoIntegracion, 0.07));

    // -------------------------------------------------------------------
    // 5. Conflicto limítrofe y prestigio
    // -------------------------------------------------------------------
    e.conflictoLimitrofe = clamp01(hacia(e.conflictoLimitrofe, clamp01(
      0.30 - 0.25 * e.integracionRegional - 0.15 * estado.regimen.democracia
      + 0.20 * n.ffaa.poderPolitico
      + (F.malvinas_ocupadas ? 0.15 : 0)
      + (n.ffaa.conflictosActivos?.length ? 0.30 : 0)
    ), 0.10));

    e.prestigio = clamp01(hacia(e.prestigio, clamp01(
      0.15
      + 0.20 * n.educacion.cienciaTecnica
      + 0.15 * n.cultura.produccionCultural
      + 0.15 * estado.regimen.democracia
      + 0.12 * clamp01(n.economia.pbiPerCapita / 15000)
      + 0.10 * e.integracionRegional
      + 0.08 * n.cultura.deporte
      - 0.20 * n.social.represion
      - 0.12 * (n.deuda.defaults?.length ? 0.5 : 0)
    ), 0.09));

    // -------------------------------------------------------------------
    // 6. SOBERANÍA EFECTIVA. La suma de condiciones materiales concretas.
    // -------------------------------------------------------------------
    const objetivoSoberania = clamp01(promedio([
      [1 - n.deuda.condicionalidad, 0.26],           // quién decide la política
      [n.recursos.controlNacional, 0.18],            // quién es dueño del subsuelo
      [e.autonomia, 0.16],                           // margen de maniobra externo
      [1 - n.tierra.extranjerizacion, 0.10],         // quién es dueño de la tierra
      [n.infraestructura.controlNacionalFerrocarril, 0.08],
      [1 - e.controlExtranjeroRecursos, 0.08],
      [estado.regimen.capacidadEstatal, 0.08],       // capacidad de hacer cumplir
      [n.ffaa.capacidadMilitar, 0.06],
    ]));
    e.soberania = clamp01(hacia(e.soberania, objetivoSoberania, 0.10));

    // -------------------------------------------------------------------
    // 7. Presión externa
    // -------------------------------------------------------------------
    estado.presiones.externa = clamp01(
      estado.presiones.externa
      + (0.5 - e.terminosIntercambio) * 0.35
      + e.giroUtilidades * 0.20
      + n.deuda.condicionalidad * 0.18
      + e.conflictoLimitrofe * 0.10
      - e.integracionRegional * 0.10
    );

    // Deriva lenta de los actores de la órbita externa.
    const mover = (id, obj) => {
      estado.actores[id] = clamp01(estado.actores[id]
        + Math.max(-0.02, Math.min(0.02, obj - estado.actores[id])));
    };
    mover('capitalExtranjero', clamp01(e.ied * 1.3 + e.controlExtranjeroRecursos * 0.4));
    mover('organismosInternacionales', clamp01(n.deuda.condicionalidad * 1.1));
  },

  indicadores(estado) {
    const e = estado.nacion.exterior;
    const n = estado.nacion;
    // Qué está erosionando la soberanía ahora mismo, en lenguaje claro.
    const causas = [
      ['condicionalidad de los acreedores', n.deuda.condicionalidad],
      ['recursos en manos extranjeras', e.controlExtranjeroRecursos],
      ['tierra extranjerizada', n.tierra.extranjerizacion],
      ['dependencia de pocos socios', e.dependenciaComercial],
      ['infraestructura ajena', 1 - n.infraestructura.controlNacionalFerrocarril],
    ].sort((a, b) => b[1] - a[1]);
    const nombres = { britanico: 'órbita británica', eeuu: 'órbita estadounidense',
      multipolar: 'mundo multipolar', autonomo: 'tercera posición', americanista: 'integración regional' };

    return [
      { clave: 'soberania', etiqueta: 'Soberanía efectiva', valor: e.soberania, formato: 'porcentaje',
        ayuda: 'Capacidad real de decidir sobre el propio territorio, recursos y política.' },
      { clave: 'principal', etiqueta: 'Principal límite', valor: causas[0][0], formato: 'texto',
        ayuda: 'Lo que más está recortando la soberanía en este momento.' },
      { clave: 'alineamiento', etiqueta: 'Alineamiento', valor: nombres[e.alineamiento] ?? e.alineamiento,
        formato: 'texto', ayuda: 'Órbita internacional en la que se inserta el país.' },
      { clave: 'autonomia', etiqueta: 'Autonomía', valor: e.autonomia, formato: 'porcentaje',
        ayuda: 'Margen para tomar decisiones distintas a las que espera la potencia dominante.' },
      { clave: 'tot', etiqueta: 'Precios internacionales', valor: e.terminosIntercambio, formato: 'indice',
        ayuda: 'Contexto mundial de precios de las materias primas. No lo decide el país.' },
      { clave: 'ied', etiqueta: 'Inversión extranjera', valor: e.ied, formato: 'indice',
        ayuda: 'Peso del capital extranjero en la economía.' },
      { clave: 'giro', etiqueta: 'Utilidades giradas', valor: e.giroUtilidades, formato: 'indice',
        ayuda: 'Divisas que salen del país como ganancia del capital extranjero.' },
      { clave: 'integracion', etiqueta: 'Integración regional', valor: e.integracionRegional,
        formato: 'porcentaje', ayuda: 'Coordinación política y económica con los vecinos.' },
    ];
  },
};
