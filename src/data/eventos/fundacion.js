// 1810-1880 · Fundación, guerras civiles y organización nacional.
//
// Es el período que define la estructura: quién se queda con la renta de la
// aduana, quién con la tierra pública, y en qué términos entra el país al
// mercado mundial de capitales. Casi todo lo que pasa después ya está decidido
// acá.

export default [
  // =========================================================================
  // Revolución e independencia
  // =========================================================================
  {
    id: 'revolucion_mayo',
    titulo: 'Revolución de Mayo',
    categoria: 'politica', etiquetas: ['fundacion'],
    año: 1810, ventana: [1810, 1812], canonico: true, peso: 10,
    narrativa: () => 'Cae el virrey. Una junta criolla asume el gobierno en nombre del rey cautivo, y nadie sabe todavía hasta dónde llega eso.',
    opciones: [
      {
        id: 'junta_revolucionaria', texto: 'Junta revolucionaria con proyección continental',
        resumen: 'Se financian ejércitos para llevar la revolución al Alto Perú y a Chile.',
        historica: true,
        actores: { clasesMedias: 0.6, portuarios: 0.5, iglesia: -0.3, caudillosProvinciales: 0.3 },
        aplicar: (s, rng, api) => {
          api.regimen({ tipo: 'revolucionario', legitimidad: 0.55, signoPolitico: 'patriota' });
          api.efectos({
            'nacion.ffaa.presupuesto': 0.25, 'nacion.ffaa.capacidadMilitar': 0.12,
            'nacion.economia.deficitFiscal': 0.04, 'nacion.social.derechosPoliticos': 0.05,
            'nacion.cultura.identidad': 0.08,
          });
          s.nacion.ffaa.conflictosActivos.push('guerra_independencia');
          api.modificador({ id: 'guerra_indep', etiqueta: 'Guerras de independencia', años: 14,
            efectos: { 'nacion.economia.crecimiento': -0.004, 'nacion.economia.capacidadFiscal': -0.002 } });
        },
        consecuencia: 'La guerra libera al continente y deja al erario en ruinas: la independencia se paga en cuero, plata y hombres.',
      },
      {
        id: 'autonomia_moderada', texto: 'Autonomía moderada dentro del imperio',
        resumen: 'Se gobierna en nombre del rey y se evita la guerra abierta.',
        actores: { iglesia: 0.8, oligarquia: 0.5, portuarios: 0.4, clasesMedias: -0.4 },
        aplicar: (s, rng, api) => {
          api.regimen({ tipo: 'oligarquico', legitimidad: 0.5 });
          api.efectos({
            'nacion.economia.crecimiento': 0.01, 'nacion.exterior.autonomia': -0.12,
            'nacion.social.derechosPoliticos': -0.03, 'nacion.cultura.identidad': -0.05,
          });
          api.actor('iglesia', 0.08);
        },
        consecuencia: 'Sin guerra el comercio no se interrumpe, y sin guerra tampoco se construye una nación.',
      },
      {
        id: 'revolucion_radical', texto: 'Revolución social además de política',
        resumen: 'Libertad de vientres inmediata, fin del tributo indígena y reparto de tierras realistas.',
        actores: { movimientosPopulares: 1, puebloOriginario: 0.8, clasesMedias: 0.3, oligarquia: -1, iglesia: -0.8 },
        peso: 0.35,
        aplicar: (s, rng, api) => {
          api.regimen({ tipo: 'revolucionario', legitimidad: 0.6, signoPolitico: 'jacobino' });
          api.efectos({
            'nacion.social.derechosCiviles': 0.12, 'nacion.social.derechosOriginarios': 0.15,
            'nacion.tierra.giniTierra': -0.08, 'nacion.tierra.chacras': 0.08,
            'nacion.economia.deficitFiscal': 0.045,
          });
          s.nacion.ffaa.conflictosActivos.push('guerra_independencia');
          api.actor('oligarquia', -0.12); api.actor('movimientosPopulares', 0.12);
          api.flag('revolucion_social');
        },
        consecuencia: 'La revolución que se anima a tocar la propiedad se gana enemigos que no la perdonan.',
      },
    ],
  },

  {
    id: 'asamblea_1813',
    titulo: 'Asamblea del Año XIII',
    categoria: 'social', etiquetas: ['derechos', 'ley'],
    año: 1813, ventana: [1812, 1816], canonico: true, peso: 6,
    requiere: (s) => s.regimen.tipo === 'revolucionario',
    narrativa: () => 'La Asamblea discute qué clase de sociedad va a ser esta.',
    opciones: [
      {
        id: 'libertad_vientres', texto: 'Libertad de vientres y fin del tributo indígena',
        resumen: 'Los hijos de esclavos nacen libres; se abolen el tributo, la mita y el yanaconazgo.',
        historica: true,
        actores: { movimientosPopulares: 0.8, puebloOriginario: 0.9, clasesMedias: 0.4, oligarquia: -0.4 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.social.derechosCiviles': 0.10, 'nacion.social.derechosOriginarios': 0.08,
            'nacion.cultura.identidad': 0.05,
          });
          api.flag('libertad_vientres');
        },
        consecuencia: 'La libertad llega por goteo generacional: los que ya son esclavos siguen siéndolo.',
      },
      {
        id: 'abolicion_plena', texto: 'Abolición inmediata de la esclavitud',
        resumen: 'Se libera a toda la población esclavizada con indemnización a los propietarios.',
        actores: { movimientosPopulares: 1, oligarquia: -0.8, iglesia: -0.2 },
        peso: 0.5,
        requiere: (s) => s.nacion.economia.capacidadFiscal > 0.12,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.social.derechosCiviles': 0.20, 'nacion.social.cohesion': 0.06,
            'nacion.economia.deficitFiscal': 0.02, 'nacion.cultura.identidad': 0.06,
          });
          api.flag('abolicion_esclavitud');
        },
        consecuencia: 'Se hace lo correcto y se paga en efectivo: la indemnización sale del mismo tesoro que financia la guerra.',
      },
      {
        id: 'sin_reformas', texto: 'Postergar las reformas hasta ganar la guerra',
        resumen: 'Primero la independencia, después los derechos.',
        actores: { oligarquia: 0.7, ffaa: 0.5, iglesia: 0.4, movimientosPopulares: -0.8 },
        aplicar: (s, rng, api) => {
          api.efectos({ 'nacion.ffaa.capacidadMilitar': 0.06, 'nacion.social.derechosCiviles': -0.03 });
        },
        consecuencia: '"Después" es la palabra más larga del vocabulario político.',
      },
    ],
  },

  {
    id: 'independencia_1816',
    titulo: 'Congreso de Tucumán',
    categoria: 'politica', etiquetas: ['fundacion'],
    año: 1816, ventana: [1815, 1820], canonico: true, peso: 8,
    narrativa: () => 'Las provincias reunidas discuten si declararse independientes y bajo qué forma de gobierno.',
    opciones: [
      {
        id: 'republica', texto: 'Independencia y forma republicana',
        resumen: 'Se rompe con España sin coronar a nadie.',
        historica: true,
        actores: { clasesMedias: 0.7, caudillosProvinciales: 0.6, iglesia: -0.2 },
        aplicar: (s, rng, api) => {
          api.flag('independencia_declarada');
          api.efectos({
            'nacion.exterior.soberania': 0.12, 'nacion.exterior.prestigio': 0.06,
            'nacion.cultura.identidad': 0.10, 'regimen.legitimidad': 0.08,
          });
        },
        consecuencia: 'La independencia queda declarada; falta averiguar de quién es el país.',
      },
      {
        id: 'monarquia_incaica', texto: 'Monarquía constitucional con dinastía incaica',
        resumen: 'El plan de Belgrano: una corona americana que una al Alto Perú y legitime la revolución.',
        actores: { puebloOriginario: 1, iglesia: 0.5, caudillosProvinciales: 0.3, portuarios: -0.8 },
        peso: 0.4,
        aplicar: (s, rng, api) => {
          api.flag('independencia_declarada'); api.flag('monarquia_americana');
          api.regimen({ tipo: 'oligarquico', legitimidad: 0.55 });
          api.efectos({
            'nacion.social.derechosOriginarios': 0.20, 'nacion.cultura.identidad': 0.12,
            'nacion.exterior.prestigio': 0.08, 'nacion.demografia.composicion.indigena': 0.03,
          });
          api.actor('puebloOriginario', 0.15); api.actor('portuarios', -0.08);
          for (const p of api.provincias((p) => ['norte', 'cuyo'].includes(p.region))) {
            p.integracion = Math.min(1, p.integracion + 0.15);
          }
        },
        consecuencia: 'Un país con capital en el norte y legitimidad andina sería otro país entero.',
      },
      {
        id: 'protectorado', texto: 'Buscar el protectorado de una potencia europea',
        resumen: 'Independencia bajo tutela de Gran Bretaña o Portugal.',
        actores: { portuarios: 0.9, oligarquia: 0.7, capitalExtranjero: 1, caudillosProvinciales: -0.9 },
        peso: 0.3,
        aplicar: (s, rng, api) => {
          api.flag('independencia_declarada');
          api.efectos({
            'nacion.exterior.soberania': -0.18, 'nacion.exterior.autonomia': -0.20,
            'nacion.economia.crecimiento': 0.015, 'nacion.exterior.ied': 0.08,
          });
          api.actor('capitalExtranjero', 0.15);
          s.nacion.exterior.alineamiento = 'britanico';
        },
        consecuencia: 'La protección de una potencia se cobra siempre, y rara vez en el momento en que se firma.',
      },
    ],
  },

  // =========================================================================
  // La deuda: el evento fundacional que casi nadie recuerda
  // =========================================================================
  {
    id: 'emprestito_baring',
    titulo: 'Empréstito con la Baring Brothers',
    categoria: 'deuda', etiquetas: ['deuda', 'soberania'],
    año: 1824, ventana: [1822, 1830], canonico: true, peso: 9,
    narrativa: () => 'Londres ofrece un millón de libras para obras públicas: puerto, agua corriente y pueblos de frontera. La operación se cierra en el mercado de Londres, y de la nada llega en metálico casi nada.',
    opciones: [
      {
        id: 'tomar_emprestito', texto: 'Tomar el empréstito',
        resumen: 'Un millón nominal, del que llegan unas 570 mil libras, garantizadas con las tierras públicas.',
        historica: true,
        actores: { portuarios: 1, oligarquia: 0.7, capitalExtranjero: 1, caudillosProvinciales: -0.6 },
        aplicar: (s, rng, api) => {
          api.flag('emprestito_baring');
          api.delta('nacion.deuda.deudaExterna', 0.021);
          s.nacion.deuda.acreedores.britanico = 1;
          api.efectos({
            'nacion.deuda.monedaExtranjera': 0.05, 'nacion.deuda.condicionalidad': 0.10,
            'nacion.exterior.soberania': -0.06, 'nacion.infraestructura.puertos': 0.04,
          });
          // Las tierras públicas quedan hipotecadas: no se pueden repartir.
          api.flag('tierras_hipotecadas');
          api.modificador({ id: 'baring', etiqueta: 'Servicio del empréstito Baring', años: 30,
            efectos: { 'nacion.economia.deficitFiscal': 0.004, 'nacion.deuda.condicionalidad': 0.004 } });
          api.actor('capitalExtranjero', 0.18);
        },
        consecuencia: 'De las obras prometidas no se hace casi ninguna. La deuda se termina de pagar recién ochenta años después.',
      },
      {
        id: 'rechazar_emprestito', texto: 'Rechazar el empréstito',
        resumen: 'Las obras se financian con recursos propios, o no se hacen.',
        actores: { caudillosProvinciales: 0.8, oligarquia: -0.3, capitalExtranjero: -1 },
        peso: (s) => 0.5 + s.nacion.exterior.autonomia * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.exterior.soberania': 0.08, 'nacion.exterior.autonomia': 0.08,
            'nacion.infraestructura.puertos': -0.02, 'nacion.economia.crecimiento': -0.008,
          });
          api.actor('capitalExtranjero', -0.10);
        },
        consecuencia: 'El país se queda sin puerto moderno y sin hipoteca. Falta ver cuál de las dos cosas pesa más.',
      },
      {
        id: 'emprestito_controlado', texto: 'Tomarlo con control parlamentario y destino atado',
        resumen: 'Cada libra que entra se rinde en una cuenta pública y va a obra productiva.',
        requiere: (s) => s.regimen.capacidadEstatal > 0.18,
        actores: { clasesMedias: 0.8, caudillosProvinciales: 0.4, capitalExtranjero: 0.2, oligarquia: -0.2 },
        peso: (s) => 0.4 + s.regimen.capacidadEstatal * 2.5,
        aplicar: (s, rng, api) => {
          api.flag('emprestito_baring'); api.flag('bicameral_deuda');
          api.delta('nacion.deuda.deudaExterna', 0.018);
          s.nacion.deuda.acreedores.britanico = 1;
          api.efectos({
            'nacion.infraestructura.puertos': 0.10, 'nacion.infraestructura.agua_saneamiento': 0.05,
            'nacion.deuda.condicionalidad': 0.04, 'regimen.capacidadEstatal': 0.04,
          });
        },
        consecuencia: 'Endeudarse no es el problema; endeudarse sin saber en qué se gastó, sí.',
      },
    ],
  },

  {
    id: 'enfiteusis',
    titulo: 'La tierra pública: enfiteusis o reparto',
    categoria: 'tierra', etiquetas: ['tierra', 'estructural'],
    año: 1826, ventana: [1822, 1840], canonico: true, peso: 9,
    narrativa: () => 'Hay millones de hectáreas ganadas a la frontera y un Estado sin plata. La pregunta es a quién se le entregan y en qué condiciones.',
    opciones: [
      {
        id: 'enfiteusis_rivadaviana', texto: 'Enfiteusis: arriendo enfitéutico sin límite de extensión',
        resumen: 'El Estado conserva la propiedad y cede el uso; sin tope, unos pocos toman superficies enormes.',
        historica: true,
        actores: { oligarquia: 1, portuarios: 0.6, movimientosPopulares: -0.6 },
        aplicar: (s, rng, api) => {
          api.flag('enfiteusis');
          api.efectos({
            'nacion.tierra.giniTierra': 0.10, 'nacion.tierra.latifundio': 0.12,
            'nacion.tierra.chacras': -0.10, 'nacion.tierra.arrendamiento': 0.10,
            'nacion.recursos.ganaderia': 0.06,
          });
          api.actor('oligarquia', 0.12);
          api.modificador({ id: 'concentracion_temprana', etiqueta: 'Concentración de la tierra', años: 40,
            efectos: { 'nacion.tierra.giniTierra': 0.004, 'nacion.economia.gini': 0.002 } });
        },
        consecuencia: 'Nace la estancia como forma dominante. Todo lo que venga después va a tener que negociar con ella.',
      },
      {
        id: 'colonizacion_chacras', texto: 'Ley de colonización: chacras familiares con título',
        resumen: 'Superficie limitada por familia, título de propiedad y obligación de poblar.',
        requiere: (s) => !s.flags.tierras_hipotecadas,
        actores: { clasesMedias: 0.8, movimientosPopulares: 0.9, caudillosProvinciales: 0.4, oligarquia: -1 },
        peso: (s) => 0.6 + (s.config.repartoTierras === 'colonizacion' ? 3 : 0),
        aplicar: (s, rng, api) => {
          api.flag('ley_colonizacion');
          api.efectos({
            'nacion.tierra.giniTierra': -0.14, 'nacion.tierra.chacras': 0.18,
            'nacion.tierra.latifundio': -0.14, 'nacion.economia.gini': -0.06,
            'nacion.recursos.agro': 0.04, 'nacion.recursos.ganaderia': -0.04,
          });
          api.actor('oligarquia', -0.15);
          api.modificador({ id: 'colonizacion', etiqueta: 'Colonización agrícola', años: 45,
            efectos: {
              'nacion.tierra.chacras': 0.003, 'nacion.economia.gini': -0.0015,
              'nacion.educacion.primaria': 0.002, 'nacion.economia.diversificacion': 0.0015,
            } });
        },
        consecuencia: 'Con la tierra repartida, el excedente agrario se queda en el pueblo: aparecen almacenes, escuelas y talleres.',
      },
      {
        id: 'remate_tierras', texto: 'Rematar la tierra para financiar al Estado',
        resumen: 'Venta en grandes lotes al mejor postor: caja inmediata.',
        actores: { oligarquia: 1, capitalExtranjero: 0.6, portuarios: 0.5, movimientosPopulares: -0.8 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.tierra.giniTierra': 0.14, 'nacion.tierra.latifundio': 0.15,
            'nacion.tierra.chacras': -0.12, 'nacion.economia.capacidadFiscal': 0.05,
            'nacion.economia.deficitFiscal': -0.02, 'nacion.tierra.extranjerizacion': 0.05,
          });
          api.actor('oligarquia', 0.15);
        },
        consecuencia: 'La caja se llena una vez. La estructura de propiedad queda para siempre.',
      },
    ],
  },

  // =========================================================================
  // La aduana: el conflicto que estructura medio siglo
  // =========================================================================
  {
    id: 'ley_aduana',
    titulo: 'La cuestión de la aduana',
    categoria: 'economia', etiquetas: ['aduana', 'federalismo', 'estructural'],
    año: 1835, ventana: [1826, 1852], canonico: true, peso: 9,
    narrativa: () => 'La renta de la aduana de Buenos Aires es casi todo el ingreso público del país, y entra en una sola caja. Los talleres del interior compiten con manufactura inglesa que llega sin freno.',
    opciones: [
      {
        id: 'aduana_proteccionista', texto: 'Aduana proteccionista, renta para Buenos Aires',
        resumen: 'La Ley de Aduana de 1835: se protege la producción del interior, pero la caja no se reparte.',
        historica: true,
        actores: { caudillosProvinciales: 0.6, burguesiaIndustrial: 0.7, portuarios: 0.3, capitalExtranjero: -0.8 },
        aplicar: (s, rng, api) => {
          api.flag('proteccionismo');
          api.efectos({
            'nacion.economia.industrializacion': 0.05, 'nacion.economia.capacidadFiscal': 0.04,
            'nacion.infraestructura.centralismoPortuario': 0.06,
          });
          for (const p of api.provincias((p) => ['norte', 'cuyo'].includes(p.region))) {
            p.industria = Math.min(1, p.industria + 0.05);
            p.descontento = Math.min(1, p.descontento + 0.05);
          }
        },
        consecuencia: 'Los telares de Catamarca sobreviven un tiempo más; la plata sigue quedándose en el puerto.',
      },
      {
        id: 'aduana_nacionalizada', texto: 'Nacionalizar la aduana y repartir la renta',
        resumen: 'La renta aduanera se distribuye entre todas las provincias.',
        actores: { caudillosProvinciales: 1, burguesiaIndustrial: 0.4, portuarios: -1, oligarquia: -0.5 },
        peso: (s) => 0.4 + s.config.federalismo * 3 + s.actores.caudillosProvinciales * 1.5,
        aplicar: (s, rng, api) => {
          api.flag('aduana_nacionalizada'); api.flag('estado_federal');
          api.efectos({
            'nacion.infraestructura.centralismoPortuario': -0.20,
            'nacion.infraestructura.integracionTerritorial': 0.10,
            'regimen.capacidadEstatal': 0.06, 'nacion.educacion.brechaRegional': -0.08,
          });
          for (const p of api.provincias((p) => p.region !== 'pampa')) {
            p.infraestructura = Math.min(1, p.infraestructura + 0.06);
            p.autonomismo = Math.max(0, p.autonomismo - 0.12);
          }
          api.actor('portuarios', -0.15); api.actor('caudillosProvinciales', 0.1);
          api.modificador({ id: 'federalismo_fiscal', etiqueta: 'Federalismo fiscal', años: 40,
            efectos: { 'nacion.infraestructura.integracionTerritorial': 0.003 } });
        },
        consecuencia: 'Sin el monopolio de la caja, Buenos Aires deja de ser un país adentro de otro.',
      },
      {
        id: 'librecambio', texto: 'Librecambio pleno',
        resumen: 'Puerto abierto: barato lo importado, muerto el taller.',
        actores: { portuarios: 1, oligarquia: 0.8, capitalExtranjero: 1, burguesiaIndustrial: -1, caudillosProvinciales: -0.8 },
        aplicar: (s, rng, api) => {
          api.flag('librecambio');
          api.efectos({
            'nacion.economia.industrializacion': -0.03, 'nacion.economia.crecimiento': 0.012,
            'nacion.exterior.dependenciaComercial': 0.10, 'nacion.infraestructura.centralismoPortuario': 0.10,
          });
          for (const p of api.provincias((p) => p.region !== 'pampa' && p.region !== 'litoral')) {
            p.industria = Math.max(0, p.industria - 0.04);
            p.descontento = Math.min(1, p.descontento + 0.12);
          }
          api.actor('portuarios', 0.12);
        },
        consecuencia: 'Los ponchos ingleses llegan más baratos que los de Catamarca. El interior lo entiende como una declaración de guerra.',
      },
    ],
  },

  {
    id: 'bloqueos_navales',
    titulo: 'Bloqueo naval de las potencias europeas',
    categoria: 'exterior', etiquetas: ['soberania', 'guerra'],
    ventana: [1838, 1850], canonico: true, año: 1845, peso: 5,
    requiere: (s) => !s.flags.librecambio || s.nacion.exterior.autonomia > 0.4,
    narrativa: () => 'Escuadras francesas e inglesas bloquean el puerto y remontan el Paraná para forzar la libre navegación de los ríos interiores.',
    opciones: [
      {
        id: 'resistir', texto: 'Resistir el bloqueo',
        resumen: 'Se combate en la Vuelta de Obligado y se sostiene el control de los ríos.',
        historica: true,
        actores: { caudillosProvinciales: 0.8, ffaa: 0.7, movimientosPopulares: 0.5, portuarios: -0.6, capitalExtranjero: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.exterior.soberania': 0.10, 'nacion.cultura.identidad': 0.10,
            'nacion.economia.balanzaComercial': -0.15, 'nacion.economia.crecimiento': -0.02,
            'nacion.ffaa.capacidadMilitar': 0.05,
          });
          api.modificador({ id: 'bloqueo', etiqueta: 'Bloqueo del puerto', años: 4,
            efectos: { 'nacion.economia.reservas': -0.008, 'nacion.economia.crecimiento': -0.004 } });
        },
        consecuencia: 'Se pierde la batalla y se gana el tratado: los ríos siguen siendo interiores.',
      },
      {
        id: 'ceder_rios', texto: 'Ceder la libre navegación de los ríos',
        resumen: 'Se abre el Paraná y el Uruguay a las banderas extranjeras.',
        actores: { portuarios: 0.4, capitalExtranjero: 1, oligarquia: 0.5, caudillosProvinciales: -0.5 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.exterior.soberania': -0.10, 'nacion.economia.crecimiento': 0.015,
            'nacion.economia.balanzaComercial': 0.06, 'nacion.exterior.dependenciaComercial': 0.08,
          });
          for (const p of api.provincias((p) => p.region === 'litoral')) p.desarrollo = Math.min(1, p.desarrollo + 0.05);
          api.actor('capitalExtranjero', 0.10);
        },
        consecuencia: 'El litoral gana salida propia al mundo y el país pierde la llave de sus ríos.',
      },
    ],
  },

  // =========================================================================
  // Organización nacional
  // =========================================================================
  {
    id: 'constitucion_1853',
    titulo: 'Constitución Nacional',
    categoria: 'politica', etiquetas: ['ley', 'fundacion'],
    año: 1853, ventana: [1852, 1862], canonico: true, peso: 9,
    narrativa: () => 'Después de Caseros se reúne un congreso constituyente. Buenos Aires no manda representantes.',
    opciones: [
      {
        id: 'federal_con_secesion', texto: 'Constitución federal, sin Buenos Aires',
        resumen: 'Se sanciona igual: la Confederación queda con territorio y sin aduana.',
        historica: true,
        actores: { caudillosProvinciales: 1, portuarios: -0.8 },
        aplicar: (s, rng, api) => {
          api.flag('constitucion_sancionada'); api.flag('secesion');
          api.regimen({ tipo: 'oligarquico', legitimidad: 0.5, signoPolitico: 'confederal' });
          api.efectos({
            'regimen.capacidadEstatal': 0.06, 'nacion.social.derechosPoliticos': 0.06,
            'nacion.economia.capacidadFiscal': -0.05, 'nacion.exterior.prestigio': 0.05,
          });
          api.modificador({ id: 'confederacion_sin_aduana', etiqueta: 'Confederación sin puerto', años: 9,
            efectos: { 'nacion.economia.deficitFiscal': 0.006, 'presiones.regional': 0.01 } });
        },
        consecuencia: 'Una constitución modélica sobre un Estado que no tiene con qué cobrar impuestos.',
      },
      {
        id: 'acuerdo_pleno', texto: 'Acuerdo previo con Buenos Aires: constitución y aduana',
        resumen: 'Se pacta primero el reparto de la renta aduanera y después se sanciona.',
        requiere: (s) => s.flags.aduana_nacionalizada || s.config.federalismo > 0.6,
        actores: { caudillosProvinciales: 0.8, portuarios: 0.5, clasesMedias: 0.5 },
        peso: (s) => 0.4 + (s.flags.aduana_nacionalizada ? 3 : 0),
        aplicar: (s, rng, api) => {
          api.flag('constitucion_sancionada'); api.flag('bsas_incorporada'); api.flag('capital_federalizada');
          api.regimen({ tipo: 'oligarquico', legitimidad: 0.62 });
          api.efectos({
            'regimen.capacidadEstatal': 0.14, 'nacion.economia.capacidadFiscal': 0.08,
            'nacion.infraestructura.integracionTerritorial': 0.10,
            'nacion.infraestructura.centralismoPortuario': -0.10,
          });
        },
        consecuencia: 'El país se organiza sin pagar el peaje de una década de guerra civil.',
      },
      {
        id: 'unitaria', texto: 'Constitución unitaria',
        resumen: 'Un solo poder, con sede en Buenos Aires.',
        actores: { portuarios: 1, oligarquia: 0.7, caudillosProvinciales: -1 },
        aplicar: (s, rng, api) => {
          api.flag('constitucion_sancionada'); api.flag('estado_unitario');
          api.regimen({ tipo: 'oligarquico', legitimidad: 0.45 });
          api.efectos({
            'regimen.capacidadEstatal': 0.10, 'nacion.infraestructura.centralismoPortuario': 0.15,
            'nacion.infraestructura.integracionTerritorial': -0.08,
          });
          for (const p of api.provincias((p) => p.region !== 'pampa')) {
            p.autonomismo = Math.min(1, p.autonomismo + 0.15);
            p.descontento = Math.min(1, p.descontento + 0.10);
          }
          s.presiones.regional = Math.min(1, s.presiones.regional + 0.3);
        },
        consecuencia: 'Se ordena el país por decreto. El interior toma nota y afila los facones.',
      },
    ],
  },

  {
    id: 'ferrocarriles',
    titulo: 'La red ferroviaria',
    categoria: 'infraestructura', etiquetas: ['infraestructura', 'estructural'],
    año: 1862, ventana: [1857, 1885], canonico: true, peso: 8,
    narrativa: () => 'Llega la propuesta de tender vías. Las compañías inglesas piden concesión, tierra a los costados y garantía de una ganancia mínima asegurada por el Estado.',
    opciones: [
      {
        id: 'concesion_britanica', texto: 'Concesión británica con garantía de rentabilidad',
        resumen: 'Capital extranjero, trazado en abanico hacia el puerto, ganancia garantizada por el Estado.',
        historica: true,
        actores: { capitalExtranjero: 1, oligarquia: 0.8, portuarios: 1, burguesiaIndustrial: -0.5 },
        aplicar: (s, rng, api) => {
          api.flag('ferrocarril_britanico');
          api.efectos({
            'nacion.infraestructura.ferrocarril': 0.22,
            'nacion.infraestructura.controlNacionalFerrocarril': -0.1,
            'nacion.infraestructura.centralismoPortuario': 0.15,
            'nacion.exterior.ied': 0.10, 'nacion.recursos.agro': 0.08,
            'nacion.economia.crecimiento': 0.02,
          });
          api.actor('capitalExtranjero', 0.15);
          api.modificador({ id: 'abanico', etiqueta: 'Red radial al puerto', años: 60,
            efectos: {
              'nacion.infraestructura.ferrocarril': 0.008,
              'nacion.infraestructura.centralismoPortuario': 0.002,
              'nacion.exterior.giroUtilidades': 0.001,
            } });
        },
        consecuencia: 'Sacar un fardo de lana a Liverpool sale más barato que llevarlo de Salta a Mendoza.',
      },
      {
        id: 'ferrocarril_estatal', texto: 'Construcción estatal con trazado mallado',
        resumen: 'El Estado construye y opera, uniendo provincias entre sí y no sólo con el puerto.',
        requiere: (s) => s.regimen.capacidadEstatal > 0.3,
        actores: { caudillosProvinciales: 0.9, burguesiaIndustrial: 0.7, clasesMedias: 0.4, capitalExtranjero: -1 },
        peso: (s) => 0.35 + s.regimen.capacidadEstatal * 2.5 + s.config.intervencionEstatal * 2,
        aplicar: (s, rng, api) => {
          api.flag('ferrocarril_estatal');
          api.efectos({
            'nacion.infraestructura.ferrocarril': 0.14,
            'nacion.infraestructura.controlNacionalFerrocarril': 0.55,
            'nacion.infraestructura.integracionTerritorial': 0.15,
            'nacion.infraestructura.centralismoPortuario': -0.08,
            'nacion.economia.deficitFiscal': 0.02,
          });
          for (const p of api.provincias((p) => p.region !== 'pampa')) {
            p.infraestructura = Math.min(1, p.infraestructura + 0.08);
          }
          api.modificador({ id: 'red_mallada', etiqueta: 'Red ferroviaria mallada', años: 50,
            efectos: {
              'nacion.infraestructura.ferrocarril': 0.006,
              'nacion.infraestructura.integracionTerritorial': 0.004,
              'nacion.economia.diversificacion': 0.001,
            } });
        },
        consecuencia: 'Más lento y más caro de construir; el mercado interno que arma dura un siglo.',
      },
      {
        id: 'mixto_ferroviario', texto: 'Régimen mixto con trazado decidido por el Estado',
        resumen: 'Capital privado, pero el Estado define recorridos y no garantiza ganancias.',
        actores: { burguesiaIndustrial: 0.6, clasesMedias: 0.5, capitalExtranjero: 0.3, oligarquia: 0.2 },
        peso: 0.7,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.infraestructura.ferrocarril': 0.18,
            'nacion.infraestructura.controlNacionalFerrocarril': 0.25,
            'nacion.infraestructura.integracionTerritorial': 0.08,
            'nacion.exterior.ied': 0.06, 'nacion.economia.crecimiento': 0.015,
          });
          api.modificador({ id: 'ferro_mixto', etiqueta: 'Expansión ferroviaria mixta', años: 45,
            efectos: { 'nacion.infraestructura.ferrocarril': 0.007 } });
        },
        consecuencia: 'Sin garantía de ganancia los ingleses invierten menos, y sólo donde el negocio existe de verdad.',
      },
    ],
  },

  {
    id: 'guerra_paraguay',
    titulo: 'Guerra de la Triple Alianza',
    categoria: 'exterior', etiquetas: ['guerra', 'deuda'],
    año: 1865, ventana: [1864, 1870], canonico: true, peso: 7,
    narrativa: () => 'Brasil e Inglaterra empujan una alianza contra el Paraguay. En el interior, las montoneras se niegan a marchar y hay que reprimirlas para juntar el ejército.',
    opciones: [
      {
        id: 'participar_guerra', texto: 'Entrar en la guerra',
        resumen: 'Cinco años de campaña, financiados con empréstitos ingleses.',
        historica: true,
        actores: { portuarios: 0.8, capitalExtranjero: 1, ffaa: 0.6, caudillosProvinciales: -1, movimientosPopulares: -0.8 },
        aplicar: (s, rng, api) => {
          api.flag('guerra_paraguay');
          s.nacion.ffaa.conflictosActivos.push('guerra_paraguay');
          api.delta('nacion.deuda.deudaExterna', 0.03);
          api.efectos({
            'nacion.economia.deficitFiscal': 0.04, 'nacion.ffaa.profesionalizacion': 0.12,
            'nacion.ffaa.poderPolitico': 0.06, 'nacion.social.cohesion': -0.10,
            'nacion.exterior.prestigio': -0.05, 'nacion.demografia.mortalidad': 0.004,
          });
          s.presiones.regional = Math.min(1, s.presiones.regional + 0.25);
          api.modificador({ id: 'costo_guerra', etiqueta: 'Costo de la guerra del Paraguay', años: 6,
            efectos: { 'nacion.economia.crecimiento': -0.008, 'nacion.economia.deficitFiscal': 0.004 } });
        },
        consecuencia: 'El Paraguay queda destruido, el ejército nacional queda profesional, y la deuda queda.',
      },
      {
        id: 'neutralidad', texto: 'Declarar la neutralidad',
        resumen: 'No se presta el territorio ni se envían tropas.',
        actores: { caudillosProvinciales: 1, movimientosPopulares: 0.7, clasesMedias: 0.3, capitalExtranjero: -0.8, portuarios: -0.6 },
        peso: (s) => 0.4 + s.actores.caudillosProvinciales * 2 + s.nacion.exterior.autonomia * 2,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.exterior.soberania': 0.06, 'nacion.exterior.integracionRegional': 0.10,
            'nacion.social.cohesion': 0.06, 'nacion.exterior.conflictoLimitrofe': 0.10,
            'nacion.ffaa.profesionalizacion': -0.04,
          });
          api.actor('caudillosProvinciales', 0.08);
        },
        consecuencia: 'Sin guerra no hay deuda de guerra, ni ejército nacional, ni montoneras reprimidas.',
      },
      {
        id: 'mediar', texto: 'Mediar entre Brasil y Paraguay',
        resumen: 'Una salida diplomática que evite la destrucción del vecino.',
        requiere: (s) => s.nacion.exterior.prestigio > 0.18,
        actores: { clasesMedias: 0.6, caudillosProvinciales: 0.5, capitalExtranjero: -0.5 },
        peso: (s) => 0.3 + s.nacion.exterior.prestigio * 3,
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.exterior.prestigio': 0.12, 'nacion.exterior.integracionRegional': 0.18,
            'nacion.exterior.soberania': 0.05, 'nacion.exterior.conflictoLimitrofe': -0.10,
          });
          api.flag('mediacion_regional');
        },
        consecuencia: 'Una Sudamérica que resuelve sus conflictos entre vecinos es más difícil de arbitrar desde afuera.',
      },
    ],
  },

  {
    id: 'educacion_comun',
    titulo: 'Escuelas, maestras y libros',
    categoria: 'educacion', etiquetas: ['educacion'],
    año: 1870, ventana: [1863, 1884], canonico: true, peso: 6,
    narrativa: () => 'Se discute si el Estado debe enseñar a leer a todo el mundo, y con qué plata.',
    opciones: [
      {
        id: 'escuela_masiva', texto: 'Escuela pública masiva y escuelas normales',
        resumen: 'Se importan maestras, se fundan normales y se financia la primaria.',
        historica: true,
        actores: { clasesMedias: 1, iglesia: -0.4, oligarquia: -0.1 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.educacion.gastoPbi': 0.008, 'nacion.educacion.primaria': 0.10,
            'nacion.educacion.alfabetizacion': 0.05, 'nacion.economia.deficitFiscal': 0.008,
          });
          api.modificador({ id: 'expansion_escolar', etiqueta: 'Expansión de la escuela pública', años: 45,
            efectos: { 'nacion.educacion.alfabetizacion': 0.009, 'nacion.educacion.primaria': 0.008 } });
        },
        consecuencia: 'La escuela se convierte en la máquina más eficaz que este país haya construido.',
      },
      {
        id: 'escuela_elite', texto: 'Educación para las élites',
        resumen: 'Colegios nacionales y universidad; la primaria queda en manos de las provincias y la Iglesia.',
        actores: { oligarquia: 0.8, iglesia: 1, clasesMedias: -0.5 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.educacion.superior': 0.03, 'nacion.educacion.primaria': 0.02,
            'nacion.educacion.brechaRegional': 0.12,
          });
          api.actor('iglesia', 0.08);
        },
        consecuencia: 'Se forma una dirigencia culta sobre un país que no sabe leer.',
      },
    ],
  },

  {
    id: 'frontera_sur',
    titulo: 'La frontera con los pueblos originarios',
    categoria: 'tierra', etiquetas: ['territorio', 'originarios', 'estructural'],
    año: 1878, ventana: [1872, 1890], canonico: true, peso: 9,
    narrativa: () => 'Al sur del río Salado y en el Chaco hay millones de hectáreas bajo control de las confederaciones indígenas, y una frontera que se sostiene con fortines y tratados. La estancia necesita esa tierra.',
    opciones: [
      {
        id: 'campana_militar', texto: 'Campaña militar de ocupación',
        resumen: 'Expedición con remington y ferrocarril; la tierra se remata antes de ganarla, en grandes lotes, para financiar la campaña.',
        historica: true,
        actores: { oligarquia: 1, ffaa: 1, portuarios: 0.6, puebloOriginario: -1, movimientosPopulares: -0.4 },
        aplicar: (s, rng, api) => {
          api.flag('conquista_desierto');
          s.nacion.ffaa.conflictosActivos.push('frontera');
          api.efectos({
            'nacion.tierra.territorioOriginario': -0.45, 'nacion.tierra.fronteraAgricola': 0.25,
            'nacion.tierra.giniTierra': 0.12, 'nacion.tierra.latifundio': 0.15,
            'nacion.social.derechosOriginarios': -0.05, 'nacion.recursos.ganaderia': 0.12,
            'nacion.ffaa.poderPolitico': 0.08, 'nacion.recursos.biodiversidad': -0.06,
          });
          for (const p of api.provincias((p) => ['patagonia', 'norte'].includes(p.region))) {
            p.controlOriginario = Math.max(0, p.controlOriginario - 0.85);
            p.integracion = Math.min(1, p.integracion + 0.35);
          }
          api.actor('puebloOriginario', -0.30); api.actor('oligarquia', 0.15); api.actor('ffaa', 0.10);
          api.modificador({ id: 'reparto_desierto', etiqueta: 'Reparto de la tierra conquistada', años: 15,
            efectos: { 'nacion.tierra.giniTierra': 0.006, 'nacion.tierra.latifundio': 0.005 } });
        },
        consecuencia: 'Se duplica la superficie útil del país y se la entrega a menos de dos mil propietarios. Las comunidades que sobreviven son deportadas y repartidas como servidumbre.',
      },
      {
        id: 'tratados', texto: 'Frontera por tratados',
        resumen: 'Se reconocen territorios, se pactan pasos y comercio, y la expansión se negocia.',
        actores: { puebloOriginario: 1, clasesMedias: 0.3, iglesia: 0.2, oligarquia: -1, ffaa: -0.7 },
        peso: (s) => 0.3 + (s.config.fronteraIndigena === 'tratados' ? 3.5 : 0)
          + s.nacion.social.derechosOriginarios * 2,
        aplicar: (s, rng, api) => {
          api.flag('tratados_originarios');
          api.efectos({
            'nacion.tierra.territorioOriginario': -0.10, 'nacion.tierra.fronteraAgricola': 0.10,
            'nacion.social.derechosOriginarios': 0.25, 'nacion.tierra.giniTierra': -0.03,
            'nacion.cultura.identidad': 0.06, 'nacion.recursos.biodiversidad': 0.03,
            'nacion.exterior.prestigio': 0.05,
          });
          for (const p of api.provincias((p) => ['patagonia', 'norte'].includes(p.region))) {
            p.controlOriginario = Math.max(0, p.controlOriginario - 0.25);
            p.integracion = Math.min(1, p.integracion + 0.15);
          }
          api.actor('puebloOriginario', 0.10);
          api.modificador({ id: 'frontera_negociada', etiqueta: 'Frontera negociada', años: 30,
            efectos: { 'nacion.tierra.fronteraAgricola': 0.004, 'nacion.social.derechosOriginarios': 0.002 } });
        },
        consecuencia: 'El país crece más despacio y con otra gente adentro. La Patagonia se incorpora sin quedar en manos de cincuenta familias.',
      },
      {
        id: 'colonizacion_frontera', texto: 'Ocupación con colonias agrícolas',
        resumen: 'Avance militar acotado y reparto en chacras a colonos y soldados.',
        requiere: (s) => s.flags.ley_colonizacion || s.config.repartoTierras !== 'latifundio',
        actores: { clasesMedias: 0.8, movimientosPopulares: 0.6, ffaa: 0.4, oligarquia: -0.8, puebloOriginario: -0.6 },
        peso: (s) => 0.3 + (s.flags.ley_colonizacion ? 2.5 : 0),
        aplicar: (s, rng, api) => {
          api.flag('conquista_desierto'); api.flag('colonias_frontera');
          api.efectos({
            'nacion.tierra.territorioOriginario': -0.35, 'nacion.tierra.fronteraAgricola': 0.22,
            'nacion.tierra.chacras': 0.12, 'nacion.tierra.giniTierra': -0.05,
            'nacion.recursos.agro': 0.10, 'nacion.social.derechosOriginarios': -0.03,
          });
          for (const p of api.provincias((p) => ['patagonia', 'norte'].includes(p.region))) {
            p.controlOriginario = Math.max(0, p.controlOriginario - 0.6);
            p.integracion = Math.min(1, p.integracion + 0.3);
            p.agro = Math.min(1, p.agro + 0.1);
          }
          api.modificador({ id: 'colonias_sur', etiqueta: 'Colonias agrícolas del sur', años: 30,
            efectos: { 'nacion.tierra.chacras': 0.003, 'nacion.economia.diversificacion': 0.001 } });
        },
        consecuencia: 'La misma violencia sobre los pueblos originarios, otro destino para la tierra.',
      },
    ],
  },

  {
    id: 'federalizacion_1880',
    titulo: 'Federalización de Buenos Aires',
    categoria: 'politica', etiquetas: ['federalismo'],
    año: 1880, ventana: [1876, 1886], canonico: true, peso: 7,
    requiere: (s) => s.flags.constitucion_sancionada,
    narrativa: () => 'Se resuelve por las armas la última pregunta abierta desde 1810: dónde está la capital y de quién es el puerto.',
    opciones: [
      {
        id: 'capital_federal', texto: 'Buenos Aires capital federal',
        resumen: 'La ciudad se separa de la provincia y la aduana pasa a la Nación.',
        historica: true,
        actores: { oligarquia: 0.8, ffaa: 0.6, portuarios: -0.3, caudillosProvinciales: 0.4 },
        aplicar: (s, rng, api) => {
          api.flag('capital_federalizada'); api.flag('bsas_incorporada'); api.flag('aduana_nacionalizada');
          api.regimen({ tipo: 'oligarquico', legitimidad: 0.6, capacidadEstatal: 0.35 });
          api.efectos({
            'regimen.capacidadEstatal': 0.15, 'nacion.economia.capacidadFiscal': 0.10,
            'nacion.infraestructura.integracionTerritorial': 0.06,
          });
          s.presiones.regional = Math.max(0, s.presiones.regional - 0.3);
        },
        consecuencia: 'Nace el Estado nacional argentino. Llega tarde y llega fuerte.',
      },
      {
        id: 'capital_interior', texto: 'Capital en el interior',
        resumen: 'La sede del gobierno se traslada lejos del puerto.',
        actores: { caudillosProvinciales: 1, portuarios: -1, oligarquia: -0.4 },
        peso: (s) => 0.25 + s.config.federalismo * 2.5,
        aplicar: (s, rng, api) => {
          api.flag('capital_federalizada'); api.flag('capital_interior');
          api.regimen({ tipo: 'oligarquico', legitimidad: 0.55, capacidadEstatal: 0.3 });
          api.efectos({
            'regimen.capacidadEstatal': 0.10,
            'nacion.infraestructura.centralismoPortuario': -0.18,
            'nacion.infraestructura.integracionTerritorial': 0.15,
            'nacion.educacion.brechaRegional': -0.10,
          });
          for (const p of api.provincias((p) => p.region !== 'pampa')) {
            p.infraestructura = Math.min(1, p.infraestructura + 0.06);
            p.desarrollo = Math.min(1, p.desarrollo + 0.04);
          }
          api.modificador({ id: 'capital_mediterranea', etiqueta: 'Capital mediterránea', años: 60,
            efectos: { 'nacion.infraestructura.integracionTerritorial': 0.002 } });
        },
        consecuencia: 'Mover la capital mueve el país: el mapa económico deja de tener un solo centro.',
      },
    ],
  },

  // =========================================================================
  // No canónicos: la textura del período
  // =========================================================================
  {
    id: 'montonera',
    titulo: 'Levantamiento montonero',
    categoria: 'social', etiquetas: ['conflicto', 'federalismo'],
    ventana: [1815, 1875], unaVez: false, enfriamiento: 7, canonico: false, probabilidad: 0.5,
    peso: (s) => s.presiones.regional * 3 + s.actores.caudillosProvinciales * 2,
    requiere: (s) => s.presiones.regional > 0.4 && s.año < 1880,
    narrativa: () => 'Una provincia se alza. Detrás del caudillo hay gauchos sin tierra y artesanos arruinados por la importación.',
    opciones: [
      {
        id: 'reprimir_montonera', texto: 'Reprimir el levantamiento',
        resumen: 'Intervención federal y persecución de los alzados.',
        historica: true,
        actores: { ffaa: 0.9, portuarios: 0.7, oligarquia: 0.6, caudillosProvinciales: -1 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.ffaa.poderPolitico': 0.05, 'nacion.social.represion': 0.08,
            'regimen.capacidadEstatal': 0.03, 'nacion.social.cohesion': -0.08,
          });
          for (const p of api.provincias((p) => p.autonomismo > 0.55)) {
            p.conflicto = Math.min(1, p.conflicto + 0.25);
            p.descontento = Math.min(1, p.descontento + 0.12);
          }
        },
        consecuencia: 'El orden se impone. La memoria del interior tarda generaciones en cerrarse.',
      },
      {
        id: 'pactar_montonera', texto: 'Pactar con el caudillo',
        resumen: 'Reparto de cargos, obras y renta a cambio de deponer las armas.',
        actores: { caudillosProvinciales: 1, clasesMedias: 0.2, portuarios: -0.5 },
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.infraestructura.integracionTerritorial': 0.04,
            'regimen.corrupcion': 0.04, 'nacion.social.cohesion': 0.05,
          });
          for (const p of api.provincias((p) => p.autonomismo > 0.55)) {
            p.descontento = Math.max(0, p.descontento - 0.15);
            p.infraestructura = Math.min(1, p.infraestructura + 0.04);
          }
          s.presiones.regional = Math.max(0, s.presiones.regional - 0.2);
        },
        consecuencia: 'La paz se compra con cargos. Es más barata que la guerra y deja otras deudas.',
      },
    ],
  },

  {
    id: 'malvinas_1833',
    titulo: 'Ocupación británica de las Malvinas',
    categoria: 'exterior', etiquetas: ['soberania', 'territorio'],
    año: 1833, ventana: [1833, 1836], canonico: true, peso: 8, interactivo: false,
    narrativa: () => 'Una corbeta británica desaloja a la guarnición argentina de Puerto Soledad.',
    opciones: [
      {
        id: 'reclamo_diplomatico', texto: 'Protesta diplomática permanente',
        historica: true, peso: 3,
        aplicar: (s, rng, api) => {
          api.flag('malvinas_ocupadas');
          api.efectos({ 'nacion.exterior.soberania': -0.06, 'nacion.exterior.conflictoLimitrofe': 0.10 });
          api.modificador({ id: 'reclamo_malvinas', etiqueta: 'Reclamo por Malvinas', años: 200,
            efectos: { 'nacion.cultura.identidad': 0.0008 } });
        },
        consecuencia: 'El reclamo se sostiene sin interrupción y sin resultado.',
      },
      {
        id: 'ruptura_britanica', texto: 'Romper relaciones con Gran Bretaña',
        peso: (s) => 0.3 + s.nacion.exterior.autonomia * 2,
        aplicar: (s, rng, api) => {
          api.flag('malvinas_ocupadas');
          api.efectos({
            'nacion.exterior.soberania': -0.03, 'nacion.economia.balanzaComercial': -0.10,
            'nacion.exterior.dependenciaComercial': -0.12, 'nacion.exterior.ied': -0.06,
          });
          api.actor('capitalExtranjero', -0.12);
        },
        consecuencia: 'Enfrentar al principal comprador cuesta caro y deja al país más suelto de manos.',
      },
    ],
  },

  {
    id: 'fiebre_amarilla',
    titulo: 'Epidemia de fiebre amarilla',
    categoria: 'social', etiquetas: ['epidemia'],
    año: 1871, ventana: [1867, 1875], canonico: true, peso: 4, interactivo: false,
    requiere: (s) => s.nacion.infraestructura.agua_saneamiento < 0.35,
    narrativa: () => 'La epidemia arrasa Buenos Aires. Los que pueden se mudan al norte de la ciudad; los que no, se quedan en los conventillos del sur.',
    opciones: [
      {
        id: 'obras_sanitarias', texto: 'Construir cloacas y agua corriente',
        historica: true, peso: 2,
        aplicar: (s, rng, api) => {
          api.delta('nacion.demografia.poblacion', -0.014);
          api.efectos({
            'nacion.infraestructura.agua_saneamiento': 0.12, 'nacion.infraestructura.salud': 0.06,
            'nacion.economia.deficitFiscal': 0.01,
          });
          api.modificador({ id: 'obras_sanitarias', etiqueta: 'Obras sanitarias', años: 25,
            efectos: { 'nacion.infraestructura.agua_saneamiento': 0.006 } });
        },
        consecuencia: 'Las cloacas salvan más vidas que todos los médicos del siglo juntos.',
      },
      {
        id: 'sin_obras', texto: 'Contener el brote sin obras de fondo',
        peso: 1,
        aplicar: (s, rng, api) => {
          api.delta('nacion.demografia.poblacion', -0.020);
          api.efectos({ 'nacion.social.cohesion': -0.06, 'nacion.demografia.mortalidad': 0.003 });
        },
        consecuencia: 'La ciudad queda partida en dos por una frontera sanitaria que va a durar un siglo.',
      },
    ],
  },

  {
    id: 'sequia_ganadera',
    titulo: 'Gran seca',
    categoria: 'recursos', etiquetas: ['clima'],
    ventana: [1827, 1880], unaVez: false, enfriamiento: 12, canonico: false, probabilidad: 0.35,
    interactivo: false, peso: 1.5,
    opciones: [
      {
        id: 'perdida_hacienda', texto: 'Mueren millones de cabezas de ganado',
        aplicar: (s, rng, api) => {
          api.efectos({
            'nacion.recursos.ganaderia': -0.12, 'nacion.economia.balanzaComercial': -0.10,
            'nacion.economia.crecimiento': -0.02,
          });
          api.modificador({ id: 'gran_seca', etiqueta: 'Gran seca', años: 3,
            efectos: { 'nacion.recursos.ganaderia': 0.015, 'nacion.economia.reservas': -0.004 } });
        },
        consecuencia: 'El campo se recupera; los pequeños productores, no. Cada seca concentra un poco más la tierra.',
      },
    ],
  },
];
