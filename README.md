# Aldermoor: El Sello Quebrado

RPG de acción 2D con vista aérea, de fantasía oscura medieval, hecho con
**Phaser 3** y JavaScript (módulos ES6). Sin compilación ni dependencias:
es un sitio estático listo para GitHub Pages. La partida se guarda en
LocalStorage.

Contenido de esta versión: un supramundo de 9 pantallas, 5 NPCs, 4 hechizos,
la mazmorra "Cripta de las Brasas" (8 salas, puzles, llaves, mapa) y su jefe.
El diseño completo (lore, mecánicas, números, animaciones, tareas pendientes)
está en [DISENO.md](DISENO.md).

## Controles

| Acción | Teclas |
| --- | --- |
| Moverse | WASD o flechas |
| Espada | Espacio o J |
| Escudo (mantener) | Shift o K |
| Lanzar hechizo | L o F |
| Cambiar hechizo | 1-4, o Q |
| Hablar / abrir / leer | E o Enter |
| Mapa | M |
| Pausa | Esc o P |

## Probarlo en tu ordenador

Los módulos ES6 no cargan con `file://`, así que hace falta un servidor local.
Desde la carpeta del proyecto:

    python3 -m http.server 8000

y abre http://localhost:8000 en el navegador. Si tu equipo no tiene WebGL,
añade `?canvas` a la dirección para usar el renderizador Canvas 2D.

## Publicarlo en GitHub Pages

1. Crea un repositorio en GitHub y sube todo el contenido de esta carpeta
   (con `index.html` en la raíz):

       git init
       git add .
       git commit -m "Aldermoor"
       git branch -M main
       git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
       git push -u origin main

2. En el repositorio: Settings > Pages > "Build and deployment" >
   Source: "Deploy from a branch", rama `main`, carpeta `/ (root)`. Guarda.
3. En un minuto estará en `https://TU_USUARIO.github.io/TU_REPO/`.

Todas las rutas son relativas, así que funciona en una subcarpeta sin tocar
nada. El archivo `.nojekyll` evita que GitHub procese el sitio con Jekyll.

## Estructura

    index.html              página del juego
    style.css               estilos y tipografías
    lib/phaser.min.js       Phaser 3 (incluido, sin CDN)
    src/
      main.js               configuración de Phaser
      config.js             constantes y tablas de equilibrio
      save.js               guardado en LocalStorage
      sfx.js                efectos de sonido sintetizados (WebAudio)
      data/dialogs.js       diálogos, carteles y textos de objetos
      scenes/
        BootScene.js        carga de recursos y animaciones
        TitleScene.js       título: Continuar / Nueva partida
        WorldScene.js       mapa, colisiones, combate, interacción
        UIScene.js          HUD, diálogos, mapa y pausa
      entities/
        Player.js           movimiento, espada, escudo, daño
        Enemies.js          limo, murciélago, Caballero Hueco
        Boss.js             Ser Caldric
      systems/
        Magic.js            maná, hechizos y proyectiles
        Objects.js          objetos del mapa y puzles
        Rooms.js            cámara por pantallas, enemigos por sala
    assets/
      tilesets/tiles.png    tileset (64 px, margen 1, separación 2)
      maps/*.json           mapas en formato Tiled
      sprites/  ui/  fonts/
    tools/                  generadores de arte y mapas (Python)

## Dónde está cada cosa

- **Configuración de Phaser**: `src/main.js` (escala FIT 1280x832, Arcade
  Physics sin gravedad, cuatro escenas).
- **Control del jugador con físicas**: `Player.tick()` en
  `src/entities/Player.js`. Las colisiones se declaran en
  `WorldScene.create()` (`physics.add.collider` / `overlap`).
- **Barra de maná y hechizos**: `src/systems/Magic.js`. `cast()` comprueba y
  descuenta el coste, `update()` regenera el maná; la barra se dibuja en
  `UIScene.drawHud()`. Los costes están en `src/config.js`.
- **Proyectiles mágicos e interruptores**: en `Magic.js` un `overlap` entre
  el grupo de proyectiles y el grupo `obstacles` llama a
  `Objects.shotHit(proyectil, objeto)`. Ahí se decide el efecto según el tipo:
  Brasa enciende antorchas y quema zarzas, cualquier proyectil activa un
  cristal, Vendaval disipa niebla y empuja bloques. Cada efecto activa una
  bandera (`setFlag('crystal:c1')`) y `Objects.onFlag()` abre lo que esté
  enlazado a ella.

## Editar los mapas

Los mapas son JSON de Tiled con tres capas: `ground` (tiles), `solid`
(bloqueos invisibles) y `objects` (todo lo interactivo; el campo `type`
decide qué es). Hay dos formas de cambiarlos:

- Abrir `assets/maps/*.json` en [Tiled](https://www.mapeditor.org/).
- Editar las pantallas en ASCII de `tools/gen_maps.py` y regenerar:

      python3 tools/gen_maps.py

Los puzles se enlazan con propiedades. Ejemplo: una reja con
`opens_on = torches:vest` se abre cuando todas las antorchas con
`group = vest` están encendidas; un puente con `opens_on = crystal:c1`
aparece al activar el cristal con `id = c1`; un objeto con `hidden = true`
solo aparece con el hechizo Revelación.

## Regenerar el arte

Todo el arte es procedural (Python + Pillow + NumPy):

    python3 tools/gen_tiles.py      # tileset
    python3 tools/gen_sprites.py    # personajes, objetos, interfaz
    python3 tools/gen_maps.py       # mapas (necesita tools/tiles_index.json)

## Créditos

Phaser 3 (licencia MIT). Tipografías Cinzel y Alegreya (SIL Open Font License).
