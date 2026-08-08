// Registro de sistemas. El orden real de ejecución lo fija `meta.orden`
// (ver la tabla de docs/CONTRATO.md); acá sólo se importan.

import recursos from './recursos.js';
import tierra from './tierra.js';
import economia from './economia.js';
import deuda from './deuda.js';
import demografia from './demografia.js';
import educacion from './educacion.js';
import infraestructura from './infraestructura.js';
import ffaa from './ffaa.js';
import social from './social.js';
import exterior from './exterior.js';
import cultura from './cultura.js';
import regimen from './regimen.js';

export const SISTEMAS = [
  recursos, tierra, economia, deuda, demografia, educacion,
  infraestructura, ffaa, social, exterior, cultura, regimen,
];

export default SISTEMAS;
