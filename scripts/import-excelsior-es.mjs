#!/usr/bin/env node
/**
 * Textos oficiales en español de Asesinato en el hotel Excelsior. El reglamento
 * (docs-proyecto/reglas/AHLCG_Asesinato_en_el_hotel_excelsior.pdf) es un escaneado
 * sin texto, así que sus párrafos están transcritos aquí a mano; los reversos de
 * planes y actos salen de public/cards_es.json del proyecto de referencia. Se
 * añaden a apps/web/public/local-assets/story/es.json (conservando lo demás).
 *
 * Uso: node scripts/import-excelsior-es.mjs [ruta-del-proyecto-de-referencia]
 *
 * Marcas de apps/web/src/game/story.ts: párrafos separados por una línea en blanco,
 * "» " instrucción de juego, "• " punto de una lista, *negrita* y _cursiva_.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const reference = process.argv[2] ?? 'E:/referencia/ArkhamHorror'
const target = fileURLToPath(
  new URL('../apps/web/public/local-assets/story/es.json', import.meta.url),
)

const NOTE = '_Es todo un montaje._\n\n_Habitación 225. Esta noche._\n\n_No ha acabado._'

/** Reglamento del escenario (páginas 5 a 23). */
const rulebook = {
  intro1: [
    '*Introducción 1:* _Desde hace más de un mes se están produciendo sucesos insólitos en el hotel Excelsior de Arkham: desapariciones, visiones extrañas, cierres repentinos de hasta varios días sin previo aviso aparente… Todo parece sacado de una historia de fantasmas, pero sabes bien que no sería sensato ignorar esos rumores. Hay demasiada gente murmurando acerca del Excelsior… Y para empeorar las cosas, parece que las historias se han vuelto más perturbadoras durante la última semana. Es hora de que alguien lo investigue._',
    '_Has intentado acudir a la policía, pero el veterano y curtido sargento Monroe te ha despachado sin más cada vez que lo has hecho. No te queda otra que investigar por tu cuenta. Tras preguntar en los locales más frecuentados de la ciudad, no obtienes pista alguna. El Restaurante de Velma, el Motel Hibb, La Bella Luna… Pero cada visita sólo te plantea más preguntas. Al menos hasta hoy._',
    '_Mientras caminas por la Avenida Central del Centro pensando en tus cosas, te chocas con un hombre que lleva una gabardina larga. Empiezas a disculparte, pero él sigue andando a buen paso sin pararse. Hasta que no vuelves a casa no encuentras la nota de tu bolsillo que antes no estaba ahí._',
    '_Tengo respuestas._\n\n_Habitación 225. Esta noche. Ven solo._\n\n_¡Están vigilando!_',
    '_Has llegado a un punto en el que no sabes qué más puedes hacer, así que empiezas a prepararte para encontrarte con esta persona misteriosa._',
  ],
  intro2: [
    '*Introducción 2:* _El Excelsior está a rebosar esta noche, ya sea porque los rumores no han desanimado a estos clientes o porque las historias le han dado mayor atractivo al hotel. Todo parece normal. El personal del hotel lleva equipajes y útiles de limpieza por el vestíbulo y la escalera principal. El hombre que hay tras el mostrador de recepción te saluda con un breve gesto de cabeza y una apretada sonrisa. Hay un guardia de seguridad uniformado leyendo el último Arkham Advertiser en el rincón. Pese a todo, no logras sacarte de la cabeza la advertencia final de la nota._',
    '_Atraviesas el vestíbulo rápidamente y subes las escaleras, preguntándote si deberías haberle contado a alguien adónde ibas. ¿Ha sido sensato venir solo? ¿Y si te estás metiendo en la boca del lobo? Aprietas la mandíbula y cierras los puños mientras miras la puerta de color rojo sangre de la habitación 225, pero antes de poder pensártelo mejor, llamas. Ya no hay vuelta atrás._',
  ],
  intro3: [
    '*Introducción 3:* _El Excelsior está a rebosar esta noche, ya sea porque los rumores no han desanimado a estos clientes o porque las historias le han dado mayor atractivo al hotel. Todo parece normal. El personal del hotel lleva equipajes y útiles de limpieza por el vestíbulo y la escalera principal. El hombre que hay tras el mostrador de recepción te saluda con un breve gesto de cabeza y una apretada sonrisa. Hay un guardia de seguridad uniformado leyendo el último Arkham Advertiser en el rincón. Pese a todo, no logras sacarte de la cabeza la advertencia final de la nota._',
    '_Atraviesas el vestíbulo rápidamente y subes las escaleras, disfrutando de un cierto consuelo por haber contactado con otros en los que puedes confiar y haberles dicho dónde ibas y para qué. Tus reuniones clandestinas rara vez van como planeas, sobre todo últimamente, y nunca está de más tener algún apoyo. Estás delante de la puerta de color rojo sangre de la habitación 225, respiras hondo y llamas. Ya no hay vuelta atrás._',
  ],
  intro4: [
    '*Introducción 4:* _Estás sentado en una silla del salón de la suite, observando cómo el hombre que te dio la nota da vueltas de forma nerviosa. No deja de hablar sobre reuniones secretas y personal vigilante. Tú no puedes evitar mirar todo el tiempo la mesa baja que tienes delante y sobre la que hay una daga curvada. Se detiene un momento, se sirve una copa y se la lleva a los labios con mano temblorosa. Luego sirve una segunda copa y te la entrega:_',
    '_–Todo esto le va a parecer una locura –dice en un tono que es poco más que un susurro. Mira de reojo cada vez que se mueve una sombra y se estremece con cada crujido del viejo edificio–. Empiezo a sentirme como un demente, pero aquí están pasando demasiadas cosas como para ignorarlas. Y llevo demasiado tiempo participando de ello…_',
    '_Escuchas atentamente, pero sus palabras comienzan a embarullarse. Su voz es etérea y débil, como el viento al final de un largo túnel. Parpadeas rápidamente. Se te nubla la vista. Cuando te quieres dar cuenta, estás de pie. Se te cae la copa al suelo y…_',
  ],
  setup: [
    '• Reúne todas las cartas del conjunto de encuentros _Asesinato en el hotel Excelsior_.',
    '• Deja aparte los siguientes conjuntos de encuentros, fuera del juego: _Interferencia alienígena, Rituales oscuros, Dirección del Excelsior, Pecados del pasado_ y _Experimentos viles_.',
    '• Crea el mazo de Acto y el mazo de Plan únicamente con los actos 1 y 2 y los planes 1 y 2 del conjunto de encuentros _Asesinato en el hotel Excelsior_.',
    '• Deja aparte las 10 copias de El verdadero culpable, fuera del juego.',
    '• El investigador jefe comienza el juego con el Apoyo de historia Daga manchada de sangre bajo su control.',
    '• Busca todos los Apoyos de historia de los 5 conjuntos de encuentros puestos aparte (Artefacto alienígena, Tomo de rituales, Solución siniestra, Llave del director y Guardapelo desgastado) y barájalos para formar un mazo aparte. Este mazo es el mazo de Indicios. Colócalo junto a la carta de referencia de escenario.',
    '• Pon en juego los siguientes Lugares: Habitación 225, Balcón de la suite, Pasillo del segundo piso, Restaurante y Vestíbulo.',
    '• El investigador jefe comienza la partida en la Habitación 225.',
    '• Cada uno de los demás investigadores comienza la partida en el Vestíbulo.',
    '• Deja aparte todos los demás Lugares, fuera del juego.',
    '• Deja aparte las siguientes cartas, fuera del juego: las 3 copias del Agente de Arkham, el Apoyo de historia Sargento Monroe y la Debilidad ¿Qué has hecho?',
    '• Baraja el resto de cartas de Encuentro para formar el mazo de Encuentros.',
    '• *Ya estás listo para empezar a jugar. No pases al siguiente interludio hasta que se te indique que lo hagas.*',
  ],
  truth1: [
    '*La verdad 1:* _Tu investigación se ve interrumpida por el sargento Monroe, el mismo policía que desdeñó tus advertencias sobre el hotel Excelsior. Está claramente frustrado por todos los sucesos extraños que ocurren en el edificio y quiere respuestas: –Escúcheme bien –dice, llevándose la mano a la funda del arma con nerviosismo–. Soy un tipo razonable, pero las sospechas apuntan a usted. Más le vale contarme todo lo que esté pasando ahora mismo, ¿me entiende? Porque si no, le espera un viaje sólo de ida a la trena._',
    '» Los investigadores deben decidir (elige uno):',
    '• _Contarle la verdad al sargento Monroe._ Pasa a *La verdad 2*.',
    '• _Mentir sobre tu implicación._ Pasa a *La verdad 3*.',
  ],
  truth2: [
    '*La verdad 2:* _Le explicas todo al sargento Monroe desde el principio. Los rumores. La nota. El asesinato. Cuanto más le explicas, más consciente eres de que parece una locura, pero sabes que es la verdad. Sabes que eres inocente. Pero ¿tienes pruebas para demostrarlo?_',
    '» El sargento Monroe sólo te creerá si has reunido suficientes pruebas y no has intentado encubrir tu implicación. Si todas las circunstancias siguientes se cumplen, pasa a *La verdad 5*. Si no es así, pasa a *La verdad 4*.',
    '• Los investigadores no han “limpiado la sangre”, ni “ocultado el cuerpo” ni “ordenado la habitación”.',
    '• Hay al menos 2 pistas [per_investigator] sobre cada Apoyo _Indicio_ en juego.',
    '• No hay Enemigos _Inocente_ en la zona de victoria.',
  ],
  truth3: [
    '*La verdad 3:* _Haces lo único que se te ocurre en ese momento: mentir descaradamente. Al fin y al cabo, es imposible que la policía vaya a entender todos los extraños sucesos que están teniendo lugar en el hotel, e incluso si lo entendieran, no esperas que vayan a hacer la vista gorda ante todas las pruebas que apuntan hacia ti._',
    '» El sargento Monroe sólo te creerá si has encubierto tu implicación. Si todas las circunstancias siguientes se cumplen, pasa a *La verdad 6*. Si no es así, pasa a *La verdad 4*.',
    '• Los investigadores han “limpiado la sangre”, “ocultado el cuerpo” y “ordenado la habitación”.',
    '• No hay Enemigos _Inocente_ en la zona de victoria.',
  ],
  truth4: [
    '*La verdad 4:* _–No. No, no le creo –dice el agente, desenfundando su arma–. Nada de eso concuerda. Usted se viene conmigo, amigo. Ya cantará en comisaría._',
    '_Levantas las manos y él empieza a sacarte de la habitación cuando se oye un estruendo tremendo en otra parte del hotel. Todo el edificio tiembla hasta los cimientos, y oyes gritar a algunos clientes._',
    '_–¿Qué demonios? –exclama mientras pasa la mirada de la puerta a ti antes de advertirte–: No se mueva de aquí. O le juro que la próxima vez que le vea, le pongo las esposas._',
    '_Se va corriendo a investigar el ruido, mascullando que se está volviendo demasiado viejo para este trabajo._',
    '» Recuerda que “la policía no te cree”. Retira al Sargento Monroe de la partida. Busca en el mazo y la pila de descartes de Encuentros y en todas las zonas de juego todas las copias del Agente de Arkham y retíralas de la partida. Añade la pila de descartes de Encuentros al mazo de Encuentros y baraja éste. Pasa a *La verdad 7*.',
  ],
  truth5: [
    '*La verdad 5:* _El sargento Monroe escucha tu historia con escepticismo, aunque parece irse convenciendo a medida que le presentas pruebas._',
    '_–Muy bien –dice cuando terminas de explicarte–. Así que actuó bajo coerción. Y posiblemente fuera drogado. Aunque parezca una locura, las piezas encajan. Creo que está diciendo la verdad. Pero si hay alguien más tirando de los hilos, debemos descubrir de quién se trata, porque de otro modo nadie más nos creería. –Una gota de sudor baja por su frente–. Venga, vámonos._',
    '» Recuerda que “la policía está de tu parte”. Elige a un investigador para que tome el control del Apoyo de historia Sargento Monroe _(muévelo a la zona de amenaza de ese investigador)_. Busca en el mazo y la pila de descartes de Encuentros y en todas las zonas de juego todas las copias del Agente de Arkham y retíralas de la partida. Añade la pila de descartes de Encuentros al mazo de Encuentros y baraja éste. Pasa a *La verdad 7*.',
  ],
  truth6: [
    '*La verdad 6:* _El sargento Monroe asiente mientras escucha tu historia convencido._',
    '_–Muy bien –dice–. Parece que realmente no ha tenido nada que ver con esto. Pero quizás pueda ayudarme a encontrar al verdadero culpable. En este maldito hotel hay un asesino, y vamos a encontrarlo._',
    '_Das un suspiro de alivio. Al menos la policía dejará de ser un problema._',
    '» Recuerda que “la policía está de tu parte”. Elige a un investigador para que tome el control del Apoyo de historia Sargento Monroe _(muévelo a la zona de amenaza de ese investigador)_. Busca en el mazo y la pila de descartes de Encuentros y en todas las zonas de juego todas las copias del Agente de Arkham y retíralas de la partida. Añade la pila de descartes de Encuentros al mazo de Encuentros y baraja éste. Pasa a *La verdad 7*.',
  ],
  truth7: [
    '*La verdad 7:* _Gracias a tu hábil investigación, ahora te haces una buena idea de lo que está pasando. El verdadero culpable no eres tú. En el hotel Excelsior están ocurriendo muchas más cosas entre bambalinas, y tú te has visto atrapado en el medio…_',
    '» Resuelve el siguiente texto en función de qué 2 Apoyos _Indicio_ controlan los jugadores.',
  ],
  culprit1: [
    '*Si están en juego el Artefacto alienígena y el Guardapelo desgastado:* _El espectro estuvo en letargo durante muchos años, sumido en una paz relativa. No se volvió violento hasta que la víctima trajo ese artefacto maldito al hotel. La señal que emitía el transmisor era inaudible para oídos humanos, pero de algún modo penetró el velo del mundo material. Tras volverse furioso, el espectro no se detendrá hasta que haya matado a todo aquel que esté en el hotel._',
    '• Retira toda la perdición del juego. Haz avanzar los mazos de Acto y de Plan a “El verdadero culpable (v. I)” puesto aparte, que actúa tanto de plan como de acto en curso.',
    '• Mueve todas las pistas del Guardapelo desgastado al Artefacto alienígena.',
    '• Haz aparecer el Espectro vengativo puesto aparte en la Habitación 245.',
  ],
  culprit2: [
    '*Si están en juego el Artefacto alienígena y la Solución siniestra:* _La víctima estaba experimentando con materia cerebral extraterrestre y atrajo la atención de otra criatura de más allá de las estrellas. Entre el brebaje que te obligaron a beber y la señal emitida por ese horrible artefacto, parece imposible que puedas pensar con claridad. Oyes un fuerte ruido y un chirrido sobrenatural que vienen del tejado. Tal vez puedas sacar alguna ventaja de esta extraña poción._',
    '• Retira toda la perdición del juego. Haz avanzar los mazos de Acto y de Plan a “El verdadero culpable (v. II)” puesto aparte, que actúa tanto de plan como de acto en curso.',
    '• Mueve todas las pistas del Artefacto alienígena a la Solución siniestra.',
    '• Haz aparecer el Entrometido sobrenatural puesto aparte en el Tejado del hotel. Coloca 1 ficha de Perdición [per_investigator] sobre el Entrometido sobrenatural.',
  ],
  culprit3: [
    '*Si están en juego el Artefacto alienígena y la Llave del director:* _Fuera lo que fuera el propósito original del artefacto extraterrestre, nunca tendría que haber llegado a tu mundo. En el momento en el que entró en contacto con humanos, los cambió, y las monstruosidades resultantes ansían más carne. Tu “víctima” era una de esas criaturas, y no un inocente, y te viste obligado a defenderte cuando descubriste la verdad. Ahora que has recuperado la memoria, puedes ponerle fin a esto._',
    '• Retira toda la perdición del juego. Haz avanzar los mazos de Acto y de Plan a “El verdadero culpable (v. III)” puesto aparte, que actúa tanto de plan como de acto en curso.',
    '• Mueve todas las pistas de la Llave del director al Artefacto alienígena.',
    '• Haz aparecer el Director del hotel en el Restaurante.',
  ],
  culprit4: [
    '*Si están en juego el Artefacto alienígena y el Tomo de rituales:* _El Enclave empleó el extraño transmisor para convocar a su propietario al hotel. Ahora quieren hacerse con el control de la criatura mediante un ritual de sacrificio de sangre. Al obligar a otros huéspedes a hacerles su sangriento trabajo, las pruebas de sus fechorías permanecen ocultas… pero tú sabes la verdad. Y ahora puedes detener su ritual y permitir que la terrible criatura vuelva a su mundo._',
    '• Retira toda la perdición del juego. Haz avanzar los mazos de Acto y de Plan a “El verdadero culpable (v. IV)” puesto aparte, que actúa tanto de plan como de acto en curso.',
    '• Mueve todas las pistas del Artefacto alienígena al Tomo de rituales.',
    '• Haz aparecer el Entrometido sobrenatural puesto aparte en el Tejado del hotel. Coloca 2 fichas de Perdición más 2 [per_investigator] sobre el Entrometido sobrenatural.',
  ],
  culprit5: [
    '*Si están en juego el Guardapelo desgastado y la Solución siniestra:* _La víctima estaba utilizando un extraño brebaje para intentar ver el mundo que hay más allá de la vida. Sus experimentos enfurecieron al espectro y provocaron su muerte. Tendrás que destruir a este espíritu de una vez por todas, y sólo hay una forma de hacerlo…_',
    '• Retira toda la perdición del juego. Haz avanzar los mazos de Acto y de Plan a “El verdadero culpable (v. V)” puesto aparte, que actúa tanto de plan como de acto en curso.',
    '• Mueve todas las pistas del Guardapelo desgastado a la Solución siniestra.',
    '• Haz aparecer el Espectro vengativo puesto aparte en la Habitación 245.',
  ],
  culprit6: [
    '*Si están en juego el Guardapelo desgastado y la Llave del director:* _La mujer cuya imagen contiene el guardapelo fue asesinada hace muchos años, y el responsable es el director. El hombre que conociste en la 225 era uno de los miembros del personal involucrados. Fue entonces cuando el espíritu te poseyó en un arrebato de furia vengativa. En el hotel no volverá nada a la normalidad hasta que el director sea destruido y el espíritu sea vengado._',
    '• Retira toda la perdición del juego. Haz avanzar los mazos de Acto y de Plan a “El verdadero culpable (v. VI)” puesto aparte, que actúa tanto de plan como de acto en curso.',
    '• Mueve todas las pistas de la Llave del director al Guardapelo desgastado.',
    '• Haz aparecer el Director del hotel puesto aparte en el Restaurante.',
  ],
  culprit7: [
    '*Si están en juego el Guardapelo desgastado y el Tomo de rituales:* _La mujer cuya imagen contiene el guardapelo fue asesinada hace muchos años como parte de uno de los muchos sacrificios de sangre del Enclave. Su odio y rencor hacia la secta es lo que lo llevó a poseerte y a matar. Es necesario satisfacer su furia, y tú eres el agente de su venganza. Tendrás que dirigir esa furia hacia su verdadero objetivo: la secta que infesta el hotel._',
    '• Retira toda la perdición del juego. Haz avanzar los mazos de Acto y de Plan a “El verdadero culpable (v. VII)” puesto aparte, que actúa tanto de plan como de acto en curso.',
    '• Haz aparecer el Vagabundo dimensional puesto aparte en el Sótano.',
    '• Añade la pila de descartes de Encuentros y todos los Enemigos _Cliente_ de la zona de victoria al mazo de Encuentros y baraja éste.',
    '• Descarta cartas de la parte superior del mazo de Encuentros hasta que sean descartados 1 más 1 [per_investigator] Enemigos _Cliente_ o _Sectario_. Haz aparecer al azar cada uno de esos Enemigos en un Lugar _Escena del crimen_ distinto (y vacío si es posible).',
  ],
  culprit8: [
    '*Si están en juego la Solución siniestra y la Llave del director:* _La víctima estaba realizando experimentos horribles en el Excelsior. Ya había transformado a gran parte del personal, e ibas a ser el siguiente en una larga lista de sujetos de pruebas… pero el experimento fracasó. Ahora debes detener estas terribles transformaciones destruyendo la fuente de este brebaje._',
    '• Retira toda la perdición del juego. Haz avanzar los mazos de Acto y de Plan a “El verdadero culpable (v. VIII)” puesto aparte, que actúa tanto de plan como de acto en curso.',
    '• Añade la pila de descartes de Encuentros y todos los Enemigos _Personal_ de la zona de victoria al mazo de Encuentros y baraja éste.',
    '• Descarta cartas de la parte superior del mazo de Encuentros hasta que sea descartado 1 Enemigo _Personal_, o bien 2 si hay 3 o 4 investigadores en la partida. Haz aparecer cada uno de esos Enemigos en el Vestíbulo.',
    '• Vincula el Cerebro extraído puesto aparte a la Habitación 212.',
  ],
  culprit9: [
    '*Si están en juego la Solución siniestra y el Tomo de rituales:* _El Enclave se ha hecho con el control de un cerebro inhumano mediante un ritual vil y un sacrificio de sangre. Ahora, la secta emplea el vasto intelecto del cerebro y sus extrañas secreciones para poseer a otras personas y obligarles a cumplir su voluntad, y tú has sido su víctima más reciente. La única forma de detener sus planes es romper de una vez por todas su control del cerebro._',
    '• Retira toda la perdición del juego. Haz avanzar los mazos de Acto y de Plan a “El verdadero culpable (v. IX)” puesto aparte, que actúa tanto de plan como de acto en curso.',
    '• Mueve todas las pistas de la Solución siniestra al Tomo de rituales.',
    '• Vincula el Cerebro extraído puesto aparte a la Habitación 212.',
  ],
  culprit10: [
    '*Si están en juego la Llave del director y el Tomo de rituales:* _El Enclave lleva días realizando un terrible ritual con la intención de transformar en horrendas monstruosidades a todos los humanos que haya en el interior del Excelsior. Los primeros en transformarse fueron los miembros del personal, y tú serás el siguiente si no te das prisa. La transformación ya ha comenzado…_',
    '• Retira toda la perdición del juego. Haz avanzar los mazos de Acto y de Plan a “El verdadero culpable (v. X)” puesto aparte, que actúa tanto de plan como de acto en curso.',
    '• Haz aparecer el Vagabundo dimensional puesto aparte en el Sótano.',
    '• Añade la pila de descartes de Encuentros y todos los Enemigos _Cliente_ de la zona de victoria al mazo de Encuentros y baraja éste.',
    '• Coloca 2 fichas de Perdición [per_investigator] sobre “El verdadero culpable (v. X)”.',
    '» *Ya estás listo para seguir jugando.*',
  ],
  noResolution: [
    '*Si no se ha llegado a ninguna resolución porque todos los investigadores fueron derrotados:* _Te desplomas en el suelo tratando de respirar. El aire que te rodea es agobiante, y en tus oídos resuenan los agonizantes alaridos de otros inocentes que han sido víctima de las crueles maquinaciones que siguen teniendo lugar en el hotel Excelsior. Te aferras a la moqueta mientras todo te da vueltas y notas cómo pierdes la consciencia. Tus esfuerzos han sido en vano. Los siniestros planes que se han puesto en marcha ya no pueden detenerse._',
    '• Anota en el registro de campaña que _el Excelsior se cobra otra víctima._',
    '• Pasa a la *Resolución 2*.',
  ],
  noResolutionResigned: [
    '*Si no se ha llegado a ninguna resolución y al menos un investigador desistió:* _Escapaste del hotel sin esperanza de resolver este misterio. Por desgracia, tu huida no contribuye precisamente a demostrar tu inocencia. No pasa mucho tiempo antes de que la pasma te encuentre y llame a tu puerta: –¡Abra! ¡Policía de Arkham!_',
    '• Anota en el registro de campaña que _los investigadores huyeron de la escena del crimen._',
    '• Pasa a la *Resolución 3*.',
  ],
  resolution1: [
    '*Resolución 1:* _nadie creerá nunca lo que viviste en el Excelsior. El hotel volvía a estar abierto cuando no habían pasado ni tres días, como si no hubiera pasado nada. Pero tú sabes que no es así. Lo viviste todo en tu propia carne. Los hechos siguen persiguiéndote en tus sueños y en tus pensamientos conscientes. Incluso ahora que han pasado semanas, sigues haciendo todo lo posible por evitar el Excelsior, pese a que no hay nada que apunte a que se estén llevando a cabo planes maléficos entre sus paredes. Lo único que acalla el eco de los recuerdos de esa horrible experiencia son las visitas a tu garito habitual. Pero ni todo el alcohol del mundo puede sacar de tus pesadillas esas macabras visiones que te despiertan violentamente en mitad de la noche empapado en sudor. Y es entonces cuando descubres que hay una persona preguntando por el Excelsior por toda la ciudad. Al principio son preguntas inocentes, pero se van volviendo más incisivas con cada día que pasa. Seguro que te cree. Alguien tiene que hacerlo. Tal vez te hayas liberado de las garras del Excelsior, pero debe de haber otras víctimas, estás seguro de ello. Coges un trozo de papel y garabateas una nota apresuradamente._',
    NOTE,
    '_Si logra ver tras la fachada del funcionamiento del Excelsior, quizá otros también puedan. ¡Tal vez no sea demasiado tarde para evitar que vuelva a suceder!_',
    '• Anota en el registro de campaña que _el Excelsior está tranquilo, por ahora._ El investigador jefe debe añadir la Debilidad ¿Qué has hecho? a su mazo. También puede elegir añadir el Apoyo de historia Daga manchada de sangre a su mazo. Ninguna de esas dos cartas cuenta para el tamaño de mazo de ese investigador.',
    '• Si “la policía está de tu parte”, un investigador cualquiera puede elegir añadir el Sargento Monroe a su mazo. Esta carta no cuenta para el tamaño de mazo de ese investigador.',
    '• Si “la policía no te cree”, no añadas el Sargento Monroe al mazo de ningún investigador. Además, si hay al menos 1 Enemigo _Policía_ en la zona de victoria, busca en la colección una Debilidad _Detective_ o _Locura_ y añádela al mazo del investigador jefe. Esta carta no cuenta para el tamaño de mazo de ese investigador.',
    '• Cada investigador obtiene una cantidad de experiencia igual al valor de Victoria X de cada carta que haya en la zona de victoria.',
  ],
  resolution2: [
    '*Resolución 2:* _–Si sigue ahí sentado mucho más tiempo, le voy a tener que cobrar alquiler._',
    '_Parpadeas rápidamente, como si salieras de un sueño profundo. Al levantar la mirada, ves a un camarero que te mira contrariado y lleva una pila de platos sucios. Tienes un vaso de agua en la mano. No recuerdas haberlo pedido, ni tampoco cuánto tiempo llevas aquí. ¿Y dónde es aquí exactamente? Te giras en la silla y te das cuenta de que estás en el restaurante del hotel Excelsior. Hay algunos comensales más que disfrutan de una cena temprana y se ocupan de sus asuntos. La tenue luz de la tarde otoñal se filtra por las ventanas, y desde el vestíbulo llega el habitual murmullo de actividad. Te das la vuelta de nuevo para mirar al camarero, te metes la mano en el bolsillo y dejas veinticinco centavos sobre la mesa antes de dirigirte hacia el vestíbulo. Notas las piernas como de gelatina. Al salir tambaleante del restaurante, otros clientes te miran con preocupación. El guardia de seguridad del rincón no te quita ojo de encima. Te acercas al mostrador de recepción y te apoyas en él para no caerte. El conserje se acerca, pero retrocedes al ver que te reconoce. El hotel está funcionando como si no hubiera pasado nada. Pero eso no puede ser. Todo lo que viste era cierto, ¿verdad? Sales corriendo por la puerta principal antes de que te alcance. Tienes que poner tierra de por medio entre este maldito lugar y tú._',
    '_Pasan semanas. Nada te ayuda a acallar la sensación en tu mente de que has pasado por alto algo importante. El asunto del Excelsior no ha terminado ni mucho menos. Comienzas de nuevo tu investigación, preguntando por la ciudad acerca de cualquier rumor reciente sobre el hotel. Más personal desaparecido. Más cierres repentinos. Clientes que nunca llegan. Clientes que nunca se marchan. Es demasiado._',
    '_Parado en una solitaria esquina del Barrio Norte, sopesas tus opciones. Las farolas se encienden entre parpadeos a tu alrededor mientras cae la noche. En ese momento, un desconocido se choca contigo y murmura una disculpa desganada. Das un paso en su dirección, pero algo en tu subconsciente te hace detenerte. No. ¿Podría ser…? Metes la mano en el bolsillo de tu abrigo. En su interior hay una notita doblada. Cuando vuelves a mirar, el desconocido ya no está. Desdoblas la nota lentamente, con los dedos temblorosos de miedo y ansiedad._',
    NOTE,
    '• Si es la primera vez que has jugado este escenario durante esta campaña, puedes volver a jugarlo. Reinicia la partida a la *Preparación* de este escenario. No anotes nada más en el registro de campaña excepto cualquier trauma sufrido. La partida anterior no otorga ningún punto de experiencia.',
    '• Si no es así:',
    '• Anota en el registro de campaña que _los asesinatos continúan sin resolver._',
    '• Cada investigador obtiene una cantidad de experiencia igual al valor de Victoria X de cada carta que haya en la zona de victoria.',
    '• El investigador jefe debe añadir la Debilidad ¿Qué has hecho? a su mazo. También puede elegir añadir el Apoyo de historia Daga manchada de sangre a su mazo. Ninguna de esas dos cartas cuenta para el tamaño de mazo de ese investigador.',
  ],
  resolution3: [
    '*Resolución 3:* _Estás sentado en una fría y húmeda celda esperando que terminen las diligencias. No tienes ninguna duda de que, con las pruebas que ha reunido la policía, te vas a pasar el resto de tu vida entre rejas. Has jurado y perjurado que no tuviste nada que ver con el asesinato, pero sigue habiendo una duda en tu mente. ¿Podrías haber sido tú el asesino de algún modo? ¿Qué ocurrió realmente en el Excelsior aquella noche?_',
    '_En ese momento, oyes que alguien llama en los barrotes de tu celda. Fuera de ella hay un agente mirando para otro lado. Te pasa una nota doblada entre los barrotes. Sería absurdo preguntarle en alto que qué hace, así que te acercas lentamente, coges la nota y la desdoblas con los dedos temblorosos de inquietud._',
    NOTE,
    '_Nada más acabar de leer la nota, oyes el clic de la cerradura de la celda al abrirse. El agente se ha ido, y la puerta está abierta de par en par._',
    '• Si es la primera vez que has jugado este escenario durante esta campaña, puedes volver a jugarlo. Reinicia la partida a la *Preparación* de este escenario. No anotes nada más en el registro de campaña excepto cualquier trauma sufrido. La partida anterior no otorga ningún punto de experiencia.',
    '• Si no es así:',
    '• Anota en el registro de campaña que _los asesinatos continúan sin resolver._',
    '• Cada investigador obtiene una cantidad de experiencia igual al valor de Victoria X de cada carta que haya en la zona de victoria.',
    '• El investigador jefe debe añadir la Debilidad ¿Qué has hecho? a su mazo. También puede elegir añadir el Apoyo de historia Daga manchada de sangre a su mazo. Ninguna de esas dos cartas cuenta para el tamaño de mazo de ese investigador.',
    '• Busca en la colección una Debilidad _Detective_ o _Locura_ y añádela al mazo del investigador jefe. Esta carta no cuenta para el tamaño de mazo de ese investigador.',
  ],
}

/** Erratas de los textos de cartas de la fuente. */
const ERRATA = [
  ['deldirector', 'del director'],
  ['enjuego', 'en juego'],
  ['desgatado', 'desgastado'],
  ['volviera a se una', 'volviera a ser una'],
]

/** Reverso de una carta en HTML de ArkhamDB → párrafos con las marcas de la mesa. */
function cardText(html) {
  return (
    ERRATA.reduce((text, [wrong, right]) => text.replaceAll(wrong, right), html)
      // Rasgos ([[Indicio]]) en cursiva.
      .replace(/\[\[([^\]]+)\]\]/g, '_$1_')
      .replace(/\n/g, '<p>')
      .replace(/<hr\s*\/?>/g, '<p>')
      .replace(/<\/?(b|strong)>/g, '*')
      .replace(/<\/?(i|em)>/g, '_')
      .replace(/<p[^>]*>/g, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n\n')
  )
}

const texts = Object.fromEntries(
  Object.entries(rulebook).map(([key, paragraphs]) => [
    `story.excelsior.${key}`,
    paragraphs.join('\n\n'),
  ]),
)

const cardsFile = join(reference, 'frontend/public/cards_es.json')
if (existsSync(cardsFile)) {
  const cards = JSON.parse(readFileSync(cardsFile, 'utf8'))
  const back = (code) => cards.find((c) => c.code === code)?.back_text ?? ''
  texts['story.excelsior.murderBack'] = cardText(back('84002'))
  texts['story.excelsior.specialInvestigationBack'] = cardText(back('84003'))
  texts['story.excelsior.whatHappenedBack'] = cardText(back('84004'))
  for (let n = 0; n < 10; n++) {
    const [doom, objective] = back(String(84043 + n)).split(/<hr\s*\/?>/)
    texts[`story.excelsior.culpritDoom${n + 1}`] = cardText(doom ?? '')
    texts[`story.excelsior.culpritObjective${n + 1}`] = cardText(objective ?? '')
  }
} else {
  console.log(`Sin ${cardsFile}: no se añaden los reversos de las cartas`)
}

const current = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : {}
writeFileSync(target, JSON.stringify({ ...current, ...texts }, null, 2) + '\n')
console.log(`${Object.keys(texts).length} textos de Asesinato en el hotel Excelsior en ${target}`)
