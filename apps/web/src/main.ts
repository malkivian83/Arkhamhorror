import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import './site-buttons.css'
import './styles/site.css'
import { detectAssets } from './game/assets'
import { i18n } from './i18n'
import { router } from './router'
import { account, loadAccount } from './account/api'
import { discardLegacySaves, setStorageUser } from './account/storage'
import { initializeLibrary } from './account/library'

discardLegacySaves()
await loadAccount()
setStorageUser(account.value.user?.id ?? null)
await initializeLibrary()

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')

detectAssets()
