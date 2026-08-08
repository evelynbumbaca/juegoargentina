# Contrato técnico del simulador

Todo módulo de sistema y todo paquete de eventos se escribe contra esta
especificación. No hay dependencias externas: JavaScript moderno, módulos ES,
sin build. El código corre igual en Node 22 y en el navegador.

---

## 1. Módulo de sistema

Archivo: `src/sim/sistemas/<id>.js`. Export por defecto con esta forma exacta:

```js
export default {
  meta: {
    id: 'economia',
    nombre: 'Economía',
    orden: 30,          // orden de ejecución dentro del año (menor primero)
    descripcion: 'Producción, precios, distribución del ingreso.',
  },

  // Opcional. Se llama una vez al crear la partida, después de crearEstado().
  init(estado, rng) {},

  // Obligatorio. Avanza un año.
  paso(estado, rng, ctx) {},

  // Opcional. Devuelve indicadores legibles para los paneles de la interfaz.
  indicadores(estado) {
    return [
      { clave: 'pbi', etiqueta: 'PBI per cápita', valor: 4200, formato: 'usd',
        tendencia: 0.02, ayuda: 'Dólares internacionales de 1990.' },
    ];
  },
};
```

`formato` admite: `'porcentaje' | 'usd' | 'millones' | 'numero' | 'texto' | 'indice'`.

### Orden de ejecución fijado

| orden | sistema | archivo |
|-------|---------|---------|
| 10 | Recursos naturales | `recursos.js` |
| 20 | Tierra | `tierra.js` |
| 30 | Economía | `economia.js` |
| 40 | Deuda externa | `deuda.js` |
| 50 | Demografía | `demografia.js` |
| 60 | Educación y ciencia | `educacion.js` |
| 70 | Infraestructura | `infraestructura.js` |
| 80 | Fuerzas armadas | `ffaa.js` |
| 90 | Movimientos sociales | `social.js` |
| 100 | Política exterior | `exterior.js` |
| 110 | Cultura | `cultura.js` |
| 120 | Régimen político y provincias | `regimen.js` |

### Contexto (`ctx`)

```js
ctx.año          // número, p. ej. 1916
ctx.era          // { id, desde, hasta, nombre } — ver ERAS en motor.js
ctx.dt           // 1
ctx.config       // condiciones iniciales de la partida
ctx.rng          // Rng principal (preferir el `rng` del argumento)
ctx.flags        // marcas persistentes puestas por eventos
ctx.indices      // { soberania, equidad, desarrollo, democracia, bienestar }
ctx.log(txt, etiquetas)
ctx.provincia(id)
```

---

## 2. Reglas de escritura del estado

**Cada campo tiene un único sistema dueño.** Un sistema puede *leer* todo el
estado, pero sólo *escribe* en su propio dominio (`estado.nacion.<dominio>`),
en las provincias en los campos que le correspondan, y en `estado.presiones`.

Los eventos sí pueden escribir en cualquier lado: representan decisiones
políticas que rompen la inercia de los sistemas.

- Salvo excepción documentada, **todo valor vive en 0..1**. El motor recorta.
- Excepciones (escala natural): `demografia.poblacion` (millones),
  `demografia.migracionNeta` (millones/año), `economia.pbiPerCapita` (dólares
  internacionales de 1990), `economia.crecimiento`, `economia.inflacion`,
  `economia.deficitFiscal`, `economia.balanzaComercial` (-1..1),
  `deuda.deudaExterna` (miles de millones USD), `deuda.deudaPbi`,
  `deuda.tasaInteres`, `deuda.servicioDeuda`.
- **Nunca** asignar `NaN`, `Infinity` ni `undefined`. Usar `sano()` de
  `core/util.js` ante cualquier división.
- Preferir `hacia(actual, objetivo, tasa)` a asignaciones bruscas: las
  estructuras sociales tienen inercia. Una tasa de 0.05–0.15 por año es lo
  normal; 0.3+ sólo para shocks.

### Presiones

`estado.presiones` son acumuladores 0..1 que los sistemas escriben y los
eventos leen como condición de disparo. Cada sistema **suma** su aporte y el
sistema `regimen` las decae al final del año.

`social`, `fiscal`, `externa`, `golpe`, `inflacionaria`, `regional`,
`ecologica`, `deuda`.

### Actores (correlación de fuerzas)

`estado.actores`, todos 0..1: `oligarquia`, `burguesiaIndustrial`,
`capitalExtranjero`, `sindicatos`, `clasesMedias`, `ffaa`, `iglesia`,
`movimientosPopulares`, `puebloOriginario`, `organismosInternacionales`,
`caudillosProvinciales`, `portuarios`.

Los sistemas pueden mover a los actores de su órbita lentamente (≤0.02/año).
Los eventos los mueven de golpe.

---

## 3. Paquete de eventos

Archivo: `src/data/eventos/<paquete>.js`, `export default [ ... ]`.

```js
{
  id: 'ley_1420',                    // único en todo el juego, snake_case
  titulo: 'Ley 1420 de educación común',
  categoria: 'educacion',            // dominio principal
  etiquetas: ['ley', 'educacion'],
  año: 1884,                         // año canónico
  ventana: [1882, 1890],             // rango en que puede dispararse
  canonico: true,                    // ocurrió realmente
  peso: 1,                           // número o (estado) => número
  probabilidad: 0.4,                 // sólo para eventos NO canónicos
  unaVez: true,                      // por defecto true
  interactivo: true,                 // false = nunca pausa al jugador

  requiere: (s) => s.regimen.tipo !== 'anarquia',

  narrativa: (s) => 'El Congreso debate la educación primaria...',

  opciones: [
    {
      id: 'sancionar',
      texto: 'Sancionar la ley: primaria gratuita, laica y obligatoria',
      resumen: 'Alfabetiza a una generación; enfrenta a la Iglesia.',
      historica: true,               // fue lo que efectivamente pasó
      actores: { clasesMedias: 1, iglesia: -1, oligarquia: 0.2 },
      requiere: (s) => s.nacion.economia.capacidadFiscal > 0.2,
      peso: (s) => 1 + s.nacion.educacion.gastoPbi * 4,
      efectos: { 'nacion.educacion.gastoPbi': 0.01 },
      aplicar: (s, rng, api) => {
        api.delta('nacion.educacion.primaria', 0.15);
        api.actor('iglesia', -0.08);
        api.flag('educacion_laica');
        api.modificador({ id: 'expansion_escolar', etiqueta: 'Expansión escolar',
                          años: 20, efectos: { 'nacion.educacion.alfabetizacion': 0.012 } });
      },
      consecuencia: 'La escuela pública se vuelve la gran máquina de integración social.',
    },
  ],
}
```

### API disponible en `aplicar(estado, rng, api)`

```js
api.delta(ruta, d)        // suma d a una ruta numérica, con recorte
api.efectos({ruta: d})    // varios deltas de una vez
api.flag(clave, valor)    // marca persistente
api.tiene(clave)          // lee una marca
api.actor(id, d)          // mueve la fuerza de un actor
api.provincia(id)         // objeto provincia mutable
api.provincias(filtro)    // array de provincias
api.regimen({...})        // cambia el régimen político
api.modificador({ id, etiqueta, años, efectos })  // efecto sostenido
api.log(texto, etiquetas)
api.rng                   // Rng
```

### Reglas para los eventos

1. **Todo evento con decisión ofrece al menos 2 caminos realmente distintos**,
   y al menos uno debe poder empeorar el país. Nada de opciones señuelo.
2. Exactamente una opción lleva `historica: true` cuando el evento es canónico.
3. Los efectos tienen que ser proporcionales: una ley no cambia el Gini 0.3 de
   golpe. Referencia: un cambio estructural fuerte mueve 0.05–0.12 en un año y
   se sostiene con `api.modificador` durante una o dos décadas.
4. Las condiciones (`requiere`) tienen que ser materialmente verosímiles: no se
   nacionaliza el petróleo sin Estado con capacidad, no hay reforma agraria sin
   fuerza social que la empuje.
5. `consecuencia` y `narrativa` se escriben en español rioplatense, en presente,
   sin bajada de línea explícita: el juicio lo hace el jugador viendo los
   números moverse.
6. Los eventos **no canónicos** (contrafácticos, crisis emergentes, coyunturas)
   son igual de importantes que los canónicos: son los que hacen que dos
   partidas con la misma configuración cuenten historias distintas.

---

## 4. Anclas históricas (línea base)

La simulación con configuración `historico` y `fidelidadHistorica: 0.8` debería
pasar razonablemente cerca de estos valores. Se verifican en
`tests/anclas.test.mjs` con tolerancias amplias — son una brújula, no una vía.

| Año | Población (M) | PBI pc (1990 int$) | Alfabetización | Deuda ext. (MM USD) |
|-----|---------------|--------------------|----------------|---------------------|
| 1810 | 0,55 | ~1.100 | 20% | 0 |
| 1869 | 1,83 | ~1.400 | 22% | ~0,05 |
| 1895 | 4,05 | ~2.500 | 45% | ~0,4 |
| 1914 | 7,90 | ~3.800 | 65% | ~0,8 |
| 1930 | 11,90 | ~4.100 | 73% | ~1,5 |
| 1947 | 15,90 | ~5.000 | 86% | ~0,5 |
| 1960 | 20,00 | ~5.560 | 91% | ~2 |
| 1974 | 24,80 | ~7.970 | 93% | ~8 |
| 1983 | 28,50 | ~6.500 | 94% | ~45 |
| 1991 | 32,60 | ~6.400 | 96% | ~65 |
| 2001 | 36,30 | ~8.100 | 97% | ~144 |
| 2010 | 40,10 | ~10.250 | 98% | ~130 |
| 2022 | 46,00 | ~10.000 | 99% | ~275 |

Otros hitos que los sistemas deben poder reproducir:

- Inmigración masiva: saldo migratorio positivo fuerte 1880–1930 (pico ~0,1–0,2
  M/año hacia 1905–1913), casi nulo después de 1955, negativo en 1976–1983 y
  2001–2002.
- Industrialización: sustitución de importaciones desde 1930, pico de peso
  industrial en el PBI hacia 1974 (~28%), caída sostenida desde 1976.
- Inflación: baja hasta 1945, alta y persistente desde 1975, hiperinflación
  1989–1990, estabilidad 1991–2001, retorno a inflación alta desde 2007.
- Pobreza: mínimos históricos hacia 1974 (~5%), picos en 1989 (~47%) y 2002
  (~54%).
- Deuda: salto 1976–1983 (8.000 → 45.000 MM USD), default 2001, canjes 2005 y
  2010, acuerdo con el FMI de 2018.

---

## 5. Exigencia de coherencia

Cada sistema y cada paquete de eventos debe cumplir estas reglas o ser
corregido:

- **Materialidad primero.** Una política sólo puede hacer lo que la estructura
  permite. Un país sin capacidad estatal no recauda; sin industria no exporta
  manufacturas; sin divisas no importa bienes de capital.
- **Restricción externa.** El cuello de botella recurrente de la economía
  argentina es la falta de dólares. Crecer con salarios altos aumenta las
  importaciones, deteriora la balanza y termina en devaluación, salvo que
  suban las exportaciones o entre financiamiento. Esa espiral (*stop and go*)
  tiene que emerger sola de las ecuaciones, no estar escrita a mano.
- **Sin determinismo.** Ninguna configuración inicial debe garantizar el
  resultado. Las decisiones y el azar tienen que poder torcer el rumbo.
- **Sin utopías gratis.** Las mejoras distributivas tensionan la balanza de
  pagos, la rentabilidad del agro o la correlación de fuerzas. Toda opción
  buena tiene un costo que se paga en algún lado.
- **Sin fatalismo.** Existen caminos de desarrollo con equidad; son difíciles,
  requieren secuencias correctas (divisas → industria → ciencia) y sostenerlas
  en el tiempo, pero tienen que ser alcanzables.
