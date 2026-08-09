// Demografía: población, transición vital, inmigración masiva y reparto
// territorial.
//
// Ninguna tasa está escrita a mano por año: la natalidad y la mortalidad salen
// de condiciones materiales (saneamiento, salud, escolarización, ingreso,
// situación de las mujeres) y la migración sale de la comparación entre lo que
// el país ofrece y lo que expulsa.
//
// La pieza más importante del sistema es la relación entre TIERRA y
// URBANIZACIÓN: el inmigrante llega igual esté la tierra repartida o
// concentrada, pero si no puede acceder a ella se queda en la ciudad como
// peón o arrendatario. Ese solo hecho decide si el país termina con una red de
// pueblos chacareros o con un conurbano gigantesco alrededor del puerto.

import { clamp, clamp01, hacia, lerp, sano } from '../../core/util.js';

/** Esperanza de vida: el índice 0..1 se mapea a este rango en años. */
export const RANGO_VIDA = [20, 85];

/**
 * Ola migratoria europea. Es contexto mundial, no una decisión argentina:
 * crecimiento demográfico y crisis agrarias en Europa, abaratamiento del
 * pasaje transatlántico, y el corte de la Gran Guerra y de 1930.
 */
function olaEuropea(año) {
  if (año < 1850 || año > 1955) return 0;
  const anclas = [
    [1850, 0.05], [1865, 0.18], [1880, 0.45], [1890, 0.62], [1895, 0.50],
    [1905, 0.95], [1913, 1.00], [1915, 0.10], [1919, 0.25], [1923, 0.75],
    [1930, 0.55], [1932, 0.10], [1939, 0.12], [1946, 0.35], [1951, 0.30],
    [1955, 0.05],
  ];
  for (let i = 0; i < anclas.length - 1; i++) {
    const [a1, v1] = anclas[i];
    const [a2, v2] = anclas[i + 1];
    if (año >= a1 && año <= a2) return lerp(v1, v2, (año - a1) / (a2 - a1));
  }
  return 0;
}

export default {
  meta: {
    id: 'demografia',
    nombre: 'Demografía',
    orden: 50,
    descripcion: 'Población, transición vital, migraciones y composición social.',
  },

  init(estado) {
    const d = estado.nacion.demografia;
    d._acumEuropeo = 0;
    d._natalidadTendencia = d.natalidad;
    // La población de las provincias tiene que sumar exactamente el total.
    const suma = estado.provincias.reduce((a, p) => a + p.poblacion, 0);
    const factor = d.poblacion / (suma || 1);
    for (const p of estado.provincias) p.poblacion *= factor;
  },

  paso(estado, rng, ctx) {
    const n = estado.nacion;
    const d = n.demografia;
    const inf = n.infraestructura;
    const edu = n.educacion;
    const eco = n.economia;
    const soc = n.social;
    const F = estado.flags;

    const ingreso = clamp01(Math.log10(Math.max(300, eco.pbiPerCapita) / 300) / 1.9);

    // -------------------------------------------------------------------
    // 1. Mortalidad. Cae primero, y por razones bien poco médicas: cloacas,
    //    agua potable y vacunación explican más que los hospitales.
    // -------------------------------------------------------------------
    const envejecimiento = clamp01(1 - d.natalidad / 0.05);
    const mortObjetivo = clamp(
      0.0345
      - 0.020 * inf.agua_saneamiento
      - 0.014 * inf.salud
      - 0.008 * edu.alfabetizacion
      - 0.006 * ingreso
      + 0.005 * envejecimiento
      + 0.004 * soc.pobreza,
      0.0068, 0.055,
    );
    d.mortalidad = hacia(d.mortalidad, mortObjetivo, 0.12);

    d.mortalidadInfantil = clamp01(hacia(d.mortalidadInfantil, clamp01(
      0.85 - 0.35 * inf.agua_saneamiento - 0.25 * inf.salud
      - 0.18 * edu.alfabetizacion - 0.12 * ingreso + 0.15 * soc.pobreza
    ), 0.10));

    d.esperanzaVida = clamp01(hacia(d.esperanzaVida, clamp01(
      0.08 + 0.45 * (1 - d.mortalidadInfantil) + 0.16 * inf.salud
      + 0.15 * inf.agua_saneamiento + 0.10 * edu.alfabetizacion
      - 0.10 * soc.pobreza
    ), 0.10));

    // -------------------------------------------------------------------
    // 2. Natalidad. Cae después, y sobre todo por la ciudad, la escuela
    //    secundaria y la autonomía de las mujeres.
    // -------------------------------------------------------------------
    const natObjetivo = clamp(
      0.0515
      - 0.024 * d.urbanizacion
      - 0.010 * soc.genero
      - 0.008 * edu.secundaria
      - 0.004 * ingreso
      + 0.004 * soc.pobreza,
      0.0115, 0.055,
    );
    // Los hijos se deciden mirando cuántos sobreviven: la natalidad tarda casi
    // una generación en responder a la caída de la mortalidad infantil.
    d._natalidadTendencia = hacia(d._natalidadTendencia ?? d.natalidad, natObjetivo, 0.09);
    d.natalidad = hacia(d.natalidad, d._natalidadTendencia, 0.25);
    d.fecundidad = clamp01(d.natalidad / 0.05);

    // -------------------------------------------------------------------
    // 3. Migración. Lo que el país ofrece frente a lo que expulsa.
    // -------------------------------------------------------------------
    const tierraAccesible = clamp01(n.tierra.chacras * 0.7 + (1 - n.tierra.giniTierra) * 0.5);
    const politica = clamp01(
      ctx.config.inmigracion * 0.6
      + (F.ley_colonizacion ? 0.25 : 0)
      + (F.ley_residencia ? -0.15 : 0)
      + 0.2
    );
    const atractivo = clamp01(
      0.34 * eco.salarioReal
      + 0.20 * tierraAccesible
      + 0.14 * (inf.ferrocarril * 0.5 + inf.puertos * 0.5)
      + 0.18 * politica
      + 0.14 * (1 - soc.conflictividad)
      - 0.20 * soc.represion
    );
    const entradaEuropea = olaEuropea(ctx.año) * atractivo * 0.46;

    // Migración limítrofe y regional: pesa cuando Argentina está relativamente
    // mejor que sus vecinos, y no depende de ninguna ola transatlántica.
    const ventajaRegional = clamp01(ingreso * 0.6 + eco.salarioReal * 0.4 - 0.25);
    const entradaLimitrofe = ctx.año > 1900
      ? ventajaRegional * 0.115 * clamp01(0.4 + ctx.config.inmigracion)
      : 0;

    // Emigración: se van cuando se rompe el horizonte, no sólo cuando hay
    // hambre. Represión, desempleo y caída del salario, combinados.
    const desesperanza = clamp01(
      0.45 * soc.represion
      + 0.30 * clamp01(eco.desempleo * 3)
      + 0.30 * clamp01(1 - eco.salarioReal * 1.6)
      + 0.20 * clamp01(eco.inflacion - 0.3)
      - 0.25 * edu.superior
    );
    const salida = Math.max(0, desesperanza - 0.42) * d.poblacion * 0.020;
    d.emigracion = clamp01(desesperanza);

    d.migracionNeta = sano(entradaEuropea + entradaLimitrofe - salida, 0);

    // -------------------------------------------------------------------
    // 4. Población total
    // -------------------------------------------------------------------
    const guerra = n.ffaa.conflictosActivos?.length ?? 0;
    const bajasGuerra = guerra > 0 ? d.poblacion * 0.0035 * guerra : 0;
    const vegetativo = d.poblacion * (d.natalidad - d.mortalidad);
    d.poblacion = clamp(d.poblacion + vegetativo + d.migracionNeta - bajasGuerra, 0.05, 300);

    d.poblacionActiva = clamp01(hacia(d.poblacionActiva,
      clamp01(0.38 + 0.18 * (1 - d.fecundidad) + 0.12 * soc.genero + 0.08 * d.urbanizacion), 0.08));

    // -------------------------------------------------------------------
    // 5. Composición. Tema delicado: se modela con seriedad demográfica.
    // -------------------------------------------------------------------
    const c = d.composicion;
    const nuevosEuropeos = entradaEuropea / Math.max(0.05, d.poblacion);
    d._acumEuropeo = (d._acumEuropeo ?? 0) + entradaEuropea;

    c.inmigranteEuropeo = clamp01(c.inmigranteEuropeo + nuevosEuropeos * 0.85
      - c.inmigranteEuropeo * 0.010);           // asimilación generacional
    c.inmigranteLimitrofe = clamp01(c.inmigranteLimitrofe
      + entradaLimitrofe / Math.max(0.05, d.poblacion) * 0.9 - c.inmigranteLimitrofe * 0.006);

    // La población indígena cae por muerte, desplazamiento y asimilación
    // forzada cuando la frontera se resuelve por vía militar; se sostiene
    // mucho mejor cuando se resuelve por tratados.
    let caidaIndigena = 0.004;
    if (F.conquista_desierto && ctx.año - (estado.eventosDisparados.conquista_desierto ?? ctx.año) < 12) {
      caidaIndigena = 0.055;
    } else if (F.tratados_originarios) {
      caidaIndigena = 0.0012;
    }
    caidaIndigena *= (1 - soc.derechosOriginarios * 0.6);
    c.indigena = clamp01(c.indigena * (1 - caidaIndigena));

    // La caída de la población afrodescendiente combina guerra, epidemias y
    // mestizaje, y también el borramiento estadístico de los censos.
    c.afro = clamp01(c.afro * (1 - 0.010 - (F.guerra_paraguay ? 0.035 : 0)));

    const resto = clamp01(1 - c.indigena - c.afro - c.inmigranteEuropeo - c.inmigranteLimitrofe);
    c.criollo = resto;
    const total = c.criollo + c.indigena + c.afro + c.inmigranteEuropeo + c.inmigranteLimitrofe;
    if (total > 0) for (const k of Object.keys(c)) c[k] = clamp01(c[k] / total);

    // -------------------------------------------------------------------
    // 6. Reparto territorial y urbanización
    // -------------------------------------------------------------------
    this.repartir(estado, d, tierraAccesible, ctx);

    const urbTotal = estado.provincias.reduce((a, p) => a + p.urbanizacion * p.poblacion, 0);
    d.urbanizacion = clamp01(sano(urbTotal / Math.max(1e-6, d.poblacion), d.urbanizacion));

    // Presión social: crecer rápido en ciudades sin vivienda ni servicios
    // genera un problema que ningún índice macro muestra.
    const hacinamiento = clamp01(d.urbanizacion - inf.vivienda * 0.9 - inf.agua_saneamiento * 0.4);
    estado.presiones.social = clamp01(estado.presiones.social + hacinamiento * 0.22);
  },

  /**
   * Reparte la población entre provincias. La gente se va de donde no puede
   * quedarse y llega a donde hay trabajo; el resultado agregado es la forma
   * del país.
   */
  repartir(estado, d, tierraAccesible, ctx) {
    const provs = estado.provincias;
    const n = estado.nacion;

    const previa = provs.reduce((a, p) => a + p.poblacion, 0) || 1;
    const crecimiento = d.poblacion / previa;

    // Crecimiento vegetativo parejo, migración diferencial encima.
    for (const p of provs) p.poblacion *= crecimiento;

    const atractivos = provs.map((p) => {
      // El puerto y la industria concentran; la tierra accesible retiene.
      const trabajo = p.industria * 0.42 + p.infraestructura * 0.24 + p.desarrollo * 0.18;
      const campo = p.agro * tierraAccesible * 0.30;
      const expulsion = p.pobreza * 0.30 + (1 - tierraAccesible) * p.agro * 0.28
        + p.conflicto * 0.35;
      // Sin frontera abierta no se puede poblar la Patagonia ni el Chaco.
      const accesible = p.integracion * 0.6 + 0.4;
      return Math.max(0.02, (0.25 + trabajo + campo - expulsion) * accesible);
    });

    const sumaAtr = atractivos.reduce((a, b) => a + b, 0) || 1;
    // Cuánta población se reacomoda por año: mucho durante el éxodo rural.
    const movilidad = clamp01(0.004
      + 0.020 * clamp01(n.economia.industrializacion * 1.6)
      + 0.012 * clamp01(1 - tierraAccesible)
      + 0.010 * clamp01(n.infraestructura.rutas));

    const bolsa = provs.reduce((a, p, i) => {
      const sale = p.poblacion * movilidad * clamp01(1 - atractivos[i] / (sumaAtr / provs.length) * 0.5);
      p.poblacion -= sale;
      return a + sale;
    }, 0);

    provs.forEach((p, i) => { p.poblacion += bolsa * (atractivos[i] / sumaAtr); });

    // Normalización: la suma provincial es siempre el total nacional.
    const suma = provs.reduce((a, p) => a + p.poblacion, 0) || 1;
    for (const p of provs) {
      p.poblacion = Math.max(0.0001, p.poblacion * (d.poblacion / suma));

      // Urbanización provincial: la ciudad crece con industria y servicios, y
      // también con gente que el campo ya no puede sostener.
      const expulsionRural = clamp01(n.tierra.giniTierra - 0.45) * 0.8;
      const objetivoUrb = clamp01(
        0.06 + p.industria * 0.55 + p.infraestructura * 0.30
        + expulsionRural * 0.45 + p.desarrollo * 0.20 - p.agro * tierraAccesible * 0.25
      );
      p.urbanizacion = clamp01(hacia(p.urbanizacion, objetivoUrb, 0.045));
    }
  },

  indicadores(estado) {
    const d = estado.nacion.demografia;
    const años = RANGO_VIDA[0] + d.esperanzaVida * (RANGO_VIDA[1] - RANGO_VIDA[0]);
    return [
      { clave: 'poblacion', etiqueta: 'Población', valor: d.poblacion, formato: 'millones',
        ayuda: 'Habitantes del territorio nacional, en millones.' },
      { clave: 'esperanza', etiqueta: 'Esperanza de vida', valor: años, formato: 'numero',
        ayuda: 'Años de vida esperados al nacer.' },
      { clave: 'urbanizacion', etiqueta: 'Urbanización', valor: d.urbanizacion, formato: 'porcentaje',
        ayuda: 'Proporción de la población que vive en ciudades.' },
      { clave: 'migracion', etiqueta: 'Saldo migratorio', valor: d.migracionNeta * 1e6, formato: 'numero',
        ayuda: 'Personas por año. Negativo significa que se va más gente de la que llega.' },
      { clave: 'natalidad', etiqueta: 'Natalidad', valor: d.natalidad * 1000, formato: 'numero',
        ayuda: 'Nacimientos por cada mil habitantes.' },
      { clave: 'mortalidadInfantil', etiqueta: 'Mortalidad infantil', valor: d.mortalidadInfantil,
        formato: 'indice', ayuda: 'Índice relativo. Es el indicador que mejor resume el estado de una sociedad.' },
      { clave: 'europeo', etiqueta: 'Origen inmigrante europeo', valor: d.composicion.inmigranteEuropeo,
        formato: 'porcentaje', ayuda: 'Peso de la inmigración europea en la composición poblacional.' },
      { clave: 'indigena', etiqueta: 'Población indígena', valor: d.composicion.indigena,
        formato: 'porcentaje', ayuda: 'Peso de los pueblos originarios en la población total.' },
    ];
  },
};
