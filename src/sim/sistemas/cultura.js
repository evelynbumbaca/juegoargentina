// Cultura, identidad y memoria.
//
// No es un adorno del simulador. La identidad nacional se fabrica —escuela,
// ritual patriótico, servicio militar, prensa— y lo que se fabrica define qué
// puede hacer después una sociedad con sus conflictos. La memoria histórica,
// en particular, es una variable con efecto material: baja la probabilidad de
// que se repita una ruptura institucional.
//
// Expone `nacion.cultura.cienciaSocial`: capacidad de pensarse con categorías
// propias. Mejora la calidad de las decisiones públicas.

import { clamp01, hacia, promedio } from '../../core/util.js';

export default {
  meta: {
    id: 'cultura',
    nombre: 'Cultura e identidad',
    orden: 110,
    descripcion: 'Identidad, prensa, industrias culturales, memoria y patrimonio.',
  },

  paso(estado, rng, ctx) {
    const n = estado.nacion;
    const c = n.cultura;
    const F = estado.flags;
    const r = estado.regimen;
    const autoritario = r.tipo === 'dictadura';

    const ingreso = clamp01(Math.log10(Math.max(300, n.economia.pbiPerCapita) / 300) / 1.9);

    // -------------------------------------------------------------------
    // 1. Identidad: se construye con instituciones, y se tensiona cuando la
    //    población real deja de parecerse a la que la élite imaginaba.
    // -------------------------------------------------------------------
    const maquinaria = clamp01(
      n.educacion.primaria * 0.42
      + (F.ley_1420 ? 0.15 : 0)
      + n.ffaa.profesionalizacion * 0.12
      + c.produccionCultural * 0.18
      + n.cultura.deporte * 0.08
    );
    // Choque entre el proyecto de "civilización importada" y lo que hay.
    const heterogeneidad = clamp01(
      n.demografia.composicion.inmigranteEuropeo * 1.1
      + n.demografia.composicion.inmigranteLimitrofe * 0.9
    );
    const tensionIdentitaria = clamp01(heterogeneidad - maquinaria * 0.8);

    c.identidad = clamp01(hacia(c.identidad,
      clamp01(0.15 + maquinaria * 0.75 - tensionIdentitaria * 0.25), 0.06));

    // La cohesión simbólica depende de si la diferencia se integra o se niega.
    const pluralismo = clamp01(
      n.social.derechosCiviles * 0.35 + n.social.derechosOriginarios * 0.25
      + c.culturaPopular * 0.25 + (1 - n.social.represion) * 0.15
    );
    c.cohesionSimbolica = clamp01(hacia(c.cohesionSimbolica, clamp01(
      c.identidad * 0.45 + pluralismo * 0.35 + n.social.cohesion * 0.30
      - n.economia.gini * 0.25 - tensionIdentitaria * 0.15
    ), 0.07));

    // -------------------------------------------------------------------
    // 2. Prensa libre: dos canales distintos de restricción.
    //    la censura estatal, y la concentración de la propiedad.
    // -------------------------------------------------------------------
    const censura = clamp01((autoritario ? 0.55 : 0) + n.social.represion * 0.5);
    const concentracionMediatica = clamp01(
      n.economia.concentracion * 0.55 + (F.ley_medios ? -0.30 : 0.12)
      + c.extranjerizacion * 0.20
    );
    c.prensaLibre = clamp01(hacia(c.prensaLibre, clamp01(
      0.20 + r.democracia * 0.55 + n.social.organizacionPopular * 0.20
      + n.educacion.alfabetizacion * 0.15
      - censura * 0.75 - concentracionMediatica * 0.30
    ), 0.14));

    // -------------------------------------------------------------------
    // 3. Producción cultural: crece con ciudad, ingreso, educación y
    //    tecnología, y depende de si hay política pública o mercado abierto.
    // -------------------------------------------------------------------
    const base = clamp01(
      n.demografia.urbanizacion * 0.30 + ingreso * 0.25
      + n.educacion.secundaria * 0.22 + n.infraestructura.digital * 0.13
      + n.educacion.superior * 0.10
    );
    const politicaCultural = clamp01(
      (F.ley_medios ? 0.25 : 0) + (F.cultura_fomento ? 0.25 : 0)
      + n.economia.pesoEstado * 0.30 + (1 - ctx.config.apertura) * 0.20
    );
    c.produccionCultural = clamp01(hacia(c.produccionCultural,
      clamp01(base * (0.55 + 0.65 * politicaCultural)), 0.08));

    c.extranjerizacion = clamp01(hacia(c.extranjerizacion, clamp01(
      0.20 + ctx.config.apertura * 0.35 + n.exterior.dependenciaComercial * 0.25
      - politicaCultural * 0.45 - c.produccionCultural * 0.25
    ), 0.07));

    c.culturaPopular = clamp01(hacia(c.culturaPopular, clamp01(
      0.25 + n.social.organizacionPopular * 0.30 + c.produccionCultural * 0.30
      + n.demografia.urbanizacion * 0.15 - c.extranjerizacion * 0.25
      - n.social.represion * 0.20
    ), 0.06));

    // -------------------------------------------------------------------
    // 4. Deporte: cohesión genuina, y también anestesia disponible para
    //    gobiernos que necesitan legitimidad prestada.
    // -------------------------------------------------------------------
    c.deporte = clamp01(hacia(c.deporte, clamp01(
      0.10 + n.demografia.urbanizacion * 0.35 + ingreso * 0.25
      + c.produccionCultural * 0.20 + n.infraestructura.digital * 0.10
    ), 0.06));
    // Un éxito deportivo tapa la deslegitimación sin resolver nada de fondo.
    if (rng.chance(0.05 * c.deporte * 3)) {
      r.legitimidad = clamp01(r.legitimidad + 0.05);
      ctx.log('Una gesta deportiva copa la conversación nacional.', ['deporte']);
    }

    // -------------------------------------------------------------------
    // 5. Memoria histórica: la variable con efecto institucional.
    // -------------------------------------------------------------------
    const objetivoMemoria = clamp01(
      0.10
      + (F.juicio_juntas ? 0.30 : 0)
      + (F.memoria_verdad_justicia ? 0.25 : 0)
      + (F.derechos_humanos ? 0.15 : 0)
      + c.cienciaSocial * 0.20
      + n.educacion.secundaria * 0.15
      + c.prensaLibre * 0.15
      - (autoritario ? 0.35 : 0)
      - n.social.represion * 0.20
    );
    c.memoriaHistorica = clamp01(hacia(c.memoriaHistorica, objetivoMemoria, 0.06));

    // Efecto material: una sociedad que sabe lo que le pasó es más difícil de
    // convencer de que la salida es romper el orden constitucional.
    estado.presiones.golpe = clamp01(estado.presiones.golpe - c.memoriaHistorica * 0.14);
    n.ffaa.golpismo = clamp01(n.ffaa.golpismo - c.memoriaHistorica * 0.010);

    // -------------------------------------------------------------------
    // 6. Pensamiento propio y patrimonio
    // -------------------------------------------------------------------
    c.cienciaSocial = clamp01(hacia(c.cienciaSocial, clamp01(
      n.educacion.superior * 0.40 + n.educacion.universidadPublica * 0.30
      + c.prensaLibre * 0.20 + c.identidad * 0.10
      - n.educacion.fugaCerebros * 0.45 - (autoritario ? 0.25 : 0)
    ), autoritario ? 0.25 : 0.07));   // se destruye rápido, se reconstruye lento

    c.patrimonio = clamp01(hacia(c.patrimonio, clamp01(
      0.25 + c.memoriaHistorica * 0.25 + estado.regimen.capacidadEstatal * 0.25
      + c.produccionCultural * 0.15 + n.recursos.sostenibilidad * 0.10
      - n.economia.concentracion * 0.15
    ), 0.05));

    // Deriva de actores
    const mover = (id, obj, t = 0.015) => {
      estado.actores[id] = clamp01(estado.actores[id]
        + Math.max(-t, Math.min(t, obj - estado.actores[id])));
    };
    mover('iglesia', clamp01(0.55 - n.educacion.secundaria * 0.35
      - n.social.derechosCiviles * 0.25 + (F.ley_1420 ? -0.10 : 0.05)));
    mover('clasesMedias', clamp01(n.educacion.secundaria * 0.5 + c.produccionCultural * 0.3
      + n.demografia.urbanizacion * 0.25));
  },

  indicadores(estado) {
    const c = estado.nacion.cultura;
    return [
      { clave: 'identidad', etiqueta: 'Identidad nacional', valor: c.identidad, formato: 'porcentaje',
        ayuda: 'Fuerza del relato común que la sociedad tiene sobre sí misma.' },
      { clave: 'cohesion', etiqueta: 'Cohesión simbólica', valor: c.cohesionSimbolica, formato: 'porcentaje',
        ayuda: 'Cuánto se reconocen entre sí los distintos pedazos del país.' },
      { clave: 'prensa', etiqueta: 'Prensa libre', valor: c.prensaLibre, formato: 'porcentaje',
        ayuda: 'Limitada por la censura estatal y también por la concentración de medios.' },
      { clave: 'produccion', etiqueta: 'Industrias culturales', valor: c.produccionCultural,
        formato: 'porcentaje', ayuda: 'Cine, música, editoriales, televisión de producción nacional.' },
      { clave: 'extranjerizacion', etiqueta: 'Consumo cultural importado', valor: c.extranjerizacion,
        formato: 'porcentaje', ayuda: 'Peso de la producción cultural extranjera en el consumo.' },
      { clave: 'memoria', etiqueta: 'Memoria histórica', valor: c.memoriaHistorica, formato: 'porcentaje',
        ayuda: 'Reduce de verdad la probabilidad de repetir rupturas institucionales.' },
      { clave: 'pensamiento', etiqueta: 'Pensamiento propio', valor: c.cienciaSocial, formato: 'porcentaje',
        ayuda: 'Capacidad de analizar el país con categorías propias y no importadas.' },
      { clave: 'patrimonio', etiqueta: 'Patrimonio', valor: c.patrimonio, formato: 'porcentaje',
        ayuda: 'Lo que se conserva frente a lo que se destruye o se vende.' },
    ];
  },
};
