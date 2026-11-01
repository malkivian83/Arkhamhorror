import { createRouter, createWebHistory } from 'vue-router'
import SetupView from './views/SetupView.vue'

// Only the landing view is part of the first load; the others are fetched when opened.

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/online/:id/play',
      name: 'online-game',
      component: () => import('./views/OnlineTableView.vue'),
    },
    { path: '/online/:id?', name: 'online', component: () => import('./views/OnlineView.vue') },
    { path: '/admin', name: 'admin', component: () => import('./views/AdminView.vue') },
    { path: '/account', name: 'account', component: () => import('./views/AccountView.vue') },
    { path: '/library', name: 'library', component: () => import('./views/LibraryView.vue') },
    { path: '/', name: 'setup', component: SetupView },
    { path: '/game', name: 'game', component: () => import('./views/GameView.vue') },
    { path: '/campaign', name: 'campaign', component: () => import('./views/CampaignView.vue') },
    { path: '/decks', name: 'decks', component: () => import('./views/DecksView.vue') },
    {
      path: '/decks/:id',
      name: 'deck-editor',
      component: () => import('./views/DeckEditorView.vue'),
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    const deckRoutes = ['decks', 'deck-editor']
    return deckRoutes.includes(String(to.name)) || deckRoutes.includes(String(from.name))
      ? (savedPosition ?? { top: 0 })
      : false
  },
})
