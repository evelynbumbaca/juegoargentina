# Registro de banderas (`estado.flags`)

Las banderas son el vocabulario común entre eventos y sistemas: un evento las
enciende, otros eventos y los sistemas las leen. **Antes de inventar una,
buscá acá.** Si hace falta una nueva, se agrega con el prefijo del dominio
(`educacion_*`, `deuda_*`, …) y se documenta en esta tabla.

Se leen con `api.tiene('clave')` desde eventos y con `estado.flags.clave` desde
sistemas. Ausente = falsa.

## Estado y organización nacional

| bandera | significado |
|---|---|
| `independencia_declarada` | Se declaró la independencia (1816 canónico) |
| `constitucion_sancionada` | Hay constitución nacional vigente |
| `bsas_incorporada` | Buenos Aires integrada al Estado nacional |
| `capital_federalizada` | Capital federal establecida |
| `aduana_nacionalizada` | La renta aduanera se reparte nacionalmente |
| `estado_unitario` / `estado_federal` | Forma de organización dominante |
| `guerra_civil` | Conflicto interno abierto en curso |
| `secesion` | Una o más provincias se separaron |

## Tierra, frontera y pueblos originarios

| bandera | significado |
|---|---|
| `enfiteusis` | Régimen de enfiteusis rivadaviana vigente |
| `conquista_desierto` | Campaña militar sobre la Patagonia consumada |
| `tratados_originarios` | Frontera sur resuelta por tratados |
| `ley_colonizacion` | Ley de colonización con chacras familiares |
| `reforma_agraria` | Reforma agraria efectivamente ejecutada |
| `arrendamientos_regulados` | Ley de arrendamientos rurales vigente |
| `ley_tierras_extranjeras` | Límite legal a la extranjerización |
| `sojizacion` | Paquete transgénico + siembra directa adoptado |

## Economía, industria y trabajo

| bandera | significado |
|---|---|
| `proteccionismo` | Aduana proteccionista vigente |
| `librecambio` | Apertura comercial plena |
| `sustitucion_importaciones` | Industrialización sustitutiva en marcha |
| `banco_central` | Banco Central creado |
| `iapi` | Estado monopoliza el comercio exterior de granos |
| `convertibilidad` | Tipo de cambio fijo por ley |
| `privatizaciones` | Ola privatizadora ejecutada |
| `reestatizaciones` | Reversión de privatizaciones |
| `retenciones` | Derechos de exportación vigentes |
| `control_cambios` | Restricciones al mercado de divisas |
| `paritarias` | Negociación colectiva institucionalizada |
| `industria_pesada` | Siderurgia/petroquímica nacional en pie |

## Deuda y relación externa

| bandera | significado |
|---|---|
| `emprestito_baring` | Primer empréstito externo tomado |
| `default_deuda` | Cesación de pagos en curso |
| `fmi_miembro` | El país ingresó al FMI |
| `acuerdo_fmi` | Programa vigente con el FMI |
| `deuda_reestructurada` | Canje de deuda concretado |
| `desendeudamiento` | Política sostenida de reducción de deuda |
| `fuga_capitales` | Fuga de divisas severa en curso |
| `bicameral_deuda` | Control parlamentario del endeudamiento |

## Recursos y energía

| bandera | significado |
|---|---|
| `petroleo_descubierto` | Hallazgo de petróleo (1907 canónico) |
| `ypf_creada` | Empresa petrolera estatal fundada |
| `ypf_privatizada` | Petrolera estatal vendida |
| `ypf_reestatizada` | Recuperación del control estatal |
| `gas_del_estado` | Empresa gasífera estatal |
| `energia_nuclear` | Programa nuclear nacional |
| `vaca_muerta` | No convencionales en explotación |
| `litio_estatal` | Litio bajo control estatal o mixto |
| `litio_concesionado` | Litio concesionado a capital extranjero |
| `mineria_cielo_abierto` | Megaminería habilitada |

## Infraestructura

| bandera | significado |
|---|---|
| `ferrocarril_britanico` | Red ferroviaria en manos extranjeras |
| `ferrocarriles_nacionalizados` | Red ferroviaria estatizada |
| `ramales_cerrados` | Desmantelamiento de ramales |
| `red_vial_nacional` | Plan vial nacional ejecutado |
| `hidroelectricas` | Grandes represas construidas |
| `puerto_multiple` | Sistema portuario descentralizado |
| `conectividad_digital` | Red digital de alcance nacional |

## Educación, ciencia y cultura

| bandera | significado |
|---|---|
| `ley_1420` | Educación primaria gratuita, laica y obligatoria |
| `reforma_universitaria` | Autonomía y cogobierno universitario |
| `universidad_gratuita` | Gratuidad universitaria |
| `conicet` | Sistema científico nacional consolidado |
| `noche_bastones_largos` | Intervención y éxodo científico |
| `invap` / `conae` | Capacidades tecnológicas estratégicas |
| `escuelas_tecnicas` | Red de educación técnica |
| `ley_medios` | Regulación de medios audiovisuales |
| `memoria_verdad_justicia` | Política de memoria consolidada |

## Régimen político y derechos

| bandera | significado |
|---|---|
| `voto_secreto` | Ley Sáenz Peña o equivalente |
| `voto_femenino` | Sufragio femenino |
| `proscripcion` | Proscripción de una fuerza mayoritaria |
| `golpe_militar` | Golpe consumado (se apaga al volver la democracia) |
| `terrorismo_estado` | Represión ilegal sistemática |
| `juicio_juntas` | Juzgamiento de los responsables |
| `derechos_humanos` | Política de DDHH consolidada |
| `matrimonio_igualitario`, `ley_aborto`, `ley_identidad_genero` | Ampliación de derechos |
| `democracia_consolidada` | Más de 30 años de continuidad institucional |

## Territorio y soberanía

| bandera | significado |
|---|---|
| `malvinas_ocupadas` | Ocupación británica vigente (desde 1833) |
| `guerra_malvinas` | Conflicto armado por las islas |
| `malvinas_recuperadas` | Soberanía efectiva recuperada |
| `guerra_paraguay` | Guerra de la Triple Alianza |
| `mercosur` | Integración regional en marcha |
| `alca_rechazado` | Rechazo al área de libre comercio hemisférica |
| `unasur` | Coordinación política sudamericana |
| `base_extranjera` | Presencia militar extranjera en territorio |
