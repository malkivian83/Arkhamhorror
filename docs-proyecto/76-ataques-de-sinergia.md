# 76 · Ataques de Sinergia

Lote `synergy-attacks`: **1 código / 1 carta distinta nueva / 0 reediciones**: Ataque en grupo (08022), nivel 1. Incorpora la dependencia dinámica pendiente de 75 sin completar el lote con impresiones adicionales.

El ataque cuesta tres recursos y una acción, no provoca ataques de oportunidad y obtiene +1 Combate y +1 daño por cada clase distinta entre las cartas en juego que controla su investigador. Reutiliza el recuento revisado de Sinergia: el evento en limbo no cuenta. Los bonos se recalculan durante la prueba y al resolver el daño, de modo que perder, ganar o transferir apoyos puede cambiarlos.

El motor añade `effectSource` a la prueba, separado del origen de apoyos, y dos comportamientos de modificadores dinámicos del evento que la inició. La interfaz muestra el nombre del evento entre los bonos. Si se sustituye Combate por Intelecto, desaparece el bono de Combate y se conserva el daño del ataque. No afecta a ataques posteriores.

Diez pruebas de reglas cubren costes, ausencia de ataques de oportunidad, clases múltiples y duplicadas, zonas excluidas, cambios de control, sustitución de habilidad, iconos comprometidos, restauración JSON, objetivos legales, fallo, daño al investigador enfrentado y duración. Una prueba de compra/inicio real, un caso web EN/ES y conversión/unicidad compartidas. Dos escaneos oficiales y miniaturas con huellas y revisión visual representativa.

Referencia: instantánea oficial congelada EN/ES, módulo `Event/Events/GangUp1.hs` de la aplicación de referencia y [texto oficial y FAQ](https://arkhamdb.com/card/08022). El cálculo `ForEach` de la referencia exige recalcular los bonos, no capturar una cifra al jugar.

Acumulado: **572 códigos / 463 familias**. Sobre 104 históricos: **468 altas = 359 registros distintos + 109 reediciones**. Pendientes históricos: **1411 códigos**, incluidas reediciones. Inventario congelado intacto; publicación y siguiente grupo en el [resumen único](continuacion-importacion.md).
