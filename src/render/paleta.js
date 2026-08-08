// Paleta y sprites en pixel art.
//
// Todo se dibuja por código: no hay imágenes externas. Los sprites son grillas
// de caracteres donde cada carácter es un índice de color; el punto es
// transparente.

export const UI = {
  fondo: '#12161c',
  panel: '#1a2029',
  panelAlto: '#222a35',
  borde: '#39485c',
  bordeVivo: '#5b748c',
  texto: '#dfe6ef',
  textoSuave: '#8fa0b5',
  acento: '#6fb1d8',      // celeste
  acento2: '#f0d38a',     // dorado
  bien: '#7fc98a',
  mal: '#e0736a',
  alerta: '#e8b45f',
};

/** Colores por índice del mapa político. */
export const COLORES_PROVINCIA = [
  '#c8785f', '#7fa650', '#5f9e6e', '#b08a4a', '#8f6fb0', '#d0a95f',
  '#6b8fa3', '#a35f5f', '#5f8fa3', '#93a84f', '#b06a45', '#79a06b',
  '#a8896b', '#6f8fc0', '#c0906f', '#8aa870', '#a06f8f', '#6fa090',
  '#c07f9a', '#7f9ac0', '#9ac07f', '#c0b07f', '#7fc0b0', '#b07fc0',
];

/** Rampa para los mapas temáticos (de peor a mejor). */
export const RAMPA_FRIA = ['#2b3a4a', '#33566b', '#3b7a86', '#54a08e', '#88c48c', '#d6e89a'];
export const RAMPA_CALIDA = ['#2a2233', '#5b2f43', '#8c3d47', '#bc5a45', '#dd8b4f', '#f2c96b'];
export const RAMPA_ROJA = ['#1e2a34', '#3d3550', '#6b3a5c', '#96415a', '#c4544f', '#e88a5a'];

/** Devuelve un color de la rampa para un valor 0..1. */
export function deRampa(rampa, v) {
  const i = Math.max(0, Math.min(rampa.length - 1, Math.floor(v * rampa.length)));
  return rampa[i];
}

// ---------------------------------------------------------------------------
// Sprites. '.' = transparente. Los dígitos indexan la paleta del sprite.
// ---------------------------------------------------------------------------

export const SPRITES = {
  // Rancho / poblado pequeño (5x5)
  poblado: {
    paleta: ['#8a6a48', '#b89268', '#4a3627'],
    px: [
      '.....',
      '..2..',
      '.212.',
      '.101.',
      '.000.',
    ],
  },
  // Ciudad (7x7)
  ciudad: {
    paleta: ['#9aa3ad', '#c3ccd6', '#5b6672', '#f0d38a'],
    px: [
      '..2.2..',
      '.212120',
      '.101013',
      '.101010',
      '2101010',
      '0103010',
      '0000000',
    ],
  },
  // Metrópoli (7x9)
  metropoli: {
    paleta: ['#98a4b4', '#cfd9e6', '#5d6a7a', '#f0d38a', '#7d8998'],
    px: [
      '...2...',
      '..212..',
      '.21012.',
      '.10301.',
      '2101012',
      '1013101',
      '0101010',
      '0130101',
      '0000000',
    ],
  },
  // Estancia: casco y alambrado (7x5)
  estancia: {
    paleta: ['#7a5c3a', '#a8834f', '#4f5b34'],
    px: [
      '.......',
      '..111..',
      '.10001.',
      '2222222',
      '.2...2.',
    ],
  },
  // Chacra: surcos sembrados (7x5)
  chacra: {
    paleta: ['#c8b45f', '#8fa348', '#6f8438'],
    px: [
      '.......',
      '0101010',
      '1212121',
      '0101010',
      '2121212',
    ],
  },
  // Fábrica con chimenea (7x6)
  fabrica: {
    paleta: ['#6f7784', '#98a2b0', '#3f4650', '#c9d2dc'],
    px: [
      '.3.....',
      '.0.....',
      '.0.111.',
      '20.101.',
      '20.101.',
      '2222222',
    ],
  },
  // Torre de petróleo (5x7)
  pozo: {
    paleta: ['#3b4149', '#6b7480', '#1d2126'],
    px: [
      '..0..',
      '.010.',
      '.010.',
      '01010',
      '01010',
      '11111',
      '22222',
    ],
  },
  // Mina (5x5)
  mina: {
    paleta: ['#6b5b4a', '#3a3129', '#a08a6a'],
    px: [
      '.....',
      '.222.',
      '21112',
      '21112',
      '.111.',
    ],
  },
  // Vía férrea (horizontal, 7x3)
  via: {
    paleta: ['#5a4a3a', '#8a7a68'],
    px: [
      '.......',
      '1111111',
      '0.0.0.0',
    ],
  },
  // Puerto: grúa y agua (7x5)
  puerto: {
    paleta: ['#8a929c', '#c2cad4', '#3f6f9c'],
    px: [
      '.11111.',
      '.0.....',
      '.0.....',
      '00000..',
      '2222222',
    ],
  },
  // Toldería / comunidad originaria (7x5)
  tolderia: {
    paleta: ['#a8815a', '#d8b586', '#5d4630'],
    px: [
      '...2...',
      '..212..',
      '.21012.',
      '2101012',
      '0000000',
    ],
  },
  // Conflicto: fuego (5x5)
  conflicto: {
    paleta: ['#e0603a', '#f0a848', '#8e2f22'],
    px: [
      '..1..',
      '.101.',
      '10101',
      '12021',
      '.222.',
    ],
  },
  // Universidad / ciencia (7x5)
  universidad: {
    paleta: ['#c8d2de', '#8d97a4', '#6fb1d8'],
    px: [
      '...2...',
      '.00000.',
      '0101010',
      '0101010',
      '1111111',
    ],
  },
  // Represa (7x5)
  represa: {
    paleta: ['#7d8894', '#b7c2ce', '#3f6f9c'],
    px: [
      '2222222',
      '2222222',
      '1111111',
      '0101010',
      '0000000',
    ],
  },
};

/** Dibuja un sprite con el píxel de tamaño `esc` en (x, y) del canvas. */
export function dibujarSprite(ctx, clave, x, y, esc = 1, alfa = 1) {
  const sp = SPRITES[clave];
  if (!sp) return;
  const anterior = ctx.globalAlpha;
  ctx.globalAlpha = alfa;
  for (let f = 0; f < sp.px.length; f++) {
    const fila = sp.px[f];
    for (let c = 0; c < fila.length; c++) {
      const ch = fila[c];
      if (ch === '.') continue;
      ctx.fillStyle = sp.paleta[Number(ch)] ?? '#fff';
      ctx.fillRect(x + c * esc, y + f * esc, esc, esc);
    }
  }
  ctx.globalAlpha = anterior;
}

export const ANCHO_SPRITE = (clave) => (SPRITES[clave]?.px[0].length ?? 0);
export const ALTO_SPRITE = (clave) => (SPRITES[clave]?.px.length ?? 0);
