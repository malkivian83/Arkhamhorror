import { createRouter, createWebHistory } from 'vue-router'
import GameView from './views/GameView.vue'
import SetupView from './views/SetupView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'setup', component: SetupView },
    { path: '/game', name: 'game', component: GameView },
  ],
})
