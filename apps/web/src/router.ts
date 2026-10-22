import { createRouter, createWebHistory } from 'vue-router'
import CampaignView from './views/CampaignView.vue'
import DecksView from './views/DecksView.vue'
import DeckEditorView from './views/DeckEditorView.vue'
import GameView from './views/GameView.vue'
import SetupView from './views/SetupView.vue'
import AccountView from './views/AccountView.vue'
import LibraryView from './views/LibraryView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/admin', name: 'admin', component: () => import('./views/AdminView.vue') },
    { path: '/account', name: 'account', component: AccountView },
    { path: '/library', name: 'library', component: LibraryView },
    { path: '/', name: 'setup', component: SetupView },
    { path: '/game', name: 'game', component: GameView },
    { path: '/campaign', name: 'campaign', component: CampaignView },
    { path: '/decks', name: 'decks', component: DecksView },
    { path: '/decks/:id', name: 'deck-editor', component: DeckEditorView },
  ],
  scrollBehavior(to, from, savedPosition) {
    const deckRoutes = ['decks', 'deck-editor']
    return deckRoutes.includes(String(to.name)) || deckRoutes.includes(String(from.name))
      ? (savedPosition ?? { top: 0 })
      : false
  },
})
