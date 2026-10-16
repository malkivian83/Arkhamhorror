import { createRouter, createWebHistory } from 'vue-router'
import CampaignView from './views/CampaignView.vue'
import GameView from './views/GameView.vue'
import SetupView from './views/SetupView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'setup', component: SetupView },
    { path: '/game', name: 'game', component: GameView },
    { path: '/campaign', name: 'campaign', component: CampaignView },
  ],
})
