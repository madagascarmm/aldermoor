# ALDERMOOR: EL SELLO QUEBRADO
Documento de diseño (GDD) · RPG de acción 2D top-down · Phaser 3 · GitHub Pages

Este documento es la referencia única del proyecto: tareas, lore, mecánicas,
números y animaciones. Si un valor cambia en el código (`src/config.js`),
se cambia también aquí.

---------------------------------------------------------------------------
## 1. FICHA RÁPIDA
---------------------------------------------------------------------------
- Género: aventura / RPG de acción, vista aérea, pantallas conectadas.
- Motor: Phaser 3 (Arcade Physics), JavaScript ES6 con módulos, sin compilación.
- Resolución interna: 1280 x 832 (HUD de 64 px arriba + vista de 1280 x 768).
- Tile: 64 x 64 px. Cada pantalla/sala mide 20 x 12 tiles.
- Mapas: JSON de Tiled (capas de tiles + capa de objetos).
- Guardado: LocalStorage (clave `aldermoor.save.v1`).
- Estilo: vectorial estilizado pintado con sombreado suave (nada de 8 bits, nada de 3D).
- Alcance de esta versión: supramundo de 9 pantallas + mazmorra 1 completa con jefe.

---------------------------------------------------------------------------
## 2. LISTA DE COSAS QUE HACER
---------------------------------------------------------------------------
Leyenda: [x] hecho en esta versión · [ ] pendiente

### Fase 0 — Base del proyecto
- [x] Estructura de carpetas (index.html, /src, /assets, /lib, /tools)
- [x] Phaser 3 incluido en /lib (sin depender de CDN)
- [x] Configuración de Phaser (escala FIT, Arcade Physics, escenas)
- [x] README con pasos para GitHub Pages

### Fase 1 — Arte y mapas
- [x] Tileset del supramundo (hierba, camino, agua, autotiles de borde)
- [x] Tileset de mazmorra (suelo, muros, foso, puente)
- [x] Hoja del héroe (3 direcciones + espejo)
- [x] Hojas de enemigos (limo, murciélago, caballero hueco, jefe)
- [x] NPCs (anciana, herrero, niña, guardia, ermitaño)
- [x] Objetos (antorcha, cristal, placa, bloque, cofre, puertas, zarza, niebla)
- [x] Proyectiles y efectos (brasa, vendaval, impacto)
- [x] Iconos de interfaz (corazones, hechizos, llaves)
- [x] Mapa del supramundo en JSON de Tiled (9 pantallas)
- [x] Mapa de la Cripta de las Brasas en JSON de Tiled (8 salas)

### Fase 2 — Jugador
- [x] Movimiento en 8 direcciones con físicas (WASD / flechas)
- [x] Animaciones: reposo, andar, atacar, lanzar, escudo, daño
- [x] Espada con hitbox frontal
- [x] Escudo (bloquea ataques y proyectiles de frente)
- [x] Corazones, invulnerabilidad tras golpe, retroceso, muerte y reaparición

### Fase 3 — Magia
- [x] Barra de maná con regeneración
- [x] Brasa (fuego, ataque)
- [x] Vendaval (viento, ataque/empuje)
- [x] Revelación (utilidad: muestra secretos)
- [x] Égida (utilidad: invulnerabilidad temporal)
- [x] Selector de hechizo en el HUD

### Fase 4 — Mundo
- [x] Cámara por pantallas con desplazamiento suave
- [x] Cambio de mapa (supramundo <-> mazmorra) con fundido
- [x] NPCs con diálogo por texto (páginas, efecto máquina de escribir)
- [x] Carteles
- [x] Zarzas (se queman con Brasa) y niebla de ceniza (se disipa con Vendaval)
- [x] Arbustos y vasijas rompibles con botín

### Fase 5 — Enemigos
- [x] Limo de ceniza
- [x] Murciélago de cripta
- [x] Caballero Hueco (bloqueo frontal, carga)
- [x] Jefe: Ser Caldric, el Guardián Calcinado

### Fase 6 — Mazmorra y puzles
- [x] Antorchas que se encienden con Brasa y abren puertas
- [x] Bloque empujable + placa de presión
- [x] Cristal interruptor activado por proyectil mágico (extiende puente)
- [x] Sala de emboscada (rejas hasta derrotar a todos)
- [x] Puente oculto que aparece con Revelación
- [x] Llaves pequeñas, llave del jefe, mapa de mazmorra
- [x] Fragmento de reliquia + contenedor de corazón al vencer al jefe

### Fase 7 — Interfaz y guardado
- [x] HUD: corazones, maná, hechizo activo, llaves, fragmentos
- [x] Pantalla de título (Continuar / Nueva partida)
- [x] Guardado automático en LocalStorage
- [x] Mapa de mazmorra (tecla M)
- [x] Pausa
- [x] Efectos de sonido sintetizados (WebAudio, sin archivos)

### Pendiente para versiones futuras
- [ ] Mazmorra 2: Torre del Vendaval (fragmento del Vendaval)
- [ ] Mazmorra 3: Catacumbas de la Vigilia (fragmento de la Vigilia)
- [ ] Interior del Castillo de Cuervonegro y combate final contra el Rey Hueco
- [ ] Música (ahora solo hay efectos)
- [ ] Controles táctiles y mando
- [ ] Tienda, monedas e inventario de consumibles
- [ ] Más hechizos (hielo, luz) y mejoras de espada/escudo
- [ ] Interiores de las casas
- [ ] Ciclo día/noche y clima
- [ ] Traducción (ahora solo español)

---------------------------------------------------------------------------
## 3. LORE
---------------------------------------------------------------------------
### 3.1 El mundo
Aldermoor es un reino feudal de páramos, bosques viejos y fortalezas de piedra
negra. Lo gobiernan barones que juran lealtad a un trono que lleva tres siglos
vacío.

### 3.2 El mal antiguo
Hace trescientos años reinó Morvane, un rey-brujo que cambió su corazón por la
inmortalidad. Sin corazón no sentía hambre, ni miedo, ni piedad: lo llamaron
EL REY HUECO. Sus caballeros bebieron de la misma magia y quedaron vacíos como
él, armaduras que caminan con una brasa donde hubo un alma.

Tres órdenes se alzaron contra él:
- la Orden de la Brasa (herreros y guerreros del fuego),
- la Orden del Vendaval (mensajeros y arqueros de las cumbres),
- la Orden de la Vigilia (monjes guardianes de los muertos).

No pudieron matarlo, porque no se puede matar a quien no tiene corazón. Lo
encerraron bajo el Castillo de Cuervonegro tras el SELLO DEL ALBA, un disco de
oro blanco forjado con la magia de las tres órdenes.

### 3.3 El Sello quebrado
Para que nadie pudiera romper el Sello de un solo golpe, se partió en tres
fragmentos y cada orden escondió el suyo en una mazmorra:
- Fragmento de la Brasa — Cripta de las Brasas (ruinas de Piedralba).
- Fragmento del Vendaval — Torre del Vendaval (cumbres del norte).
- Fragmento de la Vigilia — Catacumbas de la Vigilia (bajo el pantano).

Las órdenes murieron con los siglos. Los fragmentos se debilitan y el Sello
con ellos.

### 3.4 El presente
Una niebla de ceniza baja del castillo. Los caballeros del barón Halbrecht
vuelven de patrulla con los ojos encendidos y sin voz: son los nuevos Huecos.
Ser Edric, último caballero que conocía la historia del Sello, partió hacia
las ruinas de Piedralba y no ha regresado.

### 3.5 El héroe
Aren, escudero de Ser Edric, criado en la aldea de Brezal. Solo tiene la
espada vieja y el escudo de su maestro. La anciana Maelis, última heredera de
la Orden de la Brasa, le enseña el primer hechizo y le encarga reunir los tres
fragmentos antes de que el Sello ceda.

### 3.6 Personajes
- Maelis, la anciana de Brezal: enseña BRASA. Guía principal.
- Bruna, la herrera: explica el combate y el escudo.
- Lina, una niña: da pistas sobre el lago y su secreto.
- Guardia Tobías: vigila el cruce; habla del castillo y de la niebla.
- Oswin, el ermitaño del bosque: antiguo monje de la Vigilia; enseña REVELACIÓN.
- Ser Edric: desaparecido. Su destino se descubre en la Cripta.
- Ser Caldric, el Guardián Calcinado: jefe de la Cripta. Fue el campeón de la
  Orden de la Brasa; lleva tres siglos ardiendo junto al fragmento que juró
  proteger y ya no distingue amigo de enemigo.

### 3.7 Arco de esta versión
1. Brezal: Maelis entrega Brasa.
2. Quemar las zarzas del este y cruzar el bosque de Sauceumbrío.
3. Oswin enseña Revelación.
4. Ruinas de Piedralba: entrada a la Cripta de las Brasas.
5. Cripta: conseguir Vendaval, la llave del jefe y vencer a Ser Caldric.
6. Fragmento de la Brasa obtenido (1 de 3).
7. Opcional: con Vendaval, disipar la niebla del oeste y hallar ÉGIDA en el
   santuario; con Revelación, encontrar el corazón oculto del lago.
8. La puerta de Cuervonegro pide los tres fragmentos: "Continuará".

---------------------------------------------------------------------------
## 4. EL MUNDO
---------------------------------------------------------------------------
### 4.1 Supramundo (3 x 3 pantallas, 60 x 36 tiles)

    +---------------------+---------------------+---------------------+
    | SANTUARIO OLVIDADO  | PUERTA DE           | RUINAS DE           |
    | cofre: Égida        | CUERVONEGRO         | PIEDRALBA           |
    |                     | (sellada, 3 fragm.) | entrada a la Cripta |
    +---------------------+---------------------+---------------------+
    | CLARO DE CENIZA     | CRUCE DEL REY       | SAUCEUMBRÍO NORTE   |
    | niebla (Vendaval)   | guardia Tobías      | ermitaño Oswin      |
    +---------------------+---------------------+---------------------+
    | LAGO DEL ESPEJO     | ALDEA DE BREZAL     | SAUCEUMBRÍO SUR     |
    | corazón oculto      | inicio, Maelis      | zarzas (Brasa)      |
    +---------------------+---------------------+---------------------+

Conexiones: Brezal -> este (zarzas) -> Sauceumbrío sur -> norte -> Oswin ->
norte -> Piedralba. Brezal -> norte -> Cruce -> norte -> Puerta. Cruce ->
oeste -> Claro de Ceniza -> norte (niebla) -> Santuario. Brezal -> oeste -> Lago.

### 4.2 Cripta de las Brasas (3 x 3 salas)

    +---------------------+---------------------+---------------------+
    | SALA DEL ABISMO     | CÁMARA DEL GUARDIÁN | SALA DE EMBOSCADA   |
    | puente oculto       | JEFE                | cofre: Vendaval     |
    | cofre: llave jefe   |                     |                     |
    +---------------------+---------------------+---------------------+
    | SALA DEL BLOQUE     | GALERÍA CENTRAL     | SALA DEL CRISTAL    |
    | cofre: llave        | puerta del jefe (N) | foso + cristal      |
    | niebla al norte     | puerta con llave (E)|                     |
    +---------------------+---------------------+---------------------+
    | ARMERÍA             | VESTÍBULO           |      (roca)         |
    | cofre: mapa         | 2 antorchas         |                     |
    +---------------------+---------------------+---------------------+

Recorrido previsto:
1. Vestíbulo: encender las 2 antorchas con Brasa -> se abre la reja norte.
2. Armería (oeste): limos y murciélagos; cofre con el MAPA.
3. Galería central: norte = puerta del jefe; este = puerta con cerradura.
4. Sala del bloque (oeste): empujar el bloque sobre la placa -> baja la reja
   del cofre -> LLAVE PEQUEÑA.
5. Abrir la puerta este. Sala del cristal: disparar Brasa al cristal del otro
   lado del foso -> se extiende el puente.
6. Sala de emboscada: se cierran las rejas; vencer a todos -> cofre con VENDAVAL.
7. Volver a la sala del bloque: Vendaval disipa la niebla del norte.
8. Sala del abismo: Revelación muestra el puente oculto -> LLAVE DEL JEFE.
9. Cámara del Guardián: Ser Caldric.

---------------------------------------------------------------------------
## 5. CONTROLES
---------------------------------------------------------------------------
    Moverse ................ WASD o flechas (8 direcciones)
    Espada ................. Espacio o J
    Escudo (mantener) ...... Shift o K
    Lanzar hechizo ......... L o F
    Cambiar hechizo ........ 1, 2, 3, 4  (o Q para el siguiente)
    Hablar / abrir / leer .. E o Enter
    Mapa de mazmorra ....... M
    Pausa .................. Esc o P

---------------------------------------------------------------------------
## 6. MECÁNICAS
---------------------------------------------------------------------------
### 6.1 Movimiento
- 8 direcciones de movimiento, 4 direcciones de orientación (abajo, arriba,
  izquierda, derecha). La diagonal está normalizada (misma velocidad).
- La orientación se conserva mientras se mantiene el escudo o se ataca.
- Caja de colisión pequeña a la altura de los pies (36 x 26 px) para poder
  pasar "por detrás" de árboles y muros.
- Los objetos se ordenan en profundidad por su coordenada Y.

### 6.2 Espada
- Golpe en arco frente al héroe. Dura 0,22 s y bloquea el movimiento.
- Hitbox de 88 x 88 px delante del héroe, activa durante los 3 primeros frames.
- Corta arbustos y rompe vasijas.
- No golpea a través del escudo de un Caballero Hueco (ver 7.3).

### 6.3 Escudo
- Mientras se mantiene: velocidad reducida y no se puede atacar.
- Bloquea el daño que llega desde el frente (arco de 120 grados): contacto,
  cargas y proyectiles. El bloqueo empuja un poco al héroe hacia atrás.
- No bloquea ataques por la espalda o los flancos.

### 6.4 Salud
- La vida se mide en medios corazones (PV). 1 corazón = 2 PV.
- Tras recibir daño: 1,0 s de invulnerabilidad (parpadeo) y retroceso.
- A 0 PV: animación de caída, fundido y reaparición en el último punto de
  control (entrada de la mazmorra o la aldea) con 3 corazones mínimo.
- Los contenedores de corazón aumentan el máximo en 1 corazón y curan del todo.

### 6.5 Magia y maná
- Barra de maná azul bajo los corazones.
- Lanzar un hechizo consume maná. Sin maná suficiente: sonido de fallo y la
  barra parpadea en rojo.
- Regeneración pasiva tras 1,2 s sin lanzar hechizos.
- Los viales de maná (botín) recargan 12 puntos.
- Enfriamiento global entre hechizos: 0,35 s.
- Los hechizos se aprenden de NPCs o cofres; el activo se ve en el HUD.

### 6.6 Hechizos y su uso en el entorno
- BRASA (ataque): bola de fuego recta. Enciende antorchas, quema zarzas,
  activa cristales.
- VENDAVAL (ataque/empuje): ráfaga rápida. Empuja y aturde enemigos, disipa
  niebla de ceniza, empuja bloques a distancia, apaga el aura del jefe,
  activa cristales.
- REVELACIÓN (utilidad): pulso que recorre la sala. Hace visibles y sólidos
  los cofres y puentes ocultos. Lo revelado se queda revelado.
- ÉGIDA (utilidad): burbuja dorada. Invulnerabilidad total durante 4 s.

### 6.7 Puzles
- Antorcha: se enciende con Brasa. Cuando todas las de un grupo están
  encendidas, se abre la puerta enlazada.
- Bloque empujable: se empuja caminando contra él 0,3 s (o con Vendaval).
  Se mueve una casilla. Vuelve a su sitio al salir de la sala si el puzle no
  está resuelto.
- Placa de presión: se activa con un bloque encima.
- Cristal interruptor: lo activa cualquier proyectil mágico. Permite puzles
  a distancia (al otro lado de un foso).
- Rejas: se abren por antorchas, placas, cristales o al derrotar enemigos.
- Puerta con cerradura: gasta 1 llave pequeña. Puerta del jefe: llave del jefe.
- Lo resuelto queda guardado en la partida.

### 6.8 Progresión (qué desbloquea qué)
    Brasa ........ zarzas del este de Brezal  -> bosque y ruinas
    Revelación ... puente oculto de la Cripta -> llave del jefe
                   cofre oculto del lago      -> contenedor de corazón
    Vendaval ..... niebla de la Cripta        -> sala del abismo
                   niebla del Claro de Ceniza -> santuario (Égida)
    3 fragmentos . puerta de Cuervonegro      -> (futuro)

### 6.9 Cámara
- La cámara está limitada a la pantalla actual (20 x 12 tiles).
- Al cruzar un borde, el juego se congela 0,55 s y la cámara se desliza a la
  pantalla vecina (transición suave por cuadrícula).
- Los enemigos solo existen en la pantalla actual y reaparecen al volver
  (salvo salas de emboscada ya superadas y el jefe).

### 6.10 Diálogos
- Caja de texto inferior con nombre del hablante y efecto máquina de escribir.
- E / Enter / Espacio: completar la línea o pasar página.
- El texto de cada NPC depende del progreso (banderas de la partida).

### 6.11 Guardado (LocalStorage)
- Automático: al cambiar de pantalla, abrir cofres, aprender hechizos y
  resolver puzles.
- Se guarda: mapa y posición, PV y PV máximos, maná, hechizos, hechizo activo,
  llaves, objetos de mazmorra, fragmentos, banderas (cofres, puertas, puzles,
  diálogos) y salas visitadas.
- "Nueva partida" en el título borra la partida anterior.

---------------------------------------------------------------------------
## 7. ESTADÍSTICAS
---------------------------------------------------------------------------
### 7.1 Héroe
    PV iniciales ................ 6  (3 corazones)
    PV máximos en esta versión .. 10 (5 corazones: +1 jefe, +1 lago)
    PV máximos previstos ........ 20 (10 corazones)
    Maná máximo ................. 40
    Regeneración de maná ........ 3 por segundo (tras 1,2 s sin lanzar)
    Velocidad ................... 250 px/s (3,9 tiles/s)
    Velocidad con escudo ........ 110 px/s
    Daño de espada .............. 2
    Duración del golpe .......... 0,22 s
    Invulnerabilidad tras daño .. 1,0 s
    Retroceso al recibir daño ... 420 px/s durante 0,16 s

### 7.2 Hechizos
    Hechizo      Coste  Daño  Velocidad   Alcance     Efecto extra
    -----------  -----  ----  ----------  ----------  --------------------------
    Brasa          6     2    520 px/s    1,1 s       enciende / quema
    Vendaval       6     1    640 px/s    0,9 s       empuja 2 tiles, aturde 1 s
    Revelación    12     -    -           sala        revela secretos
    Égida         20     -    -           propio      invulnerable 4 s

### 7.3 Enemigos
    Enemigo             PV  Daño  Velocidad            Comportamiento
    ------------------  --  ----  -------------------  ---------------------------
    Limo de ceniza       2   1    saltos de 150 px/s   Espera 0,9 s y salta hacia
                                                       el héroe. Vulnerable a todo.
    Murciélago cripta    1   1    210 px/s             Reposa; a menos de 5 tiles
                                                       se lanza en curva y se aleja.
    Caballero Hueco      6   2    patrulla 70 px/s     Patrulla. Si ve al héroe en
                                  carga 320 px/s       línea (6 tiles) avisa 0,5 s y
                                                       carga; luego queda 0,9 s
                                                       expuesto.

Reglas del Caballero Hueco:
- De frente su escudo desvía la espada (chispa, sin daño, empuja al héroe).
- Por los flancos o la espalda recibe daño normal.
- Brasa le hace daño completo desde cualquier lado.
- Vendaval lo empuja y lo deja aturdido 1 s (baja el escudo: vulnerable).

Daño expresado en PV (medios corazones). Tocar a un enemigo = su daño.

### 7.4 Jefe: Ser Caldric, el Guardián Calcinado
    PV ........................ 20
    Daño por contacto ......... 2
    Daño de bola de fuego ..... 2
    Daño de carga ............. 3
    Velocidad andando ......... 90 px/s
    Velocidad de carga ........ 430 px/s

Ciclo:
1. ARDIENTE: aura de fuego. Inmune a la espada y a Brasa. Camina hacia el
   héroe, lanza abanicos de 3 bolas de fuego y, cada dos abanicos, carga.
2. Un VENDAVAL apaga el aura -> APAGADO 3,5 s: arrodillado y vulnerable a
   la espada.
3. Se reenciende con una onda que empuja al héroe y vuelve al paso 1.
Fase 2 (10 PV o menos): abanicos de 5 bolas, pausas más cortas, carga doble.
El escudo del héroe detiene las bolas de fuego de frente, pero no la carga.
Recompensa: contenedor de corazón + Fragmento de la Brasa.

### 7.5 Botín
    Origen            Corazón (+2 PV)   Vial de maná (+12)   Nada
    ----------------  ---------------   ------------------   ----
    Enemigo común          22 %               28 %           50 %
    Arbusto                12 %               12 %           76 %
    Vasija                 25 %               30 %           45 %

### 7.6 Objetos
    Objeto                 Dónde                         Efecto
    ---------------------  ----------------------------  -------------------------
    Espada de Ser Edric    inicio                        ataque cuerpo a cuerpo
    Escudo de roble        inicio                        bloqueo frontal
    Brasa                  Maelis (Brezal)               hechizo 1
    Revelación             Oswin (Sauceumbrío norte)     hechizo 3
    Mapa de la Cripta      Armería                       muestra todas las salas
    Llave pequeña          Sala del bloque               abre 1 cerradura
    Vendaval               Sala de emboscada             hechizo 2
    Llave del jefe         Sala del abismo               abre la Cámara
    Contenedor corazón     jefe / lago                   +1 corazón máximo
    Fragmento de la Brasa  jefe                          1 de 3 reliquias
    Égida                  Santuario olvidado            hechizo 4

---------------------------------------------------------------------------
## 8. ANIMACIONES (frames y velocidad)
---------------------------------------------------------------------------
Todas las hojas se generan con `tools/gen_art.py`. La izquierda es la derecha
en espejo (flipX), así que solo se dibujan 3 direcciones: abajo, arriba, lado.

### 8.1 Humanoides (héroe, Caballero Hueco, NPCs, jefe)
Frame de 96 x 96 px (jefe: 160 x 160). Hoja de 16 columnas x 3 filas
(fila 0 abajo, fila 1 arriba, fila 2 lado) + 1 frame extra.

    Animación        Columnas  Frames  FPS  Bucle  Notas
    ---------------  --------  ------  ---  -----  ---------------------------
    reposo (idle)     0-1        2      3    sí    respiración
    andar (walk)      2-7        6     12    sí    ciclo de pies + balanceo
    atacar (attack)   8-11       4     18    no    arco de espada de 150 grados
    lanzar (cast)    12-13       2     10    no    brazo extendido
    escudo (guard)   14          1      -    -     se mantiene
    daño (hurt)      15          1      -    -     se mantiene 0,16 s
    objeto (item)    frame 48    1      -    -     solo héroe: brazos en alto
    muerte           -           -      -    -     giro de 4 reposos + fundido

Total héroe: 49 frames. Los NPCs usan solo reposo y andar. El Caballero Hueco
usa reposo, andar, atacar (pose de carga) y daño.

### 8.2 Enemigos no humanoides
    Sprite               Tamaño    Animación     Frames  FPS  Bucle
    -------------------  --------  ------------  ------  ---  -----
    Limo de ceniza       64 x 64   latido/salto    4      8    sí
    Murciélago cripta    64 x 64   aleteo          4     14    sí

### 8.3 Objetos
    Sprite               Tamaño    Animación     Frames  FPS  Bucle
    -------------------  --------  ------------  ------  ---  -----
    Antorcha             64 x 96   apagada         1      -    -
                                   encendida       4     10    sí
    Cristal interruptor  64 x 64   apagado/activo  2      -    -   (+ pulso)
    Placa de presión     64 x 64   arriba/abajo    2      -    -
    Cofre                64 x 64   cerrado/abierto 2      -    -
    Reja                 64 x 64   cerrada         1      -    -   (se desliza)
    Niebla de ceniza     64 x 64   ondulación      2      2    sí
    Zarza                64 x 64   estática        1      -    -   (arde: partículas)

### 8.4 Proyectiles y efectos
    Sprite               Tamaño    Animación     Frames  FPS  Bucle
    -------------------  --------  ------------  ------  ---  -----
    Brasa                48 x 48   vuelo           4     16    sí
    Vendaval             64 x 64   vuelo           4     16    sí
    Bola del jefe        48 x 48   vuelo           4     16    sí
    Impacto / explosión  64 x 64   estallido       5     20    no

### 8.5 Interfaz
    Corazón 40 x 40: lleno, medio, vacío (3 frames estáticos)
    Iconos de hechizo 48 x 48: Brasa, Vendaval, Revelación, Égida (4 frames)
    Iconos de objeto 40 x 40: llave, llave del jefe, mapa, fragmento,
                              contenedor, vial, corazón (7 frames)

---------------------------------------------------------------------------
## 9. ESTILO VISUAL
---------------------------------------------------------------------------
- Formas vectoriales con contorno oscuro, sombreado en dos tonos y luces
  suaves; texturas pintadas en los tiles (hierba, piedra, agua).
- Paleta de fantasía oscura: verdes apagados, piedra azulada, ocres y el
  naranja de las brasas como color de acento. Magia: naranja (fuego), turquesa
  (viento), violeta (revelación), oro (égida).
- Viñeta suave en pantalla y luz cálida alrededor de antorchas en la mazmorra.
- Tipografías: Cinzel (títulos) y Alegreya (texto), incluidas en el proyecto.

---------------------------------------------------------------------------
## 10. NOTAS TÉCNICAS
---------------------------------------------------------------------------
### 10.1 Estructura
    index.html            página del juego
    style.css             estilos de la página
    lib/phaser.min.js     Phaser 3
    src/main.js           configuración de Phaser
    src/config.js         constantes y tablas de este documento
    src/save.js           guardado en LocalStorage
    src/sfx.js            efectos de sonido sintetizados
    src/data/             diálogos y textos
    src/scenes/           Boot, Title, World, UI
    src/entities/         Player, enemigos, jefe, proyectiles
    src/systems/          magia, salas/cámara, puzles
    assets/tilesets/      imágenes de tiles
    assets/maps/          mapas JSON de Tiled
    assets/sprites/       hojas de sprites
    assets/ui/            iconos
    assets/fonts/         tipografías
    tools/                generadores de arte y mapas (Python):
                          gen_tiles.py, gen_sprites.py, gen_maps.py

### 10.2 Capas de los mapas de Tiled
    ground    (tiles)    suelo; algunos tiles colisionan (agua, muro, foso)
    solid     (tiles)    bloqueos invisibles bajo árboles, casas y rocas
    objects   (objetos)  todo lo interactivo; el campo "type" decide qué es

Tipos de objeto: spawn, npc, sign, enemy, tree, rock, bush, house, deco,
bramble, fog, torch, crystal, plate, block, chest, door, bridge, warp, pot, boss.
Las propiedades enlazan puzles: por ejemplo una reja con `opens_on = torches:t1`
se abre cuando todas las antorchas con `group = t1` están encendidas.

### 10.3 Formato de la partida
    {
      "v": 1,
      "map": "overworld", "x": 1900, "y": 2010, "dir": "down",
      "hp": 6, "maxHp": 6, "mana": 40, "maxMana": 40,
      "spells": ["brasa"], "spell": "brasa",
      "keys": 0, "items": { "map": false, "bossKey": false },
      "fragments": 0,
      "flags": { "chest_c1": true, "door_d2": true },
      "visited": { "cripta": ["1,2", "1,1"] },
      "checkpoint": { "map": "overworld", "x": 1900, "y": 2010 }
    }
