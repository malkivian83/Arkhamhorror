import type { OnlineGame } from '@lcg/shared'
import type { Lobby } from './lobbies'
import { tableStats, tableView } from './table'
import {
  activeMembers,
  canPlayNext,
  currentScenario,
  pendingTransfers,
  purchaseOptions,
  removableCards,
} from '@lcg/cards'

/** Allowlist projection: adding an engine field can never disclose it accidentally. */
export function gameView(lobby: Lobby, user: string): OnlineGame {
  const g = lobby.game!
  const mine = lobby.decks?.[user]?.investigator
  const pending = g.pending
  const canDecide = pending?.investigator === mine
  const campaign = lobby.campaign
  const active = campaign ? activeMembers(campaign).map((i) => i.id) : []
  const ready = (investigator: string) =>
    lobby.members.some(
      (user) =>
        lobby.decks?.[user]?.investigator === investigator && lobby.campaignReady?.includes(user),
    )
  const own = campaign?.investigators.find((i) => i.id === mine && active.includes(i.id))
  const cards: OnlineGame['cards'] = []
  const agenda = g.agendas[g.agendaIndex],
    act = g.acts[g.actIndex]
  for (const [id, card] of [
    ['agenda', agenda],
    ['act', act],
  ] as const)
    if (card?.code)
      cards.push({ id, code: card.code, name: card.name, detail: 'online.play.card', params: {} })
  for (const location of Object.values(g.locations))
    cards.push({
      id: location.id,
      code: location.id,
      name: location.name,
      back: !location.revealed,
      detail: 'online.play.location',
      params: { clues: location.clues },
    })
  for (const e of Object.values(g.enemies))
    cards.push({
      id: e.id,
      code: e.code,
      name: e.name,
      detail: 'online.play.enemy',
      params: {
        location: e.location,
        damage: e.damageTaken,
        health: e.maxHealth,
        engaged: e.engagedWith ?? '—',
      },
    })
  for (const a of Object.values(g.assets))
    cards.push({
      id: a.id,
      code: a.code,
      name: a.code,
      detail: 'online.play.asset',
      params: {
        owner: a.owner,
        uses: a.uses,
        damage: a.damage,
        horror: a.horror,
        exhausted: a.exhausted ? 1 : 0,
      },
    })
  for (const t of Object.values(g.treacheries))
    cards.push({ id: t.id, code: t.code, name: t.name, detail: 'online.play.card', params: {} })
  for (const a of Object.values(g.placedAssets ?? {}))
    if (!a.faceDown)
      cards.push({ id: a.id, code: a.code, name: a.name, detail: 'online.play.card', params: {} })
  for (const [code] of Object.entries(g.stories ?? {}))
    cards.push({ id: `story:${code}`, code, name: code, detail: 'online.play.card', params: {} })
  return {
    table: tableView(g, mine),
    tableStats: tableStats(g),
    ...(mine ? { ownInvestigator: mine } : {}),
    canFinish: !!g.outcome && !lobby.intermission && lobby.owner === user,
    ...(lobby.intermission && campaign
      ? {
          campaign: {
            canManage: lobby.owner === user,
            nextScenario: currentScenario(campaign),
            canContinue: canPlayNext(campaign),
            ready: !!mine && ready(mine),
            allReady: active.length > 0 && active.every(ready),
            transfers: pendingTransfers(campaign),
            members: campaign.investigators.map((i) => {
              const record = campaign.log.investigators[i.id]!
              return {
                investigator: i.id,
                xp: record.xp,
                physicalTrauma: record.physicalTrauma,
                mentalTrauma: record.mentalTrauma,
                active: active.includes(i.id),
                ready: ready(i.id),
              }
            }),
            own: own
              ? {
                  deck: [...own.deck],
                  removable: removableCards(campaign, own.id),
                  options: canPlayNext(campaign)
                    ? purchaseOptions(campaign, own.id).map((o) => ({
                        code: o.code,
                        name: o.name,
                        cost: o.cost,
                        needsRemoval: o.needsRemoval,
                        ...(o.replaces ? { replaces: o.replaces } : {}),
                      }))
                    : [],
                }
              : null,
          },
        }
      : {}),
    revision: lobby.revision,
    scenarioId: g.scenarioId,
    difficulty: g.difficulty,
    round: g.round,
    phase: g.phase,
    doom: g.doom,
    finished: !!g.outcome,
    cards,
    test: g.skillTest
      ? {
          investigator: g.skillTest.investigator,
          skill: g.skillTest.skill,
          difficulty: g.skillTest.difficulty,
          tokens: [...g.skillTest.tokens],
          value: g.skillTest.modifiedSkill,
          succeeded: g.skillTest.succeeded,
        }
      : null,
    investigators: g.investigators.map((i) => ({
      id: i.id,
      name: i.name,
      damage: i.damage,
      horror: i.horror,
      resources: i.resources,
      clues: i.clues,
      actionsRemaining: i.actionsRemaining,
      location: i.location,
      eliminated: i.eliminated,
      handCount: i.hand.length,
      deckCount: i.deck.length,
      ...(i.id === mine ? { hand: [...i.hand] } : {}),
    })),
    pending: pending
      ? {
          id: String(lobby.revision),
          investigator: pending.investigator,
          ...(canDecide
            ? {
                prompt: pending.question.prompt,
                params: pending.question.promptParams ?? {},
                ...(pending.question.story
                  ? {
                      story: {
                        title: pending.question.story.title,
                        body: pending.question.story.body,
                      },
                    }
                  : {}),
              }
            : {}),
          choices: canDecide
            ? pending.question.choices.map((c) => ({ label: c.label, params: c.params ?? {} }))
            : [],
        }
      : null,
  }
}
