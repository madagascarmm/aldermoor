// Textos del juego. Los diálogos de NPC dependen del progreso (S = partida).

const has = (S, spell) => S.spells.includes(spell);

export const NPCS = {
  maelis: {
    name: 'Maelis',
    talk(S) {
      if (!has(S, 'brasa')) {
        return {
          pages: [
            'Aren... Te esperaba. Ser Edric partió hacia las ruinas de Piedralba hace nueve noches y la ceniza no ha dejado de caer desde entonces.',
            'El Sello del Alba se debilita. Tres fragmentos lo sostienen y los tres duermen en mazmorras que ya nadie guarda. Si ceden, el Rey Hueco despertará bajo Cuervonegro.',
            'Soy la última de la Orden de la Brasa. No puedo empuñar una espada, pero puedo darte nuestro fuego. Extiende la mano.',
          ],
          give: 'brasa',
        };
      }
      if (S.fragments === 0) {
        return {
          pages: [
            'Las zarzas del camino del este arden con facilidad. Cruza el bosque de Sauceumbrío hacia el norte y llegarás a Piedralba.',
            'En el bosque vive Oswin, un viejo monje de la Vigilia. Habla con él: ve cosas que los demás no vemos.',
          ],
        };
      }
      return {
        pages: [
          '¡El Fragmento de la Brasa! Puedo sentir su calor desde aquí... y también el dolor de Caldric. Le has dado descanso.',
          'Quedan dos: el del Vendaval, en las cumbres del norte, y el de la Vigilia, bajo el pantano. Descansa, Aren. El camino sigue, pero no hoy.',
        ],
      };
    },
  },
  bruna: {
    name: 'Bruna',
    talk(S) {
      if (S.fragments > 0) return { pages: ['Esa hoja ha visto fuego de verdad, ¿eh? Tráela cuando quieras y le saco el filo.'] };
      return {
        pages: [
          'Esa es la espada de Edric. Cuídala. Golpea con ESPACIO y no te quedes plantado delante de un enemigo.',
          'Mantén SHIFT para alzar el escudo: para lo que venga de frente, pero no lo que venga por la espalda.',
          'A los Caballeros Huecos no les entra la espada de cara. Rodéalos... o quémalos.',
        ],
      };
    },
  },
  lina: {
    name: 'Lina',
    talk(S) {
      if (S.flags['chest:lago']) return { pages: ['¿Encontraste el tesoro del lago? ¡Lo sabía! ¡Sabía que había algo!'] };
      return {
        pages: [
          'En el lago del oeste hay una lengua de tierra que se mete en el agua. Mi abuelo decía que al final hay un tesoro que solo ven los monjes.',
          'Yo he mirado mil veces y no hay nada. Pero los monjes veían cosas raras, ¿no?',
        ],
      };
    },
  },
  tobias: {
    name: 'Guardia Tobías',
    talk(S) {
      if (S.fragments > 0) return { pages: ['Dicen que la ceniza cae más fina desde ayer. No sé qué has hecho, escudero, pero sigue haciéndolo.'] };
      return {
        pages: [
          'Alto. Al norte está la Puerta de Cuervonegro. Lleva sellada trescientos años y así debe seguir.',
          'Al oeste, el Claro de Ceniza. Hay una niebla que no deja pasar hacia el viejo santuario. Ni el viento de las cumbres la mueve... haría falta un vendaval.',
          'Mis compañeros salieron a patrullar y volvieron... distintos. Si ves un caballero con los ojos encendidos, no le hables. Corre.',
        ],
      };
    },
  },
  oswin: {
    name: 'Oswin',
    talk(S) {
      if (!has(S, 'revelacion')) {
        return {
          pages: [
            'Hueles a brasa. Maelis te envía, entonces. Bien. Yo fui monje de la Vigilia cuando aún quedaban monjes.',
            'Los constructores de la Cripta escondieron lo importante donde los ojos no llegan. Puentes que no se ven. Cofres que no están... hasta que miras bien.',
            'Te enseñaré a mirar. Cuando un camino parezca terminar en el vacío, usa esto.',
          ],
          give: 'revelacion',
        };
      }
      if (S.fragments === 0) {
        return { pages: ['Las ruinas están al norte. Bajo el arco hay una escalera. Y recuerda: donde no veas camino, mira otra vez.'] };
      }
      return { pages: ['Un fragmento. Hace trescientos años que nadie sostenía uno. Guárdalo lejos de la niebla.'] };
    },
  },
};

export const TEXTS = {
  sign_brezal: { name: 'Cartel', pages: ['ALDEA DE BREZAL\nNorte: Cruce del Rey · Este: Bosque de Sauceumbrío · Oeste: Lago del Espejo'] },
  sign_cruce: { name: 'Cartel', pages: ['CRUCE DEL REY\nNorte: Castillo de Cuervonegro (paso prohibido) · Oeste: Claro de Ceniza · Sur: Brezal'] },
  sign_lago: { name: 'Cartel', pages: ['LAGO DEL ESPEJO\n"Lo que el agua guarda, la mirada lo devuelve."'] },
  edric: {
    name: 'Inscripción reciente',
    pages: [
      'Hay palabras rayadas en el pedestal con la punta de una daga:',
      '"Aren: si lees esto, no me busques. Caldric sigue aquí y el fuego ya no lo obedece. No pude apagarlo. Hace falta un viento que yo no tengo."',
      '"El fragmento está tras él. No lo enfrentes ardiendo. — Edric"',
    ],
  },
  gate(S) {
    return {
      name: 'Puerta de Cuervonegro',
      pages: [
        'Un sello de oro blanco cierra la puerta. Tiene tres huecos con forma de esquirla.',
        S.fragments > 0
          ? `Uno de los huecos responde al fragmento que llevas. Faltan ${3 - S.fragments}.\n\n(Continuará en la próxima versión.)`
          : 'Los tres huecos están vacíos. Algo respira, muy despacio, al otro lado.',
      ],
    };
  },
  locked: { name: '', pages: ['La puerta tiene cerradura. Necesitas una llave pequeña.'] },
  bosslocked: { name: '', pages: ['Una cerradura enorme, caliente al tacto. Necesitas la llave del jefe.'] },
  nothing: { name: '', pages: ['No hay nada oculto aquí.'] },
  ending: {
    name: '',
    pages: [
      'El fragmento late en tu mano como un corazón pequeño. Uno de tres.',
      'Has completado esta versión de ALDERMOOR. Puedes seguir explorando: aún quedan secretos en el Lago del Espejo y en el Santuario Olvidado.',
    ],
  },
};

// Objetos: icono = frame de assets/ui/items.png (o de spells.png si spell: true)
export const ITEMS = {
  brasa: {
    spell: true, icon: 0,
    pages: ['¡Has aprendido BRASA!\nLanza una bola de fuego con L o F. Enciende antorchas, quema zarzas y hiere a los enemigos. Gasta maná (la barra azul).'],
  },
  revelacion: {
    spell: true, icon: 2,
    pages: ['¡Has aprendido REVELACIÓN!\nCambia de hechizo con 1-4 o con Q. Revelación muestra lo que está oculto en la sala: cofres, puentes, caminos.'],
  },
  vendaval: {
    spell: true, icon: 1,
    pages: ['¡Has aprendido VENDAVAL!\nUna ráfaga que empuja y aturde, disipa la niebla de ceniza, mueve bloques a distancia... y apaga el fuego.'],
  },
  egida: {
    spell: true, icon: 3,
    pages: ['¡Has aprendido ÉGIDA!\nDurante unos segundos nada puede herirte. Gasta mucho maná: úsala cuando no haya otra salida.'],
  },
  map: { icon: 2, pages: ['¡Has encontrado el MAPA de la Cripta!\nPulsa M para ver todas las salas.'] },
  key: { icon: 0, pages: ['¡Una LLAVE PEQUEÑA!\nAbre una puerta con cerradura.'] },
  bossKey: { icon: 1, pages: ['¡La LLAVE DEL JEFE!\nAbre la Cámara del Guardián.'] },
  heart: { icon: 4, pages: ['¡Un CONTENEDOR DE CORAZÓN!\nTu vida máxima aumenta en un corazón.'] },
  fragment: { icon: 3, pages: ['¡Has obtenido el FRAGMENTO DE LA BRASA!\nUna esquirla del Sello del Alba. Arde sin quemar.'] },
};
