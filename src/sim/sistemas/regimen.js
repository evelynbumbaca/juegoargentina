// Régimen político y dinámica territorial.
//
// Es el sistema que cierra el año: toma lo que hicieron los demás y calcula
// capacidad estatal, legitimidad, estabilidad y el estado de cada provincia.
// No decide golpes ni elecciones —eso lo hacen los eventos—, pero produce las
// condiciones que los vuelven probables o imposibles.
//
// El decaimiento de las presiones lo hace el motor antes de correr los
// sistemas (ver DECAIMIENTO_PRESION en core/motor.js).

import { clamp01, hacia, promedio, suave, sano } from '../../core/util.js';

/** Cuánta democracia formal implica cada tipo de régimen. */
const DEMOCRACIA_POR_TIPO = {
  revolucionario: 0.2, caudillista: 0.15, anarquia: 0.05, oligarquico: 0.3,
  democracia: 0.85, democracia_restringida: 0.5, dictadura: 0.02,
  populismo: 0.7, tecnocratico: 0.4,
};

export default {
  meta: {
    id: 'regimen',
    nombre: 'Régimen y territorio',
    orden: 120,
    descripcion: 'Capacidad estatal, legitimidad, estabilidad institucional y desarrollo provincial.',
  },

  paso(estado, rng, ctx) {
    const r = estado.regimen;
    const n = estado.nacion;
    const eco = n.economia;

    // ------------------------------------------------------------------
    // Capacidad estatal: se construye durante décadas y se destruye rápido.
    // ------------------------------------------------------------------
    const objetivoCapacidad = clamp01(promedio([
      [eco.capacidadFiscal, 0.30],
      [n.educacion.alfabetizacion, 0.15],
      [n.infraestructura.integracionTerritorial, 0.15],
      [n.educacion.superior * 2, 0.10],          // burocracia formada
      [1 - r.corrupcion, 0.15],
      [promedio(estado.provincias.map((p) => [p.integracion, 1])), 0.15],
    ]));
    // Una guerra civil o una crisis institucional desarma el aparato estatal.
    const desarme = (estado.flags.guerra_civil ? 0.12 : 0)
      + (r.tipo === 'anarquia' ? 0.10 : 0)
      + estado.presiones.regional * 0.03;
    r.capacidadEstatal = clamp01(hacia(r.capacidadEstatal, objetivoCapacidad, 0.06) - desarme);

    // ------------------------------------------------------------------
    // Legitimidad: no es popularidad, es la creencia de que las reglas valen.
    // Lo que más la erosiona es la distancia entre lo prometido y lo vivido.
    // ------------------------------------------------------------------
    const bienestarPercibido = clamp01(
      (1 - n.social.pobreza) * 0.4 + eco.salarioReal * 0.35 + (1 - eco.desempleo * 2.5) * 0.25
    );
    const memoriaBienestar = r._bienestarPrevio ?? bienestarPercibido;
    const frustracion = clamp01((memoriaBienestar - bienestarPercibido) * 3);
    r._bienestarPrevio = memoriaBienestar * 0.85 + bienestarPercibido * 0.15;

    const castigoInflacion = suave(n.economia.inflacion, 0.15, 1.2) * 0.35;
    const castigoRepresion = n.social.represion * 0.15;
    const premioDerechos = (n.social.derechosCiviles * 0.5 + n.social.derechosPoliticos * 0.5) * 0.2;

    const objetivoLegitimidad = clamp01(
      0.25 + bienestarPercibido * 0.45 + premioDerechos
      - frustracion * 0.4 - castigoInflacion - castigoRepresion
      - r.corrupcion * 0.15
      + (eco.crecimiento > 0 ? Math.min(0.12, eco.crecimiento * 2.5) : Math.max(-0.2, eco.crecimiento * 2.5))
    );
    r.legitimidad = clamp01(hacia(r.legitimidad, objetivoLegitimidad, 0.22));

    // El desgaste del ejercicio del poder es real y acumulativo.
    if (r.añosEnPoder > 6) r.legitimidad = clamp01(r.legitimidad - 0.006 * (r.añosEnPoder - 6));

    // ------------------------------------------------------------------
    // Democracia: converge al tipo de régimen, pero la consolidación
    // (décadas de continuidad + memoria histórica) le agrega profundidad.
    // ------------------------------------------------------------------
    const base = DEMOCRACIA_POR_TIPO[r.tipo] ?? 0.4;
    const añosContinuidad = estado.flags._añosSinRuptura ?? 0;
    const consolidacion = suave(añosContinuidad, 0, 45) * 0.15 + n.cultura.memoriaHistorica * 0.08;
    const objetivoDem = clamp01(base + consolidacion
      + n.social.derechosPoliticos * 0.1 - n.ffaa.tutelaje * 0.18);
    r.democracia = clamp01(hacia(r.democracia, objetivoDem, 0.18));

    const esDemocracia = r.tipo === 'democracia' || r.tipo === 'populismo'
      || r.tipo === 'democracia_restringida';
    estado.flags._añosSinRuptura = esDemocracia ? añosContinuidad + 1 : 0;
    if (esDemocracia && añosContinuidad + 1 >= 30) estado.flags.democracia_consolidada = true;

    r.participacion = clamp01(hacia(r.participacion,
      r.democracia * (0.5 + n.social.derechosPoliticos * 0.5), 0.15));

    // ------------------------------------------------------------------
    // Corrupción: crece con renta extraordinaria concentrada y opacidad;
    // baja con controles, prensa libre y capacidad estatal.
    // ------------------------------------------------------------------
    const objetivoCorrupcion = clamp01(
      0.18 + n.recursos.rentaExtractiva * 0.2 + eco.concentracion * 0.2
      + eco.informalidad * 0.15
      - n.cultura.prensaLibre * 0.22 - r.capacidadEstatal * 0.2 - r.democracia * 0.1
    );
    r.corrupcion = clamp01(hacia(r.corrupcion, objetivoCorrupcion, 0.07));

    // ------------------------------------------------------------------
    // Estabilidad institucional
    // ------------------------------------------------------------------
    const amenazas = clamp01(
      estado.presiones.golpe * 0.35 + estado.presiones.social * 0.25
      + estado.presiones.regional * 0.2 + estado.presiones.deuda * 0.2
    );
    r.estabilidad = clamp01(hacia(r.estabilidad,
      clamp01(r.legitimidad * 0.55 + r.capacidadEstatal * 0.25 + 0.2 - amenazas * 0.8), 0.2));

    // ------------------------------------------------------------------
    // Provincias: desarrollo, integración al Estado nacional y autonomismo
    // ------------------------------------------------------------------
    const pobTotal = Math.max(1e-6, estado.provincias.reduce((a, p) => a + p.poblacion, 0));
    let sumaDesarrollo = 0;

    for (const p of estado.provincias) {
      const peso = p.poblacion / pobTotal;

      const objetivoDes = clamp01(
        p.industria * 0.28 + p.agro * 0.22 + p.infraestructura * 0.25
        + p.educacion * 0.2 + p.urbanizacion * 0.05
      );
      p.desarrollo = clamp01(hacia(p.desarrollo, objetivoDes, 0.08));
      sumaDesarrollo += p.desarrollo * peso;

      // La integración al Estado nacional necesita presencia material:
      // caminos, escuelas, administración. No se decreta desde la capital.
      const objetivoInt = clamp01(
        p.infraestructura * 0.35 + p.educacion * 0.2 + r.capacidadEstatal * 0.35
        + p.urbanizacion * 0.1 - p.controlOriginario * 0.5
      );
      p.integracion = clamp01(hacia(p.integracion, objetivoInt, 0.05));

      // El autonomismo provincial crece con el abandono relativo: cuando el
      // desarrollo nacional pasa de largo, la provincia mira para adentro.
      const rezago = clamp01((sumaDesarrollo + 0.001) / (p.desarrollo + 0.001) - 1);
      const objetivoAut = clamp01(
        0.15 + rezago * 0.35 + n.infraestructura.centralismoPortuario * 0.25
        + p.descontento * 0.2 - p.integracion * 0.25
        + (1 - ctx.config.federalismo) * 0.15
      );
      p.autonomismo = clamp01(hacia(p.autonomismo, objetivoAut, 0.06));
    }

    // Presión regional: promedio ponderado del autonomismo y la desigualdad
    // territorial. Es lo que alimenta secesiones, revueltas y pactos federales.
    const autonomismoMedio = promedio(estado.provincias.map((p) => [p.autonomismo, p.poblacion]));
    const desarrollos = estado.provincias.map((p) => p.desarrollo);
    const brecha = Math.max(...desarrollos) - Math.min(...desarrollos);
    estado.presiones.regional = clamp01(
      estado.presiones.regional + autonomismoMedio * 0.35 + brecha * 0.25 - r.capacidadEstatal * 0.15
    );

    // ------------------------------------------------------------------
    // Deriva lenta de actores según la estructura económica real
    // ------------------------------------------------------------------
    const a = estado.actores;
    const deriva = (clave, objetivo, tasa = 0.02) => {
      a[clave] = clamp01(a[clave] + Math.max(-tasa, Math.min(tasa, objetivo - a[clave])));
    };
    deriva('burguesiaIndustrial', clamp01(eco.industrializacion * 1.5));
    deriva('oligarquia', clamp01(n.tierra.giniTierra * 0.75 + n.recursos.rentaExtractiva * 0.2));
    deriva('capitalExtranjero', clamp01(n.exterior.ied * 1.2 + n.tierra.extranjerizacion * 0.5
      + n.recursos.controlExtranjeroRecursos * 0.4));
    deriva('organismosInternacionales', clamp01(n.deuda.condicionalidad));
    deriva('caudillosProvinciales', clamp01(autonomismoMedio * 0.8 - r.capacidadEstatal * 0.4));
    deriva('clasesMedias', clamp01(n.educacion.secundaria * 0.6 + n.demografia.urbanizacion * 0.35));

    // ------------------------------------------------------------------
    // Piso de presión fiscal: un Estado que no recauda vive en emergencia.
    // ------------------------------------------------------------------
    estado.presiones.fiscal = clamp01(estado.presiones.fiscal
      + Math.max(0, eco.deficitFiscal * 2.5) - eco.capacidadFiscal * 0.2);

    for (const k of Object.keys(estado.presiones)) {
      estado.presiones[k] = clamp01(sano(estado.presiones[k], 0));
    }
  },

  indicadores(estado) {
    const r = estado.regimen;
    const nombres = {
      revolucionario: 'Gobierno revolucionario', caudillista: 'Poder caudillista',
      anarquia: 'Sin poder central', oligarquico: 'República oligárquica',
      democracia: 'Democracia', democracia_restringida: 'Democracia restringida',
      dictadura: 'Dictadura', populismo: 'Democracia de masas',
      tecnocratico: 'Gobierno tecnocrático',
    };
    return [
      { clave: 'tipo', etiqueta: 'Régimen', valor: nombres[r.tipo] ?? r.tipo, formato: 'texto',
        ayuda: 'Forma de gobierno vigente.' },
      { clave: 'legitimidad', etiqueta: 'Legitimidad', valor: r.legitimidad, formato: 'porcentaje',
        ayuda: 'Cuánto sostiene la sociedad las reglas del juego político.' },
      { clave: 'capacidadEstatal', etiqueta: 'Capacidad estatal', valor: r.capacidadEstatal, formato: 'porcentaje',
        ayuda: 'Qué puede efectivamente hacer el Estado: recaudar, administrar, estar presente.' },
      { clave: 'estabilidad', etiqueta: 'Estabilidad', valor: r.estabilidad, formato: 'porcentaje',
        ayuda: 'Probabilidad de que el orden institucional aguante.' },
      { clave: 'corrupcion', etiqueta: 'Corrupción', valor: r.corrupcion, formato: 'porcentaje',
        ayuda: 'Apropiación privada de recursos públicos.' },
      { clave: 'continuidad', etiqueta: 'Años sin ruptura', valor: estado.flags._añosSinRuptura ?? 0,
        formato: 'numero', ayuda: 'Años consecutivos de continuidad institucional.' },
    ];
  },
};
