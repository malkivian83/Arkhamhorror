<script setup lang="ts">
import { ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { analyticsSettingsRequested } from '../analyticsSettings'
import { changelog } from '../changelog'

const { t, locale } = useI18n()
const paragraphs = ['rights', 'nonProfit', 'fairUse', 'takedown', 'warranty'] as const
const dialog = ref<HTMLDialogElement>()
const opener = ref<HTMLButtonElement>()
const titleId = useId()
const contactEmail = 'info@arkham-online.es'
const changelogDialog = ref<HTMLDialogElement>()
const changelogOpener = ref<HTMLButtonElement>()
const changelogTitleId = useId()
function releaseDate(date: string) {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`),
  )
}
</script>

<template>
  <footer class="site-footer">
    <span>{{ t('app.disclaimer') }}</span>
    <button
      ref="changelogOpener"
      type="button"
      class="ui-plain copyright-link"
      aria-haspopup="dialog"
      @click="changelogDialog?.showModal()"
    >
      {{ t('app.changelog.link') }}
    </button>
    <button
      ref="opener"
      type="button"
      class="ui-plain copyright-link"
      aria-haspopup="dialog"
      @click="dialog?.showModal()"
    >
      {{ t('app.copyright.title') }}
    </button>
    <button
      type="button"
      class="ui-plain copyright-link"
      @click="analyticsSettingsRequested = true"
    >
      {{ t('app.privacySettings') }}
    </button>
    <Teleport to="body">
      <dialog
        ref="changelogDialog"
        class="copyright-dialog changelog-dialog"
        :aria-labelledby="changelogTitleId"
        @click="$event.target === changelogDialog && changelogDialog.close()"
        @close="changelogOpener?.focus()"
      >
        <header>
          <div>
            <h2 :id="changelogTitleId">{{ t('app.changelog.title') }}</h2>
            <p class="changelog-intro">{{ t('app.changelog.description') }}</p>
          </div>
          <button
            type="button"
            :aria-label="t('table.close')"
            autofocus
            @click="changelogDialog?.close()"
          >
            ✕
          </button>
        </header>
        <ol class="changelog-list">
          <li v-for="release in changelog" :key="release.id" class="changelog-entry">
            <time :datetime="release.date">{{ releaseDate(release.date) }}</time>
            <h3>{{ t(release.title) }}</h3>
            <ul>
              <li v-for="item in release.items" :key="item">{{ t(item) }}</li>
            </ul>
          </li>
        </ol>
      </dialog>
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
.copyright-dialog .changelog-intro {
  margin-top: 6px;
  font-size: 0.9rem;
}
.changelog-list {
  list-style: none;
  padding: 0;
  margin: 20px 0 0;
}
.changelog-entry + .changelog-entry {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.changelog-entry time {
  color: var(--accent);
  font-size: 0.8rem;
}
.changelog-entry h3 {
  margin: 6px 0 10px;
  font-size: 1.05rem;
}
.changelog-entry ul {
  padding-left: 20px;
  color: var(--muted);
}
.changelog-entry li + li {
  margin-top: 8px;
}
</style>
