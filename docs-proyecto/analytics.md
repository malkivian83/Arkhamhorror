# Google Analytics

La web integra la propiedad GA4 `G-V6TQC85VWV`. Solo carga la etiqueta en una
compilación de producción y tras aceptar el aviso EN/ES. La preferencia se guarda
en `analytics-consent-v1`; si el almacenamiento falla, dura hasta recargar.
El botón «Privacidad · Analytics» permite cambiarla. Rechazar tras aceptar
desactiva la medición mediante la bandera de exclusión de GA. Las cookies existentes
pueden permanecer hasta su caducidad o hasta que se borren desde el navegador.

Se envía una visita inicial y otra por navegación correcta de Vue Router. Se usan
plantillas de rutas, sin identificadores de salas o mazos, parámetros de consulta
ni fragmentos. Se deshabilitan Google Signals y la personalización publicitaria.
No se añaden eventos de juego ni identificadores de cuenta.

En el flujo web de GA4, desactiva la **medición mejorada**, incluida la detección
automática de cambios de historial: esta integración envía sus propias visitas.
Así se evitan duplicados y eventos automáticos con URL sin filtrar. Revisa también
la información de privacidad del sitio para reflejar el uso de Google Analytics.

Para verificar tras desplegar: abre una sesión privada, comprueba en Red que no
hay peticiones a Google antes de aceptar ni al rechazar; acepta, navega y comprueba
las visitas en Tiempo real de GA4. Comprueba también la retirada del consentimiento.
El desarrollo local no envía datos. No se ha verificado la recepción en la cuenta
de Google desde las pruebas locales.

Referencia: [modo de consentimiento de Google](https://developers.google.com/tag-platform/security/concepts/consent-mode).
