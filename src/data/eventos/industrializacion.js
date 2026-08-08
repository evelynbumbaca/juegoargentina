// 1943-1983 · Industrialización, proscripción y ruptura.
//
// Cuarenta años en los que el país alcanza su mejor distribución del ingreso y
// su peor nivel de violencia política. La restricción externa y la puja
// distributiva son el motor de casi todo lo que pasa acá.

export default [
  {
    id: 'derechos_laborales',
    titulo: 'La cuestión social entra al Estado',
    categoria: 'social', etiquetas: ['trabajo', 'derechos'],
    año: 1944, ventana: [1943, 1948], canonico: true, peso: 9,
    narrativa: () => 'Una secretaría de trabajo empieza a fallar a favor de los sindicatos: convenios, aguinaldo, vacaciones pagas, indemnización por despido, tribunales laborales.',
    opciones: [
      {
        id: 'estado_bienestar', texto: 'Legislación social masiva y sindicatos por rama',
        resumen: 'Se institucionaliza la negociación colectiva y se universaliza la previsión social.',
        historica: true,
        actores: { sindicatos: 1, movimientosPopulares: 1, burguesiaIndustrial: 0.3, oligarquia: -1, capitalExtranjero: -0.6 },
        aplicar: (s, rng, api) => {
          api.flag('estado_bienestar'); api.flag('paritarias'); api.flag('sustitucion_importaciones');
          api.efectos({
            'nacion.social.derechosLaborales': 0.35, 'nacion.social.sindicalizacion': 0.30,
            'nacion.economia.salarioReal': 0.18, 'nacion.economia.gini': -0.10,
            'nacion.social.pobreza': -0.12, 'nacion.infraestructura.salud': 0.10,
            'nacion.economia.pesoEstado': 0.12, 'nacion.social.cohesion': 0.10,
          });
          api.actor('sindicatos', 0.35); api.actor('oligarquia', -0.10);
          api.regimen({ tipo: 'populismo', legitimidad: 0.72, añosEnPoder: 0, signoPolitico: 'popular' });
          api.modificador({ id: 'bienestar', etiqueta: 'Estado de bienestar', años: 12,
            efectos: {
              'nacion.economia.salarioReal': 0.006, 'nacion.social.pobreza': -0.005,
              'nacion.economia.industrializacion': 0.005, 'nacion.infraestructura.vivienda': 0.004,
            } });
        },
        consecuencia: 'La distribución del ingreso llega al punto más equitativo de la historia argentina. La clase propietaria no lo va a olvidar.',
      },
      {
        id: 'reformismo_moderado', texto: 'Reformas laborales moderadas',
        resumen: 'Mejoras acotadas sin alterar la correlación de fuerzas.',
        actores: { clasesMedias: 0.7, burguesiaIndustrial: 0.5, oligarquia: 0.2, sindicatos: -0.3 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.social.derechosLaborales': 0.12, 'nacion.economia.salarioReal': 0.06,
            'nacion.social.sindicalizacion': 0.08, 'nacion.economia.gini': -0.03,
          });
        },
        consecuencia: 'Se mejora sin romper nada, y sin construir una base social que defienda lo mejorado.',
      },
      {
        id: 'orden_conservador', texto: 'Sostener el orden previo',
        resumen: 'Se frena la sindicalización y se mantiene el esquema agroexportador.',
        actores: { oligarquia: 1, ffaa: 0.5, iglesia: 0.5, sindicatos: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.social.represion': 0.12, 'nacion.social.derechosLaborales': -0.05,
            'nacion.economia.gini': 0.04, 'nacion.social.conflictividad': 0.15,
          });
          s.presiones.social = Math.min(1, s.presiones.social + 0.3);
        },
        consecuencia: 'La presión no desaparece: se acumula y busca otra salida.',
      },
    ],
  },

  {
    id: 'ferrocarriles_1948',
    titulo: 'Compra de los ferrocarriles británicos',
    categoria: 'infraestructura', etiquetas: ['soberania', 'infraestructura'],
    año: 1948, ventana: [1946, 1952], canonico: true, peso: 7,
    requiere: (s) => s.flags.ferrocarril_britanico && !s.flags.ferrocarriles_nacionalizados,
    narrativa: () => 'Gran Bretaña debe una fortuna en libras bloqueadas que no puede pagar en oro ni en bienes. Ofrece cancelarla entregando la red ferroviaria, que tiene cincuenta años y necesita todo.',
    opciones: [
      {
        id: 'comprar_ferrocarriles', texto: 'Comprar la red con las libras bloqueadas',
        resumen: 'Se nacionaliza el ferrocarril usando una deuda que de otro modo no se cobraba.',
        historica: true,
        actores: { sindicatos: 0.9, ffaa: 0.6, burguesiaIndustrial: 0.4, capitalExtranjero: -1 },
        aplicar: (s, rng, api) => {
          api.flag('ferrocarriles_nacionalizados');
          api.efectos({
            'nacion.infraestructura.controlNacionalFerrocarril': 0.75,
            'nacion.exterior.soberania': 0.10, 'nacion.economia.reservas': -0.15,
            'nacion.infraestructura.mantenimiento': -0.10,
            'nacion.economia.deficitFiscal': 0.012, 'nacion.cultura.identidad': 0.06,
          });
          api.modificador({ id: 'ferro_estatal', etiqueta: 'Ferrocarriles del Estado', años: 30,
            efectos: {
              'nacion.infraestructura.integracionTerritorial': 0.003,
              'nacion.economia.deficitFiscal': 0.0015,
            } });
        },
        consecuencia: 'Se recuperan las vías y se hereda medio siglo de mantenimiento postergado. Las divisas gastadas van a faltar en 1952.',
      },
      {
        id: 'negociar_mejor', texto: 'Negociar: parte de la deuda en bienes de capital',
        resumen: 'Se cobra en máquinas y equipos para la industria, y se compran sólo los ramales rentables.',
        actores: { burguesiaIndustrial: 1, clasesMedias: 0.5, sindicatos: 0.2, capitalExtranjero: -0.4 },
        peso: (s) => 0.4 + s.regimen.capacidadEstatal * 2.5,
        aplicar: (s, rng, api) => {
          api.flag('ferrocarriles_nacionalizados');
          api.efectos({
            'nacion.infraestructura.controlNacionalFerrocarril': 0.45,
            'nacion.economia.industrializacion': 0.08,
            'nacion.economia.productividadIndustrial': 0.08,
            'nacion.economia.reservas': -0.06, 'nacion.exterior.soberania': 0.06,
          });
          api.modificador({ id: 'bienes_capital', etiqueta: 'Equipamiento industrial importado', años: 15,
            efectos: { 'nacion.economia.productividadIndustrial': 0.004 } });
        },
        consecuencia: 'Menos épica y más tornos. La industria arranca con máquinas que no había cómo pagar.',
      },
      {
        id: 'no_comprar', texto: 'No comprar la red',
        resumen: 'Se deja el ferrocarril en manos británicas y se conservan las divisas.',
        actores: { capitalExtranjero: 1, oligarquia: 0.5, sindicatos: -0.7 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.reservas': 0.10, 'nacion.exterior.soberania': -0.05,
            'nacion.exterior.giroUtilidades': 0.05,
          });
        },
        consecuencia: 'Se guardan los dólares y se sigue pagando flete a una empresa que decide qué pueblo existe.',
      },
    ],
  },

  {
    id: 'voto_femenino',
    titulo: 'Voto femenino',
    categoria: 'social', etiquetas: ['derechos', 'genero'],
    año: 1947, ventana: [1946, 1955], canonico: true, peso: 7,
    requiere: (s) => !s.flags.voto_femenino,
    narrativa: () => 'Se debate el sufragio femenino después de décadas de proyectos cajoneados.',
    opciones: [
      {
        id: 'sancionar_voto_femenino', texto: 'Sancionar el voto femenino',
        historica: true,
        actores: { movimientosPopulares: 1, sindicatos: 0.6, clasesMedias: 0.6, iglesia: -0.3 },
        aplicar: (s, rng, api) => {
          api.flag('voto_femenino');
          api.efectos({
            'nacion.social.genero': 0.25, 'nacion.social.derechosPoliticos': 0.15,
            'regimen.participacion': 0.20, 'nacion.social.derechosCiviles': 0.08,
          });
          api.modificador({ id: 'genero', etiqueta: 'Participación política de las mujeres', años: 60,
            efectos: { 'nacion.social.genero': 0.004 } });
        },
        consecuencia: 'Se duplica el electorado. Las prioridades de la política pública cambian de a poco y para siempre.',
      },
      {
        id: 'postergar_voto', texto: 'Postergarlo una vez más',
        actores: { iglesia: 0.8, oligarquia: 0.5, movimientosPopulares: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({ 'nacion.social.genero': -0.04, 'regimen.legitimidad': -0.04 });
        },
        consecuencia: 'La mitad de la población sigue sin poder decidir sobre la otra mitad.',
      },
    ],
  },

  {
    id: 'crisis_divisas_1952',
    titulo: 'Se acaban las divisas',
    categoria: 'economia', etiquetas: ['crisis', 'restriccion externa'],
    año: 1952, ventana: [1950, 1958], canonico: true, peso: 8,
    requiere: (s) => s.nacion.economia.industrializacion > 0.12,
    narrativa: () => 'La industria creció y necesita importar insumos y máquinas; el campo, con precios bajos y sin inversión, no genera los dólares para pagarlos. Es la primera vez que se ve el mecanismo con claridad.',
    opciones: [
      {
        id: 'plan_austeridad', texto: 'Plan de estabilización con acuerdo de precios y salarios',
        resumen: 'Congelamiento, aumento de la productividad y freno al consumo interno.',
        historica: true,
        actores: { sindicatos: 0.2, burguesiaIndustrial: 0.6, oligarquia: 0.4 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.inflacion': -0.10, 'nacion.economia.salarioReal': -0.06,
            'nacion.economia.balanzaComercial': 0.10, 'nacion.economia.reservas': 0.08,
            'nacion.recursos.agro': 0.06, 'nacion.social.conflictividad': 0.08,
          });
        },
        consecuencia: 'Se ordena la macro y se enfría la base social que sostenía al gobierno.',
      },
      {
        id: 'contratos_petroleros', texto: 'Contratos petroleros con compañías extranjeras',
        resumen: 'Autoabastecimiento energético rápido a cambio de concesiones.',
        actores: { capitalExtranjero: 1, burguesiaIndustrial: 0.4, ffaa: -0.4, movimientosPopulares: -0.6 },
        peso: (s) => 0.5 + (1 - s.nacion.recursos.petroleo) * 2,
        aplicar: (s, rng, api) => {
          api.flag('contratos_petroleros');
          api.efectos({
            'nacion.recursos.petroleo': 0.20, 'nacion.recursos.controlNacional': -0.12,
            'nacion.economia.balanzaComercial': 0.12, 'nacion.exterior.ied': 0.10,
            'nacion.exterior.soberania': -0.08, 'nacion.infraestructura.energia': 0.10,
          });
          api.actor('capitalExtranjero', 0.10);
        },
        consecuencia: 'Deja de irse en combustible el dinero que faltaba, y empieza a irse en utilidades.',
      },
      {
        id: 'exportar_industria', texto: 'Apostar a exportar manufacturas',
        resumen: 'Crédito, tipo de cambio diferencial y promoción para vender industria afuera.',
        requiere: (s) => s.nacion.economia.industrializacion > 0.2 && s.nacion.educacion.formacionTecnica > 0.15,
        actores: { burguesiaIndustrial: 1, sindicatos: 0.5, clasesMedias: 0.4, oligarquia: -0.6 },
        peso: (s) => 0.25 + s.nacion.economia.industrializacion * 3 + s.nacion.educacion.cienciaTecnica * 3,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.diversificacion': 0.10, 'nacion.economia.productividadIndustrial': 0.08,
            'nacion.exterior.dependenciaComercial': -0.10, 'nacion.economia.balanzaComercial': 0.06,
            'nacion.economia.deficitFiscal': 0.01,
          });
          api.modificador({ id: 'export_industrial', etiqueta: 'Exportaciones industriales', años: 25,
            efectos: {
              'nacion.economia.diversificacion': 0.004,
              'nacion.economia.balanzaComercial': 0.002,
            } });
        },
        consecuencia: 'Es la única salida real del laberinto, y la más lenta: exige tres décadas de política sostenida.',
      },
    ],
  },

  {
    id: 'golpe_1955',
    titulo: 'Ruptura de 1955',
    categoria: 'politica', etiquetas: ['golpe'],
    año: 1955, ventana: [1954, 1960], canonico: true, peso: 8,
    requiere: (s) => s.regimen.tipo === 'populismo' || s.flags.estado_bienestar,
    narrativa: () => 'La marina bombardea la Plaza de Mayo. Sectores de la Iglesia, la oligarquía, las clases medias urbanas y las Fuerzas Armadas confluyen contra el gobierno.',
    opciones: [
      {
        id: 'golpe_proscripcion', texto: 'Golpe y proscripción del movimiento mayoritario',
        resumen: 'Se interviene la CGT, se prohíbe el partido y hasta nombrar a su líder.',
        historica: true,
        actores: { ffaa: 1, oligarquia: 1, iglesia: 0.8, clasesMedias: 0.5, capitalExtranjero: 0.6, sindicatos: -1 },
        aplicar: (s, rng, api) => {
          api.flag('golpe_militar'); api.flag('proscripcion');
          api.regimen({ tipo: 'dictadura', legitimidad: 0.4, añosEnPoder: 0, signoPolitico: 'militar' });
          s.nacion.ffaa.doctrina = 'seguridadInterior';
          api.efectos({
            'nacion.social.derechosPoliticos': -0.35, 'nacion.social.represion': 0.25,
            'nacion.social.derechosLaborales': -0.12, 'nacion.economia.salarioReal': -0.10,
            'nacion.ffaa.poderPolitico': 0.30, 'nacion.ffaa.tutelaje': 0.25,
            'nacion.cultura.prensaLibre': -0.25,
          });
          api.actor('ffaa', 0.2); api.actor('sindicatos', -0.1);
          api.modificador({ id: 'proscripcion', etiqueta: 'Proscripción política', años: 18,
            efectos: {
              'regimen.legitimidad': -0.006, 'nacion.social.conflictividad': 0.008,
              'nacion.ffaa.golpismo': 0.004,
            } });
        },
        consecuencia: 'Proscribir a la mayoría no la hace desaparecer: la vuelve ingobernable y empuja a una generación a la violencia.',
      },
      {
        id: 'integracion_politica', texto: 'Salida electoral sin proscripciones',
        resumen: 'El gobierno cae pero el movimiento compite en elecciones libres.',
        requiere: (s) => s.nacion.social.organizacionPopular > 0.35 || s.regimen.democracia > 0.5,
        actores: { sindicatos: 1, clasesMedias: 0.5, movimientosPopulares: 0.9, ffaa: -0.8 },
        peso: (s) => 0.3 + s.nacion.social.organizacionPopular * 2.5 + s.nacion.cultura.memoriaHistorica * 2,
        aplicar: (s, rng, api) => {
          api.regimen({ tipo: 'democracia', legitimidad: 0.6, añosEnPoder: 0 });
          api.efectos({
            'nacion.social.derechosPoliticos': 0.10, 'nacion.ffaa.golpismo': -0.10,
            'nacion.social.cohesion': 0.08, 'nacion.economia.salarioReal': -0.04,
          });
          api.modificador({ id: 'sistema_competitivo', etiqueta: 'Sistema político competitivo', años: 30,
            efectos: { 'nacion.ffaa.golpismo': -0.004, 'regimen.legitimidad': 0.002 } });
        },
        consecuencia: 'Un sistema donde la mayoría puede perder elecciones y volver a ganarlas no necesita golpes.',
      },
    ],
  },

  {
    id: 'ingreso_fmi',
    titulo: 'Ingreso al Fondo Monetario Internacional',
    categoria: 'deuda', etiquetas: ['deuda', 'soberania'],
    año: 1956, ventana: [1955, 1962], canonico: true, peso: 7,
    requiere: (s) => !s.flags.fmi_miembro,
    narrativa: () => 'Se propone ingresar a los organismos de Bretton Woods para acceder a crédito de emergencia.',
    opciones: [
      {
        id: 'ingresar_fmi', texto: 'Ingresar y firmar el primer acuerdo',
        historica: true,
        actores: { organismosInternacionales: 1, capitalExtranjero: 0.9, oligarquia: 0.6, sindicatos: -0.7 },
        aplicar: (s, rng, api) => {
          api.flag('fmi_miembro'); api.flag('acuerdo_fmi');
          s.nacion.deuda.acuerdoFMI = true;
          s.nacion.deuda.acreedores.organismos = 0.3;
          api.efectos({
            'nacion.deuda.condicionalidad': 0.20, 'nacion.deuda.riesgoPais': -0.10,
            'nacion.economia.reservas': 0.10, 'nacion.exterior.soberania': -0.10,
            'nacion.economia.salarioReal': -0.05,
          });
          api.actor('organismosInternacionales', 0.25);
          api.modificador({ id: 'programas_fmi', etiqueta: 'Programas con el Fondo', años: 60,
            efectos: { 'nacion.deuda.condicionalidad': 0.003 } });
        },
        consecuencia: 'Se consigue un prestamista de última instancia que además opina sobre el presupuesto, el tipo de cambio y los salarios.',
      },
      {
        id: 'no_ingresar', texto: 'No ingresar y buscar financiamiento alternativo',
        actores: { sindicatos: 0.7, burguesiaIndustrial: 0.5, organismosInternacionales: -1, capitalExtranjero: -0.8 },
        peso: (s) => 0.35 + s.nacion.exterior.autonomia * 3,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.exterior.soberania': 0.08, 'nacion.exterior.autonomia': 0.10,
            'nacion.deuda.riesgoPais': 0.12, 'nacion.economia.reservas': -0.06,
            'nacion.exterior.integracionRegional': 0.06,
          });
        },
        consecuencia: 'Sin red de contención hay que aprender a no caerse. Sale caro cada vez que no se logra.',
      },
    ],
  },

  {
    id: 'sistema_cientifico',
    titulo: 'Un sistema científico nacional',
    categoria: 'educacion', etiquetas: ['ciencia'],
    año: 1958, ventana: [1955, 1968], canonico: true, peso: 6,
    requiere: (s) => s.nacion.educacion.superior > 0.03,
    narrativa: () => 'Se propone crear un consejo de investigaciones con carrera de investigador, becas y institutos propios, junto a organismos de tecnología agropecuaria e industrial.',
    opciones: [
      {
        id: 'crear_conicet', texto: 'Crear el sistema científico y tecnológico',
        historica: true,
        actores: { clasesMedias: 1, burguesiaIndustrial: 0.6, ffaa: 0.3 },
        aplicar: (s, rng, api) => {
          api.flag('conicet'); api.flag('escuelas_tecnicas');
          api.efectos({
            'nacion.educacion.cienciaTecnica': 0.15, 'nacion.educacion.formacionTecnica': 0.12,
            'nacion.educacion.superior': 0.04, 'nacion.recursos.agro': 0.05,
            'nacion.economia.productividadAgro': 0.08, 'nacion.exterior.prestigio': 0.06,
          });
          api.modificador({ id: 'ciencia_nacional', etiqueta: 'Sistema científico nacional', años: 40,
            efectos: {
              'nacion.educacion.cienciaTecnica': 0.004,
              'nacion.economia.productividadAgro': 0.002,
              'nacion.economia.productividadIndustrial': 0.002,
            } });
        },
        consecuencia: 'La ciencia empieza a producir semillas, vacunas, reactores y satélites. Tarda veinte años en rendir y cinco en destruirse.',
      },
      {
        id: 'sin_sistema', texto: 'Dejar la investigación a las universidades y al mercado',
        actores: { oligarquia: 0.5, capitalExtranjero: 0.6, clasesMedias: -0.6 },
        aplicar: (s, rng, api) => {
          api.efectos({ 'nacion.educacion.cienciaTecnica': -0.02, 'nacion.educacion.fugaCerebros': 0.06 });
        },
        consecuencia: 'La tecnología se compra hecha. Sale más rápido y no deja nada instalado.',
      },
    ],
  },

  {
    id: 'noche_bastones_largos',
    titulo: 'Intervención de las universidades',
    categoria: 'educacion', etiquetas: ['represion', 'ciencia'],
    año: 1966, ventana: [1962, 1972], canonico: true, peso: 6,
    requiere: (s) => s.regimen.tipo === 'dictadura' && s.flags.reforma_universitaria,
    narrativa: () => 'La policía entra a bastonazos a las facultades para terminar con la autonomía universitaria.',
    opciones: [
      {
        id: 'intervenir', texto: 'Intervenir y expulsar',
        resumen: 'Renuncian y emigran centenares de científicos y docentes.',
        historica: true,
        actores: { ffaa: 1, iglesia: 0.6, oligarquia: 0.4, clasesMedias: -1 },
        aplicar: (s, rng, api) => {
          api.flag('noche_bastones_largos');
          api.efectos({
            'nacion.educacion.universidadPublica': -0.25, 'nacion.educacion.cienciaTecnica': -0.15,
            'nacion.educacion.fugaCerebros': 0.30, 'nacion.cultura.cienciaSocial': -0.25,
            'nacion.cultura.prensaLibre': -0.10, 'nacion.social.conflictividad': 0.12,
          });
          api.modificador({ id: 'exodo_cientifico', etiqueta: 'Éxodo científico', años: 20,
            efectos: {
              'nacion.educacion.cienciaTecnica': -0.004,
              'nacion.educacion.fugaCerebros': 0.004,
            } });
        },
        consecuencia: 'Se pierde en una noche lo que llevó veinte años formar, y los que se van no vuelven.',
      },
      {
        id: 'respetar_autonomia', texto: 'Respetar la autonomía universitaria',
        actores: { clasesMedias: 1, burguesiaIndustrial: 0.4, ffaa: -0.8 },
        peso: (s) => 0.3 + s.nacion.educacion.universidadPublica * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.educacion.cienciaTecnica': 0.05, 'nacion.educacion.universidadPublica': 0.05,
            'regimen.legitimidad': 0.05,
          });
        },
        consecuencia: 'Ni el gobierno más autoritario gana nada echando a sus propios físicos.',
      },
    ],
  },

  {
    id: 'cordobazo',
    titulo: 'Insurrección obrero-estudiantil',
    categoria: 'social', etiquetas: ['conflicto'],
    año: 1969, ventana: [1966, 1974], canonico: true, peso: 7,
    requiere: (s) => s.regimen.tipo === 'dictadura' && s.nacion.social.sindicalizacion > 0.2,
    narrativa: () => 'Obreros mecánicos y estudiantes toman una ciudad industrial entera. La policía se repliega y el ejército tarda dos días en recuperar el centro.',
    opciones: [
      {
        id: 'apertura_post_cordobazo', texto: 'Abrir el juego político',
        resumen: 'El régimen no puede sostenerse y convoca a elecciones sin proscripciones.',
        historica: true,
        actores: { sindicatos: 1, movimientosPopulares: 1, clasesMedias: 0.6, ffaa: -0.8 },
        aplicar: (s, rng, api) => {
          api.flag('proscripcion', false);
          api.regimen({ tipo: 'democracia', legitimidad: 0.65, añosEnPoder: 0, signoPolitico: 'popular' });
          api.efectos({
            'nacion.social.derechosPoliticos': 0.30, 'nacion.social.organizacionPopular': 0.15,
            'nacion.social.represion': -0.15, 'nacion.economia.salarioReal': 0.08,
            'nacion.cultura.prensaLibre': 0.20,
          });
          api.actor('sindicatos', 0.10); api.actor('movimientosPopulares', 0.12);
        },
        consecuencia: 'La calle logra lo que las urnas tenían prohibido. La expectativa que se abre es enorme y difícil de administrar.',
      },
      {
        id: 'represion_cordobazo', texto: 'Reprimir y endurecer',
        resumen: 'Consejos de guerra, cárcel y persecución gremial.',
        actores: { ffaa: 1, oligarquia: 0.8, sindicatos: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.social.represion': 0.20, 'nacion.social.conflictividad': 0.20,
            'nacion.social.cohesion': -0.12, 'regimen.legitimidad': -0.15,
          });
          api.flag('violencia_politica');
          s.presiones.social = Math.min(1, s.presiones.social + 0.35);
          api.modificador({ id: 'espiral_violencia', etiqueta: 'Espiral de violencia política', años: 10,
            efectos: { 'nacion.social.conflictividad': 0.008, 'regimen.estabilidad': -0.006 } });
        },
        consecuencia: 'Cerrar todas las puertas institucionales deja una sola salida abierta, y es la peor.',
      },
    ],
  },

  {
    id: 'pacto_social_1973',
    titulo: 'Pacto social y puja distributiva',
    categoria: 'economia', etiquetas: ['salarios', 'inflacion'],
    año: 1973, ventana: [1972, 1977], canonico: true, peso: 7,
    requiere: (s) => s.regimen.democracia > 0.4,
    narrativa: () => 'Un acuerdo entre la central obrera y los empresarios congela precios y fija salarios. Funciona dos años, hasta que el shock del petróleo y la puja lo hacen volar.',
    opciones: [
      {
        id: 'sostener_pacto', texto: 'Sostener el acuerdo con administración del comercio exterior',
        resumen: 'Control de precios más control de divisas y de exportaciones.',
        requiere: (s) => s.regimen.capacidadEstatal > 0.4,
        actores: { sindicatos: 0.9, burguesiaIndustrial: 0.5, oligarquia: -1, capitalExtranjero: -0.7 },
        peso: (s) => 0.4 + s.regimen.capacidadEstatal * 2,
        aplicar: (s, rng, api) => {
          api.flag('control_cambios'); api.flag('iapi');
          api.efectos({
            'nacion.economia.inflacion': -0.12, 'nacion.economia.salarioReal': 0.08,
            'nacion.economia.gini': -0.05, 'nacion.economia.balanzaComercial': 0.08,
            'nacion.social.pobreza': -0.06,
          });
          s.presiones.golpe = Math.min(1, s.presiones.golpe + 0.2);
          api.modificador({ id: 'pacto_social', etiqueta: 'Pacto social vigente', años: 8,
            efectos: { 'nacion.economia.inflacion': -0.006, 'nacion.economia.gini': -0.002 } });
        },
        consecuencia: 'Administrar la puja distributiva funciona mientras el Estado tenga fuerza para hacerla cumplir de los dos lados.',
      },
      {
        id: 'rodrigazo', texto: 'Devaluación y sinceramiento brusco',
        resumen: 'Se libera todo de golpe: el tipo de cambio, las tarifas y los precios.',
        historica: true,
        actores: { oligarquia: 1, capitalExtranjero: 0.8, sindicatos: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.inflacion': 0.60, 'nacion.economia.salarioReal': -0.25,
            'nacion.economia.tipoCambioReal': 0.25, 'nacion.social.pobreza': 0.12,
            'nacion.economia.crecimiento': -0.05, 'regimen.legitimidad': -0.25,
          });
          s.presiones.social = Math.min(1, s.presiones.social + 0.4);
          s.presiones.golpe = Math.min(1, s.presiones.golpe + 0.3);
          api.modificador({ id: 'inflacion_alta', etiqueta: 'Inflación alta persistente', años: 15,
            efectos: { 'nacion.economia.inflacion': 0.02 } });
        },
        consecuencia: 'La inflación deja de ser un problema y pasa a ser un régimen. Nadie va a poder desactivarla por quince años.',
      },
    ],
  },

  {
    id: 'golpe_1976',
    titulo: 'Golpe de 1976',
    categoria: 'politica', etiquetas: ['golpe', 'represion'],
    año: 1976, ventana: [1975, 1980], canonico: true, peso: 10,
    requiere: (s) => s.regimen.tipo !== 'dictadura',
    narrativa: () => 'Con la economía descontrolada y la violencia política desatada, las Fuerzas Armadas toman el poder con un plan económico escrito de antemano y una lista de nombres.',
    opciones: [
      {
        id: 'dictadura_reestructuracion', texto: 'Dictadura con plan de apertura y disciplinamiento',
        resumen: 'Terrorismo de Estado, reforma financiera, apertura importadora y endeudamiento externo.',
        historica: true,
        actores: { ffaa: 1, oligarquia: 1, capitalExtranjero: 1, iglesia: 0.5, sindicatos: -1, movimientosPopulares: -1 },
        aplicar: (s, rng, api) => {
          api.flag('golpe_militar'); api.flag('terrorismo_estado'); api.flag('librecambio');
          api.flag('violencia_politica', false);
          api.regimen({ tipo: 'dictadura', legitimidad: 0.35, añosEnPoder: 0, signoPolitico: 'militar' });
          s.nacion.ffaa.doctrina = 'seguridadInterior';
          api.efectos({
            'nacion.social.represion': 0.55, 'nacion.social.derechosCiviles': -0.45,
            'nacion.social.derechosPoliticos': -0.45, 'nacion.social.organizacionPopular': -0.35,
            'nacion.social.sindicalizacion': -0.20, 'nacion.social.derechosLaborales': -0.30,
            'nacion.cultura.prensaLibre': -0.45, 'nacion.economia.salarioReal': -0.25,
            'nacion.economia.industrializacion': -0.10, 'nacion.economia.gini': 0.15,
            'nacion.ffaa.poderPolitico': 0.35, 'nacion.educacion.fugaCerebros': 0.30,
            'nacion.deuda.monedaExtranjera': 0.10, 'nacion.economia.informalidad': 0.08,
          });
          api.delta('nacion.demografia.poblacion', -0.030);
          api.actor('ffaa', 0.25); api.actor('sindicatos', -0.25);
          api.actor('oligarquia', 0.15); api.actor('capitalExtranjero', 0.20);
          api.modificador({ id: 'terrorismo_estado', etiqueta: 'Terrorismo de Estado', años: 8,
            efectos: {
              'nacion.social.organizacionPopular': -0.02, 'nacion.social.represion': 0.01,
              'nacion.educacion.cienciaTecnica': -0.006, 'nacion.deuda.fugaCapitales': 0.02,
              'nacion.economia.industrializacion': -0.006,
            } });
          api.modificador({ id: 'secuela_dictadura', etiqueta: 'Secuela del terrorismo de Estado', años: 30,
            efectos: {
              'nacion.social.organizacionPopular': -0.003,
              'nacion.social.cohesion': -0.002,
            } });
        },
        consecuencia: 'La desaparición forzada de personas es el método con que se impone una reestructuración económica que con el movimiento obrero en pie era imposible. La deuda externa se multiplica por seis.',
      },
      {
        id: 'salida_institucional_1976', texto: 'Salida institucional con acuerdo entre partidos',
        resumen: 'Elecciones anticipadas y plan de emergencia acordado.',
        requiere: (s) => s.regimen.legitimidad > 0.3 || s.nacion.cultura.memoriaHistorica > 0.35,
        actores: { clasesMedias: 0.8, sindicatos: 0.7, movimientosPopulares: 0.6, ffaa: -1 },
        peso: (s) => 0.2 + s.regimen.legitimidad * 2 + s.nacion.cultura.memoriaHistorica * 3
          + s.nacion.social.organizacionPopular * 1.5,
        aplicar: (s, rng, api) => {
          api.regimen({ tipo: 'democracia', legitimidad: 0.55, añosEnPoder: 0 });
          api.efectos({
            'nacion.economia.inflacion': -0.15, 'nacion.economia.salarioReal': -0.08,
            'nacion.ffaa.golpismo': -0.15, 'nacion.social.conflictividad': -0.15,
            'nacion.social.derechosPoliticos': 0.10,
          });
          api.flag('violencia_politica', false);
          api.modificador({ id: 'continuidad_76', etiqueta: 'Continuidad institucional', años: 25,
            efectos: { 'nacion.ffaa.golpismo': -0.004, 'nacion.economia.industrializacion': 0.002 } });
        },
        consecuencia: 'La crisis económica se resuelve mal y despacio, y el país conserva su industria, sus científicos y treinta mil personas.',
      },
    ],
  },

  {
    id: 'valorizacion_financiera',
    titulo: 'Reforma financiera y "tablita" cambiaria',
    categoria: 'deuda', etiquetas: ['deuda', 'fuga'],
    año: 1977, ventana: [1976, 1983], canonico: true, peso: 8,
    requiere: (s) => s.regimen.tipo === 'dictadura' || s.flags.librecambio,
    narrativa: () => 'Se liberaliza la tasa de interés y se anuncia por anticipado el valor del dólar. Con tasas locales altísimas y dólar barato asegurado, el negocio es endeudarse afuera, colocar adentro y después comprar dólares.',
    opciones: [
      {
        id: 'plata_dulce', texto: 'Apertura financiera con tipo de cambio pautado',
        resumen: 'Entra deuda, se valoriza en tasa y se fuga. Queda el pasivo.',
        historica: true,
        actores: { capitalExtranjero: 1, oligarquia: 0.9, burguesiaIndustrial: -1, sindicatos: -0.8 },
        aplicar: (s, rng, api) => {
          api.flag('fuga_capitales');
          const pbi = s.nacion.economia.pbiPerCapita * s.nacion.demografia.poblacion / 1000;
          api.delta('nacion.deuda.deudaExterna', Math.max(4, pbi * 0.35));
          api.efectos({
            'nacion.deuda.fugaCapitales': 0.40, 'nacion.deuda.monedaExtranjera': 0.10,
            'nacion.economia.industrializacion': -0.12, 'nacion.economia.tipoCambioReal': -0.20,
            'nacion.economia.concentracion': 0.12, 'nacion.economia.desempleo': 0.05,
          });
          api.modificador({ id: 'valorizacion', etiqueta: 'Valorización financiera', años: 7,
            efectos: {
              'nacion.deuda.fugaCapitales': 0.02, 'nacion.economia.industrializacion': -0.005,
              'nacion.deuda.deudaExterna': 2.5,
            } });
        },
        consecuencia: 'La deuda no financió ninguna fábrica ni ninguna ruta: financió su propia fuga.',
      },
      {
        id: 'control_financiero', texto: 'Mantener regulado el sistema financiero',
        resumen: 'Crédito dirigido, control de cambios y encajes altos.',
        actores: { burguesiaIndustrial: 1, sindicatos: 0.6, capitalExtranjero: -1 },
        peso: (s) => 0.3 + s.regimen.capacidadEstatal * 2 + s.nacion.exterior.autonomia * 2,
        aplicar: (s, rng, api) => {
          api.flag('control_cambios');
          api.efectos({
            'nacion.deuda.fugaCapitales': -0.20, 'nacion.economia.industrializacion': 0.05,
            'nacion.economia.reservas': 0.06, 'nacion.exterior.ied': -0.05,
          });
        },
        consecuencia: 'Sin bicicleta financiera el capital se aburre, y algo tiene que producir para ganar.',
      },
    ],
  },

  {
    id: 'estatizacion_deuda_privada',
    titulo: 'Estatización de la deuda privada',
    categoria: 'deuda', etiquetas: ['deuda', 'soberania'],
    año: 1982, ventana: [1981, 1985], canonico: true, peso: 8,
    requiere: (s) => s.nacion.deuda.deudaExterna > 5,
    narrativa: () => 'Los grupos económicos locales y las filiales extranjeras están endeudados en dólares y no pueden pagar. Se ofrece un seguro de cambio que traslada el pasivo al Estado.',
    opciones: [
      {
        id: 'estatizar', texto: 'Estatizar la deuda privada',
        historica: true,
        actores: { oligarquia: 1, capitalExtranjero: 1, sindicatos: -1, movimientosPopulares: -1 },
        aplicar: (s, rng, api) => {
          const traspaso = Math.max(3, s.nacion.deuda.deudaExterna * 0.25);
          api.delta('nacion.deuda.deudaExterna', traspaso);
          api.efectos({
            'nacion.deuda.monedaExtranjera': 0.08, 'nacion.deuda.condicionalidad': 0.10,
            'nacion.economia.deficitFiscal': 0.03, 'regimen.corrupcion': 0.10,
            'nacion.economia.concentracion': 0.08,
          });
          api.actor('oligarquia', 0.10);
        },
        consecuencia: 'Las ganancias fueron privadas y las pérdidas quedaron a nombre de todos. La deuda que se paga hasta hoy nació acá.',
      },
      {
        id: 'no_estatizar', texto: 'Dejar que las empresas afronten su deuda',
        actores: { clasesMedias: 0.7, sindicatos: 0.8, oligarquia: -1, capitalExtranjero: -1 },
        peso: (s) => 0.3 + s.regimen.democracia * 3 + s.nacion.exterior.soberania * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.crecimiento': -0.04, 'nacion.economia.desempleo': 0.04,
            'nacion.economia.concentracion': -0.06, 'nacion.deuda.condicionalidad': -0.05,
          });
          api.actor('oligarquia', -0.12);
        },
        consecuencia: 'Quiebran grupos económicos enteros y el Estado no hereda una deuda que nunca contrajo.',
      },
    ],
  },

  {
    id: 'malvinas_1982',
    titulo: 'Malvinas',
    categoria: 'exterior', etiquetas: ['guerra', 'soberania'],
    año: 1982, ventana: [1980, 1984], canonico: true, peso: 8,
    requiere: (s) => s.flags.malvinas_ocupadas,
    narrativa: () => 'El régimen, deslegitimado y con la calle en su contra, mira al Atlántico Sur.',
    opciones: [
      {
        id: 'guerra_malvinas', texto: 'Recuperar las islas por la fuerza',
        resumen: 'Desembarco, guerra con una potencia de la OTAN, derrota en diez semanas.',
        historica: true,
        actores: { ffaa: 1, movimientosPopulares: 0.3, capitalExtranjero: -0.7 },
        peso: (s) => 0.6 + (1 - s.regimen.legitimidad) * 3 + s.nacion.ffaa.poderPolitico * 2,
        aplicar: (s, rng, api) => {
          api.flag('guerra_malvinas');
          s.nacion.ffaa.conflictosActivos.push('malvinas');
          const gana = rng.chance(Math.min(0.12, s.nacion.ffaa.capacidadMilitar * 0.25));
          if (gana) {
            api.flag('malvinas_recuperadas'); api.flag('malvinas_ocupadas', false);
            api.efectos({
              'nacion.exterior.soberania': 0.15, 'nacion.exterior.prestigio': 0.15,
              'regimen.legitimidad': 0.20, 'nacion.ffaa.poderPolitico': 0.15,
            });
          } else {
            api.efectos({
              'nacion.exterior.prestigio': -0.15, 'regimen.legitimidad': -0.30,
              'nacion.ffaa.poderPolitico': -0.30, 'nacion.ffaa.golpismo': -0.25,
              'nacion.ffaa.tutelaje': -0.25, 'nacion.economia.reservas': -0.12,
              'nacion.exterior.dependenciaComercial': -0.05,
            });
            api.actor('ffaa', -0.25);
            s.presiones.social = Math.min(1, s.presiones.social + 0.45);
          }
          api.delta('nacion.demografia.poblacion', -0.001);
          s.nacion.ffaa.conflictosActivos = s.nacion.ffaa.conflictosActivos.filter((c) => c !== 'malvinas');
        },
        consecuencia: 'La derrota militar termina con la dictadura, y también con la posibilidad de reclamar las islas por otra vía durante décadas.',
      },
      {
        id: 'negociacion_malvinas', texto: 'Sostener la negociación diplomática',
        resumen: 'Se profundiza el reclamo en los foros internacionales y se buscan acuerdos de cooperación.',
        actores: { clasesMedias: 0.6, organismosInternacionales: 0.3, ffaa: -0.8 },
        peso: (s) => 0.4 + s.regimen.democracia * 3 + s.nacion.exterior.prestigio * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.exterior.prestigio': 0.08, 'nacion.exterior.conflictoLimitrofe': -0.10,
            'nacion.exterior.integracionRegional': 0.06,
          });
          api.modificador({ id: 'reclamo_diplomatico', etiqueta: 'Reclamo diplomático sostenido', años: 40,
            efectos: { 'nacion.exterior.prestigio': 0.001 } });
        },
        consecuencia: 'El reclamo sigue abierto, sin muertos y sin plazo.',
      },
    ],
  },

  // ---- No canónicos ----
  {
    id: 'plan_estabilizacion',
    titulo: 'Plan de estabilización',
    categoria: 'economia', etiquetas: ['inflacion'],
    ventana: [1952, 2100], unaVez: false, enfriamiento: 6, canonico: false, probabilidad: 0.55,
    peso: (s) => s.presiones.inflacionaria * 3 + Math.min(3, s.nacion.economia.inflacion * 4),
    requiere: (s) => s.nacion.economia.inflacion > 0.25,
    narrativa: () => 'La inflación se volvió el tema de todas las conversaciones. Hay que hacer algo.',
    opciones: [
      {
        id: 'ancla_cambiaria', texto: 'Anclar el tipo de cambio',
        resumen: 'Se frena la inflación con dólar quieto, a costa de atrasar el tipo de cambio.',
        actores: { capitalExtranjero: 0.8, oligarquia: 0.4, clasesMedias: 0.6, burguesiaIndustrial: -0.6 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.inflacion': -0.30, 'nacion.economia.tipoCambioReal': -0.15,
            'nacion.economia.salarioReal': 0.05, 'nacion.economia.balanzaComercial': -0.08,
          });
          api.modificador({ id: 'ancla', etiqueta: 'Ancla cambiaria', años: 5,
            efectos: { 'nacion.economia.inflacion': -0.02, 'nacion.economia.reservas': -0.012 } });
        },
        consecuencia: 'Funciona hasta que se acaban las reservas. Siempre se acaban las reservas.',
      },
      {
        id: 'acuerdo_precios', texto: 'Acuerdo de precios e ingresos',
        resumen: 'Concertación entre sindicatos, empresarios y Estado.',
        requiere: (s) => s.regimen.capacidadEstatal > 0.35 && s.actores.sindicatos > 0.2,
        actores: { sindicatos: 0.9, burguesiaIndustrial: 0.6, clasesMedias: 0.4, oligarquia: -0.5 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.inflacion': -0.22, 'nacion.economia.salarioReal': 0.03,
            'nacion.social.conflictividad': -0.06, 'nacion.economia.gini': -0.02,
          });
        },
        consecuencia: 'Ordenar la puja distributiva sin licuar salarios es posible y dura lo que dure la confianza.',
      },
      {
        id: 'ajuste_recesivo', texto: 'Ajuste monetario y fiscal duro',
        resumen: 'Se corta la emisión y el gasto; la recesión hace el resto.',
        actores: { organismosInternacionales: 1, capitalExtranjero: 0.8, oligarquia: 0.6, sindicatos: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.inflacion': -0.25, 'nacion.economia.crecimiento': -0.05,
            'nacion.economia.desempleo': 0.06, 'nacion.social.pobreza': 0.08,
            'nacion.economia.deficitFiscal': -0.025,
          });
          s.presiones.social = Math.min(1, s.presiones.social + 0.25);
        },
        consecuencia: 'Bajar la inflación rompiendo la economía funciona, en el mismo sentido en que apagar un incendio inundando la casa funciona.',
      },
    ],
  },

  {
    id: 'programa_nuclear',
    titulo: 'Programa nuclear y tecnológico',
    categoria: 'educacion', etiquetas: ['ciencia', 'energia'],
    ventana: [1950, 2000], canonico: false, probabilidad: 0.4, peso: 2,
    requiere: (s) => s.nacion.educacion.cienciaTecnica > 0.2 && !s.flags.energia_nuclear,
    narrativa: () => 'Se propone dominar el ciclo del combustible nuclear con desarrollo propio, en vez de comprar centrales llave en mano.',
    opciones: [
      {
        id: 'desarrollo_nuclear', texto: 'Desarrollo nuclear con tecnología propia',
        actores: { ffaa: 0.7, clasesMedias: 0.7, burguesiaIndustrial: 0.6, capitalExtranjero: -0.6 },
        aplicar: (s, rng, api) => {
          api.flag('energia_nuclear'); api.flag('invap');
          api.efectos({
            'nacion.educacion.cienciaTecnica': 0.12, 'nacion.infraestructura.energia': 0.10,
            'nacion.ffaa.industriaMilitar': 0.08, 'nacion.exterior.prestigio': 0.10,
            'nacion.economia.diversificacion': 0.05, 'nacion.economia.deficitFiscal': 0.008,
          });
          api.modificador({ id: 'nuclear', etiqueta: 'Capacidades nucleares', años: 40,
            efectos: {
              'nacion.educacion.cienciaTecnica': 0.002,
              'nacion.infraestructura.energia': 0.002,
            } });
        },
        consecuencia: 'Dominar una tecnología entera deja ingenieros, proveedores y capacidad de exportar reactores.',
      },
      {
        id: 'comprar_llave_en_mano', texto: 'Comprar centrales llave en mano',
        actores: { capitalExtranjero: 1, oligarquia: 0.3, clasesMedias: -0.3 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.infraestructura.energia': 0.12, 'nacion.deuda.deudaExterna': 1.5,
            'nacion.educacion.cienciaTecnica': -0.02, 'nacion.exterior.ied': 0.04,
          });
        },
        consecuencia: 'Se enciende la luz más rápido y no queda nadie que sepa cómo se hizo.',
      },
    ],
  },
];
