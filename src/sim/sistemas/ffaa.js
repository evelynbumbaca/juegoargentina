// Sistema de Fuerzas Armadas.
//
// Dueño de `estado.nacion.ffaa`. Aporta a `estado.presiones.golpe` y a
// `estado.presiones.fiscal`. Mueve lentamente el actor `ffaa` (≤0.02/año).
// Lee todo el resto del estado pero no lo escribe (ver docs/CONTRATO.md).
//
// ---------------------------------------------------------------------------
// LA TESIS DEL MÓDULO
// ---------------------------------------------------------------------------
// El golpismo no es un rasgo de carácter de los militares argentinos ni una
// patología nacional: es una variable de estado que sube y baja según
// condiciones materiales y políticas concretas. Acá se modela como el producto
// de siete cosas —doctrina vigente, tutelaje ya conquistado sobre el poder
// civil, crisis económica, deslegitimación del gobierno, conflictividad social
// leída como amenaza al orden, respaldo de sectores civiles y clima
// internacional— contenido por otras cinco —subordinación construida,
// continuidad institucional acumulada, costo judicial de haber intervenido,
// legitimidad del gobierno y doctrina profesional o defensiva.
//
// Y sobre todo: **un golpe necesita coalición civil**. Un cuartel enojado sin
// diarios, sin curas, sin corporaciones agrarias, sin embajada y sin clase
// media en la calle no hace un golpe: hace un motín que se apaga en 48 horas.
// Por eso `coalicionCivil` no es un sumando más sino un multiplicador con
// umbral duro: por debajo de `UMBRAL_COALICION` el aporte a `presiones.golpe`
// es exactamente cero, por más golpista que esté el ejército.
//
// ---------------------------------------------------------------------------
// TRAYECTORIA INSTITUCIONAL QUE DEBE PODER EMERGER
// ---------------------------------------------------------------------------
//   1810-1860  Milicias y caudillos. El "ejército" es la suma de fuerzas
//              provinciales; la doctrina es 'milicia'; el presupuesto militar
//              se come casi todo el gasto público porque no hay otra cosa que
//              gasto público. La profesionalización no puede despegar sin
//              Estado nacional.
//   1860-1900  Ejército nacional: escuela de oficiales, mando centralizado,
//              guerras que unifican el aparato militar (Paraguay, frontera).
//              La profesionalización se compra con capacidad estatal,
//              presupuesto sostenido y educación técnica: las tres cosas.
//   1900-1930  Conscripción y servicio militar obligatorio: el cuartel como
//              máquina de nacionalización de masas. Doctrina 'profesional'.
//   1930-1976  Deriva: la doctrina se corre a 'seguridadInterior' cuando la
//              conflictividad interna se lee como enemigo interno y hay
//              doctrina importada disponible. Las FFAA pasan a ser un actor
//              político permanente.
//   1983-      Subordinación democrática: juicios, recorte presupuestario,
//              cambio de doctrina y décadas de continuidad. Lenta, costosa,
//              no automática y perfectamente reversible.
//
// ---------------------------------------------------------------------------
// CAMPOS DE `nacion.ffaa` (todos 0..1 salvo lo indicado)
// ---------------------------------------------------------------------------
// Del esquema base:
//   presupuesto           fracción del gasto público que se lleva la defensa
//   poderPolitico         peso de las FFAA como actor de veto
//   profesionalizacion    formación, mérito, cadena de mando, cuartel separado
//   doctrina              'milicia'|'profesional'|'seguridadInterior'|'defensa'
//   golpismo              disposición efectiva a intervenir
//   capacidadMilitar      poder de fuego real (no gasto: capacidad)
//   industriaMilitar      fábricas militares, astilleros, aviones, nuclear
//   conflictosActivos     array de objetos conflicto (ver crearConflicto)
//   tutelaje              tutela ya ejercida sobre el poder civil
//
// Derivados que agrega este sistema (y que otros sistemas y eventos pueden leer):
//   presupuestoSostenido  media móvil del gasto real: lo que construye capacidad
//   conscripcion          servicio militar obligatorio
//   formacionOficial      escuela militar, cuerpo de oficiales formado
//   cohesion              unidad interna: un ejército faccionalizado no puede
//   prestigio             capital simbólico ganado o perdido en el campo
//   subordinacion         sujeción efectiva al poder civil
//   impunidad             ausencia de costo judicial por los crímenes cometidos
//   continuidadInstitucional  décadas de continuidad acumuladas (1 ≈ 45 años)
//   memoriaGolpe          precedente fresco de intervención exitosa
//   coalicionCivil        respaldo civil disponible para una asonada
//   riesgoRuptura         probabilidad efectiva de ruptura institucional
//   habilitacionRepresiva  licencia doctrinaria para la represión masiva
//                          (`social` la lee para mover `social.represion`)
//   derrameIndustrial     derrame de la industria militar sobre la civil
//                          (`economia`/`educacion` lo leen)
//   costoOportunidad      esfuerzo estatal que el cuartel le saca a escuelas,
//                          hospitales y rutas
//   saldoBelico           0.5 neutro; >0.5 victoria que legitima al gobierno,
//                          <0.5 derrota que lo derrumba (`regimen` lo lee)
//   amenazaExterna        hipótesis de conflicto externo percibida
//   bajasAnuales          muertos del año por conflictos, EN MILLONES
//                          (`demografia` lo lee y lo descuenta de la población)
//   previo                foto del año anterior, sólo para tendencias de la UI

import { clamp, clamp01, hacia, suave, promedio } from '../../core/util.js';

// --------------------------------------------------------------------------
// Constantes del modelo
// --------------------------------------------------------------------------

/** Cuánto empuja cada doctrina hacia la intervención política. */
const CARGA_GOLPISTA = {
  milicia: 0.55,            // el jefe militar ES el poder político
  profesional: 0.22,        // cuartel separado, pero con corporación fuerte
  seguridadInterior: 1.0,   // enemigo interno: la política es el campo de batalla
  defensa: 0.08,            // hipótesis externa, mando civil
};

/** Cuánto orienta cada doctrina la fuerza hacia afuera (capacidad militar real). */
const ORIENTACION_EXTERNA = {
  milicia: 0.45, profesional: 0.85, seguridadInterior: 0.4, defensa: 1.0,
};

/** Licencia doctrinaria para la represión interna masiva. */
const LICENCIA_REPRESIVA = {
  milicia: 0.45, profesional: 0.25, seguridadInterior: 1.0, defensa: 0.1,
};

/** Sin al menos esta coalición civil, una asonada no es un golpe: es un motín. */
const UMBRAL_COALICION = 0.28;

/** Riesgo por debajo del cual el sistema no aporta nada a `presiones.golpe`. */
const UMBRAL_RIESGO = 0.15;

/** Máximo de conflictos armados simultáneos que el país puede sostener. */
const MAX_CONFLICTOS = 3;

/** Años de continuidad institucional que valen `continuidadInstitucional` = 1. */
const AÑOS_CONTINUIDAD_PLENA = 45;

// --------------------------------------------------------------------------
// Utilidades locales (defensivas: ningún otro sistema tiene por qué existir)
// --------------------------------------------------------------------------

const num = (v, reserva = 0) => (Number.isFinite(v) ? v : reserva);
const bandera = (estado, clave) => (estado.flags && estado.flags[clave] ? 1 : 0);

/** Lee un subdominio de `nacion` sin romperse si todavía no fue creado. */
const dom = (estado, clave) => (estado.nacion && estado.nacion[clave]) || {};

/** Suma acotada a una presión (nunca resta: `regimen` es quien decae). */
function aportarPresion(estado, clave, delta) {
  if (!estado.presiones) return;
  const d = num(delta, 0);
  if (d <= 0) return;
  estado.presiones[clave] = clamp01(num(estado.presiones[clave], 0) + d);
}

/** Mueve un actor con el tope de 0.02/año que fija el contrato. */
function moverActor(estado, id, delta) {
  if (!estado.actores) return;
  const d = clamp(num(delta, 0), -0.02, 0.02);
  estado.actores[id] = clamp01(num(estado.actores[id], 0) + d);
}

// --------------------------------------------------------------------------
// Conflictos
// --------------------------------------------------------------------------

/**
 * Un conflicto armado activo. Vive dentro de un array, así que el saneo del
 * motor no lo recorre: este módulo se hace cargo de mantenerlo sano.
 *
 * tipo: 'externa'   guerra contra otro Estado
 *       'civil'     guerra civil, sublevación provincial, secesión
 *       'frontera'  campaña de frontera / conflicto limítrofe de baja intensidad
 *       'ocupacion' territorio nacional ocupado por una potencia
 */
function crearConflicto(datos) {
  return {
    id: datos.id,
    tipo: datos.tipo || 'externa',
    nombre: datos.nombre || 'Conflicto armado',
    intensidad: clamp01(num(datos.intensidad, 0.4)),
    dificultad: clamp01(num(datos.dificultad, 0.5)),
    apoyo: clamp01(num(datos.apoyo, 0.5)),      // apoyo interno a la guerra
    años: 0,
    duracion: Math.max(1, num(datos.duracion, 4)),
    origen: datos.origen || 'gobierno',          // quién metió al país en esto
    interno: datos.tipo === 'civil',
  };
}

/**
 * Los eventos pueden empujar strings o formas incompletas a `conflictosActivos`.
 * Acá se normaliza todo a objetos conflicto sanos.
 */
function normalizarConflictos(f) {
  if (!Array.isArray(f.conflictosActivos)) f.conflictosActivos = [];
  f.conflictosActivos = f.conflictosActivos
    .filter((c) => c != null)
    .slice(0, MAX_CONFLICTOS + 2)
    .map((c) => {
      if (typeof c === 'string') {
        const id = c;
        const civil = /civil|sublev|secesi|montoner|rebeli/i.test(id);
        const frontera = /frontera|desierto|limitrof|indig/i.test(id);
        const ocupa = /ocupac|malvinas|invasion/i.test(id);
        return crearConflicto({
          id,
          nombre: id.replace(/_/g, ' '),
          tipo: civil ? 'civil' : frontera ? 'frontera' : ocupa ? 'ocupacion' : 'externa',
          intensidad: 0.45, dificultad: 0.5, duracion: 4, apoyo: 0.5,
        });
      }
      const base = crearConflicto({ ...c, id: c.id || `conflicto_${Math.round(num(c.años, 0))}` });
      base.años = Math.max(0, Math.round(num(c.años, 0)));
      return base;
    });
}

/** Esfuerzo bélico agregado: cuánto del país está puesto en pelear. */
function esfuerzoBelico(f) {
  let e = 0;
  for (const c of f.conflictosActivos) {
    const peso = c.tipo === 'civil' ? 1.15 : c.tipo === 'externa' ? 1.0 : 0.55;
    e += c.intensidad * peso;
  }
  return clamp01(e);
}

// --------------------------------------------------------------------------
// Lecturas del contexto material
// --------------------------------------------------------------------------

/**
 * Crisis económica tal como la percibe un oficial en el casino: inflación que
 * no para, gente sin trabajo, pobreza visible, la caja del Estado vacía.
 */
function crisisEconomica(estado) {
  const eco = dom(estado, 'economia');
  const soc = dom(estado, 'social');
  const p = estado.presiones || {};
  return clamp01(promedio([
    [suave(num(eco.inflacion, 0.02), 0.15, 1.2), 1.0],
    [suave(num(eco.desempleo, 0.05), 0.05, 0.22), 0.8],
    [suave(num(soc.pobreza, 0.3), 0.2, 0.55), 0.8],
    [suave(-num(eco.crecimiento, 0), 0.0, 0.06), 0.9],
    [num(p.fiscal, 0), 0.6],
    [num(p.deuda, 0), 0.5],
    [1 - clamp01(num(eco.capacidadFiscal, 0.2) * 1.6), 0.4],
  ]));
}

/**
 * Conflictividad social percibida como amenaza al orden. Ojo: es *percepción*.
 * La misma huelga es un reclamo salarial bajo doctrina profesional y una
 * cabecera de puente del comunismo internacional bajo seguridad interior.
 */
function amenazaAlOrden(estado, f) {
  const soc = dom(estado, 'social');
  const act = estado.actores || {};
  const p = estado.presiones || {};
  const bruta = clamp01(promedio([
    [num(soc.conflictividad, 0.2), 1.0],
    [num(soc.movilizacion, 0.15), 0.7],
    [num(act.sindicatos, 0), 0.8],
    [num(act.movimientosPopulares, 0.1), 0.6],
    [num(soc.organizacionPopular, 0.1), 0.5],
    [num(p.social, 0), 0.7],
    [1 - num(estado.regimen && estado.regimen.estabilidad, 0.4), 0.6],
  ]));
  // El lente doctrinario amplifica o desdramatiza lo mismo que está pasando.
  const lente = f.doctrina === 'seguridadInterior' ? 1.45
    : f.doctrina === 'milicia' ? 1.1
      : f.doctrina === 'defensa' ? 0.7 : 1.0;
  return clamp01(bruta * lente);
}

/**
 * Cuán redistributivo es el gobierno de turno. No es un juicio moral: es el
 * dato que mira la oligarquía para decidir si banca o si voltea.
 */
function gobiernoRedistributivo(estado) {
  const soc = dom(estado, 'social');
  const eco = dom(estado, 'economia');
  const act = estado.actores || {};
  return clamp01(promedio([
    [num(soc.derechosLaborales, 0.02), 1.0],
    [num(eco.pesoEstado, 0.2), 0.8],
    [num(soc.organizacionPopular, 0.1), 0.6],
    [num(act.sindicatos, 0), 0.7],
    [num(soc.genero, 0.05) * 0.5 + num(soc.derechosCiviles, 0.1) * 0.5, 0.4],
  ]));
}

/**
 * Clima internacional: qué tan barato sale un golpe en el mundo de ese año.
 * Antes de 1930 el modelo militar importado es prusiano y profesionalizante;
 * entre 1930 y 1945 los fascismos legitiman el tutelaje castrense; en la
 * Guerra Fría la doctrina de seguridad nacional llega con manuales, becas y
 * padrinos; después de 1990 la cláusula democrática regional lo encarece.
 */
function climaInternacional(estado, año) {
  const ext = dom(estado, 'exterior');
  const deu = dom(estado, 'deuda');
  const act = estado.actores || {};
  let c;
  if (año < 1860) c = 0.40;         // guerras de independencia: la fuerza ES la política
  else if (año < 1900) c = 0.28;
  else if (año < 1930) c = 0.22;    // paz armada y profesionalización a la prusiana
  else if (año < 1945) c = 0.58;    // crisis del 30 y fascismos: el ejército tutela
  else if (año < 1990) c = 0.78;    // Guerra Fría: doctrina de seguridad nacional
  else c = 0.10;                    // cláusula democrática, golpe caro y mal visto

  const alin = ext.alineamiento;
  // Alineamiento subordinado a la potencia dominante: importa doctrina, manuales
  // y padrinos. Autonomía: menos doctrina prestada, menos padrinos.
  if (alin === 'britanico') c += 0.12;
  else if (alin === 'americanista') c += año < 1990 ? 0.05 : -0.08;
  else if (alin === 'autonomo') c -= 0.10;

  c += 0.14 * bandera(estado, 'base_extranjera');
  c += 0.10 * num(deu.condicionalidad, 0);
  c += 0.08 * num(act.organismosInternacionales, 0);
  c -= 0.08 * bandera(estado, 'mercosur');
  c -= 0.06 * bandera(estado, 'unasur');
  c -= 0.10 * bandera(estado, 'democracia_consolidada');
  return clamp01(c);
}

/** Hipótesis de conflicto externo percibida por el estado mayor. */
function amenazaExterna(estado, año) {
  const ext = dom(estado, 'exterior');
  const p = estado.presiones || {};
  return clamp01(promedio([
    [num(ext.conflictoLimitrofe, 0.3), 1.0],
    [num(p.externa, 0), 0.7],
    [bandera(estado, 'malvinas_ocupadas'), 0.5],
    [bandera(estado, 'base_extranjera'), 0.3],
    [1 - num(ext.integracionRegional, 0.1), 0.5],
    [año < 1880 ? 0.7 : 0.2, 0.4],
  ]));
}

// --------------------------------------------------------------------------
// LA COALICIÓN CIVIL DEL GOLPE
// --------------------------------------------------------------------------

/**
 * Ningún golpe argentino fue obra exclusiva de los cuarteles. En 1930 hubo
 * diarios, estudiantes y "notables"; en 1955 la Iglesia y los partidos; en 1976
 * las corporaciones agrarias, la embajada, buena parte de la prensa y una clase
 * media asustada. Esta función calcula, actor por actor, cuánta disposición hay
 * a firmar la solicitada, y la pondera por la fuerza real de cada actor.
 *
 * La disposición de cada uno depende de lo que ese actor tiene para perder con
 * el gobierno de turno. Con el gobierno adecuado, la misma oligarquía que
 * conspira en 1930 es la que sostiene el orden en 1890.
 */
function calcularCoalicionCivil(estado, f, ctxMat) {
  const act = estado.actores || {};
  const reg = estado.regimen || {};
  const soc = dom(estado, 'social');
  const eco = dom(estado, 'economia');
  const rec = dom(estado, 'recursos');
  const legit = clamp01(num(reg.legitimidad, 0.5));
  const redistrib = gobiernoRedistributivo(estado);

  // --- Oligarquía terrateniente: conspira cuando le tocan la renta o el orden.
  const dispOligarquia = clamp01(
    0.05
    + 0.50 * redistrib
    + 0.30 * ctxMat.crisis
    + 0.30 * ctxMat.amenazaOrden
    + 0.20 * bandera(estado, 'retenciones')
    + 0.25 * bandera(estado, 'reforma_agraria')
    + 0.15 * bandera(estado, 'iapi')
    - 0.45 * legit,
  );

  // --- Iglesia: conspira cuando le disputan la educación, la familia o cuando
  //     el "peligro social" la asusta. Se retira cuando el conflicto amaina.
  const secularizacion = clamp01(
    0.30 * bandera(estado, 'ley_1420')
    + 0.30 * bandera(estado, 'matrimonio_igualitario')
    + 0.30 * bandera(estado, 'ley_aborto')
    + 0.25 * bandera(estado, 'ley_identidad_genero')
    + 0.40 * num(soc.genero, 0.05)
    + 0.25 * num(soc.derechosCiviles, 0.1),
  );
  const dispIglesia = clamp01(
    0.04
    + 0.42 * ctxMat.amenazaOrden
    + 0.38 * secularizacion
    + 0.20 * ctxMat.crisis
    - 0.35 * legit,
  );

  // --- Capital extranjero: conspira cuando peligran los contratos, las
  //     remesas y la propiedad de los recursos.
  const amenazaAlCapital = clamp01(
    0.35 * num(rec.controlNacional, 0.5) * num(rec.rentaExtractiva, 0)
    + 0.30 * bandera(estado, 'reestatizaciones')
    + 0.25 * bandera(estado, 'ypf_reestatizada')
    + 0.25 * bandera(estado, 'control_cambios')
    + 0.30 * bandera(estado, 'default_deuda')
    + 0.25 * (1 - clamp01(num(estado.config && estado.config.apertura, 0.5)))
    + 0.25 * num(eco.pesoEstado, 0.2),
  );
  const dispCapital = clamp01(
    0.05
    + 0.45 * amenazaAlCapital
    + 0.35 * ctxMat.clima
    + 0.20 * ctxMat.crisis
    - 0.30 * legit,
  );

  // --- Clases medias: el actor que decide. Bancan el golpe cuando la crisis
  //     les come el ahorro y el desorden les da miedo; son, en cambio, el
  //     principal seguro antigolpe cuando hay memoria y continuidad.
  const dispClasesMedias = clamp01(
    0.02
    + 0.45 * ctxMat.crisis
    + 0.38 * ctxMat.amenazaOrden
    + 0.20 * suave(num(eco.inflacion, 0.02), 0.3, 2.0)
    - 0.50 * legit
    - 0.45 * f.continuidadInstitucional
    - 0.30 * bandera(estado, 'memoria_verdad_justicia')
    - 0.25 * bandera(estado, 'derechos_humanos'),
  );

  // --- Caudillos y poderes provinciales: relevantes sobre todo en el XIX.
  const dispCaudillos = clamp01(
    0.05
    + 0.40 * num((estado.presiones || {}).regional, 0)
    + 0.30 * (1 - num(reg.capacidadEstatal, 0.2))
    + 0.25 * bandera(estado, 'secesion')
    - 0.30 * legit,
  );

  // --- Prensa y "opinión ilustrada": no es un actor del contrato, se aproxima
  //     con la libertad de prensa y el clima internacional (los golpes se
  //     escriben antes en los diarios que en los cuarteles).
  const dispPrensa = clamp01(0.05 + 0.5 * ctxMat.crisis + 0.4 * ctxMat.amenazaOrden - 0.4 * legit);

  const coalicion = clamp01(promedio([
    [num(act.oligarquia, 0.5) * dispOligarquia, 1.15],
    [num(act.iglesia, 0.4) * dispIglesia, 0.85],
    [num(act.capitalExtranjero, 0.2) * dispCapital, 0.90],
    [num(act.clasesMedias, 0.1) * dispClasesMedias, 1.05],
    [num(act.caudillosProvinciales, 0.3) * dispCaudillos, 0.55],
    [num(estado.nacion && estado.nacion.cultura && estado.nacion.cultura.prensaLibre, 0.3) * dispPrensa, 0.50],
    [num(act.organismosInternacionales, 0) * ctxMat.clima, 0.35],
  ]) * 2.1); // reescalado: la media de productos es estructuralmente baja

  // Contrapeso: fuerzas que salen a la calle a defender el gobierno. Un golpe
  // contra un pueblo movilizado y organizado cuesta mucho más caro.
  const resistencia = clamp01(promedio([
    [num(act.sindicatos, 0), 1.0],
    [num(act.movimientosPopulares, 0.1), 0.8],
    [num(soc.organizacionPopular, 0.1), 0.7],
    [legit, 0.9],
    [num(estado.regimen && estado.regimen.democracia, 0.15), 0.6],
    [f.continuidadInstitucional, 0.7],
  ]));

  return { coalicion: clamp01(coalicion * (1 - 0.45 * resistencia)), resistencia };
}

// --------------------------------------------------------------------------
// Inicialización de campos derivados
// --------------------------------------------------------------------------

function asegurar(f) {
  const d = (k, v) => { if (!Number.isFinite(f[k])) f[k] = v; };
  d('presupuesto', 0.25); d('poderPolitico', 0.35); d('profesionalizacion', 0.15);
  d('golpismo', 0.1); d('capacidadMilitar', 0.2); d('industriaMilitar', 0.02);
  d('tutelaje', 0.2);
  if (!CARGA_GOLPISTA[f.doctrina]) f.doctrina = 'milicia';

  d('presupuestoSostenido', 0.05);
  d('conscripcion', 0.05);
  d('formacionOficial', 0.08);
  d('cohesion', 0.35);
  d('prestigio', 0.35);
  d('subordinacion', 0.2);
  d('impunidad', 0.8);
  d('continuidadInstitucional', 0.0);
  d('memoriaGolpe', 0.0);
  d('coalicionCivil', 0.0);
  d('riesgoRuptura', 0.0);
  d('habilitacionRepresiva', 0.3);
  d('derrameIndustrial', 0.0);
  d('costoOportunidad', 0.0);
  d('saldoBelico', 0.5);
  d('amenazaExterna', 0.4);
  d('bajasAnuales', 0.0);
  d('derivaDoctrinaria', 0.0);
  if (typeof f.marcaGolpe !== 'boolean') f.marcaGolpe = false;
  if (typeof f.marcaGuerraCivil !== 'boolean') f.marcaGuerraCivil = false;
  if (!f.previo || typeof f.previo !== 'object') f.previo = {};
  normalizarConflictos(f);
}

// --------------------------------------------------------------------------
// Sistema
// --------------------------------------------------------------------------

const sistema = {
  meta: {
    id: 'ffaa',
    nombre: 'Fuerzas armadas',
    orden: 80,
    descripcion: 'Del ejército de milicias al ejército profesional; doctrina, presupuesto, conflictos y riesgo de ruptura institucional.',
  },

  /** 1810: no hay ejército nacional, hay milicias en guerra. */
  init(estado) {
    const f = estado.nacion.ffaa;
    asegurar(f);
    f.doctrina = 'milicia';
    f.profesionalizacion = 0.12;
    f.formacionOficial = 0.06;
    f.conscripcion = 0.04;
    f.cohesion = 0.30;          // cada jefe con su tropa
    f.prestigio = 0.55;         // el prestigio del ejército libertador
    f.presupuestoSostenido = 0.08;
    f.subordinacion = 0.15;
    f.impunidad = 0.85;

    // La guerra de la independencia ya está en curso: se pelea desde el día uno
    // y se lleva puesta la mitad del erario de la Junta.
    if (!f.conflictosActivos.some((c) => c.id === 'guerra_independencia')) {
      f.conflictosActivos.push(crearConflicto({
        id: 'guerra_independencia',
        tipo: 'externa',
        nombre: 'Guerra de la independencia',
        intensidad: 0.72, dificultad: 0.55, apoyo: 0.75,
        duracion: 10, origen: 'gobierno',
      }));
    }
  },

  paso(estado, rng, ctx) {
    const f = estado.nacion.ffaa;
    asegurar(f);

    const año = num(ctx && ctx.año, estado.año);
    const reg = estado.regimen || {};
    const eco = dom(estado, 'economia');
    const edu = dom(estado, 'educacion');
    const inf = dom(estado, 'infraestructura');
    const ext = dom(estado, 'exterior');
    const legit = clamp01(num(reg.legitimidad, 0.5));

    // Foto del año anterior para las tendencias de los paneles.
    f.previo = {
      poderPolitico: f.poderPolitico, profesionalizacion: f.profesionalizacion,
      capacidadMilitar: f.capacidadMilitar, presupuesto: f.presupuesto,
      golpismo: f.golpismo, subordinacion: f.subordinacion,
      industriaMilitar: f.industriaMilitar, riesgoRuptura: f.riesgoRuptura,
    };

    // ¿Gobiernan los militares? Cambia casi todo lo que sigue.
    const militaresEnElPoder = !!(estado.flags && estado.flags.golpe_militar)
      || (reg.tipo === 'dictadura' && f.poderPolitico > 0.45);

    // ---------------------------------------------------------------------
    // 1. CONTEXTO MATERIAL
    // ---------------------------------------------------------------------
    const ctxMat = {
      crisis: crisisEconomica(estado),
      amenazaOrden: amenazaAlOrden(estado, f),
      clima: climaInternacional(estado, año),
      amenazaExt: amenazaExterna(estado, año),
      militaresEnElPoder,
      legit,
    };
    f.amenazaExterna = ctxMat.amenazaExt;

    // ---------------------------------------------------------------------
    // 2. CONFLICTOS ARMADOS: se pelean, drenan y se resuelven
    // ---------------------------------------------------------------------
    procesarConflictos(estado, f, rng, ctx, ctxMat);
    const esfuerzo = esfuerzoBelico(f);
    const guerraCivil = f.conflictosActivos.some((c) => c.tipo === 'civil');

    // La bandera `guerra_civil` se enciende y se apaga con lo que este sistema
    // efectivamente sostiene; nunca pisa una que haya puesto un evento.
    if (guerraCivil && !f.marcaGuerraCivil && estado.flags) {
      estado.flags.guerra_civil = true; f.marcaGuerraCivil = true;
    } else if (!guerraCivil && f.marcaGuerraCivil && estado.flags) {
      estado.flags.guerra_civil = false; f.marcaGuerraCivil = false;
    }

    // ---------------------------------------------------------------------
    // 3. PRESUPUESTO: la disputa por la caja
    // ---------------------------------------------------------------------
    // `presupuesto` es la FRACCIÓN DEL GASTO PÚBLICO que se lleva la defensa.
    // Ojo con la trampa: en un Estado sin capacidad fiscal esa fracción es
    // altísima justamente porque no hay escuelas ni hospitales que financiar.
    // Plata de verdad hay poca: eso es `gastoReal`.
    const capFiscal = clamp01(num(eco.capacidadFiscal, 0.15));
    const presupuestoObjetivo = clamp01(
      0.14
      + 0.30 * esfuerzo                       // la guerra manda
      + 0.22 * f.poderPolitico                // quien manda se autoasigna
      + 0.14 * ctxMat.amenazaExt
      + 0.10 * CARGA_GOLPISTA[f.doctrina]
      + 0.18 * (1 - capFiscal)                // Estado pobre = todo es el ejército
      + 0.10 * f.industriaMilitar
      - 0.22 * f.subordinacion                // el poder civil recorta
      - 0.12 * f.continuidadInstitucional
      - 0.10 * clamp01(num(edu.gastoPbi, 0.005) * 20), // la escuela también pide
    );
    f.presupuesto = hacia(f.presupuesto, presupuestoObjetivo, 0.14);

    // Recursos reales puestos en la fuerza: fracción del gasto por capacidad
    // de recaudar. Sin Estado que recaude, un presupuesto alto es papel pintado.
    const gastoReal = clamp01(f.presupuesto * (0.35 + 0.65 * capFiscal)
      * (0.55 + 0.45 * clamp01(num(eco.pbiPerCapita, 1100) / 9000)));
    // La capacidad no se compra en un año: importa el gasto SOSTENIDO.
    f.presupuestoSostenido = hacia(f.presupuestoSostenido, gastoReal, 0.12);

    // Costo de oportunidad: lo que el cuartel le saca a escuelas, hospitales y
    // rutas. Alto cuando el Estado es pobre y la fracción militar es grande.
    f.costoOportunidad = clamp01(f.presupuesto * (1.15 - 0.5 * capFiscal));

    // ---------------------------------------------------------------------
    // 4. PROFESIONALIZACIÓN: escuela militar, conscripción, mando único
    // ---------------------------------------------------------------------
    const capEstatal = clamp01(num(reg.capacidadEstatal, 0.15));
    const tecnologia = clamp01(promedio([
      [num(edu.cienciaTecnica, 0.05), 1.0],
      [num(edu.formacionTecnica, 0.05), 0.8],
      [num(edu.secundaria, 0.02), 0.7],
      [num(edu.superior, 0.005), 0.5],
      [num(edu.alfabetizacion, 0.2), 0.6],
    ]));

    // Cuerpo de oficiales formado: hace falta Estado, escuelas y plata estable.
    const formacionObjetivo = clamp01(promedio([
      [capEstatal, 1.2],
      [tecnologia, 1.0],
      [f.presupuestoSostenido * 2.0, 0.9],
      [bandera(estado, 'constitucion_sancionada'), 0.6],
      [bandera(estado, 'escuelas_tecnicas'), 0.4],
      [1 - clamp01(num((estado.actores || {}).caudillosProvinciales, 0.5)), 0.7],
    ]));
    f.formacionOficial = hacia(f.formacionOficial, formacionObjetivo, 0.07);

    // Conscripción: sólo es posible con Estado que registre, cuente y llame a
    // filas, y con red ferroviaria y escuela primaria que lleguen al interior.
    // Es la máquina que nacionaliza a los hijos de inmigrantes.
    const conscripcionPosible = clamp01(promedio([
      [capEstatal, 1.2],
      [num(edu.primaria, 0.1), 0.9],
      [num(inf.ferrocarril, 0) * 0.5 + num(inf.rutas, 0.05) * 0.5, 0.6],
      [num(inf.integracionTerritorial, 0.15), 0.6],
      [f.formacionOficial, 0.8],
    ]));
    // Después de décadas de continuidad democrática y sin hipótesis de guerra,
    // el servicio obligatorio deja de tener sentido y se vuelve voluntario.
    const conscripcionDeseada = clamp01(
      conscripcionPosible
      * (0.35 + 0.65 * clamp01(ctxMat.amenazaExt + esfuerzo + CARGA_GOLPISTA[f.doctrina] * 0.4))
      * (1 - 0.7 * clamp01(f.subordinacion * f.continuidadInstitucional * 1.6)),
    );
    f.conscripcion = hacia(f.conscripcion, conscripcionDeseada, 0.09);

    // La profesionalización se construye con las tres patas juntas. Cae con la
    // guerra civil (cada jefe con su tropa), con la política adentro del cuartel
    // y con la doctrina de enemigo interno (el oficio se vuelve policial).
    const profesionalObjetivo = clamp01(promedio([
      [f.formacionOficial, 1.3],
      [f.presupuestoSostenido * 1.8, 1.0],
      [tecnologia, 0.9],
      [capEstatal, 0.9],
      [f.conscripcion, 0.5],
      [f.doctrina === 'profesional' || f.doctrina === 'defensa' ? 0.85 : 0.25, 0.8],
      [1 - f.tutelaje, 0.6],
      [f.industriaMilitar, 0.4],
    ]) * (1 - 0.35 * (guerraCivil ? 1 : 0)));
    f.profesionalizacion = hacia(f.profesionalizacion, profesionalObjetivo, 0.07);

    // Cohesión interna: un ejército partido en facciones (azules y colorados)
    // no puede dar un golpe ni ganar una guerra.
    const cohesionObjetivo = clamp01(promedio([
      [f.profesionalizacion, 1.1],
      [f.formacionOficial, 0.8],
      [f.prestigio, 0.7],
      [1 - clamp01(num((estado.actores || {}).caudillosProvinciales, 0.5)), 0.6],
      [1 - (guerraCivil ? 1 : 0), 0.9],
      [1 - ctxMat.crisis * 0.6, 0.5],
      [f.doctrina === 'seguridadInterior' ? 0.45 : 0.75, 0.6],
    ]));
    f.cohesion = hacia(f.cohesion, cohesionObjetivo, 0.09);

    // ---------------------------------------------------------------------
    // 5. INDUSTRIA MILITAR Y DERRAME
    // ---------------------------------------------------------------------
    // Fábrica Militar de Aviones, DGFM, astilleros, el plan nuclear. Necesita
    // presupuesto sostenido, industria previa y ciencia; y una decisión de no
    // comprar todo afuera (un alineamiento subordinado compra llave en mano).
    const autonomiaCompra = ext.alineamiento === 'autonomo' ? 1
      : ext.alineamiento === 'americanista' ? 0.6 : 0.35;
    const industriaObjetivo = clamp01(promedio([
      [f.presupuestoSostenido * 2.2, 1.0],
      [num(eco.industrializacion, 0.05), 1.1],
      [num(edu.cienciaTecnica, 0.05), 0.9],
      [autonomiaCompra, 0.7],
      [bandera(estado, 'industria_pesada'), 0.6],
      [bandera(estado, 'energia_nuclear'), 0.5],
      [bandera(estado, 'invap') * 0.5 + bandera(estado, 'conae') * 0.5, 0.4],
      [bandera(estado, 'sustitucion_importaciones'), 0.5],
      [1 - clamp01(num(estado.config && estado.config.apertura, 0.5)), 0.4],
      [1 - bandera(estado, 'privatizaciones'), 0.6],
      [1 - num((estado.nacion.deuda || {}).condicionalidad, 0), 0.5],
    ]));
    f.industriaMilitar = hacia(f.industriaMilitar, industriaObjetivo, 0.06);

    // ¿Derrama o es una isla? Depende de si está enchufada al sistema
    // científico y productivo civil. Integrada, la fábrica de aviones deja
    // metalmecánica, la siderurgia militar deja acero, lo nuclear deja
    // radioisótopos y reactores de exportación. Aislada por el secreto militar
    // y la lógica de feudo, no deja nada afuera del perímetro del cuartel.
    const integracionCivil = clamp01(promedio([
      [num(edu.cienciaTecnica, 0.05), 1.1],
      [num(edu.universidadPublica, 0.2), 0.8],
      [num(edu.formacionTecnica, 0.05), 0.8],
      [bandera(estado, 'conicet'), 0.7],
      [bandera(estado, 'escuelas_tecnicas'), 0.5],
      [num(eco.diversificacion, 0.1), 0.6],
      [1 - bandera(estado, 'noche_bastones_largos'), 0.5],
    ]));
    const aislamiento = clamp01(
      0.45 * (f.doctrina === 'seguridadInterior' ? 1 : 0)
      + 0.35 * f.poderPolitico
      + 0.25 * (1 - integracionCivil),
    );
    f.derrameIndustrial = clamp01(f.industriaMilitar * (0.15 + 0.85 * integracionCivil) * (1 - 0.65 * aislamiento));

    // ---------------------------------------------------------------------
    // 6. CAPACIDAD MILITAR EFECTIVA
    // ---------------------------------------------------------------------
    // No es cuánto se gastó este año: es cuánto se sostuvo, con qué industria
    // propia, con qué técnicos y con qué doctrina. Un ejército con doctrina de
    // enemigo interno tiene mucha capacidad represiva y poca capacidad militar:
    // se entrena para allanar barrios, no para defender una frontera.
    const capacidadObjetivo = clamp01(promedio([
      [f.presupuestoSostenido * 1.9, 1.2],
      [f.profesionalizacion, 1.0],
      [f.industriaMilitar, 0.9],
      [tecnologia, 0.7],
      [num(inf.rutas, 0.05) * 0.4 + num(inf.ferrocarril, 0) * 0.3 + num(inf.energia, 0.02) * 0.3, 0.5],
      [f.cohesion, 0.6],
      [f.prestigio, 0.3],
    ]) * ORIENTACION_EXTERNA[f.doctrina]);
    f.capacidadMilitar = hacia(f.capacidadMilitar, capacidadObjetivo, 0.08);

    // Licencia doctrinaria para la represión masiva: `social` la lee.
    f.habilitacionRepresiva = clamp01(
      LICENCIA_REPRESIVA[f.doctrina]
      * (0.35 + 0.65 * clamp01(f.poderPolitico + 0.4 * ctxMat.amenazaOrden))
      * (1 - 0.55 * f.subordinacion)
      + 0.25 * bandera(estado, 'terrorismo_estado'),
    );

    // ---------------------------------------------------------------------
    // 7. DOCTRINA
    // ---------------------------------------------------------------------
    evaluarDoctrina(estado, f, rng, ctx, ctxMat, { tecnologia, capEstatal, esfuerzo, guerraCivil, año });

    // ---------------------------------------------------------------------
    // 8. IMPUNIDAD, CONTINUIDAD Y MEMORIA
    // ---------------------------------------------------------------------
    // El costo judicial de haber intervenido es la variable que más pesa en la
    // subordinación de largo plazo: un ejército que pagó por lo que hizo tiene
    // mucho menos incentivo a repetirlo.
    const impunidadObjetivo = clamp01(
      0.9
      - 0.40 * bandera(estado, 'juicio_juntas')
      - 0.22 * bandera(estado, 'derechos_humanos')
      - 0.20 * bandera(estado, 'memoria_verdad_justicia')
      - 0.25 * clamp01(num(reg.democracia, 0.15))
      - 0.15 * num(estado.nacion.cultura && estado.nacion.cultura.memoriaHistorica, 0.2)
      + 0.25 * f.poderPolitico
      + 0.15 * bandera(estado, 'terrorismo_estado'),
    );
    f.impunidad = hacia(f.impunidad, impunidadObjetivo, 0.10);
    const costoJudicial = 1 - f.impunidad;

    // Continuidad institucional: se acumula de a un año y se pierde de golpe.
    if (militaresEnElPoder || reg.tipo === 'anarquia') {
      f.continuidadInstitucional = clamp01(f.continuidadInstitucional * 0.15);
    } else {
      const calidad = clamp01(0.25 + 0.75 * clamp01(num(reg.democracia, 0.15)));
      f.continuidadInstitucional = clamp01(f.continuidadInstitucional + calidad / AÑOS_CONTINUIDAD_PLENA);
    }
    if (bandera(estado, 'democracia_consolidada')) {
      f.continuidadInstitucional = Math.max(f.continuidadInstitucional, 0.68);
    }

    // Memoria del último golpe: el precedente exitoso abarata el siguiente.
    if (militaresEnElPoder && !f.marcaGolpe) { f.memoriaGolpe = 1; f.marcaGolpe = true; }
    if (!militaresEnElPoder && f.marcaGolpe) f.marcaGolpe = false;
    f.memoriaGolpe = clamp01(f.memoriaGolpe - (militaresEnElPoder ? 0 : 0.04));

    // ---------------------------------------------------------------------
    // 9. LA COALICIÓN CIVIL Y EL GOLPISMO
    // ---------------------------------------------------------------------
    const { coalicion, resistencia } = calcularCoalicionCivil(estado, f, ctxMat);
    f.coalicionCivil = coalicion;

    // Impulso golpista: siete fuerzas que empujan.
    const impulso = clamp01(promedio([
      [CARGA_GOLPISTA[f.doctrina], 0.90],   // 1. doctrina vigente
      [f.tutelaje, 0.70],                   // 2. tutelaje ya conquistado
      [1 - legit, 0.85],                    // 3. deslegitimación del gobierno
      [ctxMat.crisis, 0.80],                // 4. crisis económica
      [ctxMat.amenazaOrden, 0.70],          // 5. conflictividad como amenaza
      [f.coalicionCivil, 1.00],             // 6. respaldo civil (el que más pesa)
      [ctxMat.clima, 0.50],                 // 7. clima internacional
      [f.memoriaGolpe, 0.45],               // + precedente fresco
    ]));

    // Contención: cinco fuerzas que frenan.
    const contencion = clamp01(promedio([
      [f.subordinacion, 1.00],
      [f.continuidadInstitucional, 0.85],
      [costoJudicial, 0.70],
      [legit, 0.60],
      [1 - CARGA_GOLPISTA[f.doctrina], 0.50],
      [resistencia, 0.55],
    ]));

    const golpismoObjetivo = clamp01(impulso * (1 - 0.60 * contencion) - 0.15 * contencion);
    // Sube más rápido de lo que baja: la conspiración se arma en meses y la
    // confianza en el poder civil se reconstruye en años.
    f.golpismo = hacia(f.golpismo, golpismoObjetivo,
      golpismoObjetivo > f.golpismo ? 0.16 : 0.09);

    // ---------------------------------------------------------------------
    // 10. TUTELAJE, PODER POLÍTICO Y SUBORDINACIÓN
    // ---------------------------------------------------------------------
    const tutelajeObjetivo = clamp01(
      0.50 * f.poderPolitico
      + 0.35 * f.golpismo
      + 0.30 * CARGA_GOLPISTA[f.doctrina]
      + 0.25 * (militaresEnElPoder ? 1 : 0)
      + 0.15 * f.memoriaGolpe
      - 0.60 * f.subordinacion
      - 0.30 * f.continuidadInstitucional
      - 0.20 * costoJudicial,
    );
    f.tutelaje = hacia(f.tutelaje, tutelajeObjetivo, 0.10);

    // Subordinación democrática: existe el camino, pero se recorre en décadas y
    // se pierde en una noche. Cuatro palancas: juzgamiento, recorte
    // presupuestario, cambio de doctrina y continuidad institucional.
    const recortePresupuestario = clamp01(1 - f.presupuesto * 2.2);
    const doctrinaSubordinada = (f.doctrina === 'defensa' ? 1
      : f.doctrina === 'profesional' ? 0.7 : 0.1);
    const subordinacionObjetivo = clamp01(promedio([
      [f.continuidadInstitucional, 1.10],
      [costoJudicial, 0.95],
      [recortePresupuestario, 0.60],
      [doctrinaSubordinada, 0.80],
      [clamp01(num(reg.democracia, 0.15)), 0.85],
      [legit, 0.50],
      [capEstatal, 0.45],
      [1 - f.golpismo, 0.70],
      [1 - f.conscripcion * 0.5, 0.25],
    ]));
    if (militaresEnElPoder) {
      // Con los militares en el poder no hay subordinación que valga.
      f.subordinacion = hacia(f.subordinacion, 0.03, 0.35);
    } else {
      f.subordinacion = hacia(f.subordinacion, subordinacionObjetivo, 0.07);
    }

    const poderObjetivo = clamp01(promedio([
      [f.tutelaje, 1.10],
      [f.golpismo, 0.70],
      [f.presupuesto, 0.55],
      [f.capacidadMilitar, 0.45],
      [f.prestigio, 0.45],
      [f.coalicionCivil, 0.65],
      [militaresEnElPoder ? 1 : 0, 1.20],
      [f.industriaMilitar, 0.25],
      [1 - f.subordinacion, 0.95],
      [1 - f.continuidadInstitucional, 0.55],
    ]));
    f.poderPolitico = hacia(f.poderPolitico, poderObjetivo, 0.09);

    // ---------------------------------------------------------------------
    // 11. RIESGO DE RUPTURA Y APORTE A LAS PRESIONES
    // ---------------------------------------------------------------------
    // Capacidad material de dar el golpe: sin mando unificado y sin peso propio
    // no hay operativo posible, por más ganas que haya.
    const capacidadDeGolpe = clamp01(0.18 + 0.48 * f.poderPolitico + 0.34 * f.cohesion);

    // AQUÍ ESTÁ LA REGLA CENTRAL: sin coalición civil, no prospera. Por debajo
    // del umbral el riesgo se corta a una fracción marginal (motín de cuartel).
    const factorCoalicion = f.coalicionCivil < UMBRAL_COALICION
      ? 0.15 * (f.coalicionCivil / UMBRAL_COALICION)
      : 0.35 + 0.65 * f.coalicionCivil;

    f.riesgoRuptura = clamp01(
      f.golpismo * factorCoalicion * (0.40 + 0.60 * (1 - legit)) * capacidadDeGolpe,
    );

    if (militaresEnElPoder) {
      // "Golpe dentro del golpe": cuando el gobierno militar fracasa, la presión
      // de ruptura se descarga sobre sí mismo (1955 Lonardi/Aramburu,
      // 1981 Videla/Viola/Galtieri). Es una crisis palaciega, no una asonada.
      const desgaste = clamp01(0.5 * ctxMat.crisis + 0.3 * (1 - f.prestigio) + 0.3 * (1 - f.cohesion) - 0.55);
      aportarPresion(estado, 'golpe', desgaste * 0.45);
    } else if (f.riesgoRuptura > UMBRAL_RIESGO) {
      aportarPresion(estado, 'golpe', (f.riesgoRuptura - UMBRAL_RIESGO) * 0.90);
    }
    // Si el riesgo está por debajo del umbral, el aporte es exactamente cero:
    // los cuarteles callados no acumulan presión golpista.

    // Aporte fiscal: el presupuesto que excede lo que el Estado puede pagar,
    // más el costo corriente de cada guerra.
    const excedente = Math.max(0, f.presupuesto - capFiscal * 0.95);
    aportarPresion(estado, 'fiscal', clamp01(excedente * 0.45 + esfuerzo * 0.22) * 0.55);

    // ---------------------------------------------------------------------
    // 12. EL ACTOR `ffaa`
    // ---------------------------------------------------------------------
    const actorObjetivo = clamp01(promedio([
      [f.poderPolitico, 1.10],
      [f.tutelaje, 0.75],
      [f.capacidadMilitar, 0.55],
      [f.presupuesto, 0.45],
      [f.prestigio, 0.50],
      [f.profesionalizacion, 0.35],
      [f.industriaMilitar, 0.25],
    ]));
    const actual = num((estado.actores || {}).ffaa, 0.35);
    moverActor(estado, 'ffaa', (actorObjetivo - actual) * 0.12);

    // ---------------------------------------------------------------------
    // 13. ¿SE ABRE UN CONFLICTO NUEVO?
    // ---------------------------------------------------------------------
    evaluarNuevosConflictos(estado, f, rng, ctx, ctxMat, { año, capEstatal, guerraCivil, legit });

    // ---------------------------------------------------------------------
    // 14. DECAIMIENTOS Y SANEO PROPIO
    // ---------------------------------------------------------------------
    f.saldoBelico = hacia(f.saldoBelico, 0.5, 0.18);
    f.prestigio = hacia(f.prestigio, clamp01(0.25 + 0.35 * f.capacidadMilitar + 0.25 * f.profesionalizacion
      - 0.30 * bandera(estado, 'terrorismo_estado') - 0.15 * f.impunidad * (1 - f.continuidadInstitucional)), 0.06);
    f.derivaDoctrinaria = clamp01(f.derivaDoctrinaria);
    sanearFfaa(f);

    if (ctx && typeof ctx.log === 'function') registrarHitos(estado, f, ctx, año);
  },

  indicadores,
};

// --------------------------------------------------------------------------
// Doctrina
// --------------------------------------------------------------------------

/**
 * El cambio de doctrina no es una preferencia estética del estado mayor:
 * responde al alineamiento externo (y a las doctrinas que ese alineamiento
 * importa), a la conflictividad interna y a decisiones que llegan por eventos.
 * Acá se puntúa cada doctrina contra las condiciones del año y se acumula
 * `derivaDoctrinaria`: recién cuando la presión se sostiene varios años el
 * cambio se consuma. Los ejércitos cambian de cabeza despacio.
 */
function evaluarDoctrina(estado, f, rng, ctx, ctxMat, aux) {
  const ext = dom(estado, 'exterior');
  const reg = estado.regimen || {};
  const puntajes = {};

  // MILICIA: sin Estado nacional no hay otra cosa posible.
  puntajes.milicia = clamp01(
    0.55 * (1 - aux.capEstatal)
    + 0.35 * (1 - f.formacionOficial)
    + 0.30 * clamp01(num((estado.actores || {}).caudillosProvinciales, 0.5))
    + 0.25 * (aux.guerraCivil ? 1 : 0)
    - 0.40 * f.profesionalizacion
    - 0.30 * bandera(estado, 'constitucion_sancionada'),
  );

  // PROFESIONAL: escuela militar, mando único, cuartel separado de la política.
  puntajes.profesional = clamp01(
    0.45 * f.formacionOficial
    + 0.30 * aux.capEstatal
    + 0.25 * aux.tecnologia
    + 0.20 * bandera(estado, 'constitucion_sancionada')
    + 0.20 * f.conscripcion
    - 0.35 * ctxMat.amenazaOrden * clamp01(ctxMat.clima + 0.2)
    - 0.25 * (aux.guerraCivil ? 1 : 0),
  );

  // SEGURIDAD INTERIOR: la hipótesis de conflicto se muda adentro. Necesita
  // conflictividad social alta Y doctrina importada disponible (clima
  // internacional, padrinos, manuales, becas). Sin las dos cosas no cuaja.
  const doctrinaImportada = clamp01(
    0.55 * ctxMat.clima
    + 0.25 * bandera(estado, 'base_extranjera')
    + 0.20 * num((estado.nacion.deuda || {}).condicionalidad, 0)
    + 0.15 * (ext.alineamiento === 'autonomo' ? 0 : 1),
  );
  puntajes.seguridadInterior = clamp01(
    0.50 * ctxMat.amenazaOrden
    + 0.45 * doctrinaImportada
    + 0.25 * f.tutelaje
    + 0.20 * ctxMat.crisis
    + 0.25 * bandera(estado, 'proscripcion')
    + 0.20 * bandera(estado, 'terrorismo_estado')
    + 0.15 * f.coalicionCivil
    - 0.55 * f.subordinacion
    - 0.35 * f.continuidadInstitucional
    - 0.25 * clamp01(num(ext.integracionRegional, 0.1)),
  ) * clamp01(0.15 + 1.2 * doctrinaImportada); // sin doctrina importada, no prende

  // DEFENSA: hipótesis externa, industria de defensa, mando civil. Es la
  // doctrina de un ejército subordinado con misión propia.
  puntajes.defensa = clamp01(
    0.40 * ctxMat.amenazaExt
    + 0.35 * f.subordinacion
    + 0.30 * f.industriaMilitar
    + 0.25 * f.continuidadInstitucional
    + 0.20 * clamp01(num(reg.democracia, 0.15))
    + 0.20 * f.profesionalizacion
    + 0.15 * clamp01(num(ext.autonomia, 0.4))
    - 0.35 * ctxMat.amenazaOrden * clamp01(ctxMat.clima),
  );

  // Empuje inercial a favor de la doctrina vigente: cambiar de doctrina implica
  // rehacer planes de estudio, escalafones y compras.
  let mejor = f.doctrina, mejorP = -Infinity;
  for (const d of Object.keys(puntajes)) {
    const p = puntajes[d] + (d === f.doctrina ? 0.18 : 0);
    if (p > mejorP) { mejorP = p; mejor = d; }
  }

  if (mejor === f.doctrina) {
    f.derivaDoctrinaria = clamp01(f.derivaDoctrinaria - 0.12);
    return;
  }
  const ventaja = clamp01(mejorP - (puntajes[f.doctrina] + 0.18));
  f.derivaDoctrinaria = clamp01(f.derivaDoctrinaria + 0.10 + ventaja * 0.9);

  // El cambio se consuma cuando la presión se sostuvo y el azar acompaña.
  if (f.derivaDoctrinaria > 0.55 && rng.chance(0.18 + 0.5 * f.derivaDoctrinaria)) {
    const anterior = f.doctrina;
    f.doctrina = mejor;
    f.derivaDoctrinaria = 0;
    if (ctx && typeof ctx.log === 'function') {
      ctx.log(`El estado mayor cambia la hipótesis de conflicto: de doctrina ${NOMBRE_DOCTRINA[anterior]} a ${NOMBRE_DOCTRINA[mejor]}.`, ['ffaa', 'doctrina']);
    }
  }
}

const NOMBRE_DOCTRINA = {
  milicia: 'miliciana', profesional: 'profesional',
  seguridadInterior: 'de seguridad interior', defensa: 'de defensa nacional',
};

// --------------------------------------------------------------------------
// Conflictos: desarrollo y resolución
// --------------------------------------------------------------------------

function procesarConflictos(estado, f, rng, ctx, ctxMat) {
  normalizarConflictos(f);
  const poblacion = Math.max(0.05, num(estado.nacion.demografia && estado.nacion.demografia.poblacion, 1));
  let bajas = 0;
  const siguen = [];

  for (const c of f.conflictosActivos) {
    c.años += 1;

    // Intensidad: sube al principio, se agota con los años y con el desgaste.
    const desgaste = suave(c.años / c.duracion, 0.7, 2.0);
    c.intensidad = clamp01(hacia(c.intensidad, clamp01(c.dificultad * 0.9 + 0.2) * (1 - 0.55 * desgaste), 0.25));
    // El apoyo interno a una guerra larga se evapora.
    c.apoyo = clamp01(c.apoyo - 0.05 - 0.06 * desgaste + 0.03 * f.prestigio);

    // --- Muertos del año. `demografia` lee `bajasAnuales` (en millones).
    const letalidad = c.tipo === 'civil' ? 0.0075
      : c.tipo === 'externa' ? 0.0055
        : c.tipo === 'ocupacion' ? 0.0020 : 0.0012;
    bajas += poblacion * letalidad * c.intensidad;

    // --- Drenaje fiscal directo: la guerra se paga en el acto.
    aportarPresion(estado, 'fiscal', c.intensidad * 0.05);

    // --- ¿Se resuelve este año?
    const probFin = clamp01(0.06 + 0.55 * suave(c.años / c.duracion, 0.55, 1.4)
      + 0.15 * (1 - c.apoyo));
    if (!rng.chance(probFin)) { siguen.push(c); continue; }

    resolverConflicto(estado, f, rng, ctx, ctxMat, c);
  }

  f.conflictosActivos = siguen;
  f.bajasAnuales = clamp(num(bajas, 0), 0, 0.9);
}

/**
 * Resolución. La suerte de las armas depende de capacidad militar real,
 * profesionalización y apoyo interno, contra la dificultad del adversario.
 * El resultado no sólo mueve el mapa: mueve la legitimidad del gobierno que
 * metió al país en la guerra. Ese es el mecanismo que convierte una aventura
 * externa en la sentencia de muerte de un régimen.
 */
function resolverConflicto(estado, f, rng, ctx, ctxMat, c) {
  const fuerza = clamp01(0.15 + 0.55 * f.capacidadMilitar + 0.20 * f.profesionalizacion
    + 0.20 * c.apoyo + 0.10 * f.cohesion);
  const pVictoria = clamp(0.5 + 0.85 * (fuerza - c.dificultad), 0.05, 0.95);
  const victoria = rng.chance(pVictoria);
  const magnitud = clamp01(0.35 + 0.65 * c.intensidad);

  if (victoria) {
    // Victoria: prestigio, experiencia y —cuidado— más peso político para los
    // vencedores. Un ejército victorioso es un ejército con voz en la política.
    f.prestigio = clamp01(f.prestigio + 0.22 * magnitud);
    f.capacidadMilitar = clamp01(f.capacidadMilitar + 0.06 * magnitud);
    f.cohesion = clamp01(f.cohesion + 0.08 * magnitud);
    f.saldoBelico = clamp01(0.5 + 0.40 * magnitud * (c.tipo === 'externa' ? 1 : 0.6));
    if (c.tipo === 'civil') {
      // Ganar una guerra civil es construir Estado: mando único y monopolio
      // de la violencia. También deja un ejército con la política adentro.
      f.profesionalizacion = clamp01(f.profesionalizacion + 0.05);
      f.poderPolitico = clamp01(f.poderPolitico + 0.05 * magnitud);
    } else {
      f.poderPolitico = clamp01(f.poderPolitico + 0.03 * magnitud);
    }
    if (ctx && typeof ctx.log === 'function') {
      ctx.log(`${c.nombre}: victoria. El prestigio militar sube y con él su peso en la política.`, ['ffaa', 'guerra']);
    }
  } else {
    // Derrota: se derrumba el prestigio. Y acá se bifurca la historia.
    f.prestigio = clamp01(f.prestigio - 0.30 * magnitud);
    f.cohesion = clamp01(f.cohesion - 0.15 * magnitud);
    f.capacidadMilitar = clamp01(f.capacidadMilitar - 0.10 * magnitud);
    f.saldoBelico = clamp01(0.5 - 0.42 * magnitud);

    if (ctxMat.militaresEnElPoder) {
      // Si la aventura la encabezó un gobierno militar, la derrota se lo lleva
      // puesto: se derrumba el poder político castrense, se abre el camino a
      // los juicios y la subordinación da un salto (Malvinas 1982).
      f.poderPolitico = clamp01(f.poderPolitico - 0.30 * magnitud);
      f.tutelaje = clamp01(f.tutelaje - 0.28 * magnitud);
      f.golpismo = clamp01(f.golpismo - 0.25 * magnitud);
      f.impunidad = clamp01(f.impunidad - 0.22 * magnitud);
      f.subordinacion = clamp01(f.subordinacion + 0.18 * magnitud);
      if (ctx && typeof ctx.log === 'function') {
        ctx.log(`${c.nombre}: derrota. El gobierno militar que la lanzó queda sin autoridad; los cuarteles vuelven a los cuarteles.`, ['ffaa', 'guerra']);
      }
    } else {
      // Bajo gobierno civil, la derrota se le factura al gobierno: sube la
      // presión de ruptura, aunque los militares también salgan golpeados.
      aportarPresion(estado, 'golpe', 0.20 * magnitud * clamp01(0.3 + f.coalicionCivil));
      f.poderPolitico = clamp01(f.poderPolitico - 0.05 * magnitud);
      if (ctx && typeof ctx.log === 'function') {
        ctx.log(`${c.nombre}: derrota. El gobierno paga el costo político del fracaso.`, ['ffaa', 'guerra']);
      }
    }
  }
}

/**
 * Apertura de conflictos nuevos.
 *
 * Tres vías, todas con base material:
 *  a) guerra civil, cuando no hay Estado que monopolice la violencia;
 *  b) conflicto de frontera, cuando la expansión agrícola empuja sobre
 *     territorio que no controla o sobre un límite en disputa;
 *  c) aventura externa, la más política: un gobierno deslegitimado busca en la
 *     bandera lo que no consigue en las urnas. Si gana, se salva; si pierde,
 *     se derrumba (ver resolverConflicto).
 */
function evaluarNuevosConflictos(estado, f, rng, ctx, ctxMat, aux) {
  if (f.conflictosActivos.length >= MAX_CONFLICTOS) return;
  const ext = dom(estado, 'exterior');
  const tie = dom(estado, 'tierra');
  const p = estado.presiones || {};
  const abrir = (c) => {
    f.conflictosActivos.push(c);
    if (ctx && typeof ctx.log === 'function') ctx.log(`Se abre un conflicto armado: ${c.nombre}.`, ['ffaa', 'guerra']);
  };

  // --- a) Guerra civil
  if (!aux.guerraCivil) {
    const riesgoCivil = clamp01(
      0.35 * clamp01(num((estado.actores || {}).caudillosProvinciales, 0.5))
      + 0.30 * (1 - aux.capEstatal)
      + 0.30 * num(p.regional, 0)
      + 0.25 * (1 - aux.legit)
      + 0.20 * bandera(estado, 'secesion')
      + 0.15 * (f.doctrina === 'milicia' ? 1 : 0)
      - 0.45 * f.profesionalizacion
      - 0.35 * f.continuidadInstitucional
      - 0.25 * bandera(estado, 'constitucion_sancionada'),
    );
    if (rng.chance(0.075 * riesgoCivil * riesgoCivil)) {
      abrir(crearConflicto({
        id: `guerra_civil_${aux.año}`, tipo: 'civil',
        nombre: 'Guerra civil',
        intensidad: 0.35 + 0.4 * riesgoCivil, dificultad: 0.45 + 0.25 * riesgoCivil,
        apoyo: 0.45, duracion: 3 + Math.round(4 * riesgoCivil), origen: 'interno',
      }));
      return;
    }
  }

  // --- b) Conflicto de frontera
  if (!f.conflictosActivos.some((c) => c.tipo === 'frontera')) {
    const riesgoFrontera = clamp01(
      0.40 * num(ext.conflictoLimitrofe, 0.3)
      + 0.35 * num(tie.territorioOriginario, 0) * clamp01(num(tie.fronteraAgricola, 0.15) * 2.5)
      + 0.20 * f.capacidadMilitar
      + 0.15 * (f.doctrina === 'defensa' || f.doctrina === 'profesional' ? 1 : 0)
      - 0.45 * bandera(estado, 'tratados_originarios')
      - 0.35 * bandera(estado, 'conquista_desierto')
      - 0.25 * clamp01(num(ext.integracionRegional, 0.1)),
    );
    if (rng.chance(0.085 * riesgoFrontera * riesgoFrontera)) {
      abrir(crearConflicto({
        id: `frontera_${aux.año}`, tipo: 'frontera',
        nombre: 'Campaña de frontera',
        intensidad: 0.25 + 0.3 * riesgoFrontera, dificultad: 0.3 + 0.2 * riesgoFrontera,
        apoyo: 0.55, duracion: 2 + Math.round(3 * riesgoFrontera), origen: 'gobierno',
      }));
      return;
    }
  }

  // --- c) Aventura externa: la salida por arriba de un gobierno sin consenso.
  if (!f.conflictosActivos.some((c) => c.tipo === 'externa')) {
    const tentacion = clamp01(
      0.45 * (1 - aux.legit)
      + 0.25 * ctxMat.crisis
      + 0.25 * num(p.golpe, 0)
      + 0.25 * num(ext.conflictoLimitrofe, 0.3)
      + 0.20 * bandera(estado, 'malvinas_ocupadas')
      + 0.20 * f.poderPolitico
      + 0.15 * (1 - num(ext.prestigio, 0.2))
      - 0.40 * f.subordinacion
      - 0.30 * f.continuidadInstitucional
      - 0.25 * clamp01(num(ext.integracionRegional, 0.1)),
    );
    const capaz = 0.30 + 0.70 * f.capacidadMilitar;
    if (rng.chance(0.045 * tentacion * tentacion * capaz)) {
      // Contra quién: si hay territorio ocupado, la tentación es recuperarlo, y
      // el adversario es una potencia. Si no, un vecino: más parejo.
      const porTerritorio = bandera(estado, 'malvinas_ocupadas') && rng.chance(0.55);
      abrir(crearConflicto({
        id: `aventura_${aux.año}`, tipo: 'externa',
        nombre: porTerritorio ? 'Campaña por el territorio ocupado' : 'Guerra con un país vecino',
        intensidad: 0.45 + 0.3 * tentacion,
        dificultad: porTerritorio ? 0.80 : 0.42 + 0.25 * rng.next(),
        apoyo: clamp01(0.55 + 0.35 * (porTerritorio ? 1 : 0)),
        duracion: porTerritorio ? 2 : 3 + Math.round(3 * rng.next()),
        origen: ctxMat.militaresEnElPoder ? 'militar' : 'gobierno',
      }));
    }
  }
}

// --------------------------------------------------------------------------
// Saneo propio y registro narrativo
// --------------------------------------------------------------------------

function sanearFfaa(f) {
  const campos = ['presupuesto', 'poderPolitico', 'profesionalizacion', 'golpismo',
    'capacidadMilitar', 'industriaMilitar', 'tutelaje', 'presupuestoSostenido',
    'conscripcion', 'formacionOficial', 'cohesion', 'prestigio', 'subordinacion',
    'impunidad', 'continuidadInstitucional', 'memoriaGolpe', 'coalicionCivil',
    'riesgoRuptura', 'habilitacionRepresiva', 'derrameIndustrial', 'costoOportunidad',
    'saldoBelico', 'amenazaExterna', 'derivaDoctrinaria'];
  for (const k of campos) f[k] = clamp01(num(f[k], 0));
  f.bajasAnuales = clamp(num(f.bajasAnuales, 0), 0, 0.9);
  if (!CARGA_GOLPISTA[f.doctrina]) f.doctrina = 'profesional';
  for (const c of f.conflictosActivos) {
    c.intensidad = clamp01(num(c.intensidad, 0.3));
    c.dificultad = clamp01(num(c.dificultad, 0.5));
    c.apoyo = clamp01(num(c.apoyo, 0.5));
    c.años = clamp(Math.round(num(c.años, 0)), 0, 200);
    c.duracion = clamp(num(c.duracion, 4), 1, 60);
  }
}

/** Avisos narrativos de los umbrales que importan. */
function registrarHitos(estado, f, ctx, año) {
  const p = f.previo || {};
  const cruza = (k, u) => num(p[k], f[k]) < u && f[k] >= u;
  if (cruza('profesionalizacion', 0.5)) {
    ctx.log('El ejército nacional ya no es una suma de milicias: escalafón, escuela y mando único.', ['ffaa']);
  }
  if (cruza('riesgoRuptura', 0.4)) {
    ctx.log('En los cuarteles se habla de "poner orden", y hay quienes en la ciudad asienten.', ['ffaa', 'golpe']);
  }
  if (cruza('subordinacion', 0.6)) {
    ctx.log('Las fuerzas armadas quedan bajo conducción civil efectiva: presupuesto, doctrina y ascensos los decide el poder político.', ['ffaa', 'democracia']);
  }
  void estado; void año;
}

// --------------------------------------------------------------------------
// Indicadores para los paneles
// --------------------------------------------------------------------------

/** Traduce el riesgo de ruptura a algo que se entienda sin leer el código. */
function frasesDeRiesgo(f) {
  const r = f.riesgoRuptura;
  if (f.coalicionCivil < UMBRAL_COALICION && r > 0.2) {
    return 'Ruido de sables sin apoyo civil: por ahora es un motín, no un golpe';
  }
  if (r < 0.08) return 'Nulo: los cuarteles están quietos';
  if (r < 0.18) return 'Bajo: malestar de cuartel sin consecuencias';
  if (r < 0.32) return 'Latente: se conspira, falta quien firme la solicitada';
  if (r < 0.5) return 'Alto: hay coalición civil pidiendo la intervención militar';
  return 'Inminente: el golpe tiene fecha y padrinos';
}

export function indicadores(estado) {
  const f = (estado.nacion && estado.nacion.ffaa) || {};
  const p = f.previo || {};
  const t = (k) => num(f[k], 0) - num(p[k], num(f[k], 0));
  const conflictos = Array.isArray(f.conflictosActivos) ? f.conflictosActivos : [];
  const nombres = conflictos.map((c) => c.nombre || c.id).join(', ');

  return [
    {
      clave: 'ffaa_riesgo_ruptura',
      etiqueta: 'Riesgo de ruptura institucional',
      valor: frasesDeRiesgo(f),
      formato: 'texto',
      tendencia: t('riesgoRuptura'),
      ayuda: `Golpismo ${Math.round(num(f.golpismo, 0) * 100)}% × coalición civil ${Math.round(num(f.coalicionCivil, 0) * 100)}%. `
        + 'Sin coalición civil que lo respalde, un alzamiento militar no prospera: se apaga en el cuartel.',
    },
    {
      clave: 'ffaa_poder_politico',
      etiqueta: 'Poder político militar',
      valor: num(f.poderPolitico, 0),
      formato: 'porcentaje',
      tendencia: t('poderPolitico'),
      ayuda: 'Capacidad de las fuerzas armadas para vetar decisiones del poder civil.',
    },
    {
      clave: 'ffaa_subordinacion',
      etiqueta: 'Subordinación al poder civil',
      valor: num(f.subordinacion, 0),
      formato: 'porcentaje',
      tendencia: t('subordinacion'),
      ayuda: 'Se construye con juzgamiento de los crímenes, recorte presupuestario, cambio de doctrina y décadas de continuidad institucional. Se pierde en una noche.',
    },
    {
      clave: 'ffaa_doctrina',
      etiqueta: 'Doctrina militar',
      valor: NOMBRE_DOCTRINA[f.doctrina] || 'miliciana',
      formato: 'texto',
      ayuda: f.doctrina === 'seguridadInterior'
        ? 'Hipótesis de conflicto interno: el enemigo es parte de la propia población. Habilita la represión masiva y vuelve a las fuerzas armadas un actor político permanente.'
        : f.doctrina === 'defensa'
          ? 'Hipótesis de conflicto externo y conducción civil: la fuerza mira la frontera, no la plaza.'
          : f.doctrina === 'profesional'
            ? 'Cuerpo profesional con escuela y escalafón, formalmente separado de la política.'
            : 'Milicias provinciales y jefes con tropa propia: no hay ejército nacional.',
    },
    {
      clave: 'ffaa_capacidad',
      etiqueta: 'Capacidad militar efectiva',
      valor: num(f.capacidadMilitar, 0),
      formato: 'porcentaje',
      tendencia: t('capacidadMilitar'),
      ayuda: 'Depende del gasto sostenido en el tiempo, de la industria propia y de los técnicos disponibles; no de gastar mucho un solo año.',
    },
    {
      clave: 'ffaa_presupuesto',
      etiqueta: 'Presupuesto militar',
      valor: num(f.presupuesto, 0),
      formato: 'porcentaje',
      tendencia: t('presupuesto'),
      ayuda: `Fracción del gasto público que se lleva la defensa. Costo de oportunidad frente a escuelas, hospitales y rutas: ${Math.round(num(f.costoOportunidad, 0) * 100)}%.`,
    },
    {
      clave: 'ffaa_industria',
      etiqueta: 'Industria militar',
      valor: num(f.industriaMilitar, 0),
      formato: 'porcentaje',
      tendencia: t('industriaMilitar'),
      ayuda: `Derrame sobre la industria civil: ${Math.round(num(f.derrameIndustrial, 0) * 100)}%. `
        + 'Integrada al sistema científico deja aviones, acero y tecnología nuclear; aislada por el secreto militar no deja nada afuera del cuartel.',
    },
    {
      clave: 'ffaa_conflictos',
      etiqueta: 'Conflictos armados activos',
      valor: conflictos.length,
      formato: 'numero',
      ayuda: conflictos.length
        ? `${nombres}. Bajas del año: ${Math.round(num(f.bajasAnuales, 0) * 1e6).toLocaleString('es-AR')} personas.`
        : 'Sin conflictos armados en curso.',
    },
  ];
}

export default sistema;
