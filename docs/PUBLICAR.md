# Cómo publicar el juego en internet

El juego son archivos estáticos: no hay servidor, ni base de datos, ni proceso
de compilación. Eso lo hace muy fácil de publicar y muy barato (gratis en las
dos opciones de abajo).

**Recomendación: empezá con GitHub Pages.** Son tres minutos, no hace falta
crear ninguna cuenta nueva ni tocar la terminal. Si más adelante querés un
dominio propio tipo `www.tujuego.com.ar`, pasás a Cloudflare, que también es
gratis y no te obliga a rehacer nada.

---

## Opción A · GitHub Pages (la más simple)

### Antes de empezar

El repositorio tiene que ser **público**. En las cuentas gratuitas de GitHub,
publicar un repositorio privado requiere plan pago. Para verificarlo entrá a
`https://github.com/evelynbumbaca/juegoargentina` y fijate si al lado del
nombre dice `Public` o `Private`.

Si dice `Private` y lo querés público:
1. Entrá a la pestaña **Settings** (arriba a la derecha del repositorio).
2. Bajá del todo, hasta la zona roja **Danger Zone**.
3. Clic en **Change repository visibility** → **Change to public**.
4. Te va a pedir que escribas el nombre del repositorio para confirmar.

### Publicarlo

1. Entrá a `https://github.com/evelynbumbaca/juegoargentina`.
2. Clic en la pestaña **Settings** (arriba, con un ícono de engranaje).
3. En la columna de la izquierda, clic en **Pages**.
4. En **Source** elegí **Deploy from a branch**.
5. Debajo aparecen dos desplegables:
   - En el primero (la rama) elegí `claude/argentina-sandbox-game-ukv92n`.
     Debería estar ya seleccionada, porque es la rama principal del repositorio.
   - En el segundo (la carpeta) dejá **`/ (root)`**.
6. Clic en **Save**.
7. Esperá entre uno y tres minutos. Recargá la página de **Pages**: arriba va a
   aparecer un recuadro verde con la dirección.

La dirección va a ser:

```
https://evelynbumbaca.github.io/juegoargentina/
```

Esa es la que podés compartir. Cada vez que se suban cambios al repositorio, el
sitio se actualiza solo en un par de minutos.

### Si algo no funciona

- **Aparece un 404.** Esperá cinco minutos más: la primera publicación a veces
  tarda. Si sigue, revisá que en el paso 5 la carpeta sea `/ (root)` y no
  `/docs`.
- **Se ve la página pero el mapa no aparece.** Probá en otro navegador o con
  Ctrl+Shift+R (recarga forzada). Suele ser el navegador mostrando una versión
  vieja guardada.
- **No aparece la opción Pages.** Es que el repositorio es privado y la cuenta
  es gratuita: hacelo público como se explica arriba.

---

## Opción B · Cloudflare Pages (si querés dominio propio)

Vale la pena si querés `tujuego.com.ar` en vez de `github.io`, o si esperás
mucho tráfico. También es gratis.

1. Creá una cuenta en `https://dash.cloudflare.com/sign-up` (pide sólo mail y
   contraseña).
2. En el menú de la izquierda, entrá a **Workers & Pages**.
3. Clic en **Create** → pestaña **Pages** → **Connect to Git**.
4. Clic en **Connect GitHub** y autorizá el acceso. Cuando pregunte a qué
   repositorios, podés elegir **Only select repositories** y marcar sólo
   `juegoargentina`.
5. Elegí el repositorio `juegoargentina` y clic en **Begin setup**.
6. Esta pantalla es la importante. Configurala así:
   - **Production branch**: `claude/argentina-sandbox-game-ukv92n`
   - **Framework preset**: `None`
   - **Build command**: **dejalo completamente vacío**
   - **Build output directory**: `/`
7. Clic en **Save and Deploy**.
8. En un minuto te da una dirección tipo `juegoargentina.pages.dev`.

> El paso 6 es donde se traba la mayoría: Cloudflare asume que todo proyecto
> necesita compilarse. Este no. Si le ponés un comando de compilación, va a
> fallar.

### Ponerle un dominio propio

Primero hay que comprar el dominio. Dos caminos:

- **`.com.ar`** — se registra en `https://nic.ar`. Es barato (cuesta unos pocos
  miles de pesos por año) pero necesitás Clave Fiscal de AFIP/ARCA.
- **`.com`, `.net`, `.ar`** — en cualquier registrador internacional
  (Namecheap, Porkbun, Cloudflare Registrar). Se paga con tarjeta, unos 10 a 15
  dólares por año, y no necesitás nada más.

Una vez que lo tenés:

1. En Cloudflare, entrá a tu proyecto de Pages → pestaña **Custom domains**.
2. Clic en **Set up a custom domain** y escribí tu dominio.
3. Cloudflare te va a mostrar los datos que hay que cargar en el panel donde
   compraste el dominio (unos registros llamados `CNAME` o unos *nameservers*).
   Copiá y pegá exactamente lo que te muestra.
4. Puede tardar desde unos minutos hasta 24 horas en propagarse. El certificado
   de seguridad (el candadito del `https`) lo pone Cloudflare solo.

---

## Cuál elegir

| | GitHub Pages | Cloudflare Pages |
|---|---|---|
| Tiempo de puesta en marcha | 3 minutos | 10 minutos |
| Hace falta cuenta nueva | No | Sí |
| Repositorio privado | Requiere plan pago | Gratis |
| Dominio propio | Se puede, con más pasos | Muy simple |
| Velocidad fuera de Argentina | Buena | Mejor |

Para mostrárselo a alguien esta semana, **GitHub Pages**. Si el proyecto crece y
querés dominio propio y estadísticas de visitas, **Cloudflare**. Cambiar de una
a la otra después no cuesta nada: los archivos son los mismos.

---

## Probarlo en tu computadora antes de publicar

No es obligatorio, pero si querés verlo funcionando localmente:

1. Descargá el repositorio (botón verde **Code** → **Download ZIP**) y
   descomprimilo.
2. Abrí una terminal en esa carpeta y ejecutá:
   ```
   python3 -m http.server 8000
   ```
3. Abrí `http://localhost:8000` en el navegador.

Ojo: **no alcanza con hacer doble clic en `index.html`**. El juego está partido
en muchos archivos y los navegadores, por seguridad, no dejan que se carguen
entre sí cuando se abren directamente desde el disco. Por eso hace falta el
comando de arriba, que levanta un servidor chiquito en tu propia máquina.
