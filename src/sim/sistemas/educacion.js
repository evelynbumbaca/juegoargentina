// Educación y ciencia.
//
// La escuela pública argentina fue, durante casi un siglo, la máquina de
// movilidad social más eficaz de la región. Este sistema modela esa máquina y
// —sobre todo— sus condiciones materiales: sin capacidad fiscal, sin Estado
// que llegue al territorio y sin ciudades, la ley queda escrita en un papel.
//
// Cuatro ideas estructuran el módulo:
//
//   1. La cobertura es un FLUJO; la alfabetización es un STOCK. La escuela
//      alfabetiza cohortes, y el stock adulto sólo se mueve a la velocidad a
//      la que se renueva la población. Por eso la ley 1420 (1884) se ve en el
//      censo de 1914 y no en el de 1895.
//   2. Los niveles están ENCADENADOS con retardo generacional: no hay
//      secundaria masiva sin primaria masiva veinte años antes, ni
//      universidad masiva sin secundaria masiva veinte años antes.
//   3. La ciencia y la técnica necesitan inversión sostenida durante décadas,
//      universidad pública y —decisivo— DEMANDA de la estructura productiva.
//      Sin industria que contrate ingenieros, la capacidad formada se va.
//   4. Destruir es rápido y reconstruir es lento. Una noche de bastones
//      largos borra en cinco años lo que tres décadas acumularon, y la
//      recuperación es lenta porque hacen falta investigadores formados para
//      formar investigadores.
//
// Dominio propio: `estado.nacion.educacion` (todos sus campos) y
// `provincia.educacion`. Mueve lentamente al actor `clasesMedias` y suma a
// `estado.presiones`. No escribe nada más.

import { clamp, clamp01, hacia, suave, promedio, sano } from '../../core/util.js';

// ---------------------------------------------------------------------------
// Constantes de calibración
// ---------------------------------------------------------------------------

const LARGO_COLA = 48;      // años de memoria de las colas de retardo

const RET_ALFAB = 8;        // cobertura primaria -> cohorte adulta alfabetizada
const RET_SEC = 22;         // una generación: primaria masiva -> secundaria masiva
const RET_SUP = 20;         // secundaria masiva -> universidad masiva
const RET_CIENCIA = 16;     // graduados -> investigadores en actividad
const RET_INDUSTRIA = 12;   // ventana para detectar desindustrialización
const VENTANA_INV = 25;     // años de inversión que "cuentan" como sostenida
const VENTANA_EXPANSION = 5;// ventana para medir el ritmo de expansión

const GASTO_PLENO = 0.055;  // 5,5% del PBI = financiamiento educativo pleno
const TECHO_ALFAB = 0.995;  // el analfabetismo residual nunca llega a cero

// Asimetrías: subir capacidades cuesta décadas, perderlas cuesta años.
const SUBE_CIENCIA = 0.075;
const CAE_CIENCIA = 0.14;
const DESTRUCCION_FUGA = 0.16;
const SUBE_TECNICA = 0.06;
const CAE_TECNICA = 0.11;

// Banderas cuya *aparición* provoca un shock, no un estado permanente.
const BANDERAS_SHOCK = ['noche_bastones_largos', 'terrorismo_estado', 'golpe_militar'];
const INTENSIDAD_SHOCK = {
  noche_bastones_largos: 0.85,
  terrorismo_estado: 1.0,
  golpe_militar: 0.35,
};

// ---------------------------------------------------------------------------
// Utilidades locales
// ---------------------------------------------------------------------------

/** Bandera como 0/1. */
const ban = (s, k) => (s.flags && s.flags[k] ? 1 : 0);

/**
 * Estado interno del sistema (colas de retardo y memoria de shocks).
 * Vive dentro de `nacion.educacion` porque es dominio propio; `Motor.sanear()`
 * no toca los arrays, y los escalares que guarda están todos en 0..1.
 */
function asegurar(estado) {
  const ed = estado.nacion.educacion;
  if (ed.interno && Array.isArray(ed.interno.primaria)) return ed.interno;

  const lleno = (v) => Array.from({ length: 12 }, () => sano(v, 0));
  ed.interno = {
    primaria: lleno(ed.primaria),
    secundaria: lleno(ed.secundaria),
    superior: lleno(ed.superior),
    matricula: lleno(ed.primaria * 0.45),
    inversion: lleno(0),
    industria: lleno(sano(estado.nacion.economia.industrializacion, 0.05)),
    historia: [],          // instantáneas para las tendencias de los paneles
    banderasVistas: [],    // banderas de shock ya procesadas
    avisos: [],            // hitos narrativos ya registrados
    pulsoRepresion: 0,     // 0..1, decae solo
  };
  return ed.interno;
}

/** Agrega un valor a una cola de retardo, recortando su largo. */
function empujar(cola, valor) {
  cola.push(clamp01(sano(valor, 0)));
  while (cola.length > LARGO_COLA) cola.shift();
}

/** Valor de la cola `n` años atrás (o el más viejo disponible). */
function atras(cola, n) {
  if (!cola || cola.length === 0) return 0;
  const i = cola.length - 1 - n;
  return sano(cola[i < 0 ? 0 : i], 0);
}

/** Promedio simple de los últimos `n` valores de una cola. */
function mediaCola(cola, n) {
  if (!cola || cola.length === 0) return 0;
  const desde = Math.max(0, cola.length - n);
  let s = 0;
  for (let i = desde; i < cola.length; i++) s += sano(cola[i], 0);
  return sano(s / (cola.length - desde), 0);
}

/** Capacidad de una jurisdicción para sostener su propio sistema escolar. */
function capacidadPropia(p) {
  return clamp01(
    0.30 * sano(p.desarrollo, 0) +
    0.22 * sano(p.infraestructura, 0) +
    0.28 * sano(p.urbanizacion, 0) +
    0.20 * sano(p.integracion, 0)
  );
}

/** Coeficiente de variación ponderado por población (0 = todos iguales). */
function dispersion(valores, pesos) {
  const media = promedio(valores.map((v, i) => [v, pesos[i]]));
  if (media <= 1e-6) return 0;
  const varianza = promedio(valores.map((v, i) => [(v - media) ** 2, pesos[i]]));
  return sano(Math.sqrt(Math.max(0, varianza)) / media, 0);
}

// ---------------------------------------------------------------------------
// Sistema
// ---------------------------------------------------------------------------

export default {
  meta: {
    id: 'educacion',
    nombre: 'Educación y ciencia',
    orden: 60,
    descripcion: 'Escuela pública, niveles encadenados, ciencia y técnica, fuga de cerebros y brecha regional.',
  },

  init(estado) {
    asegurar(estado);
  },

  paso(estado, rng, ctx) {
    const n = estado.nacion;
    const ed = n.educacion;
    const eco = n.economia;
    const dem = n.demografia;
    const soc = n.social;
    const reg = estado.regimen || {};
    const act = estado.actores || {};
    const inn = asegurar(estado);
    const año = sano(ctx?.año, estado.año);

    // -----------------------------------------------------------------------
    // 0. Entradas materiales y políticas (sólo lectura)
    // -----------------------------------------------------------------------
    const capFiscal = clamp01(sano(eco.capacidadFiscal, 0.15));
    const capEstatal = clamp01(sano(reg.capacidadEstatal, 0.15));
    const urb = clamp01(sano(dem.urbanizacion, 0.12));
    const industria = clamp01(sano(eco.industrializacion, 0.05));
    const diversif = clamp01(sano(eco.diversificacion, 0.1));
    const prodInd = clamp01(sano(eco.productividadIndustrial, 0.1));
    const democracia = clamp01(sano(reg.democracia, 0.1));
    const pbiPc = clamp(sano(eco.pbiPerCapita, 1100), 250, 250000);
    const pobreza = clamp01(sano(soc.pobreza, 0.5));
    const represionSocial = clamp01(sano(soc.represion, 0.3));
    const sindicalizacion = clamp01(sano(soc.sindicalizacion, 0));
    const clasesMedias = clamp01(sano(act.clasesMedias, 0.08));
    const sindicatos = clamp01(sano(act.sindicatos, 0));
    const dictadura = reg.tipo === 'dictadura' ? 1 : 0;

    // "Época": la escolarización masiva se vuelve un estándar mundial entre
    // 1870 y 2010. Sirve para que el contrafáctico sin ley 1420 no quede
    // congelado en el siglo XIX, sólo mucho más atrás.
    const epoca = suave(año, 1870, 2010);

    // Financiamiento relativo: 1.0 = gasto educativo pleno.
    const gastoRel = clamp01(sano(ed.gastoPbi / GASTO_PLENO, 0));

    const fLey = ban(estado, 'ley_1420');
    const fLaica = ban(estado, 'educacion_laica');
    const fReforma = ban(estado, 'reforma_universitaria');
    const fGratuita = ban(estado, 'universidad_gratuita');
    const fConicet = ban(estado, 'conicet');
    const fTecnicas = ban(estado, 'escuelas_tecnicas');
    const fNuclear = ban(estado, 'energia_nuclear');
    const fInvap = clamp01(ban(estado, 'invap') + ban(estado, 'conae'));
    const fSustitucion = ban(estado, 'sustitucion_importaciones');
    const fPesada = ban(estado, 'industria_pesada');
    const fPrivatizaciones = ban(estado, 'privatizaciones');
    const fTerrorismo = ban(estado, 'terrorismo_estado');
    const fDDHH = ban(estado, 'derechos_humanos');
    const fAduana = ban(estado, 'aduana_nacionalizada');
    const fUnitario = ban(estado, 'estado_unitario');
    const fFederal = ban(estado, 'estado_federal');
    const fDefault = ban(estado, 'default_deuda');
    const fFmi = ban(estado, 'acuerdo_fmi') || (n.deuda?.acuerdoFMI ? 1 : 0);

    // Pulso de represión: las banderas quedan encendidas para siempre, pero el
    // shock que producen es un evento puntual que después decae.
    inn.pulsoRepresion = clamp01(sano(inn.pulsoRepresion, 0) * 0.86);
    for (const b of BANDERAS_SHOCK) {
      if (ban(estado, b) && !inn.banderasVistas.includes(b)) {
        inn.banderasVistas.push(b);
        inn.pulsoRepresion = clamp01(Math.max(inn.pulsoRepresion, INTENSIDAD_SHOCK[b] ?? 0.5));
      }
    }
    // Mientras la dictadura con terrorismo de Estado sigue en pie, el shock no
    // se apaga: la universidad permanece intervenida.
    const represionActiva = clamp01(
      0.70 * inn.pulsoRepresion +
      0.55 * fTerrorismo * dictadura +
      0.30 * dictadura +
      0.35 * Math.max(0, represionSocial - 0.45) / 0.55
    );

    // -----------------------------------------------------------------------
    // 1. Gasto educativo (lo que el Estado puede y quiere poner)
    // -----------------------------------------------------------------------
    const matriculaActual = clamp01(0.45 * ed.primaria + 0.33 * ed.secundaria + 0.30 * ed.superior);
    const demandaSocial = clamp01(
      0.22 +
      0.45 * clasesMedias +
      0.25 * sindicatos +
      0.22 * democracia +
      0.25 * matriculaActual +
      0.10 * epoca
    );
    const bonoPolitico = 1 + 0.22 * fLey + 0.18 * fGratuita + 0.12 * fConicet + 0.08 * fTecnicas;
    const ahogoFinanciero =
      0.30 * clamp01(sano(n.deuda?.servicioDeuda, 0) / 0.5) +
      0.20 * fFmi +
      0.15 * fDefault +
      0.20 * dictadura;
    const objGasto = clamp01(
      0.002 +
      0.095 * demandaSocial * Math.pow(capFiscal, 1.3) * bonoPolitico * (1 - 0.45 * clamp01(ahogoFinanciero))
    );
    ed.gastoPbi = clamp01(hacia(sano(ed.gastoPbi, 0.005), objGasto, 0.11));

    const gastoRelNuevo = clamp01(sano(ed.gastoPbi / GASTO_PLENO, 0));

    // -----------------------------------------------------------------------
    // 2. Primaria: la decisión política multiplicada por los medios materiales
    // -----------------------------------------------------------------------
    // `medios` es lo que la estructura permite: recaudación, Estado que llega
    // al territorio, ciudades donde concentrar chicos, y plata en el aula.
    const medios = clamp01(
      0.16 +
      0.42 * capFiscal +
      0.30 * capEstatal +
      0.30 * urb +
      0.42 * gastoRelNuevo
    );
    // `voluntad` es la decisión de escolarizar a todo el mundo. La ley 1420
    // (gratuita, laica y obligatoria) es de lejos el término dominante.
    const voluntad = clamp01(
      0.13 +
      0.46 * fLey +
      0.08 * fLaica +
      0.14 * democracia +
      0.12 * clasesMedias +
      0.22 * epoca
    );
    const objPrimaria = clamp01(1.42 * medios * voluntad);
    ed.primaria = clamp01(hacia(sano(ed.primaria, 0.1), objPrimaria, 0.075));

    // -----------------------------------------------------------------------
    // 3. Secundaria: techo generacional en la primaria de hace veinte años
    // -----------------------------------------------------------------------
    const primariaVieja = atras(inn.primaria, RET_SEC);
    const demandaSec = clamp01(
      0.10 +
      0.38 * urb +
      0.42 * industria +
      0.30 * clasesMedias +
      0.28 * epoca +
      0.10 * fTecnicas
    );
    const mediosSec = clamp01(0.20 + 0.45 * gastoRelNuevo + 0.40 * capFiscal + 0.25 * capEstatal);
    const objSecundaria = clamp01(1.55 * primariaVieja * demandaSec * mediosSec);
    ed.secundaria = clamp01(hacia(sano(ed.secundaria, 0.02), objSecundaria, 0.065));

    // -----------------------------------------------------------------------
    // 4. Superior: techo generacional en la secundaria de hace veinte años
    // -----------------------------------------------------------------------
    const secundariaVieja = atras(inn.secundaria, RET_SUP);
    const demandaSup = clamp01(
      0.12 +
      0.32 * industria +
      0.35 * clasesMedias +
      0.25 * diversif +
      0.28 * epoca
    );
    const accesoUniversitario = clamp01(
      (0.35 + 0.65 * clamp01(sano(ed.universidadPublica, 0.2))) *
      (1 + 0.55 * fGratuita + 0.20 * fReforma) *
      (1 - 0.30 * clamp01(pobreza - 0.35) / 0.65)
    );
    const objSuperior = clamp01(1.85 * secundariaVieja * demandaSup * accesoUniversitario * (0.35 + 0.65 * gastoRelNuevo));
    ed.superior = clamp01(hacia(sano(ed.superior, 0.005), objSuperior, 0.06));

    // -----------------------------------------------------------------------
    // 5. Alfabetización: stock que se renueva al ritmo de las generaciones
    // -----------------------------------------------------------------------
    const alfPrevia = clamp01(sano(ed.alfabetizacion, 0.2));
    const primariaEfectiva = atras(inn.primaria, RET_ALFAB);
    const calidadPrevia = clamp01(sano(ed.calidad, 0.3));

    // Cohorte que entra a la edad adulta: la alfabetiza la escuela y, en su
    // defecto, la familia ya alfabetizada (la alfabetización se hereda).
    const porLaEscuela = primariaEfectiva * (0.80 + 0.20 * calidadPrevia);
    const porLaFamilia = alfPrevia * (0.50 + 0.32 * urb) * (1 - 0.55 * primariaEfectiva);
    const objetivoCohorte = clamp01(porLaEscuela + porLaFamilia);

    // Velocidad de recambio poblacional: con natalidad alta las generaciones
    // se reemplazan rápido y el stock se mueve rápido.
    const renovacion = clamp(sano(dem.natalidad, 0.03) * 0.92, 0.012, 0.05);
    let alf = hacia(alfPrevia, objetivoCohorte, renovacion);

    // Alfabetización de adultos: campañas, conscripción, bibliotecas obreras,
    // escuelas nocturnas. Sólo funcionan si hay ciudad y hay sistema escolar.
    const campaña = 0.042 * (1 - alfPrevia) * clamp01(
      0.30 * urb + 0.50 * ed.primaria + 0.20 * sindicalizacion + 0.15 * democracia
    );
    alf += campaña;

    // El colapso social desescolariza: pobreza extrema y guerra civil.
    const deterioro = 0.012 * clamp01(pobreza - 0.5) / 0.5 + 0.010 * ban(estado, 'guerra_civil');
    alf -= deterioro * alfPrevia;

    ed.alfabetizacion = clamp(sano(alf, alfPrevia), 0, TECHO_ALFAB);

    // -----------------------------------------------------------------------
    // 6. Formación técnica: eje propio, atado a la industria
    // -----------------------------------------------------------------------
    const baseEscolar = clamp01(0.35 * atras(inn.primaria, 10) + 0.65 * atras(inn.secundaria, 6));
    const politicaTecnica = clamp01(
      0.06 +
      0.30 * fTecnicas +
      0.18 * fSustitucion +
      0.18 * fPesada +
      0.12 * fNuclear +
      0.12 * fInvap
    );
    const objTecnica = clamp01(
      (0.55 * industria + 0.25 * prodInd + 0.90 * politicaTecnica) *
      (0.30 + 0.70 * baseEscolar) *
      (0.40 + 0.60 * gastoRelNuevo)
    );
    const tecnicaPrevia = clamp01(sano(ed.formacionTecnica, 0.05));
    let tecnica = objTecnica > tecnicaPrevia
      ? hacia(tecnicaPrevia, objTecnica, SUBE_TECNICA)
      : hacia(tecnicaPrevia, objTecnica, CAE_TECNICA);
    // Desmantelamiento: cuando la industria se cae, los talleres cierran y no
    // vuelven a abrir por decreto.
    const desindustrializacion = clamp01(atras(inn.industria, RET_INDUSTRIA) - industria);
    tecnica -= (0.85 * desindustrializacion + 0.010 * fPrivatizaciones) * tecnicaPrevia;
    ed.formacionTecnica = clamp01(sano(tecnica, tecnicaPrevia));

    // -----------------------------------------------------------------------
    // 7. Universidad pública
    // -----------------------------------------------------------------------
    const univPrevia = clamp01(sano(ed.universidadPublica, 0.2));
    const objUniv = clamp01(
      0.12 +
      0.22 * fReforma +
      0.20 * fGratuita +
      0.14 * fConicet +
      0.30 * gastoRelNuevo +
      0.18 * democracia +
      0.12 * clamp01(ed.superior * 1.5) +
      0.08 * fDDHH -
      0.45 * represionActiva -
      0.10 * fPrivatizaciones
    );
    const tasaUniv = objUniv < univPrevia ? 0.16 : 0.07; // intervenirla es rápido
    ed.universidadPublica = clamp01(hacia(univPrevia, objUniv, tasaUniv));

    // -----------------------------------------------------------------------
    // 8. Fuga de cerebros
    // -----------------------------------------------------------------------
    // Necesidad de financiamiento: cuanto más grande el sistema formado, más
    // caro sostenerlo. Si el gasto no acompaña, el sistema expulsa gente.
    const necesidad = clamp01(0.30 + 0.70 * (0.55 * ed.superior + 0.45 * clamp01(sano(ed.cienciaTecnica, 0))));
    const desfinanciamiento = clamp01(sano((necesidad - gastoRelNuevo) / Math.max(0.15, necesidad), 0));

    const crisis = clamp01(
      4.0 * Math.max(0, -sano(eco.crecimiento, 0)) +
      0.50 * suave(sano(eco.inflacion, 0), 0.3, 3) +
      0.80 * clamp01(sano(eco.desempleo, 0.05)) +
      0.60 * clamp01(pobreza - 0.3) / 0.7
    );

    // Falta de demanda profesional: más graduados que puestos donde aplicarlos.
    // Es la causa silenciosa y permanente, la que opera incluso en democracia.
    const puestos = clamp01(1.55 * industria + 0.75 * diversif + 0.55 * prodInd + 0.35 * ed.formacionTecnica);
    const faltaDemanda = clamp01(1.25 * ed.superior + 0.75 * clamp01(sano(ed.cienciaTecnica, 0)) - puestos);

    const objFuga = clamp01(
      (0.42 * represionActiva + 0.24 * desfinanciamiento + 0.22 * crisis + 0.34 * faltaDemanda) *
      (0.25 + 0.75 * clamp01(ed.superior * 1.4 + clamp01(sano(ed.cienciaTecnica, 0))))
    );
    // La decisión de irse se toma rápido; volver, no tanto.
    const fugaPrevia = clamp01(sano(ed.fugaCerebros, 0));
    ed.fugaCerebros = clamp01(hacia(fugaPrevia, objFuga, objFuga > fugaPrevia ? 0.40 : 0.16));

    // -----------------------------------------------------------------------
    // 9. Ciencia y técnica: décadas para construir, años para destruir
    // -----------------------------------------------------------------------
    const cienciaPrevia = clamp01(sano(ed.cienciaTecnica, 0.05));

    // Inversión científica del año, que se acumula en una cola: lo que cuenta
    // no es el presupuesto de este año sino el de los últimos veinticinco.
    const inversionAnual = clamp01(
      gastoRelNuevo *
      (0.35 + 0.65 * ed.universidadPublica) *
      (0.55 + 0.30 * fConicet + 0.15 * fInvap + 0.10 * fNuclear) *
      (1 - 0.60 * represionActiva)
    );
    const inversionSostenida = mediaCola(inn.inversion, VENTANA_INV);

    // Demanda de la estructura productiva: si nadie contrata investigadores ni
    // ingenieros, la ciencia queda aislada del aparato productivo.
    const demandaProductiva = clamp01(
      0.10 + 0.95 * (0.55 * industria + 0.20 * diversif + 0.15 * prodInd + 0.10 * ed.formacionTecnica)
    );
    const graduadosViejos = atras(inn.superior, RET_CIENCIA);

    const objCiencia = clamp01(
      1.95 *
      inversionSostenida *
      (0.22 + 0.78 * clamp01(graduadosViejos * 1.7)) *
      (0.35 + 0.65 * ed.formacionTecnica) *
      (0.20 + 0.80 * demandaProductiva)
    );

    // Capacidad formativa: hace falta gente formada para formar gente. Con el
    // stock destruido, la reconstrucción arranca casi de cero.
    const capacidadFormativa = 0.18 + 0.82 * suave(cienciaPrevia, 0, 0.40);
    let ciencia = objCiencia > cienciaPrevia
      ? hacia(cienciaPrevia, objCiencia, SUBE_CIENCIA * capacidadFormativa)
      : hacia(cienciaPrevia, objCiencia, CAE_CIENCIA);

    // La fuga destruye stock acumulado. Esto es lo que no se recupera.
    ciencia -= DESTRUCCION_FUGA * ed.fugaCerebros * cienciaPrevia;
    ed.cienciaTecnica = clamp01(sano(ciencia, cienciaPrevia));

    // -----------------------------------------------------------------------
    // 10. Calidad contra cobertura
    // -----------------------------------------------------------------------
    const matricula = clamp01(0.45 * ed.primaria + 0.33 * ed.secundaria + 0.30 * ed.superior);
    // Recursos por alumno: el gasto se reparte entre los que entraron.
    const recursoPorAlumno = clamp(
      sano(ed.gastoPbi / Math.max(0.02, matricula * GASTO_PLENO), 0), 0, 4
    );
    // Ritmo de expansión reciente: sentar chicos nuevos sin aulas ni maestros.
    const expansion = Math.max(0, matricula - atras(inn.matricula, VENTANA_EXPANSION)) / VENTANA_EXPANSION;
    const objCalidad = clamp01(
      0.10 +
      0.52 * suave(recursoPorAlumno, 0.25, 1.35) +
      0.16 * suave(pbiPc / 14000, 0.05, 1) +
      0.12 * ed.cienciaTecnica +
      0.10 * ed.formacionTecnica +
      0.06 * ed.universidadPublica -
      3.2 * expansion -
      0.25 * ed.fugaCerebros -
      0.16 * clamp01(sano(ed.brechaRegional, 0.6))
    );
    ed.calidad = clamp01(hacia(clamp01(sano(ed.calidad, 0.3)), objCalidad, 0.085));

    // -----------------------------------------------------------------------
    // 11. Reparto territorial y brecha regional
    // -----------------------------------------------------------------------
    // Cuánto del sistema escolar se financia con recursos nacionales. Con
    // financiamiento nacional la brecha se achica; con financiamiento
    // provincial puro, las provincias pobres no pueden pagar sus escuelas.
    const nacionalizacion = clamp01(
      0.18 +
      0.34 * capFiscal +
      0.24 * capEstatal +
      0.16 * fLey +
      0.10 * fAduana +
      0.10 * fUnitario +
      0.08 * fGratuita -
      0.26 * clamp01(sano(estado.config?.federalismo, 0.4)) -
      0.14 * fPrivatizaciones -
      0.06 * fFederal
    );

    const provincias = Array.isArray(estado.provincias) ? estado.provincias : [];
    const nivelNacional = clamp01(
      0.40 * ed.alfabetizacion + 0.25 * ed.primaria + 0.20 * ed.secundaria + 0.15 * ed.superior
    );

    if (provincias.length) {
      const pesos = provincias.map((p) => Math.max(1e-4, sano(p.poblacion, 0.01)));
      const caps = provincias.map(capacidadPropia);
      const capMedia = Math.max(0.02, promedio(caps.map((c, i) => [c, pesos[i]])));

      for (let i = 0; i < provincias.length; i++) {
        const p = provincias[i];
        const relativa = clamp(caps[i] / capMedia, 0.22, 1.85);
        const factor = nacionalizacion + (1 - nacionalizacion) * relativa;
        const objProv = clamp01(nivelNacional * factor);
        p.educacion = clamp01(hacia(clamp01(sano(p.educacion, 0.1)), objProv, 0.085));
      }

      const realizada = dispersion(provincias.map((p) => clamp01(sano(p.educacion, 0))), pesos);
      const estructural = dispersion(caps, pesos);
      const objBrecha = clamp01(
        (1 - nacionalizacion) * (0.30 + 0.75 * estructural) + 0.55 * realizada
      );
      ed.brechaRegional = clamp01(hacia(clamp01(sano(ed.brechaRegional, 0.6)), objBrecha, 0.08));
    }

    // -----------------------------------------------------------------------
    // 12. Movilidad social: la escuela fabrica clases medias
    // -----------------------------------------------------------------------
    const objClases = clamp01(
      0.05 +
      0.22 * ed.alfabetizacion * urb +
      0.30 * ed.secundaria +
      0.32 * ed.superior +
      0.14 * ed.formacionTecnica +
      0.10 * ed.cienciaTecnica -
      0.20 * clamp01(pobreza - 0.35) / 0.65 -
      0.10 * ed.fugaCerebros
    );
    if (typeof act.clasesMedias === 'number') {
      const paso = hacia(clasesMedias, objClases, 0.06) - clasesMedias;
      act.clasesMedias = clamp01(clasesMedias + clamp(sano(paso, 0), -0.012, 0.012));
    }

    // -----------------------------------------------------------------------
    // 13. Presiones que leen los eventos
    // -----------------------------------------------------------------------
    const pr = estado.presiones;
    if (pr) {
      // Juventud formada sin lugar donde trabajar, y docencia sin presupuesto.
      pr.social = clamp01(sano(pr.social, 0) +
        0.020 * faltaDemanda * clamp01(ed.superior * 2) +
        0.018 * desfinanciamiento * clasesMedias +
        0.010 * ed.fugaCerebros);
      // Sostener un sistema masivo con recaudación chica tensiona las cuentas.
      pr.fiscal = clamp01(sano(pr.fiscal, 0) +
        0.025 * clamp01((ed.gastoPbi / Math.max(0.05, capFiscal) - 0.10) / 0.12));
      // Provincias que no pueden pagar sus escuelas.
      pr.regional = clamp01(sano(pr.regional, 0) +
        0.022 * clamp01(ed.brechaRegional - 0.35) / 0.65 * (1 - nacionalizacion));
    }

    // -----------------------------------------------------------------------
    // 14. Colas de retardo, memoria de tendencias y relato
    // -----------------------------------------------------------------------
    empujar(inn.primaria, ed.primaria);
    empujar(inn.secundaria, ed.secundaria);
    empujar(inn.superior, ed.superior);
    empujar(inn.matricula, matricula);
    empujar(inn.inversion, inversionAnual);
    empujar(inn.industria, industria);

    inn.historia.push([
      ed.alfabetizacion, ed.secundaria, ed.superior, ed.gastoPbi,
      ed.calidad, ed.cienciaTecnica, ed.fugaCerebros, ed.brechaRegional,
    ]);
    while (inn.historia.length > 12) inn.historia.shift();

    if (typeof ctx?.log === 'function') {
      const avisar = (clave, texto, etiquetas) => {
        if (inn.avisos.includes(clave)) return;
        inn.avisos.push(clave);
        ctx.log(texto, etiquetas);
      };
      if (ed.alfabetizacion > 0.5) {
        avisar('alfab_mitad', 'La mitad del país sabe leer y escribir.', ['educacion']);
      }
      if (ed.alfabetizacion > 0.9) {
        avisar('alfab_90', 'El analfabetismo deja de ser un problema de masas.', ['educacion']);
      }
      if (ed.secundaria > 0.5) {
        avisar('sec_mitad', 'La escuela secundaria deja de ser un privilegio.', ['educacion']);
      }
      if (ed.cienciaTecnica > 0.45) {
        avisar('ciencia_alta', 'El país desarrolla tecnología propia y la aplica.', ['ciencia']);
      }
      if (ed.fugaCerebros > 0.55) {
        avisar('fuga_grave', 'Se van los que el país tardó treinta años en formar.', ['ciencia', 'crisis']);
      }
    }
  },

  indicadores(estado) {
    const ed = estado?.nacion?.educacion ?? {};
    const hist = estado?.nacion?.educacion?.interno?.historia ?? [];
    const viejo = hist.length > 5 ? hist[hist.length - 6] : null;
    const tend = (valor, i) => (viejo ? sano((valor - sano(viejo[i], valor)) / 5, 0) : 0);

    const alfab = clamp01(sano(ed.alfabetizacion, 0));
    const sec = clamp01(sano(ed.secundaria, 0));
    const sup = clamp01(sano(ed.superior, 0));
    const gasto = clamp01(sano(ed.gastoPbi, 0));
    const cal = clamp01(sano(ed.calidad, 0));
    const cien = clamp01(sano(ed.cienciaTecnica, 0));
    const fuga = clamp01(sano(ed.fugaCerebros, 0));
    const brecha = clamp01(sano(ed.brechaRegional, 0));

    return [
      {
        clave: 'alfabetizacion', etiqueta: 'Alfabetización', valor: alfab,
        formato: 'porcentaje', tendencia: tend(alfab, 0),
        ayuda: 'Población de diez años o más que sabe leer y escribir. Es un stock: se mueve al ritmo en que se renuevan las generaciones.',
      },
      {
        clave: 'secundaria', etiqueta: 'Escolarización secundaria', valor: sec,
        formato: 'porcentaje', tendencia: tend(sec, 1),
        ayuda: 'Cobertura del nivel medio. Su techo es la primaria masiva de hace una generación.',
      },
      {
        clave: 'superior', etiqueta: 'Acceso a estudios superiores', valor: sup,
        formato: 'porcentaje', tendencia: tend(sup, 2),
        ayuda: 'Cobertura del nivel superior. Depende de la secundaria de hace veinte años y de que la universidad sea pública y accesible.',
      },
      {
        clave: 'gastoPbi', etiqueta: 'Gasto educativo (PBI)', valor: gasto,
        formato: 'porcentaje', tendencia: tend(gasto, 3),
        ayuda: 'Fracción del producto destinada a educación. Sin capacidad fiscal no hay ley que alcance.',
      },
      {
        clave: 'calidad', etiqueta: 'Calidad del sistema', valor: cal,
        formato: 'indice', tendencia: tend(cal, 4),
        ayuda: 'Recursos por alumno. Expandir la matrícula más rápido que el presupuesto la deteriora; invertir la recupera.',
      },
      {
        clave: 'cienciaTecnica', etiqueta: 'Ciencia y técnica propias', valor: cien,
        formato: 'indice', tendencia: tend(cien, 5),
        ayuda: 'Capacidad de generar y aplicar conocimiento propio. Necesita décadas de inversión, universidad pública e industria que la demande.',
      },
      {
        clave: 'fugaCerebros', etiqueta: 'Fuga de cerebros', valor: fuga,
        formato: 'porcentaje', tendencia: tend(fuga, 6),
        ayuda: 'Intensidad con que se van los profesionales formados. La disparan la represión, el desfinanciamiento, la crisis y la falta de trabajo calificado.',
      },
      {
        clave: 'brechaRegional', etiqueta: 'Brecha educativa regional', valor: brecha,
        formato: 'indice', tendencia: tend(brecha, 7),
        ayuda: 'Desigualdad educativa entre jurisdicciones. Se achica con financiamiento nacional y se amplía cuando cada provincia paga sus propias escuelas.',
      },
    ];
  },
};
