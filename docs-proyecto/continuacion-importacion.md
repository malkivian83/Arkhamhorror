# Continuación de la importación

- Último lote: `improvised-survival`, documento [111](111-armas-y-barrera-improvisadas.md), tres códigos y tres cartas/niveles nuevos; sin reediciones. Sobre `aff4058e`, un solo agente. Publicación: «Añadir Arma improvisada y Barrera improvisada».
- Alcance: Arma improvisada 0/2 y Barrera improvisada 0. Jugar desde descarte, resolver ataque/evasión y devolver la copia provisional al mazo, también con Wendy; robo adicional de la mejora y evasión secundaria por margen. Escudo 09103 excluido: ya implementado en charged-assets.
- Acumulado: 1094 jugables; 1016 históricos, 967 históricos pendientes, incluidos 576 estándar. Los pendientes incluyen impresiones. Códigos/títulos/niveles y huellas EN/ES comprobados.
- Presentación: EN/ES, seis escaneos y seis miniaturas nuevos; hoja de seis caras revisada. Sin Tabú.
- Validación: 95 pruebas del lote/integración/conversión y 98 del motor/Wendy. Tipos cards/engine, formato/lint y build web. Reutilizar mientras no cambien reglas, contratos, registros, presentación, recursos o dependencias afectados.
- Git: pull inicial/final impedido por cambios conservados; fetch final confirmó igualdad con origin/main. Preparar solo adiciones propias de JSON sobre HEAD; conservar cambios ajenos. No consultar CI/Deploy sin petición expresa.
- Siguiente grupo: priorizar mecánicas compartidas y versiones nuevas, buscando 30–50 cuando sea viable. Inspección admite mazos vacíos y robo explícito; ShufflePlayedEvent devuelve eventos provisionales sin duplicar y congela el origen Wendy. No reimportar Escudo improvisado. Bendición/Maldición sigue pendiente de ChaosSymbol, resolución y límites. Conservar bloqueos 98/99/101/102/104/105/107.
- Anterior: `therapeutic-recovery`, tres cartas, publicado en `aff4058e` ([110](110-psicoanalisis-y-alivio.md)). [Historial](historial-importacion.md), innecesario para continuar.
