<script setup lang="ts">
import { ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const paragraphs = ['rights', 'nonProfit', 'fairUse', 'takedown', 'warranty'] as const
const dialog = ref<HTMLDialogElement>()
const opener = ref<HTMLButtonElement>()
const titleId = useId()
const contactEmail = 'info@arkham-online.es'
</script>

<template>
  <footer class="site-footer">
    <span>{{ t('app.disclaimer') }}</span>
    <button
      ref="opener"
      type="button"
      class="ui-plain copyright-link"
      aria-haspopup="dialog"
      @click="dialog?.showModal()"
    >
      {{ t('app.copyright.title') }}
    </button>
    <Teleport to="body">
      <dialog
        ref="dialog"
        class="copyright-dialog"
        :aria-labelledby="titleId"
        @click="$event.target === dialog && dialog.close()"
        @close="opener?.focus()"
      >
        <header>
          <h2 :id="titleId">{{ t('app.copyright.title') }}</h2>
          <button type="button" :aria-label="t('table.close')" autofocus @click="dialog?.close()">
            ✕
          </button>
        </header>
        <template v-for="key in paragraphs" :key="key">
          <p>{{ t(`app.copyright.${key}`) }}</p>
          <p v-if="key === 'takedown'" class="contact">
            {{ t('app.copyright.contact') }}:
            <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
          </p>
        </template>
      </dialog>
    </Teleport>
  </footer>
</template>

<style scoped>
.site-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 12px;
  row-gap: 2px;
  line-height: 1.4;
}
.site-footer .copyright-link {
  min-height: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  background: none;
  border: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.site-footer .copyright-link:hover {
  color: var(--accent);
}
.copyright-dialog {
  box-sizing: border-box;
  width: min(640px, calc(100vw - 32px));
  max-width: none;
  max-height: calc(100dvh - 32px);
  margin: auto;
  padding: 16px 20px 20px;
  overflow-y: auto;
  color: var(--ink);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  line-height: 1.55;
}
.copyright-dialog::backdrop {
  background: rgb(0 0 0 / 75%);
}
.copyright-dialog header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}
.copyright-dialog h2 {
  margin: 0;
  font-size: 1.1rem;
}
.copyright-dialog header button {
  flex: none;
}
.copyright-dialog p {
  margin: 12px 0 0;
  color: var(--muted);
}
.copyright-dialog .contact {
  margin-top: 4px;
}
.copyright-dialog a {
  color: var(--accent);
  text-underline-offset: 3px;
}
</style>
