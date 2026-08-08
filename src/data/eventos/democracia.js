// Paquete de eventos: 1983 → 2100.
//
// Dos mitades. La primera (1983-2025) recorre lo que efectivamente pasó, pero
// abriendo en cada nudo los caminos que estaban materialmente disponibles: la
// convertibilidad podía no sancionarse, YPF podía capitalizarse sin venderse,
// el default podía negociarse antes de reventar. La segunda (2025-2100) no
// tiene libreto: son coyunturas que se disparan según cómo quedó el país, no
// según el almanaque.
//
// Reglas seguidas (docs/CONTRATO.md §3 y §5): sólo rutas que existen en
// crearEstado(); efectos proporcionales (0.05-0.12 para un cambio estructural
// fuerte) sostenidos con api.modificador; ninguna opción sin costo.

/** Lectura defensiva de una rama del estado (evita NaN en las divisiones). */
const n = (v, d = 0) => (Number.isFinite(v) ? v : d);

/** Escala 0..1 de "cuánto aguanta el Estado" en un momento dado. */
const musculoEstatal = (s) =>
  n(s.regimen.capacidadEstatal) * 0.5 +
  n(s.nacion.economia.capacidadFiscal) * 0.3 +
  n(s.regimen.legitimidad) * 0.2;

/** Fuerza del bloque popular movilizado. */
const calle = (s) =>
  n(s.nacion.social.movilizacion) * 0.4 +
  n(s.nacion.social.organizacionPopular) * 0.3 +
  n(s.actores.sindicatos) * 0.15 +
  n(s.actores.movimientosPopulares) * 0.15;

/** Presión de los acreedores y del capital financiero. */
const pinzaExterna = (s) =>
  n(s.nacion.deuda.condicionalidad) * 0.35 +
  Math.min(1, n(s.nacion.deuda.deudaPbi) / 1.2) * 0.35 +
  n(s.actores.organismosInternacionales) * 0.3;

export default [

  // ==========================================================================
  // 1983-1989 · LA TRANSICIÓN: JUSTICIA, DEUDA E INFLACIÓN
  // ==========================================================================

  {
    id: 'retorno_democratico_1983',
    titulo: 'Vuelve la democracia',
    categoria: 'regimen',
    etiquetas: ['democracia', 'transicion', 'ddhh'],
    año: 1983,
    ventana: [1982, 1986],
    canonico: true,
    peso: 3,
    requiere: (s) => s.regimen.democracia < 0.65,
    narrativa: () =>
      'La derrota militar, la deuda y el hambre terminaron de vaciar al régimen. Se llama a elecciones ' +
      'con los cuarteles todavía enteros y una deuda externa que nadie sabe bien de dónde salió.',
    opciones: [
      {
        id: 'apertura_plena',
        texto: 'Elecciones sin proscripciones y subordinación militar al poder civil',
        resumen: 'Democracia plena, pero con las FFAA intactas y la deuda heredada sin auditar.',
        historica: true,
        actores: { clasesMedias: 1, sindicatos: 0.6, movimientosPopulares: 0.7, ffaa: -0.8 },
        peso: (s) => 1 + calle(s) * 2,
        aplicar: (s, rng, api) => {
          api.regimen({ tipo: 'democracia', signoPolitico: 'radical', añosEnPoder: 0 });
          api.delta('regimen.democracia', 0.4);
          api.delta('regimen.participacion', 0.35);
          api.delta('regimen.legitimidad', 0.25);
          api.delta('nacion.social.derechosCiviles', 0.3);
          api.delta('nacion.social.derechosPoliticos', 0.35);
          api.delta('nacion.cultura.prensaLibre', 0.3);
          api.delta('nacion.social.represion', -0.3);
          api.delta('nacion.ffaa.poderPolitico', -0.12);
          api.delta('nacion.ffaa.tutelaje', -0.1);
          api.delta('nacion.demografia.emigracion', -0.05);
          api.actor('ffaa', -0.15);
          api.actor('clasesMedias', 0.1);
          api.actor('sindicatos', 0.08);
          api.flag('golpe_militar', false);
          api.flag('terrorismo_estado', false);
          api.flag('constitucion_sancionada');
          api.modificador({
            id: 'primavera_democratica', etiqueta: 'Primavera democrática', años: 6,
            efectos: { 'nacion.cultura.produccionCultural': 0.012, 'nacion.social.derechosCiviles': 0.01 },
          });
        },
        consecuencia: 'La plaza se llena. Los cuarteles siguen llenos también, y el vencimiento de la deuda llega en marzo.',
      },
      {
        id: 'transicion_tutelada',
        texto: 'Transición pactada: amnistía previa y garantías a las Fuerzas Armadas',
        resumen: 'Se recupera el voto sin tocar a los responsables. La tutela militar sobrevive al régimen.',
        actores: { ffaa: 1, iglesia: 0.5, oligarquia: 0.4, movimientosPopulares: -1 },
        peso: (s) => 0.5 + n(s.nacion.ffaa.poderPolitico) * 2.5,
        aplicar: (s, rng, api) => {
          api.regimen({ tipo: 'democracia', signoPolitico: 'transicion tutelada', añosEnPoder: 0 });
          api.delta('regimen.democracia', 0.25);
          api.delta('regimen.participacion', 0.2);
          api.delta('regimen.legitimidad', 0.05);
          api.delta('nacion.social.derechosCiviles', 0.15);
          api.delta('nacion.social.derechosPoliticos', 0.2);
          api.delta('nacion.cultura.prensaLibre', 0.15);
          api.delta('nacion.ffaa.tutelaje', 0.06);
          api.delta('nacion.ffaa.golpismo', 0.05);
          api.delta('nacion.cultura.memoriaHistorica', -0.08);
          api.actor('ffaa', 0.05);
          api.flag('golpe_militar', false);
          api.flag('ddhh_impunidad');
          api.modificador({
            id: 'tutela_militar', etiqueta: 'Tutela militar sobre el poder civil', años: 15,
            efectos: { 'regimen.legitimidad': -0.006, 'nacion.ffaa.poderPolitico': 0.004 },
          });
        },
        consecuencia: 'Hay urnas, pero el que manda de verdad no se presentó a elecciones.',
      },
      {
        id: 'continuidad_autoritaria',
        texto: 'Postergar la salida: el régimen intenta administrar la crisis',
        resumen: 'Se estira el gobierno de facto. La economía se hunde y la calle se rompe.',
        actores: { ffaa: 1, oligarquia: 0.3, sindicatos: -1, clasesMedias: -1 },
        requiere: (s) => s.nacion.ffaa.poderPolitico > 0.3,
        peso: (s) => Math.max(0, n(s.nacion.ffaa.poderPolitico) * 2 - calle(s) * 2),
        aplicar: (s, rng, api) => {
          api.delta('regimen.legitimidad', -0.15);
          api.delta('regimen.estabilidad', -0.15);
          api.delta('nacion.social.represion', 0.1);
          api.delta('nacion.social.conflictividad', 0.15);
          api.delta('nacion.economia.inflacion', 0.6);
          api.delta('nacion.demografia.emigracion', 0.04);
          api.delta('presiones.social', 0.25);
          api.delta('presiones.golpe', 0.1);
          api.flag('golpe_militar');
          api.modificador({
            id: 'agonia_regimen', etiqueta: 'Agonía del régimen militar', años: 5,
            efectos: { 'regimen.legitimidad': -0.02, 'nacion.economia.pbiPerCapita': -60, 'presiones.social': 0.03 },
          });
        },
        consecuencia: 'Cada mes que pasa es más caro, y no lo paga el que decide.',
      },
    ],
  },

  {
    id: 'juicio_juntas_1985',
    titulo: 'Juicio a las Juntas',
    categoria: 'regimen',
    etiquetas: ['ddhh', 'justicia', 'memoria'],
    año: 1985,
    ventana: [1984, 1988],
    canonico: true,
    peso: 2.5,
    requiere: (s) => s.regimen.democracia > 0.25,
    narrativa: () =>
      'Un tribunal civil sienta en el banquillo a los comandantes. Es la primera vez en el continente que ' +
      'una democracia juzga a los jefes de su propia dictadura sin esperar a que se mueran.',
    opciones: [
      {
        id: 'juzgar_cupulas',
        texto: 'Juzgar a las cúpulas con pruebas del propio Estado',
        resumen: 'Condena histórica y jurisprudencia; abajo de la cúpula, la tropa queda intacta y armada.',
        historica: true,
        actores: { clasesMedias: 1, movimientosPopulares: 1, sindicatos: 0.4, ffaa: -1, iglesia: -0.3 },
        peso: (s) => 1 + n(s.regimen.democracia) * 2,
        efectos: { 'nacion.cultura.memoriaHistorica': 0.1 },
        aplicar: (s, rng, api) => {
          api.delta('nacion.social.derechosCiviles', 0.12);
          api.delta('nacion.cultura.memoriaHistorica', 0.1);
          api.delta('regimen.legitimidad', 0.1);
          api.delta('nacion.exterior.prestigio', 0.08);
          api.delta('nacion.ffaa.poderPolitico', -0.1);
          api.delta('nacion.ffaa.tutelaje', -0.08);
          api.delta('nacion.cultura.cienciaSocial', 0.05);
          api.delta('presiones.golpe', 0.2);
          api.actor('ffaa', -0.12);
          api.actor('movimientosPopulares', 0.08);
          api.flag('juicio_juntas');
          api.flag('derechos_humanos');
          api.modificador({
            id: 'jurisprudencia_ddhh', etiqueta: 'Jurisprudencia de derechos humanos', años: 25,
            efectos: { 'nacion.cultura.memoriaHistorica': 0.008, 'nacion.ffaa.golpismo': -0.004 },
          });
        },
        consecuencia: 'La sentencia entra en los manuales. Los que quedaron afuera del banquillo empiezan a reunirse.',
      },
      {
        id: 'juicio_total',
        texto: 'Juzgar toda la cadena de mandos, sin excepción de rango',
        resumen: 'Justicia completa; las FFAA se sublevan y la democracia camina meses sobre el filo.',
        actores: { movimientosPopulares: 1, sindicatos: 0.5, ffaa: -1, oligarquia: -0.5 },
        requiere: (s) => s.regimen.democracia > 0.4 && s.nacion.social.movilizacion > 0.25,
        peso: (s) => calle(s) * 2.5,
        aplicar: (s, rng, api) => {
          api.delta('nacion.social.derechosCiviles', 0.15);
          api.delta('nacion.cultura.memoriaHistorica', 0.16);
          api.delta('nacion.exterior.prestigio', 0.1);
          api.delta('nacion.ffaa.poderPolitico', -0.18);
          api.delta('nacion.ffaa.tutelaje', -0.15);
          api.delta('nacion.ffaa.capacidadMilitar', -0.08);
          api.delta('regimen.estabilidad', -0.12);
          api.delta('presiones.golpe', 0.35);
          api.actor('ffaa', -0.22);
          api.flag('juicio_juntas');
          api.flag('derechos_humanos');
          api.flag('memoria_verdad_justicia');
          api.modificador({
            id: 'depuracion_militar', etiqueta: 'Depuración de las Fuerzas Armadas', años: 12,
            efectos: { 'nacion.ffaa.golpismo': -0.012, 'nacion.ffaa.profesionalizacion': 0.008, 'presiones.golpe': 0.012 },
          });
        },
        consecuencia: 'Nadie queda afuera. Nadie duerme tranquilo tampoco, ni los jueces ni el gobierno.',
      },
      {
        id: 'punto_final_temprano',
        texto: 'Cerrar el capítulo: amnistía y reconciliación nacional',
        resumen: 'Se compra paz militar con impunidad. La deuda con la sociedad sigue abierta décadas.',
        actores: { ffaa: 1, iglesia: 0.7, oligarquia: 0.4, movimientosPopulares: -1 },
        peso: (s) => 0.4 + n(s.nacion.ffaa.poderPolitico) * 2,
        aplicar: (s, rng, api) => {
          api.delta('nacion.cultura.memoriaHistorica', -0.1);
          api.delta('nacion.social.derechosCiviles', -0.05);
          api.delta('regimen.legitimidad', -0.06);
          api.delta('nacion.ffaa.tutelaje', 0.05);
          api.delta('regimen.estabilidad', 0.06);
          api.delta('nacion.social.conflictividad', 0.08);
          api.actor('ffaa', 0.06);
          api.actor('movimientosPopulares', -0.05);
          api.flag('ddhh_impunidad');
          api.modificador({
            id: 'impunidad_estructural', etiqueta: 'Impunidad como norma', años: 20,
            efectos: { 'regimen.corrupcion': 0.005, 'regimen.legitimidad': -0.004, 'nacion.cultura.memoriaHistorica': -0.004 },
          });
        },
        consecuencia: 'Los cuarteles se aquietan. Lo que no se juzga vuelve, más tarde, con otro uniforme.',
      },
    ],
  },

  {
    id: 'plan_austral_1985',
    titulo: 'Plan Austral',
    categoria: 'economia',
    etiquetas: ['inflacion', 'estabilizacion', 'moneda'],
    año: 1985,
    ventana: [1984, 1988],
    canonico: true,
    peso: 2,
    requiere: (s) => s.nacion.economia.inflacion > 0.25,
    narrativa: (s) =>
      `La inflación corre al ${Math.round(n(s.nacion.economia.inflacion) * 100)}% y el sueldo se evapora entre ` +
      'que se cobra y que se gasta. El gobierno saca una moneda nueva y congela todo de un día para el otro.',
    opciones: [
      {
        id: 'shock_heterodoxo',
        texto: 'Moneda nueva, congelamiento de precios y salarios, desindexación por decreto',
        resumen: 'La inflación se derrumba unos meses. Sin dólares ni ajuste fiscal, el congelamiento se pudre.',
        historica: true,
        actores: { clasesMedias: 1, burguesiaIndustrial: 0.4, sindicatos: -0.3 },
        peso: 2,
        aplicar: (s, rng, api) => {
          const infl = n(s.nacion.economia.inflacion);
          api.delta('nacion.economia.inflacion', -infl * 0.75);
          api.delta('nacion.economia.salarioReal', 0.05);
          api.delta('nacion.economia.tipoCambioReal', -0.06);
          api.delta('regimen.legitimidad', 0.08);
          api.delta('presiones.inflacionaria', -0.25);
          api.delta('presiones.fiscal', 0.1);
          api.flag('economia_plan_austral');
          api.modificador({
            id: 'desgaste_austral', etiqueta: 'Desgaste del congelamiento', años: 4,
            efectos: { 'nacion.economia.inflacion': 0.28, 'nacion.economia.reservas': -0.03, 'presiones.inflacionaria': 0.05 },
          });
        },
        consecuencia: 'Por unos meses los precios en las góndolas se quedan quietos. Los desequilibrios de fondo, no.',
      },
      {
        id: 'ajuste_ortodoxo',
        texto: 'Ajuste fiscal duro y tipo de cambio alto, sin congelamiento',
        resumen: 'La inflación baja más despacio pero acumula divisas. La recesión se come el salario.',
        actores: { oligarquia: 1, capitalExtranjero: 0.8, organismosInternacionales: 1, sindicatos: -1 },
        peso: (s) => 0.6 + pinzaExterna(s) * 2,
        aplicar: (s, rng, api) => {
          const infl = n(s.nacion.economia.inflacion);
          api.delta('nacion.economia.inflacion', -infl * 0.4);
          api.delta('nacion.economia.deficitFiscal', -0.02);
          api.delta('nacion.economia.tipoCambioReal', 0.1);
          api.delta('nacion.economia.balanzaComercial', 0.1);
          api.delta('nacion.economia.reservas', 0.08);
          api.delta('nacion.economia.salarioReal', -0.09);
          api.delta('nacion.economia.desempleo', 0.04);
          api.delta('nacion.social.pobreza', 0.05);
          api.delta('nacion.economia.crecimiento', -0.03);
          api.delta('presiones.social', 0.15);
          api.actor('sindicatos', -0.05);
          api.modificador({
            id: 'ajuste_85', etiqueta: 'Ajuste recesivo', años: 4,
            efectos: { 'nacion.economia.salarioReal': -0.012, 'nacion.economia.reservas': 0.015 },
          });
        },
        consecuencia: 'Entran dólares al Banco Central. Salen changas de las fábricas.',
      },
      {
        id: 'plan_concertado',
        texto: 'Acuerdo de precios e ingresos con empresarios y sindicatos, con metas trimestrales',
        resumen: 'Estabilización más lenta pero con salario protegido. Exige capacidad estatal para auditar.',
        actores: { sindicatos: 1, burguesiaIndustrial: 0.6, clasesMedias: 0.5, oligarquia: -0.5 },
        requiere: (s) => s.actores.sindicatos > 0.25 && s.regimen.capacidadEstatal > 0.3,
        peso: (s) => n(s.actores.sindicatos) * 2 + musculoEstatal(s),
        aplicar: (s, rng, api) => {
          const infl = n(s.nacion.economia.inflacion);
          api.delta('nacion.economia.inflacion', -infl * 0.5);
          api.delta('nacion.economia.salarioReal', 0.04);
          api.delta('nacion.economia.deficitFiscal', -0.01);
          api.delta('nacion.social.derechosLaborales', 0.05);
          api.delta('regimen.capacidadEstatal', 0.04);
          api.delta('presiones.inflacionaria', -0.15);
          api.actor('sindicatos', 0.06);
          api.actor('burguesiaIndustrial', 0.04);
          api.flag('paritarias');
          api.flag('economia_acuerdo_precios_ingresos');
          api.modificador({
            id: 'concertacion_precios', etiqueta: 'Concertación de precios e ingresos', años: 8,
            efectos: { 'nacion.economia.inflacion': -0.05, 'nacion.economia.salarioReal': 0.006, 'presiones.fiscal': 0.012 },
          });
        },
        consecuencia: 'Cada trimestre hay que volver a sentar a todos en la mesa. Es agotador y funciona a medias.',
      },
    ],
  },

  {
    id: 'crisis_deuda_baker_brady',
    titulo: 'Crisis de la deuda: del Plan Baker al Plan Brady',
    categoria: 'deuda',
    etiquetas: ['deuda', 'fmi', 'acreedores'],
    año: 1988,
    ventana: [1985, 1994],
    canonico: true,
    peso: 2,
    requiere: (s) => s.nacion.deuda.deudaExterna > 15,
    narrativa: (s) =>
      `Los acreedores ofrecen refinanciar los ${Math.round(n(s.nacion.deuda.deudaExterna))} mil millones a cambio de ` +
      'reformas: primero dinero fresco contra apertura (Baker), después bonos con garantía del Tesoro estadounidense ' +
      'y quita de capital (Brady). Nadie ofrece revisar de dónde salió la deuda.',
    opciones: [
      {
        id: 'brady_reformas',
        texto: 'Entrar al Plan Brady: bonos garantizados, quita parcial y reformas estructurales',
        resumen: 'Se despeja el vencimiento y vuelve el crédito, a cambio de privatizar y abrir la economía.',
        historica: true,
        actores: { organismosInternacionales: 1, capitalExtranjero: 1, oligarquia: 0.5, sindicatos: -0.6 },
        peso: (s) => 1 + pinzaExterna(s) * 2.5,
        aplicar: (s, rng, api) => {
          const d = n(s.nacion.deuda.deudaExterna);
          api.delta('nacion.deuda.deudaExterna', -d * 0.12);
          api.delta('nacion.deuda.deudaPbi', -0.08);
          api.delta('nacion.deuda.riesgoPais', -0.15);
          api.delta('nacion.deuda.tasaInteres', -0.01);
          api.delta('nacion.deuda.condicionalidad', 0.2);
          api.delta('nacion.deuda.acreedores.eeuu', 0.15);
          api.delta('nacion.deuda.acreedores.organismos', 0.1);
          api.delta('nacion.exterior.autonomia', -0.1);
          api.delta('presiones.deuda', -0.2);
          api.actor('organismosInternacionales', 0.15);
          api.actor('capitalExtranjero', 0.1);
          s.nacion.deuda.acuerdoFMI = true;
          api.flag('acuerdo_fmi');
          api.flag('fmi_miembro');
          api.flag('deuda_reestructurada');
          api.modificador({
            id: 'condicionalidad_brady', etiqueta: 'Condicionalidad del Plan Brady', años: 10,
            efectos: { 'nacion.economia.pesoEstado': -0.008, 'nacion.deuda.condicionalidad': 0.006, 'nacion.exterior.ied': 0.006 },
          });
        },
        consecuencia: 'El vencimiento se corre diez años. El programa de gobierno lo escribe otro.',
      },
      {
        id: 'moratoria_club_deudores',
        texto: 'Moratoria coordinada con el resto de los deudores latinoamericanos',
        resumen: 'Fuerza mejores términos si el bloque aguanta unido; si se rompe, el país queda solo y sin crédito.',
        actores: { sindicatos: 0.8, movimientosPopulares: 0.9, burguesiaIndustrial: 0.4, capitalExtranjero: -1, organismosInternacionales: -1 },
        requiere: (s) => s.nacion.exterior.integracionRegional > 0.12 && s.nacion.exterior.autonomia > 0.25,
        peso: (s) => n(s.nacion.exterior.integracionRegional) * 2.5 + calle(s),
        aplicar: (s, rng, api) => {
          const exito = n(s.nacion.exterior.integracionRegional) * 0.5 + n(s.nacion.exterior.prestigio) * 0.3 + rng.rango(0, 0.35);
          const d = n(s.nacion.deuda.deudaExterna);
          if (exito > 0.5) {
            api.delta('nacion.deuda.deudaExterna', -d * 0.25);
            api.delta('nacion.deuda.deudaPbi', -0.16);
            api.delta('nacion.exterior.autonomia', 0.12);
            api.delta('nacion.exterior.integracionRegional', 0.1);
            api.delta('nacion.deuda.condicionalidad', -0.12);
            api.log('El bloque de deudores aguanta y los bancos aceptan una quita mayor.', ['deuda']);
          } else {
            api.delta('nacion.deuda.deudaExterna', -d * 0.05);
            api.delta('nacion.deuda.riesgoPais', 0.2);
            api.delta('nacion.economia.reservas', -0.1);
            api.delta('nacion.exterior.autonomia', 0.04);
            api.log('El bloque se rompe: cada país negocia por su cuenta y el más débil paga.', ['deuda']);
          }
          api.delta('nacion.exterior.ied', -0.05);
          api.delta('presiones.externa', 0.15);
          api.actor('organismosInternacionales', -0.12);
          api.flag('default_deuda');
          api.modificador({
            id: 'aislamiento_financiero_80', etiqueta: 'Aislamiento financiero', años: 6,
            efectos: { 'nacion.deuda.riesgoPais': 0.012, 'nacion.exterior.ied': -0.004 },
          });
        },
        consecuencia: 'Se descubre que el bloque de deudores es fuerte exactamente hasta que uno se baja.',
      },
      {
        id: 'auditoria_deuda_80',
        texto: 'Auditar la deuda heredada y desconocer la contraída fraudulentamente',
        resumen: 'Recupera soberanía y castiga el fraude; corta el crédito externo por años y aísla al país.',
        actores: { movimientosPopulares: 1, sindicatos: 0.7, capitalExtranjero: -1, organismosInternacionales: -1, oligarquia: -0.7 },
        requiere: (s) => s.regimen.capacidadEstatal > 0.35 && s.nacion.social.movilizacion > 0.3,
        peso: (s) => calle(s) * 2 * musculoEstatal(s) * 2,
        aplicar: (s, rng, api) => {
          const d = n(s.nacion.deuda.deudaExterna);
          api.delta('nacion.deuda.deudaExterna', -d * 0.3);
          api.delta('nacion.deuda.deudaPbi', -0.2);
          api.delta('nacion.deuda.condicionalidad', -0.2);
          api.delta('nacion.exterior.autonomia', 0.15);
          api.delta('nacion.exterior.soberania', 0.1);
          api.delta('nacion.deuda.riesgoPais', 0.3);
          api.delta('nacion.exterior.ied', -0.08);
          api.delta('nacion.economia.reservas', -0.1);
          api.delta('nacion.economia.crecimiento', -0.03);
          api.delta('regimen.corrupcion', -0.06);
          api.actor('organismosInternacionales', -0.2);
          api.actor('capitalExtranjero', -0.15);
          api.flag('deuda_auditoria');
          api.flag('bicameral_deuda');
          api.flag('default_deuda');
          api.modificador({
            id: 'costo_repudio', etiqueta: 'Costo del repudio de deuda', años: 10,
            efectos: { 'nacion.deuda.riesgoPais': 0.01, 'nacion.exterior.ied': -0.005, 'nacion.deuda.deudaPbi': -0.02 },
          });
        },
        consecuencia: 'El expediente muestra empresas privadas estatizando sus pasivos. Los bancos cierran la ventanilla.',
      },
    ],
  },

  {
    id: 'carapintadas_leyes_impunidad',
    titulo: 'Carapintadas, Punto Final y Obediencia Debida',
    categoria: 'ffaa',
    etiquetas: ['ddhh', 'militares', 'impunidad'],
    año: 1987,
    ventana: [1986, 1991],
    canonico: true,
    peso: 2.2,
    requiere: (s) => s.regimen.democracia > 0.3 && s.nacion.ffaa.poderPolitico > 0.1,
    narrativa: () =>
      'Oficiales con la cara pintada se atrincheran en Campo de Mayo mientras los juzgados citan a cientos de ' +
      'militares. El gobierno no consigue que ninguna unidad marche a reprimir a los sublevados.',
    opciones: [
      {
        id: 'ceder_leyes',
        texto: 'Sancionar Punto Final y Obediencia Debida: los que cumplían órdenes quedan afuera',
        resumen: 'Frena la sublevación y salva el gobierno. La impunidad queda escrita en el Boletín Oficial.',
        historica: true,
        actores: { ffaa: 1, iglesia: 0.4, clasesMedias: -0.2, movimientosPopulares: -1 },
        peso: (s) => 1.2 + n(s.nacion.ffaa.poderPolitico) * 2,
        aplicar: (s, rng, api) => {
          api.delta('regimen.estabilidad', 0.08);
          api.delta('presiones.golpe', -0.2);
          api.delta('regimen.legitimidad', -0.12);
          api.delta('nacion.cultura.memoriaHistorica', -0.06);
          api.delta('nacion.social.derechosCiviles', -0.05);
          api.delta('nacion.ffaa.tutelaje', 0.06);
          api.delta('nacion.social.conflictividad', 0.08);
          api.actor('ffaa', 0.06);
          api.actor('movimientosPopulares', 0.05);
          api.flag('ddhh_impunidad');
          api.modificador({
            id: 'leyes_impunidad', etiqueta: 'Leyes de impunidad vigentes', años: 16,
            efectos: { 'nacion.cultura.memoriaHistorica': -0.005, 'regimen.legitimidad': -0.004, 'nacion.ffaa.tutelaje': 0.003 },
          });
        },
        consecuencia: '"La casa está en orden", dice el presidente. Nadie en la plaza le cree del todo.',
      },
      {
        id: 'reprimir_sublevacion',
        texto: 'Reprimir la sublevación con tropas leales y juzgar a los amotinados',
        resumen: 'Somete a los cuarteles de una vez; exige una fuerza leal que puede no existir.',
        actores: { movimientosPopulares: 1, sindicatos: 0.6, clasesMedias: 0.5, ffaa: -1 },
        requiere: (s) => s.nacion.ffaa.profesionalizacion > 0.35 && s.regimen.legitimidad > 0.4,
        peso: (s) => n(s.nacion.ffaa.profesionalizacion) * 2 + n(s.regimen.legitimidad),
        aplicar: (s, rng, api) => {
          const exito = n(s.nacion.ffaa.profesionalizacion) * 0.6 + n(s.regimen.legitimidad) * 0.4 + rng.rango(-0.15, 0.25);
          if (exito > 0.55) {
            api.delta('nacion.ffaa.poderPolitico', -0.16);
            api.delta('nacion.ffaa.golpismo', -0.12);
            api.delta('nacion.ffaa.tutelaje', -0.14);
            api.delta('regimen.legitimidad', 0.12);
            api.delta('nacion.cultura.memoriaHistorica', 0.08);
            api.actor('ffaa', -0.18);
            api.flag('memoria_verdad_justicia');
            api.log('La sublevación se rinde. El poder civil manda por primera vez en el siglo.', ['ffaa']);
          } else {
            api.delta('regimen.estabilidad', -0.18);
            api.delta('presiones.golpe', 0.3);
            api.delta('nacion.ffaa.poderPolitico', 0.08);
            api.delta('regimen.legitimidad', -0.1);
            api.log('Las tropas leales no aparecen. El gobierno queda expuesto y solo.', ['ffaa']);
          }
          api.delta('nacion.ffaa.capacidadMilitar', -0.06);
          api.delta('nacion.economia.crecimiento', -0.01);
        },
        consecuencia: 'La pregunta no era si el gobierno quería reprimir, sino si alguien iba a obedecerle.',
      },
      {
        id: 'juicios_sin_leyes',
        texto: 'No sancionar nada: los juicios siguen aunque el país tiemble',
        resumen: 'Sostiene la justicia al costo de una inestabilidad crónica y sublevaciones recurrentes.',
        actores: { movimientosPopulares: 1, clasesMedias: 0.3, ffaa: -1, oligarquia: -0.4 },
        peso: (s) => calle(s) * 2,
        aplicar: (s, rng, api) => {
          api.delta('nacion.cultura.memoriaHistorica', 0.12);
          api.delta('nacion.social.derechosCiviles', 0.08);
          api.delta('regimen.estabilidad', -0.14);
          api.delta('presiones.golpe', 0.3);
          api.delta('nacion.economia.crecimiento', -0.02);
          api.delta('nacion.exterior.prestigio', 0.06);
          api.actor('ffaa', -0.1);
          api.flag('memoria_verdad_justicia');
          api.flag('derechos_humanos');
          api.modificador({
            id: 'tension_civico_militar', etiqueta: 'Tensión cívico-militar permanente', años: 10,
            efectos: { 'presiones.golpe': 0.02, 'nacion.cultura.memoriaHistorica': 0.006, 'regimen.estabilidad': -0.006 },
          });
        },
        consecuencia: 'Cada Semana Santa alguien se atrinchera en un cuartel. Los juicios siguen igual.',
      },
    ],
  },

  {
    id: 'hiperinflacion_1989',
    titulo: 'Hiperinflación y traspaso anticipado',
    categoria: 'economia',
    etiquetas: ['hiperinflacion', 'crisis', 'saqueos'],
    año: 1989,
    ventana: [1988, 1992],
    canonico: true,
    peso: 3,
    requiere: (s) => s.nacion.economia.inflacion > 0.4 && s.nacion.economia.reservas < 0.45,
    narrativa: () =>
      'Los precios se remarcan tres veces por día. Hay saqueos a supermercados en el conurbano y en Rosario, ' +
      'estado de sitio y un presidente electo que todavía no debería asumir hasta diciembre.',
    opciones: [
      {
        id: 'traspaso_anticipado',
        texto: 'Entregar el gobierno seis meses antes y dejar que el que viene arregle',
        resumen: 'Evita el colapso institucional; la salida la escribe el poder económico que provocó la corrida.',
        historica: true,
        actores: { oligarquia: 1, capitalExtranjero: 0.8, clasesMedias: 0.3, sindicatos: -0.3 },
        peso: 2.5,
        aplicar: (s, rng, api) => {
          api.delta('nacion.economia.inflacion', 18 + rng.rango(0, 14));
          api.delta('nacion.economia.salarioReal', -0.22);
          api.delta('nacion.social.pobreza', 0.2);
          api.delta('nacion.economia.pbiPerCapita', -650);
          api.delta('nacion.economia.crecimiento', -0.07);
          api.delta('nacion.economia.reservas', -0.12);
          api.delta('nacion.deuda.fugaCapitales', 0.2);
          api.delta('regimen.legitimidad', -0.2);
          api.delta('presiones.inflacionaria', 0.4);
          api.delta('presiones.social', 0.3);
          api.regimen({ signoPolitico: 'justicialista', añosEnPoder: 0 });
          api.actor('oligarquia', 0.1);
          api.actor('capitalExtranjero', 0.08);
          api.actor('sindicatos', -0.1);
          api.flag('economia_hiperinflacion');
          api.flag('fuga_capitales');
          api.modificador({
            id: 'trauma_hiperinflacion', etiqueta: 'Trauma hiperinflacionario', años: 25,
            efectos: { 'nacion.cultura.identidad': -0.002, 'nacion.economia.informalidad': 0.004 },
          });
        },
        consecuencia: 'La hiperinflación deja una lección grabada a fuego: cualquier cosa antes que volver a esto.',
      },
      {
        id: 'aguantar_hasta_diciembre',
        texto: 'Aguantar hasta el traspaso constitucional con control de cambios y precios máximos',
        resumen: 'Salva la forma institucional; el desgaste de la hiperinflación se estira y se profundiza.',
        actores: { sindicatos: 0.5, clasesMedias: 0.3, oligarquia: -0.8, capitalExtranjero: -0.8 },
        requiere: (s) => s.regimen.capacidadEstatal > 0.25,
        peso: (s) => musculoEstatal(s) * 2,
        aplicar: (s, rng, api) => {
          api.delta('nacion.economia.inflacion', 24 + rng.rango(0, 18));
          api.delta('nacion.economia.salarioReal', -0.26);
          api.delta('nacion.social.pobreza', 0.24);
          api.delta('nacion.economia.pbiPerCapita', -800);
          api.delta('nacion.economia.crecimiento', -0.09);
          api.delta('nacion.economia.reservas', -0.06);
          api.delta('regimen.legitimidad', -0.1);
          api.delta('regimen.democracia', 0.03);
          api.delta('presiones.inflacionaria', 0.45);
          api.delta('presiones.social', 0.35);
          api.flag('economia_hiperinflacion');
          api.flag('control_cambios');
          api.modificador({
            id: 'trauma_hiperinflacion', etiqueta: 'Trauma hiperinflacionario', años: 25,
            efectos: { 'nacion.cultura.identidad': -0.002, 'nacion.economia.informalidad': 0.005 },
          });
        },
        consecuencia: 'El mandato se cumple hasta el último día. Lo que queda del salario, no.',
      },
      {
        id: 'reforma_monetaria_soberana',
        texto: 'Reforma monetaria con nacionalización de depósitos y regulación del comercio exterior',
        resumen: 'Corta la corrida de raíz si el Estado tiene músculo; si no lo tiene, acelera el derrumbe.',
        actores: { sindicatos: 1, movimientosPopulares: 0.9, burguesiaIndustrial: 0.3, oligarquia: -1, capitalExtranjero: -1 },
        requiere: (s) => s.regimen.capacidadEstatal > 0.4 && s.actores.sindicatos > 0.3,
        peso: (s) => musculoEstatal(s) * 2.5 * (0.5 + calle(s)),
        aplicar: (s, rng, api) => {
          const cap = musculoEstatal(s);
          api.delta('nacion.economia.inflacion', cap > 0.45 ? 6 + rng.rango(0, 6) : 22 + rng.rango(0, 16));
          api.delta('nacion.economia.salarioReal', cap > 0.45 ? -0.1 : -0.28);
          api.delta('nacion.social.pobreza', cap > 0.45 ? 0.08 : 0.26);
          api.delta('nacion.economia.reservas', cap > 0.45 ? 0.08 : -0.15);
          api.delta('nacion.deuda.fugaCapitales', cap > 0.45 ? -0.1 : 0.25);
          api.delta('nacion.economia.pesoEstado', 0.08);
          api.delta('nacion.exterior.ied', -0.06);
          api.delta('nacion.exterior.autonomia', 0.08);
          api.delta('presiones.inflacionaria', cap > 0.45 ? -0.1 : 0.4);
          api.actor('capitalExtranjero', -0.12);
          api.actor('oligarquia', -0.08);
          api.flag('control_cambios');
          api.flag('economia_hiperinflacion');
          api.modificador({
            id: 'economia_administrada_89', etiqueta: 'Economía administrada de emergencia', años: 8,
            efectos: { 'nacion.economia.pesoEstado': 0.004, 'nacion.exterior.ied': -0.003, 'nacion.economia.informalidad': 0.003 },
          });
        },
        consecuencia: 'Se sabe recién a los tres meses si el Estado tenía la fuerza que decía tener.',
      },
    ],
  },

  {
    id: 'reforma_estado_emergencia_1989',
    titulo: 'Leyes de Reforma del Estado y Emergencia Económica',
    categoria: 'regimen',
    etiquetas: ['ley', 'privatizacion', 'estado'],
    año: 1989,
    ventana: [1989, 1993],
    canonico: true,
    peso: 2.5,
    requiere: (s) => s.regimen.democracia > 0.25,
    narrativa: () =>
      'Dos leyes votadas en semanas habilitan al Ejecutivo a privatizar por decreto, suspender subsidios y ' +
      'derogar regímenes de promoción. El Congreso delega y se saca el problema de encima.',
    opciones: [
      {
        id: 'delegacion_total',
        texto: 'Delegar facultades: privatizar por decreto, sin marco regulatorio previo',
        resumen: 'Velocidad máxima de reforma. Los marcos regulatorios llegan después, o no llegan.',
        historica: true,
        actores: { capitalExtranjero: 1, oligarquia: 0.8, organismosInternacionales: 1, sindicatos: -0.8 },
        peso: (s) => 1 + pinzaExterna(s) * 2 + n(s.presiones.fiscal) * 2,
        aplicar: (s, rng, api) => {
          api.delta('regimen.capacidadEstatal', -0.08);
          api.delta('regimen.corrupcion', 0.1);
          api.delta('regimen.democracia', -0.06);
          api.delta('nacion.economia.pesoEstado', -0.06);
          api.delta('presiones.fiscal', -0.1);
          api.actor('capitalExtranjero', 0.12);
          api.actor('organismosInternacionales', 0.1);
          api.actor('sindicatos', -0.08);
          api.flag('reforma_estado_delegada');
          api.modificador({
            id: 'decretismo', etiqueta: 'Gobierno por decreto', años: 12,
            efectos: { 'regimen.democracia': -0.004, 'regimen.corrupcion': 0.004, 'regimen.capacidadEstatal': -0.004 },
          });
        },
        consecuencia: 'El Estado se desarma más rápido de lo que aprende a controlar lo que privatizó.',
      },
      {
        id: 'reforma_con_marcos',
        texto: 'Reformar con marcos regulatorios y entes de control sancionados antes de cada venta',
        resumen: 'Privatiza más lento y saca menos caja, pero conserva capacidad de regular tarifas e inversión.',
        actores: { clasesMedias: 0.8, burguesiaIndustrial: 0.5, sindicatos: 0.2, capitalExtranjero: -0.4 },
        requiere: (s) => s.regimen.capacidadEstatal > 0.3,
        peso: (s) => musculoEstatal(s) * 2.5,
        aplicar: (s, rng, api) => {
          api.delta('regimen.capacidadEstatal', 0.05);
          api.delta('regimen.corrupcion', -0.03);
          api.delta('nacion.economia.pesoEstado', -0.03);
          api.delta('presiones.fiscal', -0.04);
          api.delta('nacion.exterior.ied', 0.03);
          api.flag('regimen_entes_control');
          api.modificador({
            id: 'entes_reguladores', etiqueta: 'Entes reguladores con dientes', años: 20,
            efectos: { 'regimen.capacidadEstatal': 0.004, 'nacion.infraestructura.mantenimiento': 0.005 },
          });
        },
        consecuencia: 'Los compradores se quejan de la letra chica. Es exactamente para eso que está.',
      },
      {
        id: 'saneamiento_sin_venta',
        texto: 'Sanear las empresas públicas sin venderlas: auditoría, tarifas reales y gestión profesional',
        resumen: 'Conserva los activos y las divisas que generan; exige disciplina fiscal y aguantar la presión.',
        actores: { sindicatos: 1, burguesiaIndustrial: 0.4, movimientosPopulares: 0.7, capitalExtranjero: -1, organismosInternacionales: -1 },
        requiere: (s) => s.regimen.capacidadEstatal > 0.4 && s.nacion.economia.deficitFiscal < 0.06,
        peso: (s) => musculoEstatal(s) * 3 - pinzaExterna(s),
        aplicar: (s, rng, api) => {
          api.delta('nacion.economia.pesoEstado', 0.04);
          api.delta('regimen.capacidadEstatal', 0.06);
          api.delta('nacion.economia.deficitFiscal', -0.012);
          api.delta('nacion.infraestructura.mantenimiento', 0.06);
          api.delta('nacion.exterior.ied', -0.04);
          api.delta('nacion.deuda.riesgoPais', 0.08);
          api.delta('presiones.externa', 0.1);
          api.actor('sindicatos', 0.06);
          api.actor('organismosInternacionales', -0.1);
          api.flag('empresas_publicas_saneadas');
          api.modificador({
            id: 'gestion_publica_profesional', etiqueta: 'Gestión pública profesionalizada', años: 15,
            efectos: { 'regimen.capacidadEstatal': 0.004, 'nacion.infraestructura.energia': 0.004, 'nacion.economia.balanzaComercial': 0.004 },
          });
        },
        consecuencia: 'Cada balance trimestral es una batalla política. Los activos siguen siendo del país.',
      },
    ],
  },

  {
    id: 'indultos_1990',
    titulo: 'Los indultos',
    categoria: 'regimen',
    etiquetas: ['ddhh', 'impunidad', 'decreto'],
    año: 1990,
    ventana: [1989, 1994],
    canonico: true,
    peso: 2,
    requiere: (s) => !!s.flags.juicio_juntas || !!s.flags.ddhh_impunidad,
    narrativa: () =>
      'Por decreto salen en libertad los comandantes condenados, junto a jefes carapintadas y responsables de ' +
      'la guerrilla. Se llama pacificación. En la calle hay una de las marchas más grandes desde el 83.',
    opciones: [
      {
        id: 'indultar',
        texto: 'Indultar a condenados y procesados por decreto',
        resumen: 'Compra paz con los cuarteles y capital político con el establishment; hipoteca la legitimidad.',
        historica: true,
        actores: { ffaa: 1, iglesia: 0.6, oligarquia: 0.4, movimientosPopulares: -1, clasesMedias: -0.6 },
        peso: (s) => 1.2 + n(s.nacion.ffaa.poderPolitico) * 2,
        aplicar: (s, rng, api) => {
          api.delta('nacion.cultura.memoriaHistorica', -0.12);
          api.delta('regimen.legitimidad', -0.1);
          api.delta('nacion.social.derechosCiviles', -0.04);
          api.delta('presiones.golpe', -0.15);
          api.delta('regimen.estabilidad', 0.05);
          api.delta('nacion.social.movilizacion', 0.08);
          api.actor('ffaa', 0.08);
          api.actor('movimientosPopulares', 0.06);
          api.flag('ddhh_indultos');
          api.flag('ddhh_impunidad');
          api.flag('derechos_humanos', false);
          api.modificador({
            id: 'deuda_moral', etiqueta: 'Impunidad sin cerrar', años: 14,
            efectos: { 'regimen.legitimidad': -0.004, 'nacion.social.movilizacion': 0.004 },
          });
        },
        consecuencia: 'Los condenados salen a la calle. Las Madres siguen dando vueltas a la pirámide.',
      },
      {
        id: 'sostener_condenas',
        texto: 'Sostener las condenas y ampliar la investigación al plan económico de la dictadura',
        resumen: 'Consolida la justicia y expone la complicidad civil; enfrenta a la vez a los cuarteles y a los bancos.',
        actores: { movimientosPopulares: 1, sindicatos: 0.6, clasesMedias: 0.4, ffaa: -1, oligarquia: -1 },
        requiere: (s) => s.regimen.legitimidad > 0.4 && s.nacion.cultura.memoriaHistorica > 0.25,
        peso: (s) => n(s.nacion.cultura.memoriaHistorica) * 2 + calle(s),
        aplicar: (s, rng, api) => {
          api.delta('nacion.cultura.memoriaHistorica', 0.12);
          api.delta('nacion.cultura.cienciaSocial', 0.05);
          api.delta('regimen.legitimidad', 0.08);
          api.delta('nacion.ffaa.tutelaje', -0.08);
          api.delta('regimen.corrupcion', -0.05);
          api.delta('presiones.golpe', 0.2);
          api.delta('nacion.exterior.ied', -0.04);
          api.actor('oligarquia', -0.08);
          api.actor('ffaa', -0.1);
          api.flag('memoria_verdad_justicia');
          api.flag('derechos_humanos');
          api.modificador({
            id: 'complicidad_civil', etiqueta: 'Investigación de la complicidad económica', años: 12,
            efectos: { 'nacion.cultura.memoriaHistorica': 0.006, 'regimen.corrupcion': -0.003, 'nacion.exterior.ied': -0.002 },
          });
        },
        consecuencia: 'El expediente empieza a nombrar directorios, no sólo regimientos.',
      },
      {
        id: 'memoria_sin_justicia',
        texto: 'Indultar pero construir memoria: museos, archivos y educación, sin causas penales',
        resumen: 'Preserva el relato sin tocar a nadie. La sociedad recuerda; el aparato represivo queda intacto.',
        actores: { clasesMedias: 0.6, iglesia: 0.3, ffaa: 0.5, movimientosPopulares: -0.5 },
        peso: 1,
        aplicar: (s, rng, api) => {
          api.delta('nacion.cultura.memoriaHistorica', 0.06);
          api.delta('nacion.educacion.calidad', 0.02);
          api.delta('regimen.legitimidad', -0.04);
          api.delta('nacion.ffaa.tutelaje', 0.03);
          api.delta('presiones.golpe', -0.1);
          api.flag('ddhh_indultos');
          api.flag('ddhh_memoria_sin_justicia');
          api.modificador({
            id: 'memoria_declarativa', etiqueta: 'Memoria sin justicia', años: 20,
            efectos: { 'nacion.cultura.memoriaHistorica': 0.003, 'nacion.ffaa.golpismo': 0.002, 'regimen.legitimidad': -0.002 },
          });
        },
        consecuencia: 'Hay placas y efemérides. Los que apretaron el gatillo cobran su jubilación de privilegio.',
      },
    ],
  },

  // ==========================================================================
  // 1990-1995 · CONVERTIBILIDAD, PRIVATIZACIONES Y ALINEAMIENTO
  // ==========================================================================

  {
    id: 'privatizacion_entel_1990',
    titulo: 'Privatización de ENTel',
    categoria: 'infraestructura',
    etiquetas: ['privatizacion', 'telefonos', 'monopolio'],
    año: 1990,
    ventana: [1989, 1994],
    canonico: true,
    peso: 2,
    requiere: (s) => !!s.flags.reforma_estado_delegada || !!s.flags.regimen_entes_control || s.nacion.economia.pesoEstado > 0.2,
    narrativa: () =>
      'La telefónica del Estado se parte en dos monopolios regionales y se vende. Se pagan setecientos millones ' +
      'en efectivo y cinco mil en títulos de deuda tomados a valor nominal, cuando en el mercado valen un tercio.',
    opciones: [
      {
        id: 'venta_con_titulos',
        texto: 'Vender en dos monopolios zonales, aceptando títulos de deuda a valor nominal',
        resumen: 'Entra caja y baja deuda nominal; se regala un monopolio con tarifas dolarizadas por diez años.',
        historica: true,
        actores: { capitalExtranjero: 1, oligarquia: 0.7, organismosInternacionales: 0.8, sindicatos: -1 },
        peso: (s) => 1 + n(s.actores.capitalExtranjero) * 2,
        aplicar: (s, rng, api) => {
          const d = n(s.nacion.deuda.deudaExterna);
          api.delta('nacion.deuda.deudaExterna', -d * 0.05);
          api.delta('nacion.economia.reservas', 0.06);
          api.delta('nacion.economia.deficitFiscal', -0.008);
          api.delta('nacion.infraestructura.digital', 0.08);
          api.delta('nacion.exterior.ied', 0.08);
          api.delta('nacion.exterior.controlExtranjeroRecursos', 0.06);
          api.delta('nacion.economia.concentracion', 0.06);
          api.delta('nacion.economia.desempleo', 0.02);
          api.delta('nacion.economia.pesoEstado', -0.04);
          api.actor('capitalExtranjero', 0.1);
          api.actor('sindicatos', -0.06);
          api.flag('privatizaciones');
          api.modificador({
            id: 'renta_telefonica', etiqueta: 'Renta monopólica telefónica girada al exterior', años: 12,
            efectos: { 'nacion.economia.balanzaComercial': -0.006, 'nacion.infraestructura.digital': 0.008, 'nacion.economia.concentracion': 0.003 },
          });
        },
        consecuencia: 'El teléfono deja de tardar tres años en instalarse y pasa a costar como en Europa.',
      },
      {
        id: 'venta_competitiva',
        texto: 'Vender en competencia, con marco regulatorio y tarifas en pesos revisables',
        resumen: 'Menos caja de entrada, más inversión y precios controlados; requiere un ente regulador serio.',
        actores: { clasesMedias: 0.8, burguesiaIndustrial: 0.6, capitalExtranjero: -0.3 },
        requiere: (s) => s.regimen.capacidadEstatal > 0.3,
        peso: (s) => musculoEstatal(s) * 2.5,
        aplicar: (s, rng, api) => {
          api.delta('nacion.economia.reservas', 0.03);
          api.delta('nacion.infraestructura.digital', 0.09);
          api.delta('nacion.exterior.ied', 0.05);
          api.delta('nacion.economia.concentracion', 0.01);
          api.delta('nacion.economia.pesoEstado', -0.03);
          api.delta('regimen.capacidadEstatal', 0.02);
          api.flag('privatizaciones');
          api.flag('regimen_entes_control');
          api.modificador({
            id: 'competencia_telecom', etiqueta: 'Competencia en telecomunicaciones', años: 15,
            efectos: { 'nacion.infraestructura.digital': 0.008, 'nacion.economia.diversificacion': 0.002 },
          });
        },
        consecuencia: 'Los compradores pagan menos porque no compran un monopolio. Es la idea.',
      },
      {
        id: 'entel_estatal_modernizada',
        texto: 'Modernizar ENTel con inversión pública y asociación tecnológica',
        resumen: 'Conserva el activo y la renta; requiere financiar la digitalización sin crédito barato.',
        actores: { sindicatos: 1, burguesiaIndustrial: 0.5, capitalExtranjero: -1 },
        requiere: (s) => s.regimen.capacidadEstatal > 0.4 && s.nacion.economia.capacidadFiscal > 0.25,
        peso: (s) => musculoEstatal(s) * 2 + n(s.actores.sindicatos),
        aplicar: (s, rng, api) => {
          api.delta('nacion.infraestructura.digital', 0.05);
          api.delta('nacion.economia.pesoEstado', 0.03);
          api.delta('nacion.economia.deficitFiscal', 0.01);
          api.delta('nacion.educacion.cienciaTecnica', 0.03);
          api.delta('nacion.economia.reservas', -0.03);
          api.delta('presiones.fiscal', 0.08);
          api.actor('sindicatos', 0.05);
          api.actor('capitalExtranjero', -0.06);
          api.flag('telecom_estatal');
          api.modificador({
            id: 'telecom_publica', etiqueta: 'Telecomunicaciones públicas', años: 20,
            efectos: { 'nacion.infraestructura.digital': 0.006, 'nacion.economia.deficitFiscal': 0.002, 'nacion.exterior.soberania': 0.002 },
          });
        },
        consecuencia: 'La red crece más despacio, pero el tendido y los datos quedan del lado de acá.',
      },
    ],
  },

  {
    id: 'privatizacion_aerolineas_1990',
    titulo: 'Venta de Aerolíneas Argentinas',
    categoria: 'infraestructura',
    etiquetas: ['privatizacion', 'aerolineas', 'vaciamiento'],
    año: 1990,
    ventana: [1990, 1995],
    canonico: true,
    peso: 1.8,
    requiere: (s) => !!s.flags.privatizaciones || !!s.flags.reforma_estado_delegada,
    narrativa: () =>
      'La empresa se tasa en menos que la flota que tiene volando. La compra un grupo español que después le ' +
      'vende sus propios aviones a la empresa y le carga la deuda de la compra.',
    opciones: [
      {
        id: 'venta_subvaluada',
        texto: 'Vender al precio ofrecido, con los aviones y las rutas incluidas',
        resumen: 'Alivio fiscal inmediato; el comprador vacía la empresa y las rutas de cabotaje se caen.',
        historica: true,
        actores: { capitalExtranjero: 1, organismosInternacionales: 0.6, sindicatos: -1 },
        peso: (s) => 1 + n(s.actores.capitalExtranjero) * 2,
        aplicar: (s, rng, api) => {
          api.delta('nacion.economia.deficitFiscal', -0.006);
          api.delta('nacion.exterior.controlExtranjeroRecursos', 0.05);
          api.delta('nacion.infraestructura.integracionTerritorial', -0.06);
          api.delta('nacion.economia.desempleo', 0.015);
          api.delta('nacion.economia.pesoEstado', -0.03);
          api.delta('nacion.exterior.soberania', -0.04);
          api.actor('capitalExtranjero', 0.06);
          api.flag('privatizaciones');
          api.provincias((p) => p.region === 'patagonia' || p.region === 'norte').forEach((p) => {
            p.integracion = Math.max(0, p.integracion - 0.03);
            p.descontento = Math.min(1, p.descontento + 0.04);
          });
          api.modificador({
            id: 'vaciamiento_aerolineas', etiqueta: 'Vaciamiento de la aerolínea de bandera', años: 15,
            efectos: { 'nacion.infraestructura.integracionTerritorial': -0.004, 'nacion.exterior.soberania': -0.002 },
          });
        },
        consecuencia: 'Volar de Neuquén a Salta empieza a exigir escala en Buenos Aires. O ya no se puede.',
      },
      {
        id: 'venta_con_obligaciones',
        texto: 'Vender con obligación de mantener rutas de fomento y flota mínima',
        resumen: 'Sostiene la conectividad federal; ahuyenta compradores y baja el precio de venta.',
        actores: { caudillosProvinciales: 1, clasesMedias: 0.4, capitalExtranjero: -0.6 },
        requiere: (s) => s.regimen.capacidadEstatal > 0.3,
        peso: (s) => musculoEstatal(s) * 2 + n(s.actores.caudillosProvinciales),
        aplicar: (s, rng, api) => {
          api.delta('nacion.economia.deficitFiscal', -0.003);
          api.delta('nacion.infraestructura.integracionTerritorial', 0.02);
          api.delta('nacion.economia.pesoEstado', -0.02);
          api.delta('regimen.capacidadEstatal', 0.02);
          api.flag('privatizaciones');
          api.flag('regimen_entes_control');
        },
        consecuencia: 'Los pliegos obligan a volar donde no da la cuenta. Alguien tiene que pagar esa diferencia.',
      },
      {
        id: 'aerolinea_estatal',
        texto: 'No vender: reestructurar la empresa como servicio público de conectividad',
        resumen: 'Mantiene la red federal y las divisas del turismo; carga un déficit operativo permanente.',
        actores: { sindicatos: 1, caudillosProvinciales: 0.8, capitalExtranjero: -1 },
        requiere: (s) => s.nacion.economia.capacidadFiscal > 0.25,
        peso: (s) => musculoEstatal(s) * 2,
        aplicar: (s, rng, api) => {
          api.delta('nacion.infraestructura.integracionTerritorial', 0.06);
          api.delta('nacion.economia.deficitFiscal', 0.008);
          api.delta('nacion.economia.pesoEstado', 0.02);
          api.delta('presiones.fiscal', 0.08);
          api.actor('sindicatos', 0.04);
          api.provincias((p) => p.region === 'patagonia' || p.region === 'norte').forEach((p) => {
            p.integracion = Math.min(1, p.integracion + 0.03);
          });
          api.modificador({
            id: 'conectividad_aerea_publica', etiqueta: 'Conectividad aérea como servicio público', años: 20,
            efectos: { 'nacion.infraestructura.integracionTerritorial': 0.004, 'nacion.economia.deficitFiscal': 0.0015 },
          });
        },
        consecuencia: 'El déficit aparece todos los años en la planilla. La conectividad del sur, también.',
      },
    ],
  },

  {
    id: 'convertibilidad_1991',
    titulo: 'Ley de Convertibilidad',
    categoria: 'economia',
    etiquetas: ['convertibilidad', 'moneda', 'ancla'],
    año: 1991,
    ventana: [1990, 1995],
    canonico: true,
    peso: 3,
    requiere: (s) => s.nacion.economia.inflacion > 0.3,
    narrativa: () =>
      'Un peso, un dólar, por ley del Congreso. El Banco Central sólo puede emitir contra reservas. Se apaga ' +
      'la hiperinflación de un plumazo y se ata la política monetaria a los dólares que entren de afuera.',
    opciones: [
      {
        id: 'convertibilidad_rigida',
        texto: 'Ancla rígida por ley: un peso, un dólar, emisión respaldada al 100%',
        resumen: 'Mata la inflación y devuelve el crédito. Aprecia el peso, destruye industria y exige deuda para sostenerse.',
        historica: true,
        actores: { capitalExtranjero: 1, oligarquia: 0.8, clasesMedias: 0.9, organismosInternacionales: 1, burguesiaIndustrial: -0.6 },
        peso: (s) => 2 + Math.min(2, n(s.nacion.economia.inflacion)),
        aplicar: (s, rng, api) => {
          const infl = n(s.nacion.economia.inflacion);
          api.delta('nacion.economia.inflacion', -infl * 0.97);
          api.delta('nacion.economia.tipoCambioReal', -0.3);
          api.delta('nacion.economia.salarioReal', 0.1);
          api.delta('nacion.economia.crecimiento', 0.06);
          api.delta('nacion.economia.reservas', 0.15);
          api.delta('nacion.exterior.ied', 0.1);
          api.delta('nacion.deuda.riesgoPais', -0.12);
          api.delta('nacion.economia.industrializacion', -0.05);
          api.delta('nacion.economia.balanzaComercial', -0.2);
          api.delta('nacion.economia.desempleo', 0.04);
          api.delta('nacion.deuda.monedaExtranjera', 0.08);
          api.delta('presiones.inflacionaria', -0.5);
          api.delta('presiones.externa', 0.15);
          api.actor('capitalExtranjero', 0.12);
          api.actor('burguesiaIndustrial', -0.08);
          api.flag('convertibilidad');
          api.flag('librecambio');
          api.flag('economia_hiperinflacion', false);
          api.modificador({
            id: 'convertibilidad_activa', etiqueta: 'Convertibilidad: estabilidad a crédito', años: 11,
            efectos: {
              'nacion.economia.balanzaComercial': -0.022,
              'nacion.economia.industrializacion': -0.007,
              'nacion.economia.desempleo': 0.012,
              'nacion.deuda.deudaExterna': 7.5,
              'nacion.deuda.deudaPbi': 0.035,
              'presiones.externa': 0.03,
            },
          });
        },
        consecuencia: 'Los precios se quedan quietos por primera vez en veinte años. La cuenta la abre el país entero.',
      },
      {
        id: 'flotacion_administrada',
        texto: 'Flotación administrada con metas de tipo de cambio real y acuerdo de precios',
        resumen: 'Baja la inflación más despacio pero conserva competitividad; exige negociar todos los años.',
        actores: { burguesiaIndustrial: 1, sindicatos: 0.6, clasesMedias: -0.2, capitalExtranjero: -0.5 },
        requiere: (s) => s.regimen.capacidadEstatal > 0.35 && s.nacion.economia.reservas > 0.2,
        peso: (s) => musculoEstatal(s) * 2 + n(s.actores.burguesiaIndustrial) * 2,
        aplicar: (s, rng, api) => {
          const infl = n(s.nacion.economia.inflacion);
          api.delta('nacion.economia.inflacion', -infl * 0.7);
          api.delta('nacion.economia.tipoCambioReal', 0.08);
          api.delta('nacion.economia.balanzaComercial', 0.12);
          api.delta('nacion.economia.industrializacion', 0.04);
          api.delta('nacion.economia.crecimiento', 0.02);
          api.delta('nacion.economia.salarioReal', -0.03);
          api.delta('nacion.economia.reservas', 0.06);
          api.delta('presiones.inflacionaria', -0.2);
          api.actor('burguesiaIndustrial', 0.08);
          api.flag('economia_flotacion_administrada');
          api.flag('paritarias');
          api.modificador({
            id: 'tipo_cambio_competitivo', etiqueta: 'Tipo de cambio real competitivo', años: 14,
            efectos: {
              'nacion.economia.balanzaComercial': 0.01,
              'nacion.economia.industrializacion': 0.005,
              'nacion.economia.inflacion': 0.02,
              'nacion.economia.reservas': 0.006,
            },
          });
        },
        consecuencia: 'Nadie festeja: la inflación sigue existiendo. La fábrica de Villa Constitución sigue existiendo también.',
      },
      {
        id: 'dolarizacion_plena',
        texto: 'Dolarizar directamente: eliminar la moneda nacional',
        resumen: 'Estabilidad total e irreversible; se pierde el Banco Central, el crédito y cualquier margen frente a un shock.',
        actores: { capitalExtranjero: 1, oligarquia: 0.6, clasesMedias: 0.5, burguesiaIndustrial: -1, sindicatos: -0.8 },
        requiere: (s) => s.nacion.economia.reservas > 0.25,
        peso: (s) => Math.max(0, Math.min(2, n(s.nacion.economia.inflacion) * 0.6) - n(s.actores.burguesiaIndustrial)),
        aplicar: (s, rng, api) => {
          const infl = n(s.nacion.economia.inflacion);
          api.delta('nacion.economia.inflacion', -infl * 0.99);
          api.delta('nacion.economia.tipoCambioReal', -0.35);
          api.delta('nacion.economia.reservas', -0.15);
          api.delta('nacion.economia.industrializacion', -0.08);
          api.delta('nacion.economia.balanzaComercial', -0.25);
          api.delta('nacion.economia.desempleo', 0.06);
          api.delta('nacion.deuda.monedaExtranjera', 0.15);
          api.delta('nacion.exterior.autonomia', -0.15);
          api.delta('nacion.exterior.soberania', -0.1);
          api.delta('presiones.externa', 0.25);
          api.actor('capitalExtranjero', 0.15);
          api.flag('economia_dolarizacion');
          api.flag('banco_central', false);
          api.modificador({
            id: 'economia_dolarizada', etiqueta: 'Economía dolarizada', años: 25,
            efectos: {
              'nacion.economia.industrializacion': -0.006,
              'nacion.economia.balanzaComercial': -0.018,
              'nacion.economia.desempleo': 0.008,
              'nacion.exterior.autonomia': -0.004,
              'presiones.externa': 0.02,
            },
          });
        },
        consecuencia: 'Ya no hay corrida cambiaria posible porque ya no hay moneda que correr.',
      },
    ],
  },

  {
    id: 'relaciones_carnales_1991',
    titulo: 'Relaciones carnales',
    categoria: 'exterior',
    etiquetas: ['alineamiento', 'eeuu', 'soberania'],
    año: 1991,
    ventana: [1990, 1996],
    canonico: true,
    peso: 1.8,
    requiere: (s) => s.regimen.democracia > 0.3,
    narrativa: () =>
      'El país manda naves al Golfo, desmantela el misil Cóndor II, se retira del Movimiento de No Alineados y ' +
      'vota junto a Washington en todos los foros. A cambio espera crédito, inversión y una silla en la mesa.',
    opciones: [
      {
        id: 'alineamiento_automatico',
        texto: 'Alineamiento automático con Estados Unidos, incluso en programas propios',
        resumen: 'Abre crédito e inversión; se desmantelan capacidades tecnológicas que costaron décadas.',
        historica: true,
        actores: { capitalExtranjero: 1, oligarquia: 0.7, organismosInternacionales: 1, ffaa: -0.4 },
        peso: (s) => 1.5 + pinzaExterna(s) * 2,
        aplicar: (s, rng, api) => {
          api.delta('nacion.exterior.autonomia', -0.15);
          api.delta('nacion.exterior.soberania', -0.08);
          api.delta('nacion.exterior.dependenciaComercial', 0.08);
          api.delta('nacion.exterior.ied', 0.08);
          api.delta('nacion.deuda.riesgoPais', -0.08);
          api.delta('nacion.ffaa.industriaMilitar', -0.08);
          api.delta('nacion.educacion.cienciaTecnica', -0.05);
          api.delta('nacion.ffaa.capacidadMilitar', -0.06);
          s.nacion.exterior.socioPrincipal = 'eeuu';
          s.nacion.exterior.alineamiento = 'americanista';
          api.actor('organismosInternacionales', 0.12);
          api.actor('capitalExtranjero', 0.08);
          api.flag('exterior_alineamiento_automatico');
          api.modificador({
            id: 'alineamiento_eeuu', etiqueta: 'Alineamiento automático', años: 11,
            efectos: { 'nacion.exterior.autonomia': -0.004, 'nacion.exterior.ied': 0.004, 'nacion.educacion.cienciaTecnica': -0.002 },
          });
        },
        consecuencia: 'El Cóndor II se desarma con soplete delante de inspectores extranjeros.',
      },
      {
        id: 'autonomia_pragmatica',
        texto: 'Relación cordial pero autónoma: sostener los programas propios y diversificar socios',
        resumen: 'Conserva capacidades estratégicas al costo de menos crédito y más fricción diplomática.',
        actores: { burguesiaIndustrial: 1, ffaa: 0.6, sindicatos: 0.4, capitalExtranjero: -0.6 },
        requiere: (s) => s.nacion.educacion.cienciaTecnica > 0.15 || s.nacion.ffaa.industriaMilitar > 0.1,
        peso: (s) => n(s.nacion.educacion.cienciaTecnica) * 3 + n(s.nacion.exterior.autonomia),
        aplicar: (s, rng, api) => {
          api.delta('nacion.exterior.autonomia', 0.08);
          api.delta('nacion.exterior.dependenciaComercial', -0.06);
          api.delta('nacion.educacion.cienciaTecnica', 0.05);
          api.delta('nacion.ffaa.industriaMilitar', 0.03);
          api.delta('nacion.exterior.ied', -0.03);
          api.delta('nacion.deuda.riesgoPais', 0.06);
          api.flag('invap');
          api.modificador({
            id: 'capacidades_propias', etiqueta: 'Capacidades tecnológicas propias', años: 20,
            efectos: { 'nacion.educacion.cienciaTecnica': 0.004, 'nacion.economia.diversificacion': 0.002, 'nacion.deuda.riesgoPais': 0.002 },
          });
        },
        consecuencia: 'Sin el sello de Washington el crédito sale más caro. El satélite se sigue armando en Bariloche.',
      },
      {
        id: 'giro_sur',
        texto: 'Priorizar el eje sudamericano por sobre el hemisférico',
        resumen: 'Multiplica el peso regional; enfrenta represalias comerciales y financieras del norte.',
        actores: { burguesiaIndustrial: 0.8, sindicatos: 0.7, movimientosPopulares: 0.8, capitalExtranjero: -1, organismosInternacionales: -0.8 },
        requiere: (s) => s.nacion.exterior.integracionRegional > 0.15,
        peso: (s) => n(s.nacion.exterior.integracionRegional) * 3,
        aplicar: (s, rng, api) => {
          api.delta('nacion.exterior.integracionRegional', 0.12);
          api.delta('nacion.exterior.autonomia', 0.12);
          api.delta('nacion.exterior.dependenciaComercial', -0.1);
          api.delta('nacion.exterior.prestigio', 0.05);
          api.delta('nacion.exterior.ied', -0.06);
          api.delta('nacion.deuda.riesgoPais', 0.1);
          s.nacion.exterior.alineamiento = 'autonomo';
          api.actor('organismosInternacionales', -0.1);
          api.flag('exterior_no_alineamiento');
          api.modificador({
            id: 'eje_sur', etiqueta: 'Eje sudamericano', años: 20,
            efectos: { 'nacion.exterior.integracionRegional': 0.005, 'nacion.exterior.autonomia': 0.003, 'nacion.exterior.ied': -0.002 },
          });
        },
        consecuencia: 'Brasilia contesta el teléfono más rápido que Washington. El crédito, más lento.',
      },
    ],
  },

  {
    id: 'mercosur_1991',
    titulo: 'Tratado de Asunción: nace el Mercosur',
    categoria: 'exterior',
    etiquetas: ['integracion', 'mercosur', 'comercio'],
    año: 1991,
    ventana: [1990, 1996],
    canonico: true,
    peso: 2,
    requiere: (s) => s.nacion.exterior.conflictoLimitrofe < 0.6,
    narrativa: () =>
      'Argentina y Brasil, que se pasaron un siglo preparándose para una guerra que nunca hicieron, firman una ' +
      'unión aduanera con Uruguay y Paraguay. La pregunta es si va a ser un mercado o un proyecto.',
    opciones: [
      {
        id: 'mercado_comun_comercial',
        texto: 'Unión aduanera comercial, sin coordinación macroeconómica ni fondos de convergencia',
        resumen: 'Multiplica el comercio regional; sin coordinación, cada devaluación del socio golpea la industria propia.',
        historica: true,
        actores: { burguesiaIndustrial: 0.7, oligarquia: 0.5, capitalExtranjero: 0.4 },
        peso: 2,
        aplicar: (s, rng, api) => {
          api.delta('nacion.exterior.integracionRegional', 0.15);
          api.delta('nacion.exterior.conflictoLimitrofe', -0.15);
          api.delta('nacion.economia.balanzaComercial', 0.05);
          api.delta('nacion.economia.diversificacion', 0.03);
          api.delta('nacion.exterior.dependenciaComercial', 0.04);
          s.nacion.exterior.tratados.push('mercosur');
          api.actor('burguesiaIndustrial', 0.05);
          api.flag('mercosur');
          api.modificador({
            id: 'comercio_mercosur', etiqueta: 'Comercio intrazona', años: 25,
            efectos: { 'nacion.exterior.integracionRegional': 0.004, 'nacion.economia.diversificacion': 0.002 },
          });
        },
        consecuencia: 'Las autopartes cruzan el puente sin arancel. Los tipos de cambio siguen cada uno por su lado.',
      },
      {
        id: 'integracion_profunda',
        texto: 'Integración profunda: coordinación macro, fondos de convergencia y cadenas industriales comunes',
        resumen: 'Blinda a la región frente a shocks externos; exige ceder margen de política propia.',
        actores: { burguesiaIndustrial: 1, sindicatos: 0.6, clasesMedias: 0.3, capitalExtranjero: -0.5 },
        requiere: (s) => s.regimen.capacidadEstatal > 0.35,
        peso: (s) => musculoEstatal(s) * 2.5,
        aplicar: (s, rng, api) => {
          api.delta('nacion.exterior.integracionRegional', 0.22);
          api.delta('nacion.exterior.conflictoLimitrofe', -0.2);
          api.delta('nacion.economia.industrializacion', 0.04);
          api.delta('nacion.economia.diversificacion', 0.05);
          api.delta('nacion.exterior.autonomia', 0.06);
          api.delta('nacion.exterior.autonomia', -0.02);
          api.delta('presiones.externa', -0.08);
          s.nacion.exterior.tratados.push('mercosur_profundo');
          api.actor('burguesiaIndustrial', 0.08);
          api.flag('mercosur');
          api.flag('exterior_integracion_profunda');
          api.modificador({
            id: 'cadenas_regionales', etiqueta: 'Cadenas industriales regionales', años: 30,
            efectos: {
              'nacion.economia.industrializacion': 0.004,
              'nacion.exterior.integracionRegional': 0.006,
              'nacion.economia.balanzaComercial': 0.004,
            },
          });
        },
        consecuencia: 'Decidir el tipo de cambio pasa a ser una conversación con Brasilia. También decidir el arancel.',
      },
      {
        id: 'apertura_unilateral',
        texto: 'Saltear la región y abrir unilateralmente al mundo',
        resumen: 'Importaciones baratas y consumidores contentos; la industria y el empleo industrial se desploman.',
        actores: { oligarquia: 1, capitalExtranjero: 1, clasesMedias: 0.5, burguesiaIndustrial: -1, sindicatos: -1 },
        peso: (s) => 0.5 + n(s.actores.capitalExtranjero) * 2,
        aplicar: (s, rng, api) => {
          api.delta('nacion.exterior.integracionRegional', -0.05);
          api.delta('nacion.economia.industrializacion', -0.08);
          api.delta('nacion.economia.desempleo', 0.05);
          api.delta('nacion.economia.balanzaComercial', -0.12);
          api.delta('nacion.economia.salarioReal', 0.04);
          api.delta('nacion.economia.diversificacion', -0.04);
          api.actor('burguesiaIndustrial', -0.1);
          api.flag('librecambio');
          api.flag('industria_desindustrializacion');
          api.modificador({
            id: 'apertura_unilateral', etiqueta: 'Apertura importadora', años: 12,
            efectos: {
              'nacion.economia.industrializacion': -0.006,
              'nacion.economia.desempleo': 0.008,
              'nacion.economia.balanzaComercial': -0.012,
            },
          });
        },
        consecuencia: 'Los electrodomésticos nunca fueron tan baratos. Las fábricas que los hacían, tampoco.',
      },
    ],
  },
  // ---- FIN DEL BLOQUE ----
];
