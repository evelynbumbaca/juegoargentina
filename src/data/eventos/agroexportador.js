// 1880-1943 · Modelo agroexportador, democracia ampliada y restauración.
//
// El país más rico de su historia relativa, y el que menos hace con esa
// riqueza. Acá se decide si la renta agraria financia un desarrollo o
// simplemente se consume y se gira.

export default [
  {
    id: 'ley_1420',
    titulo: 'Ley 1420 de educación común',
    categoria: 'educacion', etiquetas: ['ley', 'educacion'],
    año: 1884, ventana: [1882, 1892], canonico: true, peso: 8,
    requiere: (s) => s.flags.constitucion_sancionada,
    narrativa: () => 'El Congreso discute si la escuela primaria debe ser gratuita, obligatoria y laica. La Iglesia se opone con todo lo que tiene.',
    opciones: [
      {
        id: 'sancionar_1420', texto: 'Sancionar la ley: gratuita, obligatoria y laica',
        resumen: 'El Estado se hace cargo de alfabetizar a todo el mundo, incluidos los hijos de inmigrantes.',
        historica: true,
        actores: { clasesMedias: 1, iglesia: -1, oligarquia: 0.2 },
        aplicar: (s, rng, api) => {
          api.flag('ley_1420'); api.flag('educacion_laica');
          api.efectos({
            'nacion.educacion.gastoPbi': 0.010, 'nacion.educacion.primaria': 0.15,
            'nacion.educacion.calidad': 0.08, 'nacion.cultura.identidad': 0.08,
          });
          api.actor('iglesia', -0.12); api.actor('clasesMedias', 0.06);
          api.modificador({ id: 'ley1420', etiqueta: 'Escuela común', años: 50,
            efectos: {
              'nacion.educacion.alfabetizacion': 0.011, 'nacion.educacion.primaria': 0.009,
              'nacion.educacion.brechaRegional': -0.003,
            } });
        },
        consecuencia: 'En treinta años el país pasa de no saber leer a tener una de las tasas de alfabetización más altas del mundo.',
      },
      {
        id: 'educacion_confesional', texto: 'Educación con enseñanza religiosa obligatoria',
        resumen: 'La Iglesia conserva el control de los contenidos.',
        actores: { iglesia: 1, oligarquia: 0.5, clasesMedias: -0.6 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.educacion.primaria': 0.07, 'nacion.educacion.gastoPbi': 0.004,
            'nacion.social.derechosCiviles': -0.04, 'nacion.cultura.cienciaSocial': -0.03,
          });
          api.actor('iglesia', 0.12);
        },
        consecuencia: 'Se alfabetiza igual, más despacio, y la escuela no logra integrar al que viene de afuera.',
      },
    ],
  },

  {
    id: 'crisis_1890',
    titulo: 'Crisis de 1890',
    categoria: 'deuda', etiquetas: ['crisis', 'deuda'],
    año: 1890, ventana: [1889, 1895], canonico: true, peso: 9,
    requiere: (s) => s.nacion.deuda.deudaExterna > 0.01 || s.flags.emprestito_baring,
    narrativa: () => 'Años de cédulas hipotecarias, bancos garantidos y emisión sin respaldo terminan de golpe. La Baring, otra vez, queda al borde de la quiebra y Londres corta el crédito.',
    opciones: [
      {
        id: 'arreglo_acreedores', texto: 'Arreglo con los acreedores y ajuste interno',
        resumen: 'Se refinancia con la banca inglesa a cambio de garantizar el servicio con la renta aduanera.',
        historica: true,
        actores: { capitalExtranjero: 1, oligarquia: 0.7, organismosInternacionales: 0.5, sindicatos: -0.8 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.deuda.condicionalidad': 0.15, 'nacion.deuda.tasaInteres': 0.01,
            'nacion.economia.deficitFiscal': -0.02, 'nacion.economia.crecimiento': -0.04,
            'nacion.social.pobreza': 0.06, 'nacion.economia.salarioReal': -0.08,
            'nacion.exterior.soberania': -0.08,
          });
          api.modificador({ id: 'arreglo_1890', etiqueta: 'Servicio garantizado de la deuda', años: 12,
            efectos: { 'nacion.economia.crecimiento': -0.003, 'nacion.deuda.servicioDeuda': 0.01 } });
          s.presiones.social = Math.min(1, s.presiones.social + 0.3);
        },
        consecuencia: 'El crédito vuelve y la aduana queda comprometida por una década. El ajuste lo paga el que no participó de la fiesta.',
      },
      {
        id: 'cesacion_1890', texto: 'Suspender los pagos y renegociar con quita',
        resumen: 'Se declara la cesación y se negocia desde la necesidad.',
        actores: { burguesiaIndustrial: 0.6, movimientosPopulares: 0.7, capitalExtranjero: -1 },
        peso: (s) => 0.4 + s.nacion.exterior.autonomia * 2.5,
        aplicar: (s, rng, api) => {
          api.flag('default_deuda');
          s.nacion.deuda.defaults.push(s.año);
          api.delta('nacion.deuda.deudaExterna', -s.nacion.deuda.deudaExterna * 0.35);
          api.efectos({
            'nacion.deuda.riesgoPais': 0.30, 'nacion.exterior.ied': -0.08,
            'nacion.economia.crecimiento': -0.05, 'nacion.exterior.soberania': 0.05,
            'nacion.economia.salarioReal': -0.04,
          });
        },
        consecuencia: 'La quita alivia el balance y cierra el mercado de Londres por años. El modelo entero depende de ese mercado.',
      },
      {
        id: 'banco_estatal_1890', texto: 'Reorganizar el sistema financiero bajo control estatal',
        resumen: 'Se liquidan los bancos garantidos y se crea una autoridad monetaria pública.',
        requiere: (s) => s.regimen.capacidadEstatal > 0.35,
        actores: { clasesMedias: 0.7, burguesiaIndustrial: 0.6, oligarquia: -0.5, capitalExtranjero: -0.7 },
        peso: (s) => 0.3 + s.regimen.capacidadEstatal * 2,
        aplicar: (s, rng, api) => {
          api.flag('banco_central');
          api.efectos({
            'nacion.economia.capacidadFiscal': 0.06, 'regimen.capacidadEstatal': 0.06,
            'nacion.economia.crecimiento': -0.03, 'nacion.deuda.fugaCapitales': -0.08,
            'nacion.economia.informalidad': -0.04,
          });
        },
        consecuencia: 'Se pierde menos plata en la próxima crisis, que llega igual.',
      },
    ],
  },

  {
    id: 'ley_residencia',
    titulo: 'La cuestión obrera',
    categoria: 'social', etiquetas: ['conflicto', 'ley'],
    año: 1902, ventana: [1896, 1912], canonico: true, peso: 6,
    narrativa: () => 'Anarquistas y socialistas organizan a los obreros del puerto, los talleres y los frigoríficos. Las huelgas paran la exportación.',
    opciones: [
      {
        id: 'ley_residencia_si', texto: 'Ley de Residencia: expulsar extranjeros "indeseables"',
        resumen: 'Se deporta sin juicio a los dirigentes gremiales nacidos en el exterior.',
        historica: true,
        actores: { oligarquia: 1, portuarios: 0.8, capitalExtranjero: 0.6, sindicatos: -1, movimientosPopulares: -1 },
        aplicar: (s, rng, api) => {
          api.flag('ley_residencia');
          api.efectos({
            'nacion.social.represion': 0.15, 'nacion.social.sindicalizacion': -0.05,
            'nacion.social.derechosCiviles': -0.10, 'nacion.social.derechosLaborales': -0.03,
            'nacion.social.conflictividad': 0.08,
          });
          api.actor('sindicatos', -0.06);
        },
        consecuencia: 'Se puede deportar a los dirigentes; el problema que los produjo se queda.',
      },
      {
        id: 'legislacion_laboral', texto: 'Legislación laboral y reconocimiento sindical',
        resumen: 'Jornada limitada, descanso dominical, y sindicatos con personería.',
        actores: { sindicatos: 1, clasesMedias: 0.6, burguesiaIndustrial: 0.2, oligarquia: -0.8 },
        peso: (s) => 0.4 + s.actores.sindicatos * 2.5 + s.nacion.social.organizacionPopular * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.social.derechosLaborales': 0.14, 'nacion.social.sindicalizacion': 0.08,
            'nacion.social.conflictividad': -0.10, 'nacion.economia.salarioReal': 0.05,
            'nacion.social.cohesion': 0.06,
          });
          api.actor('sindicatos', 0.08);
          api.flag('paritarias');
          api.modificador({ id: 'derecho_laboral', etiqueta: 'Legislación laboral temprana', años: 30,
            efectos: { 'nacion.social.derechosLaborales': 0.004, 'nacion.social.pobreza': -0.002 } });
        },
        consecuencia: 'Canalizar el conflicto en instituciones es más lento que reprimirlo y mucho más barato.',
      },
    ],
  },

  {
    id: 'grito_alcorta',
    titulo: 'Grito de Alcorta',
    categoria: 'tierra', etiquetas: ['tierra', 'conflicto'],
    año: 1912, ventana: [1910, 1922], canonico: true, peso: 7,
    requiere: (s) => s.nacion.tierra.arrendamiento > 0.3,
    narrativa: () => 'Los chacareros arrendatarios del sur de Santa Fe se niegan a levantar la cosecha. Piden contratos más largos, rebaja del canon y libertad para vender donde quieran.',
    opciones: [
      {
        id: 'ley_arrendamientos', texto: 'Ley de arrendamientos rurales',
        resumen: 'Plazos mínimos, tope al canon y derecho a mejoras.',
        historica: true,
        actores: { movimientosPopulares: 0.9, clasesMedias: 0.6, oligarquia: -1 },
        aplicar: (s, rng, api) => {
          api.flag('arrendamientos_regulados');
          api.efectos({
            'nacion.tierra.arrendamiento': -0.08, 'nacion.tierra.chacras': 0.06,
            'nacion.tierra.giniTierra': -0.04, 'nacion.economia.gini': -0.03,
            'nacion.recursos.agro': 0.05,
          });
          api.actor('oligarquia', -0.05);
          api.modificador({ id: 'chacareros', etiqueta: 'Chacareros con contrato', años: 25,
            efectos: { 'nacion.tierra.chacras': 0.002, 'nacion.economia.diversificacion': 0.001 } });
        },
        consecuencia: 'El chacarero que puede planificar a cinco años invierte, compra máquinas y manda los hijos a la escuela.',
      },
      {
        id: 'reforma_agraria_1912', texto: 'Impuesto progresivo a la renta potencial de la tierra',
        resumen: 'Se grava la tierra ociosa para forzar su puesta en producción o su venta.',
        requiere: (s) => s.regimen.capacidadEstatal > 0.4 && s.actores.movimientosPopulares > 0.25,
        actores: { movimientosPopulares: 1, clasesMedias: 0.7, burguesiaIndustrial: 0.5, oligarquia: -1 },
        peso: (s) => 0.2 + s.nacion.social.organizacionPopular * 3,
        aplicar: (s, rng, api) => {
          api.flag('reforma_agraria');
          api.efectos({
            'nacion.tierra.giniTierra': -0.12, 'nacion.tierra.latifundio': -0.12,
            'nacion.tierra.chacras': 0.14, 'nacion.economia.capacidadFiscal': 0.08,
            'nacion.economia.gini': -0.08, 'nacion.recursos.agro': 0.08,
          });
          api.actor('oligarquia', -0.18);
          s.presiones.golpe = Math.min(1, s.presiones.golpe + 0.25);
          api.modificador({ id: 'reforma_agraria', etiqueta: 'Reforma agraria', años: 30,
            efectos: {
              'nacion.tierra.giniTierra': -0.004, 'nacion.economia.gini': -0.002,
              'nacion.economia.diversificacion': 0.002, 'nacion.educacion.primaria': 0.002,
            } });
        },
        consecuencia: 'Tocar la renta de la tierra cambia el país entero y pone a la clase propietaria a buscar salidas por fuera de las urnas.',
      },
      {
        id: 'desalojo', texto: 'Desalojar a los arrendatarios en huelga',
        resumen: 'La policía provincial garantiza la cosecha.',
        actores: { oligarquia: 1, portuarios: 0.4, movimientosPopulares: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.tierra.arrendamiento': 0.06, 'nacion.tierra.giniTierra': 0.04,
            'nacion.social.represion': 0.08, 'nacion.social.conflictividad': 0.10,
          });
          api.actor('oligarquia', 0.06);
        },
        consecuencia: 'La cosecha se levanta. El campo argentino queda sin clase media rural.',
      },
    ],
  },

  {
    id: 'saenz_peña',
    titulo: 'Ley Sáenz Peña',
    categoria: 'politica', etiquetas: ['democracia', 'ley'],
    año: 1912, ventana: [1910, 1918], canonico: true, peso: 8,
    narrativa: () => 'El régimen conservador evalúa abrir el juego electoral antes de que se lo abran por la fuerza.',
    opciones: [
      {
        id: 'voto_secreto', texto: 'Voto secreto, universal y obligatorio (masculino)',
        resumen: 'Padrón militar, cuarto oscuro y fin del fraude organizado.',
        historica: true,
        actores: { clasesMedias: 1, oligarquia: -0.3, movimientosPopulares: 0.6 },
        aplicar: (s, rng, api) => {
          api.flag('voto_secreto');
          api.regimen({ tipo: 'democracia_restringida', legitimidad: 0.65, añosEnPoder: 0 });
          api.efectos({
            'nacion.social.derechosPoliticos': 0.25, 'regimen.participacion': 0.20,
            'nacion.cultura.prensaLibre': 0.08,
          });
          api.actor('clasesMedias', 0.12);
        },
        consecuencia: 'Las clases medias urbanas llegan al gobierno. La estructura económica no se entera.',
      },
      {
        id: 'voto_universal_pleno', texto: 'Sufragio universal incluyendo a las mujeres',
        resumen: 'Se amplía el padrón a toda la población adulta y a los extranjeros naturalizados.',
        requiere: (s) => s.nacion.social.genero > 0.12,
        actores: { clasesMedias: 0.9, movimientosPopulares: 1, iglesia: -0.5, oligarquia: -0.6 },
        peso: (s) => 0.2 + s.nacion.social.genero * 4,
        aplicar: (s, rng, api) => {
          api.flag('voto_secreto'); api.flag('voto_femenino');
          api.regimen({ tipo: 'democracia', legitimidad: 0.7, añosEnPoder: 0 });
          api.efectos({
            'nacion.social.derechosPoliticos': 0.35, 'nacion.social.genero': 0.20,
            'regimen.participacion': 0.30, 'nacion.social.derechosCiviles': 0.10,
          });
          api.modificador({ id: 'sufragio_pleno', etiqueta: 'Sufragio pleno', años: 40,
            efectos: { 'nacion.social.genero': 0.003, 'nacion.social.derechosCiviles': 0.002 } });
        },
        consecuencia: 'Adelantar el voto femenino treinta y cinco años cambia qué políticas se vuelven pensables.',
      },
      {
        id: 'fraude_continuado', texto: 'Sostener el régimen restringido',
        resumen: 'Se mantiene el voto cantado y la maquinaria electoral conservadora.',
        actores: { oligarquia: 1, portuarios: 0.6, clasesMedias: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.social.derechosPoliticos': -0.06, 'regimen.legitimidad': -0.10,
            'regimen.corrupcion': 0.08, 'nacion.social.conflictividad': 0.10,
          });
          s.presiones.social = Math.min(1, s.presiones.social + 0.2);
        },
        consecuencia: 'Cerrar la puerta institucional no hace desaparecer la presión: la manda a la calle.',
      },
    ],
  },

  {
    id: 'reforma_universitaria',
    titulo: 'Reforma Universitaria',
    categoria: 'educacion', etiquetas: ['educacion', 'derechos'],
    año: 1918, ventana: [1916, 1926], canonico: true, peso: 6,
    requiere: (s) => s.nacion.educacion.superior > 0.01,
    narrativa: () => 'Los estudiantes de Córdoba toman la universidad y le hablan a los hombres libres de Sudamérica.',
    opciones: [
      {
        id: 'autonomia_cogobierno', texto: 'Autonomía, cogobierno y concursos abiertos',
        resumen: 'La universidad se independiza del poder político y de la Iglesia.',
        historica: true,
        actores: { clasesMedias: 1, iglesia: -1, oligarquia: -0.5 },
        aplicar: (s, rng, api) => {
          api.flag('reforma_universitaria');
          api.efectos({
            'nacion.educacion.universidadPublica': 0.25, 'nacion.educacion.superior': 0.03,
            'nacion.educacion.calidad': 0.10, 'nacion.cultura.cienciaSocial': 0.10,
            'nacion.exterior.prestigio': 0.06,
          });
          api.actor('iglesia', -0.08); api.actor('clasesMedias', 0.08);
          api.modificador({ id: 'reforma_univ', etiqueta: 'Universidad reformista', años: 60,
            efectos: { 'nacion.educacion.cienciaTecnica': 0.003, 'nacion.educacion.superior': 0.002 } });
        },
        consecuencia: 'Una universidad que elige a sus profesores por concurso produce ciencia; una que los hereda, produce apellidos.',
      },
      {
        id: 'represion_universitaria', texto: 'Intervenir las universidades',
        resumen: 'Se desaloja la toma y se sostiene el gobierno vitalicio de las academias.',
        actores: { iglesia: 1, oligarquia: 0.8, clasesMedias: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.educacion.universidadPublica': -0.05, 'nacion.educacion.calidad': -0.06,
            'nacion.social.represion': 0.06, 'nacion.cultura.cienciaSocial': -0.06,
          });
        },
        consecuencia: 'La universidad sigue siendo un club. La ciencia argentina arranca medio siglo más tarde.',
      },
    ],
  },

  {
    id: 'represion_obrera',
    titulo: 'Semana Trágica y Patagonia rebelde',
    categoria: 'social', etiquetas: ['conflicto', 'represion'],
    año: 1919, ventana: [1918, 1925], canonico: true, peso: 6,
    requiere: (s) => s.nacion.social.sindicalizacion > 0.05,
    narrativa: () => 'Una huelga metalúrgica en Buenos Aires y otra de peones rurales en Santa Cruz ponen a prueba a un gobierno que llegó con los votos obreros.',
    opciones: [
      {
        id: 'represion_1919', texto: 'Reprimir con el ejército y grupos de choque',
        resumen: 'Cientos de muertos en Buenos Aires; fusilamientos masivos en la Patagonia.',
        historica: true,
        actores: { oligarquia: 1, ffaa: 0.9, capitalExtranjero: 0.7, sindicatos: -1, movimientosPopulares: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.social.represion': 0.20, 'nacion.social.sindicalizacion': -0.06,
            'nacion.social.derechosCiviles': -0.08, 'nacion.social.cohesion': -0.10,
            'nacion.ffaa.poderPolitico': 0.08, 'regimen.legitimidad': -0.12,
          });
          api.delta('nacion.demografia.poblacion', -0.002);
          api.actor('ffaa', 0.08); api.actor('sindicatos', -0.08);
        },
        consecuencia: 'Un gobierno elegido por el voto popular usa el ejército contra los obreros: el precedente queda establecido.',
      },
      {
        id: 'mediacion_1919', texto: 'Mediar y arbitrar el conflicto',
        resumen: 'El gobierno impone un laudo con mejoras salariales y reconocimiento gremial.',
        actores: { sindicatos: 1, clasesMedias: 0.5, oligarquia: -0.9, ffaa: -0.5 },
        peso: (s) => 0.4 + s.actores.sindicatos * 2 + s.regimen.democracia * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.social.derechosLaborales': 0.12, 'nacion.social.sindicalizacion': 0.06,
            'nacion.economia.salarioReal': 0.05, 'nacion.social.cohesion': 0.08,
            'nacion.social.conflictividad': -0.12,
          });
          api.actor('sindicatos', 0.08); api.actor('oligarquia', -0.05);
          s.presiones.golpe = Math.min(1, s.presiones.golpe + 0.10);
        },
        consecuencia: 'La clase propietaria descubre que este gobierno no le garantiza la mano de obra barata, y empieza a buscar otro.',
      },
    ],
  },

  {
    id: 'ypf_mosconi',
    titulo: 'El petróleo: YPF',
    categoria: 'recursos', etiquetas: ['recursos', 'soberania'],
    año: 1922, ventana: [1910, 1935], canonico: true, peso: 8,
    narrativa: () => 'Se descubrió petróleo en Comodoro Rivadavia. Las compañías internacionales ofrecen explotarlo pagando regalías; hay quien propone que lo haga el Estado, integrando desde el pozo hasta el surtidor.',
    opciones: [
      {
        id: 'ypf_estatal', texto: 'Petrolera estatal integrada',
        resumen: 'El Estado explora, extrae, refina y vende. Reserva del subsuelo para la Nación.',
        historica: true,
        actores: { ffaa: 0.8, clasesMedias: 0.7, burguesiaIndustrial: 0.6, capitalExtranjero: -1, oligarquia: -0.3 },
        aplicar: (s, rng, api) => {
          api.flag('ypf_creada'); api.flag('petroleo_descubierto');
          api.efectos({
            'nacion.recursos.petroleo': 0.25, 'nacion.recursos.controlNacional': 0.15,
            'nacion.infraestructura.energia': 0.10, 'nacion.exterior.soberania': 0.10,
            'nacion.economia.balanzaComercial': 0.05, 'regimen.capacidadEstatal': 0.05,
          });
          for (const p of api.provincias((p) => p.aptitud.petroleo > 0.4)) {
            p.desarrollo = Math.min(1, p.desarrollo + 0.06);
            p.integracion = Math.min(1, p.integracion + 0.1);
          }
          api.modificador({ id: 'ypf', etiqueta: 'YPF en expansión', años: 50,
            efectos: {
              'nacion.recursos.petroleo': 0.006, 'nacion.infraestructura.energia': 0.004,
              'nacion.educacion.formacionTecnica': 0.002,
            } });
        },
        consecuencia: 'La primera petrolera estatal integrada del mundo fuera de la Unión Soviética. Ahorra divisas y forma ingenieros.',
      },
      {
        id: 'concesiones_petroleo', texto: 'Concesiones a compañías extranjeras',
        resumen: 'Explotación rápida a cambio de regalías.',
        actores: { capitalExtranjero: 1, oligarquia: 0.6, portuarios: 0.4, ffaa: -0.6 },
        aplicar: (s, rng, api) => {
          api.flag('petroleo_descubierto');
          api.efectos({
            'nacion.recursos.petroleo': 0.30, 'nacion.recursos.controlNacional': -0.20,
            'nacion.exterior.controlExtranjeroRecursos': 0.15, 'nacion.exterior.ied': 0.10,
            'nacion.exterior.soberania': -0.10, 'nacion.infraestructura.energia': 0.12,
          });
          api.actor('capitalExtranjero', 0.12);
          api.modificador({ id: 'concesion_petrolera', etiqueta: 'Petróleo concesionado', años: 40,
            efectos: { 'nacion.exterior.giroUtilidades': 0.002, 'nacion.recursos.rentaExtractiva': 0.003 } });
        },
        consecuencia: 'Sale más rápido y más barato. La renta se va por el mismo caño que el crudo.',
      },
      {
        id: 'petroleo_mixto', texto: 'Empresa mixta con mayoría estatal',
        resumen: 'Tecnología y capital de afuera, control y renta adentro.',
        actores: { burguesiaIndustrial: 0.8, clasesMedias: 0.5, capitalExtranjero: 0.3, ffaa: 0.4 },
        peso: 0.8,
        aplicar: (s, rng, api) => {
          api.flag('ypf_creada'); api.flag('petroleo_descubierto');
          api.efectos({
            'nacion.recursos.petroleo': 0.28, 'nacion.recursos.controlNacional': 0.06,
            'nacion.infraestructura.energia': 0.12, 'nacion.exterior.ied': 0.05,
            'nacion.educacion.cienciaTecnica': 0.04,
          });
          api.modificador({ id: 'petroleo_mixto', etiqueta: 'Petróleo de gestión mixta', años: 40,
            efectos: { 'nacion.recursos.petroleo': 0.005, 'nacion.infraestructura.energia': 0.003 } });
        },
        consecuencia: 'El esquema mixto funciona mientras el Estado tenga con qué controlar al socio.',
      },
    ],
  },

  {
    id: 'crisis_1930',
    titulo: 'La crisis mundial y el golpe de 1930',
    categoria: 'politica', etiquetas: ['crisis', 'golpe'],
    año: 1930, ventana: [1929, 1934], canonico: true, peso: 9,
    narrativa: () => 'Se derrumban los precios de los granos y se corta el crédito internacional. En la calle Florida se pide una solución de fondo.',
    opciones: [
      {
        id: 'golpe_1930', texto: 'Golpe militar',
        resumen: 'Primera interrupción del orden constitucional del siglo XX.',
        historica: true,
        actores: { ffaa: 1, oligarquia: 0.9, iglesia: 0.6, capitalExtranjero: 0.5, sindicatos: -1, clasesMedias: -0.5 },
        aplicar: (s, rng, api) => {
          api.flag('golpe_militar');
          api.regimen({ tipo: 'dictadura', legitimidad: 0.4, añosEnPoder: 0, signoPolitico: 'militar' });
          api.efectos({
            'nacion.ffaa.poderPolitico': 0.25, 'nacion.ffaa.tutelaje': 0.20,
            'nacion.ffaa.golpismo': 0.15, 'nacion.social.derechosPoliticos': -0.30,
            'nacion.cultura.prensaLibre': -0.20, 'nacion.social.represion': 0.15,
          });
          s.nacion.ffaa.doctrina = 'seguridadInterior';
          api.actor('ffaa', 0.18);
          api.modificador({ id: 'tutela_militar', etiqueta: 'Tutela militar sobre la política', años: 50,
            efectos: { 'nacion.ffaa.golpismo': 0.003, 'nacion.ffaa.tutelaje': 0.002 } });
        },
        consecuencia: 'Se abre una puerta que va a quedar abierta durante medio siglo.',
      },
      {
        id: 'salida_institucional_1930', texto: 'Adelantar elecciones y salida institucional',
        resumen: 'El gobierno resiste la presión y llama a las urnas.',
        requiere: (s) => s.regimen.legitimidad > 0.35 || s.nacion.social.organizacionPopular > 0.35,
        actores: { clasesMedias: 0.8, sindicatos: 0.7, ffaa: -0.8, oligarquia: -0.6 },
        peso: (s) => 0.3 + s.regimen.legitimidad * 2.5 + s.nacion.social.organizacionPopular * 2,
        aplicar: (s, rng, api) => {
          api.regimen({ tipo: 'democracia_restringida', legitimidad: 0.5, añosEnPoder: 0 });
          api.efectos({
            'nacion.ffaa.golpismo': -0.10, 'nacion.social.derechosPoliticos': 0.05,
            'nacion.economia.crecimiento': -0.03,
          });
          api.modificador({ id: 'continuidad_1930', etiqueta: 'Continuidad institucional', años: 25,
            efectos: { 'nacion.ffaa.golpismo': -0.003 } });
        },
        consecuencia: 'Que el sistema aguante la primera crisis grande vale más que cualquier ley.',
      },
    ],
  },

  {
    id: 'roca_runciman',
    titulo: 'Pacto Roca-Runciman',
    categoria: 'exterior', etiquetas: ['soberania', 'comercio'],
    año: 1933, ventana: [1932, 1938], canonico: true, peso: 9,
    requiere: (s) => s.nacion.exterior.dependenciaComercial > 0.4,
    narrativa: () => 'Gran Bretaña, replegada sobre su imperio, amenaza con cerrarle el mercado a la carne argentina. La misión que viaja a Londres vuelve con una cuota y una lista de contrapartidas.',
    opciones: [
      {
        id: 'firmar_pacto', texto: 'Firmar el pacto',
        resumen: 'Cuota de carne a cambio de control de cambios en favor de Gran Bretaña, aranceles bajos a lo británico y monopolio privado del transporte urbano.',
        historica: true,
        actores: { oligarquia: 1, capitalExtranjero: 1, portuarios: 0.6, burguesiaIndustrial: -1 },
        aplicar: (s, rng, api) => {
          api.flag('pacto_preferencial');
          api.efectos({
            'nacion.economia.balanzaComercial': 0.10, 'nacion.exterior.soberania': -0.18,
            'nacion.exterior.autonomia': -0.15, 'nacion.exterior.dependenciaComercial': 0.20,
            'nacion.economia.industrializacion': -0.04, 'nacion.exterior.ied': 0.08,
            'nacion.infraestructura.controlNacionalFerrocarril': -0.05,
          });
          api.actor('oligarquia', 0.10); api.actor('capitalExtranjero', 0.12);
          api.modificador({ id: 'roca_runciman', etiqueta: 'Preferencia británica', años: 12,
            efectos: {
              'nacion.exterior.dependenciaComercial': 0.004,
              'nacion.exterior.giroUtilidades': 0.002,
            } });
        },
        consecuencia: 'Se salva la cuota de carne de un puñado de estancieros y se entrega el manejo de las divisas del país.',
      },
      {
        id: 'rechazar_pacto', texto: 'Rechazar el pacto y buscar mercados alternativos',
        resumen: 'Se acepta perder cuota británica y se sale a colocar en otros mercados.',
        actores: { burguesiaIndustrial: 1, clasesMedias: 0.5, sindicatos: 0.4, oligarquia: -1, capitalExtranjero: -1 },
        peso: (s) => 0.35 + s.nacion.exterior.autonomia * 2.5 + s.nacion.economia.industrializacion * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.balanzaComercial': -0.12, 'nacion.exterior.soberania': 0.10,
            'nacion.exterior.autonomia': 0.12, 'nacion.exterior.dependenciaComercial': -0.15,
            'nacion.economia.industrializacion': 0.06, 'nacion.economia.crecimiento': -0.02,
          });
          api.flag('sustitucion_importaciones');
          api.modificador({ id: 'sustitucion_forzada', etiqueta: 'Sustitución de importaciones', años: 25,
            efectos: {
              'nacion.economia.industrializacion': 0.005,
              'nacion.economia.diversificacion': 0.003,
            } });
        },
        consecuencia: 'Sin mercado asegurado hay que fabricar acá lo que antes se compraba. Duele dos años y funda una industria.',
      },
      {
        id: 'negociar_en_bloque', texto: 'Negociar en bloque con otros exportadores',
        resumen: 'Coordinación con Brasil, Uruguay y Australia para no negociar de a uno.',
        requiere: (s) => s.nacion.exterior.integracionRegional > 0.15,
        actores: { burguesiaIndustrial: 0.6, clasesMedias: 0.5, capitalExtranjero: -0.6 },
        peso: (s) => 0.25 + s.nacion.exterior.integracionRegional * 4,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.exterior.integracionRegional': 0.15, 'nacion.exterior.soberania': 0.06,
            'nacion.economia.balanzaComercial': 0.04, 'nacion.exterior.prestigio': 0.08,
            'nacion.exterior.dependenciaComercial': -0.08,
          });
        },
        consecuencia: 'Un vendedor solo acepta el precio que le dan; varios vendedores juntos lo discuten.',
      },
    ],
  },

  {
    id: 'banco_central_1935',
    titulo: 'Creación del Banco Central',
    categoria: 'economia', etiquetas: ['institucion'],
    año: 1935, ventana: [1932, 1946], canonico: true, peso: 6,
    requiere: (s) => !s.flags.banco_central,
    narrativa: () => 'Se crea una autoridad monetaria. La discusión es de quién es.',
    opciones: [
      {
        id: 'bcra_mixto', texto: 'Banco mixto con participación de la banca privada extranjera',
        resumen: 'Directorio compartido con los bancos que operan en el país.',
        historica: true,
        actores: { capitalExtranjero: 1, oligarquia: 0.7, burguesiaIndustrial: -0.3 },
        aplicar: (s, rng, api) => {
          api.flag('banco_central');
          api.efectos({
            'nacion.economia.capacidadFiscal': 0.06, 'nacion.economia.inflacion': -0.01,
            'nacion.exterior.soberania': -0.05, 'nacion.deuda.condicionalidad': 0.05,
          });
        },
        consecuencia: 'El país gana una herramienta monetaria y comparte el volante con los que prestan.',
      },
      {
        id: 'bcra_estatal', texto: 'Banco Central enteramente estatal',
        resumen: 'Directorio designado por el poder político, con mandato de desarrollo.',
        actores: { burguesiaIndustrial: 0.8, sindicatos: 0.5, clasesMedias: 0.4, capitalExtranjero: -1 },
        peso: (s) => 0.5 + s.config.intervencionEstatal * 2 + s.nacion.exterior.autonomia * 1.5,
        aplicar: (s, rng, api) => {
          api.flag('banco_central'); api.flag('bcra_estatal');
          api.efectos({
            'nacion.economia.capacidadFiscal': 0.10, 'regimen.capacidadEstatal': 0.06,
            'nacion.exterior.soberania': 0.06, 'nacion.economia.pesoEstado': 0.06,
            'nacion.deuda.fugaCapitales': -0.06,
          });
        },
        consecuencia: 'El crédito puede dirigirse a la industria en vez de seguir al mejor postor.',
      },
    ],
  },

  {
    id: 'plan_pinedo',
    titulo: 'Plan de reactivación industrial',
    categoria: 'economia', etiquetas: ['industria'],
    año: 1940, ventana: [1938, 1946], canonico: true, peso: 6,
    narrativa: () => 'La guerra vuelve a cortar las importaciones. Un plan propone crédito industrial, vivienda y comprar los ferrocarriles con los saldos que Gran Bretaña no puede pagar.',
    opciones: [
      {
        id: 'rechazar_plan', texto: 'El Congreso lo cajonea',
        resumen: 'No hay acuerdo político y el plan no se trata.',
        historica: true,
        actores: { oligarquia: 0.8, portuarios: 0.5, burguesiaIndustrial: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({ 'nacion.economia.industrializacion': 0.02, 'regimen.legitimidad': -0.06 });
        },
        consecuencia: 'La industria crece igual, por la escasez y no por decisión. Nadie la planifica, nadie la sostiene.',
      },
      {
        id: 'aprobar_plan', texto: 'Aprobar el plan',
        resumen: 'Crédito industrial, obra pública y compra anticipada de los ferrocarriles.',
        actores: { burguesiaIndustrial: 1, sindicatos: 0.6, clasesMedias: 0.6, oligarquia: -0.7 },
        peso: (s) => 0.5 + s.actores.burguesiaIndustrial * 3,
        aplicar: (s, rng, api) => {
          api.flag('sustitucion_importaciones'); api.flag('industria_pesada');
          api.efectos({
            'nacion.economia.industrializacion': 0.10, 'nacion.economia.diversificacion': 0.06,
            'nacion.infraestructura.controlNacionalFerrocarril': 0.30,
            'nacion.infraestructura.vivienda': 0.06, 'nacion.economia.deficitFiscal': 0.015,
          });
          api.flag('ferrocarriles_nacionalizados');
          api.modificador({ id: 'plan_industrial', etiqueta: 'Plan de reactivación industrial', años: 20,
            efectos: {
              'nacion.economia.industrializacion': 0.006,
              'nacion.educacion.formacionTecnica': 0.003,
            } });
        },
        consecuencia: 'Comprar los ferrocarriles con libras bloqueadas es el mejor negocio que este país no hizo.',
      },
    ],
  },

  // ---- No canónicos ----
  {
    id: 'inmigracion_masiva',
    titulo: 'Oleada inmigratoria',
    categoria: 'demografia', etiquetas: ['inmigracion'],
    ventana: [1880, 1930], unaVez: false, enfriamiento: 9, canonico: false, probabilidad: 0.55,
    peso: 2,
    narrativa: () => 'Los barcos llegan llenos. La pregunta es qué se hace con esa gente cuando baja.',
    opciones: [
      {
        id: 'hacia_la_ciudad', texto: 'Sin tierra disponible, se quedan en la ciudad',
        historica: true,
        peso: (s) => 1 + s.nacion.tierra.giniTierra * 3,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.demografia.urbanizacion': 0.04, 'nacion.economia.informalidad': 0.03,
            'nacion.infraestructura.vivienda': -0.05, 'nacion.social.sindicalizacion': 0.03,
            'nacion.cultura.produccionCultural': 0.04,
          });
          const bsas = api.provincia('bsas'), caba = api.provincia('caba');
          if (bsas) bsas.urbanizacion = Math.min(1, bsas.urbanizacion + 0.05);
          if (caba) caba.poblacion *= 1.05;
        },
        consecuencia: 'Los conventillos se llenan y nace el tango. También nace el movimiento obrero.',
      },
      {
        id: 'colonias_agricolas', texto: 'Se los instala en colonias agrícolas',
        requiere: (s) => s.nacion.tierra.chacras > 0.3,
        peso: (s) => 0.5 + s.nacion.tierra.chacras * 3,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.recursos.agro': 0.05, 'nacion.tierra.chacras': 0.03,
            'nacion.economia.diversificacion': 0.03, 'nacion.educacion.primaria': 0.03,
            'nacion.economia.gini': -0.02,
          });
          for (const p of api.provincias((p) => ['litoral', 'pampa', 'centro'].includes(p.region))) {
            p.agro = Math.min(1, p.agro + 0.05);
            p.desarrollo = Math.min(1, p.desarrollo + 0.03);
          }
        },
        consecuencia: 'Cada colonia levanta una cooperativa, una escuela y una sociedad de socorros mutuos.',
      },
    ],
  },

  {
    id: 'frigorificos',
    titulo: 'Los frigoríficos y el negocio de la carne',
    categoria: 'economia', etiquetas: ['comercio'],
    año: 1907, ventana: [1900, 1935], canonico: false, probabilidad: 0.5, peso: 2,
    narrativa: () => 'Tres compañías extranjeras concentran el embarque de carne y fijan el precio que se le paga al ganadero.',
    opciones: [
      {
        id: 'sin_regulacion', texto: 'Dejar que el mercado se ordene solo',
        historica: true,
        actores: { capitalExtranjero: 1, oligarquia: 0.4 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.concentracion': 0.06, 'nacion.exterior.controlExtranjeroRecursos': 0.06,
            'nacion.exterior.giroUtilidades': 0.04, 'nacion.economia.balanzaComercial': 0.04,
          });
        },
        consecuencia: 'El precio de la carne argentina se decide en tres oficinas que no están en Argentina.',
      },
      {
        id: 'investigacion_carnes', texto: 'Investigar el comercio de carnes y regular',
        resumen: 'Comisión parlamentaria, control de embarques y frigorífico estatal testigo.',
        requiere: (s) => s.regimen.democracia > 0.35,
        actores: { clasesMedias: 0.8, burguesiaIndustrial: 0.5, capitalExtranjero: -1, oligarquia: -0.4 },
        peso: (s) => 0.4 + s.nacion.cultura.prensaLibre * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.economia.concentracion': -0.05, 'regimen.capacidadEstatal': 0.04,
            'nacion.exterior.giroUtilidades': -0.05, 'regimen.corrupcion': -0.03,
            'nacion.exterior.soberania': 0.04,
          });
          api.actor('capitalExtranjero', -0.06);
        },
        consecuencia: 'Averiguar quién se queda con la diferencia es peligroso: a veces se cobra en el recinto del Senado.',
      },
    ],
  },

  {
    id: 'langosta',
    titulo: 'Plaga de langosta',
    categoria: 'recursos', etiquetas: ['plaga'],
    ventana: [1890, 1950], unaVez: false, enfriamiento: 11, canonico: false, probabilidad: 0.3,
    interactivo: false, peso: 1.2,
    opciones: [
      {
        id: 'perdida_cosecha', texto: 'Las mangas arrasan la cosecha',
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.recursos.agro': -0.08, 'nacion.economia.balanzaComercial': -0.07,
            'nacion.economia.crecimiento': -0.012,
          });
        },
        consecuencia: 'Un país que vive de la cosecha aprende a rezar mirando el horizonte.',
      },
    ],
  },
];
