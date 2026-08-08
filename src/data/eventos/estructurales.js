// Eventos estructurales: los que no tienen fecha en el manual de historia pero
// pasan una y otra vez. Son recurrentes (`unaVez: false` + `enfriamiento`) y se
// disparan por el estado del país, no por el calendario. Sin ellos la partida
// sería una lista de efemérides; con ellos, dos partidas con la misma
// configuración cuentan historias distintas.

const alto = (v, u = 0.6) => v >= u;

export default [
  // =========================================================================
  // Ciclo político
  // =========================================================================
  {
    id: 'eleccion_nacional',
    titulo: 'Elecciones nacionales',
    categoria: 'politica',
    etiquetas: ['eleccion'],
    ventana: [1854, 2100],
    unaVez: false,
    enfriamiento: 5,
    canonico: false,
    probabilidad: 0.75,
    peso: (s) => 1 + s.regimen.democracia * 2,
    requiere: (s) => s.regimen.democracia > 0.28 && s.regimen.tipo !== 'dictadura',
    narrativa: (s) => s.regimen.legitimidad < 0.4
      ? 'El oficialismo llega desgastado. La campaña se da en un clima de bronca.'
      : 'Se abre el calendario electoral y las fuerzas se reordenan.',
    opciones: [
      {
        id: 'continuidad',
        texto: 'Gana la continuidad del rumbo',
        resumen: 'El oficialismo revalida y profundiza lo que venía haciendo.',
        actores: { clasesMedias: 0.3 },
        peso: (s) => 0.4 + s.regimen.legitimidad * 2.2,
        aplicar: (s, rng, api) => {
          api.regimen({ añosEnPoder: 0 });
          api.delta('regimen.legitimidad', 0.08);
          api.delta('nacion.social.derechosPoliticos', 0.02);
        },
        consecuencia: 'El proyecto en curso gana tiempo para madurar, y también para agotarse.',
      },
      {
        id: 'alternancia',
        texto: 'Gana la oposición y cambia el signo político',
        resumen: 'Vuelco electoral: cambia el modelo económico y la coalición de gobierno.',
        actores: { clasesMedias: 0.5, sindicatos: -0.1 },
        peso: (s) => 0.5 + (1 - s.regimen.legitimidad) * 2.5,
        aplicar: (s, rng, api) => {
          api.regimen({ añosEnPoder: 0, legitimidad: 0.55 });
          // El giro de timón: la política económica rota hacia el otro lado.
          const giro = s.nacion.economia.pesoEstado > 0.45 ? -1 : 1;
          api.delta('nacion.economia.pesoEstado', 0.07 * giro);
          api.delta('nacion.exterior.autonomia', 0.04 * giro);
          api.actor(giro > 0 ? 'sindicatos' : 'oligarquia', 0.05);
          api.delta('nacion.social.derechosPoliticos', 0.03);
          s.regimen.signoPolitico = giro > 0 ? 'popular' : 'liberal';
        },
        consecuencia: 'Cada alternancia deshace parte de lo anterior: el país avanza en zigzag.',
      },
      {
        id: 'coalicion_reformista',
        texto: 'Se impone una coalición reformista amplia',
        resumen: 'Un acuerdo entre fuerzas distintas sostiene reformas de fondo.',
        requiere: (s) => s.regimen.capacidadEstatal > 0.4 && s.nacion.cultura.prensaLibre > 0.45,
        actores: { clasesMedias: 0.6, sindicatos: 0.4, burguesiaIndustrial: 0.4, oligarquia: -0.2 },
        peso: (s) => 0.25 + s.nacion.social.organizacionPopular * 1.2 + s.nacion.educacion.superior * 2,
        aplicar: (s, rng, api) => {
          api.regimen({ añosEnPoder: 0, legitimidad: 0.68 });
          api.delta('regimen.capacidadEstatal', 0.05);
          api.modificador({
            id: 'reformismo', etiqueta: 'Programa reformista', años: 8,
            efectos: {
              'nacion.educacion.gastoPbi': 0.002,
              'nacion.social.derechosCiviles': 0.008,
              'nacion.economia.capacidadFiscal': 0.006,
            },
          });
        },
        consecuencia: 'Los acuerdos amplios avanzan despacio, pero lo que dejan sobrevive a los gobiernos.',
      },
    ],
  },

  {
    id: 'ruptura_institucional',
    titulo: 'Se conspira contra el orden constitucional',
    categoria: 'politica',
    etiquetas: ['golpe', 'crisis'],
    ventana: [1853, 2100],
    unaVez: false,
    enfriamiento: 6,
    canonico: false,
    probabilidad: 0.85,
    peso: (s) => s.presiones.golpe * 4 + s.nacion.ffaa.golpismo * 2,
    requiere: (s) => s.presiones.golpe > 0.55 && s.regimen.tipo !== 'dictadura'
      && s.nacion.ffaa.poderPolitico > 0.3,
    narrativa: () => 'Los cuarteles se mueven. En los diarios ya se pide "una solución de fondo".',
    opciones: [
      {
        id: 'golpe_consumado',
        texto: 'El golpe se consuma',
        resumen: 'Las Fuerzas Armadas toman el poder con respaldo civil.',
        actores: { ffaa: 1, oligarquia: 0.6, capitalExtranjero: 0.4, iglesia: 0.3, sindicatos: -1, movimientosPopulares: -1 },
        peso: (s) => 1 + s.nacion.ffaa.golpismo * 2.5 - s.nacion.cultura.memoriaHistorica * 1.5,
        aplicar: (s, rng, api) => {
          api.regimen({ tipo: 'dictadura', legitimidad: 0.35, añosEnPoder: 0, signoPolitico: 'militar' });
          api.flag('golpe_militar');
          api.efectos({
            'nacion.ffaa.poderPolitico': 0.25,
            'nacion.ffaa.tutelaje': 0.2,
            'nacion.social.represion': 0.25,
            'nacion.social.derechosPoliticos': -0.3,
            'nacion.social.derechosCiviles': -0.2,
            'nacion.cultura.prensaLibre': -0.3,
          });
          api.actor('ffaa', 0.2);
          api.actor('sindicatos', -0.15);
        },
        consecuencia: 'Cada interrupción deja al país con menos anticuerpos para la siguiente.',
      },
      {
        id: 'golpe_fracasado',
        texto: 'El levantamiento fracasa',
        resumen: 'La movilización popular y la lealtad de parte de las fuerzas lo impiden.',
        requiere: (s) => s.nacion.social.organizacionPopular > 0.3 || s.regimen.legitimidad > 0.5,
        actores: { sindicatos: 0.8, movimientosPopulares: 0.9, clasesMedias: 0.4, ffaa: -0.6 },
        peso: (s) => 0.4 + s.nacion.social.organizacionPopular * 2 + s.regimen.legitimidad * 1.5
          + s.nacion.cultura.memoriaHistorica * 1.5,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.ffaa.poderPolitico': -0.15,
            'nacion.ffaa.golpismo': -0.2,
            'nacion.ffaa.tutelaje': -0.12,
            'regimen.legitimidad': 0.12,
            'nacion.social.organizacionPopular': 0.08,
          });
          api.actor('ffaa', -0.1);
          api.actor('movimientosPopulares', 0.08);
        },
        consecuencia: 'Un golpe derrotado en la calle vale más que diez discursos sobre la democracia.',
      },
      {
        id: 'salida_negociada',
        texto: 'Se negocia una salida institucional',
        resumen: 'Adelanto de elecciones y concesiones para desactivar la conspiración.',
        actores: { clasesMedias: 0.5, ffaa: 0.2, oligarquia: 0.3 },
        peso: (s) => 0.5 + s.regimen.capacidadEstatal * 1.5,
        aplicar: (s, rng, api) => {
          api.regimen({ añosEnPoder: 0, legitimidad: 0.45 });
          api.efectos({
            'nacion.ffaa.tutelaje': 0.08,
            'nacion.social.derechosPoliticos': -0.04,
          });
        },
        consecuencia: 'El orden constitucional sobrevive, pero con los militares mirando por encima del hombro.',
      },
    ],
  },

  {
    id: 'apertura_democratica',
    titulo: 'La dictadura se agota',
    categoria: 'politica',
    etiquetas: ['democracia', 'transicion'],
    ventana: [1856, 2100],
    unaVez: false,
    enfriamiento: 8,
    canonico: false,
    probabilidad: 0.7,
    peso: (s) => 1 + s.presiones.social * 3 + (1 - s.regimen.legitimidad) * 2,
    requiere: (s) => s.regimen.tipo === 'dictadura'
      && (s.presiones.social > 0.45 || s.regimen.legitimidad < 0.3 || s.regimen.añosEnPoder > 7),
    narrativa: () => 'El régimen perdió la calle, la economía y el relato. Se discute cómo salir.',
    opciones: [
      {
        id: 'transicion_con_juicio',
        texto: 'Transición con juzgamiento de los responsables',
        resumen: 'Vuelve la democracia y la justicia investiga los crímenes del régimen.',
        requiere: (s) => s.nacion.social.organizacionPopular > 0.25,
        actores: { movimientosPopulares: 1, clasesMedias: 0.7, sindicatos: 0.6, ffaa: -1 },
        peso: (s) => 0.5 + s.nacion.social.organizacionPopular * 2.5 + s.nacion.cultura.memoriaHistorica * 2,
        aplicar: (s, rng, api) => {
          api.regimen({ tipo: 'democracia', legitimidad: 0.7, añosEnPoder: 0, signoPolitico: 'democratico' });
          api.flag('golpe_militar', false);
          api.flag('juicio_juntas');
          api.flag('derechos_humanos');
          api.efectos({
            'nacion.social.derechosPoliticos': 0.35,
            'nacion.social.derechosCiviles': 0.3,
            'nacion.cultura.prensaLibre': 0.3,
            'nacion.cultura.memoriaHistorica': 0.3,
            'nacion.social.represion': -0.4,
            'nacion.ffaa.poderPolitico': -0.25,
            'nacion.ffaa.tutelaje': -0.2,
          });
          api.modificador({
            id: 'memoria_activa', etiqueta: 'Política de memoria', años: 25,
            efectos: { 'nacion.cultura.memoriaHistorica': 0.008, 'nacion.ffaa.golpismo': -0.006 },
          });
        },
        consecuencia: 'Juzgar lo ocurrido es la única vacuna conocida contra su repetición.',
      },
      {
        id: 'transicion_pactada',
        texto: 'Transición pactada con impunidad',
        resumen: 'Vuelven las elecciones a cambio de no tocar a los responsables.',
        actores: { ffaa: 0.8, oligarquia: 0.4, clasesMedias: 0.3, movimientosPopulares: -0.6 },
        peso: (s) => 0.8 + s.nacion.ffaa.poderPolitico * 2,
        aplicar: (s, rng, api) => {
          api.regimen({ tipo: 'democracia_restringida', legitimidad: 0.55, añosEnPoder: 0 });
          api.flag('golpe_militar', false);
          api.efectos({
            'nacion.social.derechosPoliticos': 0.2,
            'nacion.cultura.prensaLibre': 0.15,
            'nacion.ffaa.tutelaje': 0.1,
            'nacion.cultura.memoriaHistorica': -0.1,
          });
        },
        consecuencia: 'La democracia vuelve con una hipoteca: lo que no se juzga queda latente.',
      },
      {
        id: 'endurecimiento',
        texto: 'El régimen se endurece',
        resumen: 'Más represión para sostenerse un tiempo más.',
        actores: { ffaa: 1, movimientosPopulares: -1 },
        peso: (s) => 0.4 + s.nacion.social.represion * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.social.represion': 0.2,
            'nacion.social.organizacionPopular': -0.12,
            'nacion.cultura.prensaLibre': -0.15,
            'regimen.legitimidad': -0.12,
          });
          api.modificador({
            id: 'endurecimiento', etiqueta: 'Endurecimiento represivo', años: 4,
            efectos: { 'nacion.economia.crecimiento': -0.004, 'nacion.educacion.fugaCerebros': 0.02 },
          });
        },
        consecuencia: 'Ganar tiempo con represión sale caro cuando el tiempo se termina igual.',
      },
    ],
  },

  // =========================================================================
  // Conflicto social
  // =========================================================================
  {
    id: 'estallido_social',
    titulo: 'Estallido social',
    categoria: 'social',
    etiquetas: ['conflicto', 'crisis'],
    ventana: [1850, 2100],
    unaVez: false,
    enfriamiento: 7,
    canonico: false,
    probabilidad: 0.8,
    peso: (s) => s.presiones.social * 5,
    requiere: (s) => s.presiones.social > 0.6,
    narrativa: (s) => s.nacion.social.pobreza > 0.4
      ? 'Saqueos, cortes y asambleas. La olla se destapó.'
      : 'La calle se llena: lo que se perdió se reclama con el cuerpo.',
    opciones: [
      {
        id: 'represion',
        texto: 'Reprimir la protesta',
        resumen: 'Restablecer el orden por la fuerza.',
        actores: { ffaa: 0.8, oligarquia: 0.7, capitalExtranjero: 0.4, sindicatos: -1, movimientosPopulares: -1 },
        peso: (s) => 0.6 + s.nacion.social.represion * 2 + s.actores.oligarquia * 1.2,
        aplicar: (s, rng, api) => {
          const muertos = 0.02 + rng.next() * 0.05;
          api.efectos({
            'nacion.social.represion': 0.15,
            'nacion.social.conflictividad': -0.15,
            'nacion.social.cohesion': -0.12,
            'nacion.social.derechosCiviles': -0.08,
            'regimen.legitimidad': -0.15,
          });
          api.delta('nacion.demografia.poblacion', -muertos * 0.01);
          s.presiones.golpe = Math.min(1, s.presiones.golpe + 0.12);
        },
        consecuencia: 'El conflicto baja de la calle, pero no desaparece: se guarda.',
      },
      {
        id: 'concesiones',
        texto: 'Conceder y negociar',
        resumen: 'Aumentos, planes sociales y apertura de la negociación colectiva.',
        actores: { sindicatos: 1, movimientosPopulares: 0.9, clasesMedias: 0.3, oligarquia: -0.6 },
        peso: (s) => 0.5 + s.actores.sindicatos * 2 + s.regimen.democracia * 1.5,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.salarioReal': 0.06,
            'nacion.social.derechosLaborales': 0.06,
            'nacion.social.conflictividad': -0.2,
            'nacion.economia.deficitFiscal': 0.012,
            'regimen.legitimidad': 0.08,
          });
          api.actor('sindicatos', 0.05);
        },
        consecuencia: 'Comprar paz social con recursos que no sobran tensiona las cuentas.',
      },
      {
        id: 'reforma_estructural',
        texto: 'Responder con una reforma de fondo',
        resumen: 'Atacar la causa: distribución, empleo y acceso a la tierra o a la vivienda.',
        requiere: (s) => s.regimen.capacidadEstatal > 0.35 && s.actores.movimientosPopulares > 0.3,
        actores: { movimientosPopulares: 1, sindicatos: 0.8, oligarquia: -1, capitalExtranjero: -0.6 },
        peso: (s) => 0.2 + s.nacion.social.organizacionPopular * 2.5 + s.regimen.legitimidad,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.gini': -0.05,
            'nacion.social.derechosLaborales': 0.08,
            'nacion.tierra.giniTierra': -0.03,
            'nacion.social.conflictividad': -0.25,
            'nacion.infraestructura.vivienda': 0.05,
          });
          api.actor('oligarquia', -0.06);
          api.modificador({
            id: 'reforma_social', etiqueta: 'Reforma social en marcha', años: 12,
            efectos: { 'nacion.social.pobreza': -0.006, 'nacion.economia.gini': -0.003 },
          });
          s.presiones.golpe = Math.min(1, s.presiones.golpe + 0.18);
        },
        consecuencia: 'Tocar la estructura resuelve el conflicto de raíz y despierta a los que pierden.',
      },
    ],
  },

  {
    id: 'huelga_general',
    titulo: 'Huelga general',
    categoria: 'social',
    etiquetas: ['sindicato', 'conflicto'],
    ventana: [1890, 2100],
    unaVez: false,
    enfriamiento: 4,
    canonico: false,
    probabilidad: 0.6,
    peso: (s) => s.nacion.social.conflictividad * 3 * (0.3 + s.nacion.social.sindicalizacion),
    requiere: (s) => s.nacion.social.sindicalizacion > 0.15 && s.nacion.social.conflictividad > 0.45,
    narrativa: () => 'El país se para. Puertos, fábricas y transporte, quietos.',
    opciones: [
      {
        id: 'acuerdo_paritario',
        texto: 'Cerrar un acuerdo salarial',
        resumen: 'Se recompone el salario y se levanta la medida.',
        actores: { sindicatos: 1, burguesiaIndustrial: 0.2, oligarquia: -0.4 },
        peso: (s) => 0.6 + s.actores.sindicatos * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.salarioReal': 0.05,
            'nacion.economia.inflacion': 0.012,
            'nacion.social.conflictividad': -0.18,
          });
          api.flag('paritarias');
        },
        consecuencia: 'La puja distributiva se resuelve en la mesa y reaparece en los precios.',
      },
      {
        id: 'quiebre_huelga',
        texto: 'Quebrar la huelga',
        resumen: 'Descuento de días, despidos y reemplazo de trabajadores.',
        actores: { oligarquia: 0.8, capitalExtranjero: 0.6, sindicatos: -1 },
        peso: (s) => 0.4 + s.actores.oligarquia * 1.5 + s.nacion.social.represion * 1.5,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.social.sindicalizacion': -0.06,
            'nacion.economia.salarioReal': -0.03,
            'nacion.social.conflictividad': 0.08,
            'nacion.social.cohesion': -0.06,
          });
          api.actor('sindicatos', -0.05);
        },
        consecuencia: 'Se gana el conflicto y se pierde la paz.',
      },
    ],
  },

  // =========================================================================
  // Economía y deuda
  // =========================================================================
  {
    id: 'crisis_balanza_pagos',
    titulo: 'Crisis de balanza de pagos',
    categoria: 'economia',
    etiquetas: ['crisis', 'divisas'],
    ventana: [1830, 2100],
    unaVez: false,
    enfriamiento: 6,
    canonico: false,
    probabilidad: 0.85,
    peso: (s) => (1 - s.nacion.economia.reservas) * 3 + s.presiones.externa * 2,
    requiere: (s) => s.nacion.economia.reservas < 0.18 && s.nacion.economia.balanzaComercial < 0,
    narrativa: () => 'Se acabaron los dólares. El Banco Central vende lo que no tiene.',
    opciones: [
      {
        id: 'devaluar',
        texto: 'Devaluar',
        resumen: 'Se recompone el saldo externo licuando salarios.',
        actores: { oligarquia: 0.9, capitalExtranjero: 0.4, sindicatos: -0.9 },
        peso: (s) => 1 + s.actores.oligarquia * 1.5 + s.nacion.deuda.condicionalidad * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.tipoCambioReal': 0.15,
            'nacion.economia.salarioReal': -0.09,
            'nacion.economia.inflacion': 0.08,
            'nacion.economia.balanzaComercial': 0.12,
            'nacion.economia.crecimiento': -0.025,
            'nacion.social.pobreza': 0.05,
          });
          s.presiones.social = Math.min(1, s.presiones.social + 0.15);
        },
        consecuencia: 'El ajuste lo paga el salario. Las cuentas cierran; la sociedad, no.',
      },
      {
        id: 'controles',
        texto: 'Controlar el comercio exterior y los cambios',
        resumen: 'Racionamiento de divisas y administración de importaciones.',
        requiere: (s) => s.regimen.capacidadEstatal > 0.35,
        actores: { sindicatos: 0.6, burguesiaIndustrial: 0.5, capitalExtranjero: -0.8, oligarquia: -0.7 },
        peso: (s) => 0.5 + s.regimen.capacidadEstatal * 2 - s.nacion.deuda.condicionalidad * 2,
        aplicar: (s, rng, api) => {
          api.flag('control_cambios');
          api.efectos({
            'nacion.economia.balanzaComercial': 0.08,
            'nacion.deuda.fugaCapitales': -0.1,
            'nacion.economia.crecimiento': -0.008,
            'nacion.economia.informalidad': 0.03,
          });
          api.modificador({
            id: 'cepo', etiqueta: 'Restricciones cambiarias', años: 6,
            efectos: { 'nacion.economia.reservas': 0.008, 'nacion.exterior.ied': -0.004 },
          });
        },
        consecuencia: 'Se gana tiempo y se paga con mercado paralelo y menos inversión.',
      },
      {
        id: 'endeudarse',
        texto: 'Tomar deuda para sostener el nivel de actividad',
        resumen: 'Financiar el déficit externo en el mercado internacional.',
        requiere: (s) => s.nacion.deuda.riesgoPais < 0.7,
        actores: { capitalExtranjero: 1, organismosInternacionales: 0.8, oligarquia: 0.3 },
        peso: (s) => 0.4 + (1 - s.nacion.deuda.riesgoPais) * 2.5,
        aplicar: (s, rng, api) => {
          const monto = Math.max(0.05, s.nacion.economia.pbiPerCapita
            * s.nacion.demografia.poblacion * 1e-3 * 0.06);
          api.delta('nacion.deuda.deudaExterna', monto);
          api.efectos({
            'nacion.economia.reservas': 0.12,
            'nacion.deuda.monedaExtranjera': 0.03,
            'nacion.deuda.condicionalidad': 0.04,
          });
        },
        consecuencia: 'La crisis se pospone. El problema, capitalizado a interés compuesto.',
      },
    ],
  },

  {
    id: 'crisis_deuda',
    titulo: 'La deuda se vuelve impagable',
    categoria: 'deuda',
    etiquetas: ['deuda', 'crisis'],
    ventana: [1826, 2100],
    unaVez: false,
    enfriamiento: 10,
    canonico: false,
    probabilidad: 0.85,
    peso: (s) => s.presiones.deuda * 5,
    requiere: (s) => s.presiones.deuda > 0.6 && s.nacion.deuda.deudaPbi > 0.4,
    narrativa: () => 'Los vencimientos superan lo que entra. Se busca quién refinancie.',
    opciones: [
      {
        id: 'ajuste',
        texto: 'Ajustar para pagar',
        resumen: 'Recorte de gasto, tarifas y salarios para garantizar el servicio.',
        actores: { organismosInternacionales: 1, capitalExtranjero: 0.9, oligarquia: 0.5, sindicatos: -1 },
        peso: (s) => 0.6 + s.nacion.deuda.condicionalidad * 3 + s.actores.organismosInternacionales * 2,
        aplicar: (s, rng, api) => {
          api.flag('acuerdo_fmi');
          api.efectos({
            'nacion.deuda.condicionalidad': 0.15,
            'nacion.deuda.acuerdoFMI': 0,
            'nacion.economia.deficitFiscal': -0.02,
            'nacion.economia.crecimiento': -0.03,
            'nacion.social.pobreza': 0.06,
            'nacion.educacion.gastoPbi': -0.004,
            'nacion.infraestructura.mantenimiento': -0.08,
          });
          s.nacion.deuda.acuerdoFMI = true;
          s.presiones.social = Math.min(1, s.presiones.social + 0.2);
        },
        consecuencia: 'Pagar sin crecer obliga a pagar de nuevo, y cada vez con menos país.',
      },
      {
        id: 'reestructurar',
        texto: 'Reestructurar con quita',
        resumen: 'Canje de deuda con reducción de capital y plazos largos.',
        requiere: (s) => s.regimen.capacidadEstatal > 0.35,
        actores: { burguesiaIndustrial: 0.6, sindicatos: 0.5, capitalExtranjero: -0.7, organismosInternacionales: -0.6 },
        peso: (s) => 0.4 + s.regimen.capacidadEstatal * 2 + s.nacion.exterior.autonomia * 1.5,
        aplicar: (s, rng, api) => {
          const quita = 0.25 + rng.next() * 0.3;
          api.delta('nacion.deuda.deudaExterna', -s.nacion.deuda.deudaExterna * quita);
          api.flag('deuda_reestructurada');
          api.efectos({
            'nacion.deuda.riesgoPais': 0.15,
            'nacion.deuda.servicioDeuda': -0.3,
            'nacion.deuda.condicionalidad': -0.08,
          });
        },
        consecuencia: 'Negociar desde la necesidad es difícil; negociar sin plan es imposible.',
      },
      {
        id: 'default',
        texto: 'Declarar la cesación de pagos',
        resumen: 'Se suspende el pago y se enfrenta el aislamiento financiero.',
        actores: { movimientosPopulares: 0.8, sindicatos: 0.6, capitalExtranjero: -1, organismosInternacionales: -1 },
        peso: (s) => 0.3 + s.presiones.social * 2 + (1 - s.nacion.economia.reservas) * 1.5,
        aplicar: (s, rng, api) => {
          api.flag('default_deuda');
          s.nacion.deuda.defaults.push(s.año);
          api.efectos({
            'nacion.deuda.riesgoPais': 0.4,
            'nacion.deuda.servicioDeuda': -0.6,
            'nacion.deuda.condicionalidad': -0.15,
            'nacion.economia.crecimiento': -0.05,
            'nacion.exterior.ied': -0.06,
          });
          api.modificador({
            id: 'aislamiento', etiqueta: 'Aislamiento financiero', años: 5,
            efectos: { 'nacion.deuda.riesgoPais': 0.02, 'nacion.economia.reservas': -0.004 },
          });
        },
        consecuencia: 'Dejar de pagar libera recursos y cierra la puerta del crédito por años.',
      },
    ],
  },

  {
    id: 'shock_externo',
    titulo: 'Shock en los mercados internacionales',
    categoria: 'exterior',
    etiquetas: ['shock', 'mundo'],
    ventana: [1820, 2100],
    unaVez: false,
    enfriamiento: 11,
    canonico: false,
    probabilidad: 0.5,
    interactivo: false,
    peso: 1.2,
    narrativa: () => 'El mundo se sacude y la onda llega al puerto.',
    opciones: [
      {
        id: 'caida_precios',
        texto: 'Se derrumban los precios de las materias primas',
        peso: (s) => 1 + s.nacion.exterior.dependenciaComercial * 2,
        aplicar: (s, rng, api) => {
          api.modificador({
            id: 'shock_precios', etiqueta: 'Precios internacionales deprimidos', años: 3 + rng.entero(0, 3),
            efectos: {
              'nacion.economia.terminosIntercambio': -0.05,
              'nacion.economia.balanzaComercial': -0.03,
              'nacion.economia.reservas': -0.02,
            },
          });
          s.presiones.externa = Math.min(1, s.presiones.externa + 0.25);
        },
        consecuencia: 'Cuando se vende siempre lo mismo, el precio ajeno decide el año propio.',
      },
      {
        id: 'auge_precios',
        texto: 'Se disparan los precios de las materias primas',
        peso: 1,
        aplicar: (s, rng, api) => {
          api.modificador({
            id: 'auge_precios', etiqueta: 'Términos de intercambio favorables', años: 3 + rng.entero(0, 4),
            efectos: {
              'nacion.economia.terminosIntercambio': 0.05,
              'nacion.economia.balanzaComercial': 0.03,
              'nacion.economia.reservas': 0.02,
            },
          });
        },
        consecuencia: 'La bonanza abre una ventana: lo que se hace con ella define la década siguiente.',
      },
      {
        id: 'corte_credito',
        texto: 'Se corta el crédito internacional',
        peso: (s) => 0.8 + s.nacion.deuda.deudaPbi * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.deuda.tasaInteres': 0.03,
            'nacion.deuda.riesgoPais': 0.2,
            'nacion.deuda.fugaCapitales': 0.1,
          });
          s.presiones.deuda = Math.min(1, s.presiones.deuda + 0.3);
        },
        consecuencia: 'Los capitales entran de a olas y se van todos juntos.',
      },
    ],
  },

  // =========================================================================
  // Territorio, naturaleza y ciencia
  // =========================================================================
  {
    id: 'tension_federal',
    titulo: 'Tensión entre la Nación y las provincias',
    categoria: 'politica',
    etiquetas: ['federalismo', 'territorio'],
    ventana: [1820, 2100],
    unaVez: false,
    enfriamiento: 9,
    canonico: false,
    probabilidad: 0.6,
    peso: (s) => s.presiones.regional * 3,
    requiere: (s) => s.presiones.regional > 0.55,
    narrativa: () => 'El interior reclama su parte. La discusión es siempre la misma: la plata.',
    opciones: [
      {
        id: 'coparticipacion',
        texto: 'Repartir los recursos con las provincias',
        resumen: 'Un régimen de reparto automático de la recaudación.',
        actores: { caudillosProvinciales: 1, portuarios: -0.7, clasesMedias: 0.2 },
        peso: (s) => 0.6 + s.actores.caudillosProvinciales * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.infraestructura.integracionTerritorial': 0.06,
            'nacion.infraestructura.centralismoPortuario': -0.05,
            'nacion.educacion.brechaRegional': -0.05,
          });
          for (const p of api.provincias((p) => p.region !== 'pampa')) {
            p.infraestructura = Math.min(1, p.infraestructura + 0.03);
            p.descontento = Math.max(0, p.descontento - 0.08);
          }
          api.flag('estado_federal');
        },
        consecuencia: 'Repartir recursos integra el país y le quita margen a la caja central.',
      },
      {
        id: 'centralizar',
        texto: 'Centralizar los recursos en la Nación',
        resumen: 'La caja se decide en Buenos Aires.',
        actores: { portuarios: 1, oligarquia: 0.5, caudillosProvinciales: -1 },
        peso: (s) => 0.5 + s.actores.portuarios * 1.8,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.infraestructura.centralismoPortuario': 0.06,
            'nacion.economia.capacidadFiscal': 0.03,
            'nacion.infraestructura.integracionTerritorial': -0.04,
          });
          for (const p of api.provincias((p) => p.region !== 'pampa')) {
            p.descontento = Math.min(1, p.descontento + 0.08);
            p.autonomismo = Math.min(1, p.autonomismo + 0.06);
          }
        },
        consecuencia: 'El centro gana capacidad de decisión y el interior, motivos.',
      },
      {
        id: 'revuelta',
        texto: 'El conflicto se desborda',
        resumen: 'Levantamiento provincial e intervención federal.',
        requiere: (s) => s.presiones.regional > 0.75,
        actores: { caudillosProvinciales: 1, ffaa: 0.4 },
        peso: (s) => 0.2 + s.presiones.regional * 2 - s.regimen.capacidadEstatal * 1.5,
        aplicar: (s, rng, api) => {
          api.efectos({
            'regimen.estabilidad': -0.15,
            'nacion.economia.crecimiento': -0.02,
            'regimen.capacidadEstatal': -0.05,
          });
          const prov = api.provincias((p) => p.autonomismo > 0.6);
          for (const p of prov) { p.conflicto = Math.min(1, p.conflicto + 0.3); }
          s.presiones.golpe = Math.min(1, s.presiones.golpe + 0.1);
        },
        consecuencia: 'Las guerras internas se pelean por la aduana aunque se hable de banderas.',
      },
    ],
  },

  {
    id: 'catastrofe_natural',
    titulo: 'Catástrofe natural',
    categoria: 'recursos',
    etiquetas: ['clima', 'shock'],
    ventana: [1810, 2100],
    unaVez: false,
    enfriamiento: 6,
    canonico: false,
    probabilidad: 0.45,
    interactivo: false,
    peso: (s) => 1 + (1 - s.nacion.recursos.sostenibilidad) * 2,
    opciones: [
      {
        id: 'sequia',
        texto: 'Una sequía severa castiga la cosecha',
        peso: (s) => 1.5 + (1 - s.nacion.recursos.agua) * 2,
        aplicar: (s, rng, api) => {
          const dureza = 0.5 + rng.next() * 0.5;
          api.modificador({
            id: 'sequia', etiqueta: 'Sequía', años: 1 + rng.entero(0, 2),
            efectos: {
              'nacion.recursos.agro': -0.06 * dureza,
              'nacion.economia.balanzaComercial': -0.06 * dureza,
              'nacion.economia.reservas': -0.04 * dureza,
            },
          });
          s.presiones.externa = Math.min(1, s.presiones.externa + 0.2 * dureza);
        },
        consecuencia: 'Un país que exporta clima queda a merced del clima.',
      },
      {
        id: 'inundacion',
        texto: 'Inundaciones arrasan el litoral',
        peso: 1,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.infraestructura.rutas': -0.04,
            'nacion.infraestructura.vivienda': -0.05,
            'nacion.recursos.agro': -0.03,
          });
          s.presiones.social = Math.min(1, s.presiones.social + 0.1);
        },
        consecuencia: 'El agua encuentra siempre los barrios que el Estado no encontró.',
      },
      {
        id: 'epidemia',
        texto: 'Una epidemia golpea las ciudades',
        requiere: (s) => s.nacion.demografia.urbanizacion > 0.25,
        peso: (s) => 1 + (1 - s.nacion.infraestructura.agua_saneamiento) * 3,
        aplicar: (s, rng, api) => {
          const letalidad = (1 - s.nacion.infraestructura.salud) * (1 - s.nacion.infraestructura.agua_saneamiento);
          api.delta('nacion.demografia.poblacion', -s.nacion.demografia.poblacion * 0.012 * letalidad);
          api.efectos({
            'nacion.demografia.mortalidad': 0.004,
            'nacion.economia.crecimiento': -0.015,
          });
          s.presiones.social = Math.min(1, s.presiones.social + 0.12);
        },
        consecuencia: 'Las epidemias no son democráticas: cuentan cuántas cloacas hay en cada barrio.',
      },
    ],
  },

  {
    id: 'avance_cientifico',
    titulo: 'Avance científico o técnico',
    categoria: 'educacion',
    etiquetas: ['ciencia'],
    ventana: [1860, 2100],
    unaVez: false,
    enfriamiento: 8,
    canonico: false,
    probabilidad: 0.5,
    interactivo: false,
    peso: (s) => s.nacion.educacion.cienciaTecnica * 4 + s.nacion.educacion.superior * 2,
    requiere: (s) => s.nacion.educacion.cienciaTecnica > 0.15,
    opciones: [
      {
        id: 'desarrollo_propio',
        texto: 'Un desarrollo propio se aplica a la producción',
        peso: (s) => 0.5 + s.nacion.economia.industrializacion * 3,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.productividadIndustrial': 0.05,
            'nacion.economia.diversificacion': 0.04,
            'nacion.educacion.cienciaTecnica': 0.03,
            'nacion.exterior.prestigio': 0.03,
          });
        },
        consecuencia: 'La ciencia rinde cuando hay industria que la use.',
      },
      {
        id: 'avance_sanitario',
        texto: 'Un avance sanitario reduce la mortalidad',
        peso: 1,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.infraestructura.salud': 0.04,
            'nacion.demografia.mortalidadInfantil': -0.05,
            'nacion.demografia.esperanzaVida': 0.02,
          });
        },
        consecuencia: 'Los años de vida ganados no se ven en el PBI y son la mejor noticia del siglo.',
      },
      {
        id: 'sin_aplicacion',
        texto: 'El hallazgo se publica afuera y no encuentra aplicación local',
        peso: (s) => 0.5 + (1 - s.nacion.economia.industrializacion) * 3,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.educacion.fugaCerebros': 0.05,
            'nacion.exterior.prestigio': 0.02,
          });
        },
        consecuencia: 'Formar gente que se va es exportar el subsidio más caro del Estado.',
      },
    ],
  },

  {
    id: 'escandalo_corrupcion',
    titulo: 'Escándalo de corrupción',
    categoria: 'politica',
    etiquetas: ['corrupcion'],
    ventana: [1820, 2100],
    unaVez: false,
    enfriamiento: 8,
    canonico: false,
    probabilidad: 0.45,
    peso: (s) => s.regimen.corrupcion * 3 * (0.4 + s.nacion.cultura.prensaLibre),
    requiere: (s) => s.regimen.corrupcion > 0.4,
    narrativa: () => 'Salta a la luz un negociado con dinero público.',
    opciones: [
      {
        id: 'investigacion',
        texto: 'Investigar y sancionar',
        resumen: 'La justicia y el Congreso llegan hasta el final.',
        requiere: (s) => s.regimen.democracia > 0.4,
        actores: { clasesMedias: 0.8, movimientosPopulares: 0.4, oligarquia: -0.3 },
        peso: (s) => 0.4 + s.nacion.cultura.prensaLibre * 2 + s.regimen.capacidadEstatal * 1.5,
        aplicar: (s, rng, api) => {
          api.efectos({
            'regimen.corrupcion': -0.08,
            'regimen.legitimidad': -0.04,
            'regimen.capacidadEstatal': 0.03,
            'nacion.cultura.prensaLibre': 0.03,
          });
        },
        consecuencia: 'Investigar cuesta credibilidad en el corto plazo y la construye en el largo.',
      },
      {
        id: 'encubrimiento',
        texto: 'Encubrir y pasar de página',
        resumen: 'Se cierra la causa y se aprieta a los que informaron.',
        actores: { oligarquia: 0.6, capitalExtranjero: 0.3, clasesMedias: -0.8 },
        peso: (s) => 0.5 + s.regimen.corrupcion * 2 - s.nacion.cultura.prensaLibre * 1.5,
        aplicar: (s, rng, api) => {
          api.efectos({
            'regimen.corrupcion': 0.06,
            'regimen.legitimidad': -0.1,
            'nacion.cultura.prensaLibre': -0.05,
            'nacion.social.cohesion': -0.05,
          });
          s.presiones.golpe = Math.min(1, s.presiones.golpe + 0.06);
        },
        consecuencia: 'La impunidad sale barata hasta que hay que explicar por qué nadie cree en nada.',
      },
    ],
  },
];
