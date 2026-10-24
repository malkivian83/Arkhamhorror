import { messages } from '@lcg/i18n'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { expect, it } from 'vitest'
import { useLabels } from './labels'

function render(key: string, params: Record<string, string | number>) {
  const Probe = defineComponent(() => {
    const label = useLabels()
    return () => h('p', label(key, params))
  })
  return renderToString(
    createSSRApp(Probe).use(createI18n({ legacy: false, locale: 'es', messages })),
  )
}

it('nombra el origen del daño: una carta o una ficha del caos', async () => {
  const damage = { name: 'Roland', damage: 1, horror: 0 }
  expect(await render('log.damage', damage)).toContain('Roland recibe 1 daño y 0 horror</p>')
  expect(await render('log.damage', { ...damage, source: 'Ghoul' })).toContain(
    'Roland recibe 1 daño y 0 horror de Ghoul',
  )
  expect(await render('log.damage', { ...damage, source: 'token:skull' })).toContain(
    'de la ficha de Calavera',
  )
  expect(await render('prompt.assignHorror', { source: 'Ghoul' })).toContain(
    'Asigna 1 horror de Ghoul',
  )
})
