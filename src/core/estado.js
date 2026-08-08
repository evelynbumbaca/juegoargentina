// Estado del país. Es la única estructura de datos que comparten todos los
// sistemas y todos los eventos. Ver docs/CONTRATO.md para las reglas de
// escritura (qué sistema es dueño de qué campo).
//
// Convenciones:
//   - Salvo que se aclare, todo valor es 0..1.
//   - poblacion: millones de habitantes.
//   - pbiPerCapita: dólares internacionales de 1990 (serie tipo Maddison).
//   - deudaExterna: miles de millones de USD corrientes.
//   - inflacion: fracción anual (0.25 = 25%).

import { PROVINCIAS } from '../data/provincias.js';
import { clamp01 } from './util.js';

export const AÑO_INICIAL = 1810;
export const AÑO_FINAL = 2100;

/** Condiciones iniciales que configura el jugador antes de empezar. */
export const CONFIG_POR_DEFECTO = {
  semilla: 'PAMPA-1810',
  modo: 'observador', // 'observador' | 'interventor'

  // --- Reparto de la tierra ---
  // 'latifundio': enfiteusis y grandes estancias (línea histórica).
  // 'mixto': coexistencia de estancia y chacra colona.
  // 'colonizacion': ley de tierras tipo Homestead, chacras familiares.
  repartoTierras: 'latifundio',

  // --- Modelo económico de arranque ---
  // 'agroexportador' | 'mixto' | 'proteccionista'
  modeloEconomico: 'agroexportador',

  apertura: 0.75,            // apertura comercial (0 cerrado, 1 librecambio pleno)
  intervencionEstatal: 0.2,  // peso del Estado en la economía
  federalismo: 0.4,          // 0 unitario puro, 1 confederación
  inmigracion: 0.6,          // política inmigratoria (0 cerrada, 1 puertas abiertas)
  alineamiento: 'britanico', // 'britanico' | 'autonomo' | 'americanista'
  fronteraIndigena: 'conquista', // 'conquista' | 'tratados' | 'integracion'

  // --- Ajustes de simulación ---
  volatilidad: 1.0,          // multiplicador global del azar
  fidelidadHistorica: 0.65,  // 0 = caos total, 1 = línea base muy fiel
  añoFinal: 2050,
};

/** Perfiles de arranque listos para usar (atajos de la pantalla de inicio). */
export const PRESETS = {
  historico: {
    nombre: 'Línea histórica',
    descripcion: 'Las condiciones reales de 1810: puerto abierto, tierra concentrada, alineamiento británico.',
    config: {},
  },
  colonizadora: {
    nombre: 'República de chacareros',
    descripcion: 'La tierra se reparte en chacras familiares antes del auge exportador. ¿Otro país?',
    config: { repartoTierras: 'colonizacion', modeloEconomico: 'mixto', intervencionEstatal: 0.35, inmigracion: 0.8 },
  },
  proteccionista: {
    nombre: 'Industria temprana',
    descripcion: 'Aduana proteccionista desde el arranque, al estilo del proyecto de Carlos Pellegrini adelantado un siglo.',
    config: { modeloEconomico: 'proteccionista', apertura: 0.3, intervencionEstatal: 0.5, alineamiento: 'autonomo' },
  },
  confederacion: {
    nombre: 'Confederación fuerte',
    descripcion: 'El interior manda: federalismo alto, aduana repartida, Buenos Aires como una provincia más.',
    config: { federalismo: 0.85, modeloEconomico: 'mixto', alineamiento: 'americanista', repartoTierras: 'mixto' },
  },
  soberanista: {
    nombre: 'Soberanía sobre los recursos',
    descripcion: 'Ferrocarriles, puertos y subsuelo en manos del Estado desde el principio.',
    config: { intervencionEstatal: 0.7, apertura: 0.45, alineamiento: 'autonomo', modeloEconomico: 'mixto' },
  },
  originarios: {
    nombre: 'Frontera negociada',
    descripcion: 'Sin campaña militar al sur: tratados con los pueblos originarios y frontera porosa.',
    config: { fronteraIndigena: 'tratados', repartoTierras: 'mixto', federalismo: 0.6 },
  },
};

function nacionInicial(cfg) {
  const inter = cfg.intervencionEstatal;
  const tierraConc = cfg.repartoTierras === 'colonizacion' ? 0.55
    : cfg.repartoTierras === 'mixto' ? 0.72 : 0.86;

  return {
    // ---------------- DEMOGRAFÍA ----------------
    demografia: {
      poblacion: 0.55,          // millones (territorio actual, 1810)
      natalidad: 0.045,         // nacimientos por habitante y año
      mortalidad: 0.038,
      esperanzaVida: 0.30,      // 0..1 mapeado a 25..85 años
      urbanizacion: 0.12,
      migracionNeta: 0.0,       // millones/año
      fecundidad: 0.85,         // índice relativo
      mortalidadInfantil: 0.75, // alto = malo
      composicion: {
        criollo: 0.52, indigena: 0.30, afro: 0.10,
        inmigranteEuropeo: 0.06, inmigranteLimitrofe: 0.02,
      },
      poblacionActiva: 0.42,
      emigracion: 0.0,
    },

    // ---------------- ECONOMÍA ----------------
    economia: {
      pbiPerCapita: 1100,       // dólares internacionales de 1990
      crecimiento: 0.005,
      inflacion: 0.02,
      desempleo: 0.05,
      industrializacion: 0.05,
      productividadAgro: 0.20,
      gini: tierraConc * 0.6 + 0.18,
      salarioReal: 0.25,
      balanzaComercial: 0.0,    // -1..1 (déficit..superávit)
      reservas: 0.15,
      tipoCambioReal: 0.5,      // 0 apreciado, 1 depreciado
      presionFiscal: 0.08,
      deficitFiscal: 0.03,      // fracción del PBI
      informalidad: 0.7,
      concentracion: tierraConc * 0.5 + 0.3,
      diversificacion: 0.1,
      pesoEstado: inter,
      capacidadFiscal: 0.15,
      productividadIndustrial: 0.1,
      terminosIntercambio: 0.5,
    },

    // ---------------- DEUDA EXTERNA ----------------
    deuda: {
      deudaExterna: 0.0,        // miles de millones USD
      deudaPbi: 0.0,            // fracción del PBI
      monedaExtranjera: 0.9,    // proporción emitida en moneda dura
      tasaInteres: 0.06,
      riesgoPais: 0.4,
      servicioDeuda: 0.0,       // fracción de exportaciones
      condicionalidad: 0.0,     // grado de control externo sobre la política
      acuerdoFMI: false,
      defaults: [],
      fugaCapitales: 0.0,
      acreedores: { britanico: 0, eeuu: 0, organismos: 0, local: 0, china: 0 },
    },

    // ---------------- EDUCACIÓN Y CIENCIA ----------------
    educacion: {
      alfabetizacion: 0.20,
      primaria: 0.10,
      secundaria: 0.02,
      superior: 0.005,
      gastoPbi: 0.005,
      calidad: 0.3,
      universidadPublica: 0.2,
      cienciaTecnica: 0.05,
      fugaCerebros: 0.0,
      formacionTecnica: 0.05,
      brechaRegional: 0.6,
    },

    // ---------------- FUERZAS ARMADAS ----------------
    ffaa: {
      presupuesto: 0.25,        // fracción del gasto público
      poderPolitico: 0.35,
      profesionalizacion: 0.15,
      doctrina: 'milicia',      // 'milicia'|'profesional'|'seguridadInterior'|'defensa'
      golpismo: 0.1,
      capacidadMilitar: 0.2,
      industriaMilitar: 0.02,
      conflictosActivos: [],
      tutelaje: 0.2,            // tutela sobre el poder civil
    },

    // ---------------- MOVIMIENTOS SOCIALES ----------------
    social: {
      sindicalizacion: 0.0,
      movilizacion: 0.15,
      conflictividad: 0.2,
      derechosLaborales: 0.02,
      derechosCiviles: 0.10,
      derechosPoliticos: 0.08,
      cohesion: 0.45,
      represion: 0.35,
      pobreza: 0.6,
      organizacionPopular: 0.1,
      genero: 0.05,
      derechosOriginarios: 0.05,
    },

    // ---------------- TIERRA ----------------
    tierra: {
      giniTierra: tierraConc,
      latifundio: tierraConc,
      chacras: 1 - tierraConc,
      extranjerizacion: 0.05,
      reformaAgraria: 0.0,
      territorioOriginario: 0.55,  // fracción del territorio bajo control originario
      fronteraAgricola: 0.15,
      arrendamiento: 0.4,
      concentracionSemillas: 0.0,
      sojizacion: 0.0,
    },

    // ---------------- POLÍTICA EXTERIOR ----------------
    exterior: {
      soberania: 0.55,
      alineamiento: cfg.alineamiento,
      integracionRegional: 0.1,
      prestigio: 0.2,
      ied: 0.05,                // inversión extranjera directa (peso en la economía)
      controlExtranjeroRecursos: 0.1,
      tratados: [],
      conflictoLimitrofe: 0.3,
      autonomia: 0.4,
      dependenciaComercial: 0.7, // concentración de socios comerciales
      socioPrincipal: 'britanico',
      // Expuestos por el sistema `exterior` para que los lean los demás:
      terminosIntercambio: 0.55,  // contexto mundial de precios (0.5 neutro)
      giroUtilidades: 0.0,        // divisas que salen como ganancia extranjera
      cicloHegemonico: 'britanico',
    },

    // ---------------- RECURSOS NATURALES ----------------
    recursos: {
      agro: 0.85,
      ganaderia: 0.8,
      petroleo: 0.0,
      gas: 0.0,
      litio: 0.0,
      mineria: 0.1,
      pesca: 0.2,
      bosques: 0.9,
      agua: 0.95,
      biodiversidad: 0.9,
      sostenibilidad: 0.85,
      controlNacional: 0.9,
      rentaExtractiva: 0.0,
      descubiertos: [],
      // Expuestos por el sistema `recursos`:
      potencial: 0.2,       // potencial extractivo agregado del territorio
      rentaFugada: 0.0,     // parte de la renta que se gira al exterior
      rentaRetenida: 0.0,
    },

    // ---------------- INFRAESTRUCTURA ----------------
    infraestructura: {
      ferrocarril: 0.0,
      controlNacionalFerrocarril: 0.0,
      rutas: 0.05,
      puertos: 0.2,
      centralismoPortuario: 0.75,
      energia: 0.02,
      matrizRenovable: 0.05,
      agua_saneamiento: 0.1,
      vivienda: 0.25,
      salud: 0.1,
      digital: 0.0,
      mantenimiento: 0.5,
      integracionTerritorial: 0.15,
    },

    // ---------------- CULTURA ----------------
    cultura: {
      identidad: 0.35,
      prensaLibre: 0.3,
      produccionCultural: 0.15,
      memoriaHistorica: 0.2,
      extranjerizacion: 0.4,
      deporte: 0.05,
      patrimonio: 0.4,
      cohesionSimbolica: 0.35,
      culturaPopular: 0.4,
      cienciaSocial: 0.05,
    },
  };
}

/**
 * Correlación de fuerzas: potencia relativa de cada actor social.
 * Los eventos usan estos pesos para decidir qué opción se impone en modo
 * observador, y para habilitar o bloquear opciones en modo interventor.
 */
function actoresIniciales(cfg) {
  const conc = cfg.repartoTierras === 'latifundio' ? 0.75 : cfg.repartoTierras === 'mixto' ? 0.6 : 0.45;
  return {
    oligarquia: conc,
    burguesiaIndustrial: 0.05,
    capitalExtranjero: cfg.apertura * 0.5,
    sindicatos: 0.0,
    clasesMedias: 0.08,
    ffaa: 0.35,
    iglesia: 0.45,
    movimientosPopulares: 0.12,
    puebloOriginario: 0.35,
    organismosInternacionales: 0.0,
    caudillosProvinciales: 1 - cfg.federalismo * 0.3,
    portuarios: 0.6,
  };
}

/** Régimen político vigente. */
function regimenInicial() {
  return {
    tipo: 'revolucionario',    // revolucionario|oligarquico|democracia|dictadura|anarquia|caudillista
    legitimidad: 0.5,
    democracia: 0.15,
    participacion: 0.05,
    estabilidad: 0.4,
    corrupcion: 0.35,
    capacidadEstatal: 0.15,
    signoPolitico: 'patriota', // etiqueta narrativa del gobierno de turno
    añosEnPoder: 0,
  };
}

export function crearEstado(configParcial = {}) {
  const config = { ...CONFIG_POR_DEFECTO, ...configParcial };

  const provincias = PROVINCIAS.map((p) => ({
    ...p,
    poblacion: p.poblacion1810,
    urbanizacion: p.urbanizacion1810 ?? 0.1,
    integracion: p.integracion1810,     // incorporación al Estado nacional
    desarrollo: p.desarrollo1810 ?? 0.1,
    industria: 0.02,
    agro: p.aptitud.agro * 0.3,
    infraestructura: 0.03,
    educacion: 0.1,
    descontento: 0.2,
    autonomismo: p.autonomismo1810 ?? 0.5,
    pobreza: 0.6,
    controlOriginario: p.controlOriginario1810 ?? 0,
    extranjerizacionTierra: 0.02,
    conflicto: 0,
  }));

  return {
    version: 1,
    config,
    año: AÑO_INICIAL,
    tick: 0,
    terminada: false,
    causaFin: null,

    nacion: nacionInicial(config),
    actores: actoresIniciales(config),
    regimen: regimenInicial(),
    provincias,

    // Acumuladores que escriben los sistemas y leen los eventos.
    presiones: {
      social: 0, fiscal: 0, externa: 0, golpe: 0,
      inflacionaria: 0, regional: 0, ecologica: 0, deuda: 0,
    },

    // Efectos temporales inyectados por eventos (ver motor.js).
    modificadores: [],

    // Marcas persistentes (leyes sancionadas, guerras ganadas, etc.).
    flags: {},

    // Registro narrativo de la partida.
    historia: [],
    eventosDisparados: {},
    decisiones: [],

    // Series temporales para los gráficos.
    series: {},

    // Evento esperando decisión del jugador (modo interventor).
    pendiente: null,
  };
}

/** Índices sintéticos que resumen el estado del país para la interfaz. */
export function indices(s) {
  const n = s.nacion;
  const soberania = clamp01(
    n.exterior.soberania * 0.35 +
    n.recursos.controlNacional * 0.2 +
    (1 - n.deuda.condicionalidad) * 0.25 +
    n.infraestructura.controlNacionalFerrocarril * 0.08 +
    (1 - n.tierra.extranjerizacion) * 0.12
  );
  const equidad = clamp01(
    (1 - n.economia.gini) * 0.35 +
    (1 - n.social.pobreza) * 0.3 +
    (1 - n.tierra.giniTierra) * 0.2 +
    n.social.derechosLaborales * 0.15
  );
  const desarrollo = clamp01(
    Math.min(1, n.economia.pbiPerCapita / 25000) * 0.3 +
    n.economia.industrializacion * 0.2 +
    n.educacion.cienciaTecnica * 0.15 +
    n.infraestructura.energia * 0.12 +
    n.educacion.superior * 0.13 +
    n.economia.diversificacion * 0.1
  );
  const democracia = clamp01(
    s.regimen.democracia * 0.4 +
    n.social.derechosCiviles * 0.25 +
    n.cultura.prensaLibre * 0.15 +
    n.social.derechosPoliticos * 0.2
  );
  const bienestar = clamp01(
    n.demografia.esperanzaVida * 0.25 +
    n.educacion.alfabetizacion * 0.2 +
    (1 - n.social.pobreza) * 0.25 +
    n.infraestructura.salud * 0.15 +
    n.infraestructura.agua_saneamiento * 0.15
  );
  return { soberania, equidad, desarrollo, democracia, bienestar };
}
