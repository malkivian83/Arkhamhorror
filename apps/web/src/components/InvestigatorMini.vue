<script setup lang="ts">
import { computed } from 'vue'
import { cardImage, classColor } from '../game/cards'
import { localName } from '../game/localized'

/**
 * Mini carta del investigador para moverlo por el mapa, como la de la caja.
 * No hay imágenes públicas de las minis, así que se recorta el retrato de la
 * carta oficial de investigador (la ilustración ocupa la mitad izquierda).
 */
const props = withDefaults(defineProps<{ code: string; name: string; width?: number }>(), {
  width: 54,
})

/** Encuadre por investigador cuando la cara queda más arriba o más a un lado. */
const FRAMING: Record<string, { x: number; y: number }> = {
  '12013': { x: 0.15, y: 0.11 }, // Isabelle Barnes
}

const src = computed(() => cardImage(props.code))
const style = computed(() => {
  const w = props.width
  // La carta mide 1000×699: se amplía a 2,5 veces el ancho de la mini y se
  // encuadra desde el 10 % del ancho y bajo el título (15 % del alto).
  const size = w * 2.5
  const { x, y } = FRAMING[props.code] ?? { x: 0.1, y: 0.15 }
  return {
    width: `${w}px`,
    height: `${Math.round(w * 1.43)}px`,
    '--class': classColor(props.code),
    ...(src.value
      ? {
          backgroundImage: `url(${src.value})`,
          backgroundSize: `${size}px auto`,
          backgroundPosition: `${-x * size}px ${-y * size * 0.699}px`,
        }
      : {}),
  }
})
</script>

<template>
  <div
    class="mini"
    :style="[style, { viewTransitionName: `investigator-${code}` }]"
    :title="localName(name)"
  >
    <span v-if="!src" class="initial">{{ name.charAt(0) }}</span>
  </div>
</template>

<style scoped>
.mini {
  position: relative;
  flex: none;
  border-radius: 5px;
  background-color: var(--class);
  background-repeat: no-repeat;
  border: 2px solid #f4ecd8;
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 50%),
    1px 2px 6px rgb(0 0 0 / 60%);
}
.mini::after {
  /* Franja de la clase, como el borde de color de la mini. */
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 4px;
  background: var(--class);
}
.initial {
  display: grid;
  place-items: center;
  height: 100%;
  font-weight: 700;
  font-size: 1.2rem;
  color: #fff;
}
</style>
