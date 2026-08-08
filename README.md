# Argentina · simulador de futuros posibles

Juego de simulación tipo sandbox sobre la historia argentina desde 1810, en
pixel art. Se configuran las condiciones iniciales del país y la simulación
corre sola, o se interviene en cada momento en que la historia se bifurca.

No hay dependencias ni compilación: JavaScript moderno con módulos ES.

```bash
python3 -m http.server 8000     # o cualquier servidor estático
# abrir http://localhost:8000
```

Los módulos ES no cargan por `file://`; hace falta servirlo.

## Dos modos

- **Observador** — se eligen las condiciones de 1810 y se mira. En cada
  bifurcación la opción que se impone la decide la **correlación de fuerzas**
  del momento: terratenientes, sindicatos, Fuerzas Armadas, capital extranjero,
  clases medias, poderes provinciales, pueblos originarios, organismos
  internacionales. Con la misma configuración, dos partidas cuentan historias
  distintas.
- **Interventor** — la simulación se detiene en cada bifurcación y decide el
  jugador, viendo qué actores empujan cada camino. Siempre se puede delegar la
  decisión a la correlación de fuerzas.

## Qué se simula

Doce sistemas que corren en orden cada año y se leen entre sí:

| Sistema | De qué se ocupa |
|---|---|
| Recursos naturales | Potencial del subsuelo, renta extractiva, degradación ambiental |
| Tierra | Concentración, arrendamiento, extranjerización, frontera agrícola |
| Economía | Producción, precios, distribución, restricción externa |
| Deuda externa | Cinco canales de endeudamiento, ciclo de liquidez mundial, condicionalidad |
| Demografía | Transición vital, inmigración masiva, migraciones internas, composición |
| Educación y ciencia | Alfabetización, niveles encadenados, capacidades técnicas, fuga de cerebros |
| Infraestructura | Forma de la red, control nacional, energía, mantenimiento |
| Fuerzas Armadas | Profesionalización, doctrina, coalición golpista, industria de defensa |
| Movimientos sociales | Sindicalización, derechos, represión, pobreza |
| Política exterior | Soberanía efectiva, alineamiento, inserción comercial, inversión extranjera |
| Cultura | Identidad, prensa, industrias culturales, memoria histórica |
| Régimen y territorio | Capacidad estatal, legitimidad, desarrollo provincial |

Cinco índices resumen el resultado: **soberanía, equidad, desarrollo,
democracia, bienestar**.

### Los mecanismos que el simulador intenta mostrar

- **La restricción externa.** El cuello de botella recurrente no es fiscal sino
  de divisas. Crecer con salarios altos aumenta las importaciones, deteriora la
  balanza y termina en devaluación, que licúa el salario y enfría la economía.
  El ciclo *stop and go* no está escrito: emerge de las ecuaciones, junto con la
  sustitución forzada de importaciones que abre la fase siguiente.
- **De dónde sale la deuda.** No de "gastar de más": de la brecha de divisas,
  del empuje de la liquidez internacional cuando el capital sobra en el centro,
  de la fuga financiada con la propia deuda que entra, de la estatización de
  pasivos privados, y sólo en último lugar del déficit fiscal. Cuando la tasa
  real supera el crecimiento, el stock crece solo.
- **La deuda como pérdida de soberanía.** La condicionalidad de los acreedores
  bloquea opciones de política: hay decisiones que dejan de estar disponibles.
- **El reparto de la tierra.** Define quién capta la renta agraria, y esa renta
  es la que financia —o no— la industria, la escuela y el Estado. La
  concentración se autorrefuerza: romperla exige decisión política y se paga en
  la correlación de fuerzas.
- **La forma de la red.** Una red ferroviaria en abanico hacia un solo puerto
  abarata exportar y encarece el comercio interior: funde al interior y
  concentra población en el litoral. Una red mallada produce mercado interno.
- **Lo que se destruye rápido y se reconstruye lento.** Capacidades
  científicas, organización popular, infraestructura sin mantenimiento.

## Eventos

73 eventos con 186 opciones, repartidos en cinco paquetes:

- `fundacion.js` (1810-1880): Revolución de Mayo, Asamblea del Año XIII,
  independencia, **empréstito Baring**, enfiteusis y tierra pública, ley de
  aduana, bloqueos, Constitución, ferrocarriles, guerra del Paraguay, frontera
  con los pueblos originarios, federalización.
- `agroexportador.js` (1880-1943): ley 1420, crisis de 1890, cuestión obrera,
  Grito de Alcorta, ley Sáenz Peña, Reforma Universitaria, Semana Trágica y
  Patagonia rebelde, YPF, crisis de 1930, **pacto Roca-Runciman**, Banco
  Central, plan de reactivación industrial.
- `industrializacion.js` (1943-1983): legislación social, compra de los
  ferrocarriles, voto femenino, crisis de divisas, 1955 y la proscripción,
  ingreso al FMI, sistema científico, intervención de las universidades,
  Cordobazo, pacto social y Rodrigazo, **1976 y el terrorismo de Estado**,
  valorización financiera, estatización de la deuda privada, Malvinas.
- `democracia.js` (1983-2100): juicio a las juntas, hiperinflación,
  convertibilidad, privatizaciones, 2001, canje, retenciones, YPF, FMI, y una
  veintena de **futuros abiertos** (litio, transición energética, crisis
  climática, automatización, soberanía de datos, integración regional).
- `estructurales.js`: recurrentes, disparados por el estado del país y no por el
  calendario — elecciones, rupturas institucionales, estallidos, huelgas
  generales, crisis de balanza de pagos, crisis de deuda, shocks externos,
  tensión federal, catástrofes, avances científicos, escándalos.

Cada evento canónico tiene una opción marcada como la que efectivamente
ocurrió; la fidelidad histórica es un parámetro que sesga hacia esa opción sin
imponerla.

## Mapa

El territorio se rasteriza desde el contorno real (lat/lon) a una grilla de
58×120 píxeles: ecorregiones argentinas, ríos, lagos y salares, relieve por
dithering, y las 24 jurisdicciones asignadas por Voronoi ponderado sobre
semillas geográficas. Ocho vistas: física, política, población, desarrollo,
pobreza, tierra, territorio originario y conflicto. Los sprites de ciudades,
chacras, estancias, fábricas, pozos, minas, puertos, tolderías, universidades y
conflictos se dibujan por código, sin imágenes externas.

## Pruebas

```bash
node tests/eventos.test.mjs      # ids, estructura, rutas de estado, ejecución
node tests/simulacion.test.mjs   # estabilidad, variedad, divergencia, determinismo
```

La segunda comprueba que 12 partidas terminen sin NaN ni valores absurdos, que
las partidas **diverjan** entre sí, que las configuraciones iniciales lleven a
resultados distintos, y que una misma semilla reproduzca exactamente la misma
partida.

## Estado del modelo

La simulación es estable, determinista y produce trayectorias variadas y
encadenadas. La calibración de niveles absolutos todavía corre **por debajo de
las anclas históricas** de `docs/CONTRATO.md`: hacia 2050 la línea histórica
llega a unos 26 millones de habitantes y un PBI per cápita del orden de los
700-1.000 dólares internacionales de 1990, contra los 46 millones y 10.000
reales. Las *relaciones* entre variables y las divergencias entre caminos
funcionan; los niveles necesitan otra pasada de calibración, sobre todo en la
acumulación de capital y en el peso del servicio de deuda sobre el siglo XIX.

## Documentación

- `docs/CONTRATO.md` — especificación de sistemas y eventos, anclas históricas
  y exigencias de coherencia.
- `docs/BANDERAS.md` — vocabulario compartido entre eventos y sistemas.
