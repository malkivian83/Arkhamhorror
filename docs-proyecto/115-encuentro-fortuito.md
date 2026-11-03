# 115 · Un encuentro fortuito

Lote `chance-encounter`: dos códigos y dos cartas/niveles nuevos, sin reediciones.
02270 (nivel 0) y 03238 (nivel 2), con datos y presentación originales EN/ES.

Ambos recuperan un Aliado de cualquier descarte, incluso de otro investigador
alejado, y lo ponen en juego bajo el control de quien resuelve el evento. Mantienen
el propietario original, las ranuras, la unicidad y las reacciones de entrada;
no activan reacciones que exijan jugar el aliado. Las cartas exclusivas no pueden
pasar al control de otro investigador: Pete sí puede recuperar a su propio Duke.

El nivel 0 cuesta 1 y descarta esa instancia al final de la ronda. Si abandona el
juego y entra de nuevo, la nueva instancia no hereda el descarte pendiente. El nivel
2 paga X, igual al coste impreso del aliado, y lo conserva. La conversión de coste X
está limitada a 03238 mediante un adaptador explícito y pruebas negativas.

El motor permite tomar el apoyo del descarte después de validar su entrada y
conservar su dueño. Añade continuaciones serializables de fin de ronda; los guardados
anteriores siguen siendo válidos sin ese campo opcional. Se prueban copias que salen
y vuelven a entrar, propietarios distintos, entradas inválidas y objetivos ausentes.

Validación: reglas del lote y consumidores del motor; conversión de aprobaciones;
compra, registro, inicio de escenario y presentación EN/ES. Tipos cards/engine,
lint y formato, huellas de cuatro escaneos y cuatro miniaturas, hoja de contacto y
build web. No se usa navegador ni se consulta CI/Deploy. Reutilizar resultados salvo
cambios en reglas, contratos, registros, recursos o dependencias cubiertos.

Acumulado: 1103 jugables; 1025 históricos jugables, 958 históricos pendientes,
incluidos 567 estándar. Los pendientes incluyen impresiones.

Fuentes: [nivel 0 y FAQ de cartas exclusivas](https://arkhamdb.com/card/02270)
y [nivel 2](https://arkhamdb.com/card/03238).
