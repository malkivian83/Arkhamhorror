// Manual acceptance test against apps/server/e2e/online-browser-server.ts.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = 'http://127.0.0.1:3187'
const output = await mkdtemp(join(tmpdir(), 'arkham-online-evidence-'))
const browsers = [],
  pages = [],
  snapshots = [null, null],
  errors = []
console.log(`Evidence: ${output}`)

async function eventually(predicate) {
  const deadline = Date.now() + 20000
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'Timed out waiting for synchronized views')
    await delay(100)
  }
}

async function reload(index, intermission = false) {
  const response = pages[index].waitForResponse((r) => r.url().endsWith('/game') && r.ok())
  await pages[index].reload()
  const view = await (await response).json()
  await pages[index]
    .getByRole('heading', {
      name: intermission ? 'Entre escenarios' : 'Mesa compartida',
      exact: true,
    })
    .waitFor()
  return view
}

async function progress(index, button) {
  const response = pages[index].waitForResponse(
    (r) => r.url().endsWith('/game/progress') && r.request().method() === 'POST',
  )
  await button.click()
  const result = await response
  assert.equal(result.status(), 200, await result.text())
  return result.json()
}

async function decideUntil(stop, limit) {
  const deadline = Date.now() + 300000
  let decisions = 0
  while (decisions < limit) {
    assert.ok(Date.now() < deadline, 'Scenario did not progress within five minutes')
    const revision = Math.max(...snapshots.map((v) => v?.revision ?? -1))
    const latest = snapshots.find((v) => v?.revision === revision)
    if (latest && stop(latest)) return decisions
    const actor = snapshots.findIndex((v) => v?.revision === revision && v.pending?.choices.length)
    if (actor < 0) {
      await delay(100)
      continue
    }
    const view = snapshots[actor]
    assert.equal(view.pending.investigator, view.investigators.find((i) => i.hand)?.id)
    const priorities = [
      'action.endTurn',
      'choice.keepHand',
      'choice.mulliganDone',
      'choice.done',
      'choice.continue',
    ]
    const choice =
      priorities
        .map((label) => view.pending.choices.findIndex((c) => c.label === label))
        .find((i) => i >= 0) ?? 0
    const response = pages[actor].waitForResponse(
      (r) => r.url().endsWith('/game/decisions') && r.request().method() === 'POST',
    )
    await pages[actor].locator('.decision button').nth(choice).click()
    const result = await response
    assert.equal(result.status(), 200, await result.text())
    decisions++
    if (decisions % 25 === 0) console.log(`Decisions: ${decisions}; round: ${view.round}`)
    await delay(100)
  }
  assert.fail(`Scenario did not reach the expected state in ${limit} decisions`)
}

try {
  for (const [index, channel] of ['chrome', 'msedge'].entries()) {
    const browser = await chromium.launch({ channel, headless: true })
    browsers.push(browser)
    console.log(`${channel}: ${browser.version()}`)
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    pages.push(page)
    page.setDefaultTimeout(20000)
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('response', async (response) => {
      if (/\/game(?:\/decisions|\/progress)?$/.test(response.url()) && response.ok()) {
        const view = await response.json().catch(() => null)
        if (view && (!snapshots[index] || view.revision >= snapshots[index].revision))
          snapshots[index] = view
      }
    })
    await page.goto(`${base}/account`)
    await page
      .locator('input[type=email]')
      .fill(`browser-${index ? 'friend' : 'host'}@example.test`)
    await page.locator('input[type=password]').fill('Online-browser-test-2026!')
    await page.locator('form button[type=submit]').click()
    await page.waitForURL('**/library')
  }
  const [host, friend] = pages
  const entry = await host.goto(`${base}/online`)
  assert.equal(entry.status(), 200)
  await host.getByRole('button', { name: 'Crear mesa', exact: true }).click()
  await host.getByRole('button', { name: 'Crear o renovar invitación', exact: true }).click()
  const invite = await host.getByLabel('Copia este enlace para invitar a tus amigos').inputValue()
  assert.ok(invite.includes('#invite='))
  assert.equal((await friend.goto(invite)).status(), 200)
  await friend.getByRole('button', { name: 'Unirme', exact: true }).click()
  await friend.getByRole('combobox', { name: /Tu mazo/ }).waitFor()
  for (const [index, deck] of ['starter:trish', 'starter:daniela'].entries()) {
    const page = pages[index]
    await page.reload()
    await page.getByRole('combobox', { name: /Tu mazo/ }).selectOption(deck)
    const saved = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith('/deck'),
    )
    await page.getByRole('button', { name: 'Guardar mazo', exact: true }).click()
    assert.equal((await saved).status(), 200)
  }
  for (const page of pages) {
    await page.reload()
    await page.getByRole('button', { name: 'Listo', exact: true }).click()
    await page.getByRole('button', { name: 'Dejar de estar listo', exact: true }).waitFor()
  }
  await host.reload()
  await host.getByRole('button', { name: 'Iniciar partida', exact: true }).click()
  await Promise.all(
    pages.map((p) => p.getByRole('heading', { name: 'Mesa compartida', exact: true }).waitFor()),
  )
  await reload(0)
  console.log(`First scenario finished in ${await decideUntil((v) => v.finished, 1500)} decisions`)
  await reload(0)
  await progress(
    0,
    host.getByRole('button', { name: 'Registrar resultado y experiencia', exact: true }),
  )
  await Promise.all(
    pages.map((p) => p.getByRole('heading', { name: 'Entre escenarios', exact: true }).waitFor()),
  )
  assert.equal(
    await host
      .getByRole('button', { name: 'Iniciar siguiente escenario', exact: true })
      .isDisabled(),
    true,
  )
  assert.equal(
    await friend.getByRole('button', { name: 'Iniciar siguiente escenario', exact: true }).count(),
    0,
  )
  const decks = [],
    members = []
  for (let index = 0; index < 2; index++) {
    const page = pages[index]
    const before = await reload(index, true)
    const ownId = before.investigators.find((i) => i.hand)?.id
    const own = before.campaign.members.find((i) => i.investigator === ownId)
    assert.ok(own.xp > 0, 'This acceptance run requires earned XP for each player')
    const option =
      before.campaign.own.options.find((o) => o.replaces) ?? before.campaign.own.options[0]
    assert.ok(option)
    await progress(
      index,
      page.locator('.campaign').getByRole('button', { name: 'Listo', exact: true }),
    )
    await page
      .locator('.campaign select')
      .first()
      .selectOption(`${option.code}:${option.replaces ?? ''}`)
    const removed = option.replaces ?? before.campaign.own.removable.find((c) => c !== option.code)
    if (option.needsRemoval) await page.locator('.campaign select').nth(1).selectOption(removed)
    const purchased = await progress(
      index,
      page.getByRole('button', { name: 'Comprar mejora', exact: true }),
    )
    assert.equal(
      purchased.campaign.ready,
      false,
      'Buying must reset only the purchaser confirmation',
    )
    assert.equal(
      purchased.campaign.members.find((i) => i.investigator === ownId).xp,
      own.xp - option.cost,
    )
    const expected = [...before.campaign.own.deck]
    assert.ok(expected.includes(removed))
    expected.splice(expected.indexOf(removed), 1)
    expected.push(option.code)
    assert.deepEqual([...purchased.campaign.own.deck].sort(), expected.sort())
    decks[index] = purchased.campaign.own.deck
    members[index] = purchased.campaign.members.find((i) => i.investigator === ownId)
    const persisted = await reload(index, true)
    assert.deepEqual(persisted.campaign.own.deck, decks[index])
    const other = await reload(1 - index, true)
    assert.deepEqual(other.campaign.members, persisted.campaign.members)
    assert.notDeepEqual(other.campaign.own.deck, decks[index])
    if (index === 1) assert.deepEqual(other.campaign.own.deck, decks[0])
    console.log(`Player ${index + 1}: ${removed} -> ${option.code}; cost ${option.cost} XP`)
    await page.screenshot({ path: join(output, `intermission-${index}.png`), fullPage: true })
  }
  for (let index = 0; index < 2; index++) {
    await reload(index, true)
    await progress(
      index,
      pages[index].locator('.campaign').getByRole('button', { name: 'Listo', exact: true }),
    )
  }
  await reload(0, true)
  await progress(0, host.getByRole('button', { name: 'Iniciar siguiente escenario', exact: true }))
  for (let index = 0; index < 2; index++) {
    const view = await reload(index)
    assert.equal(view.scenarioId, 'smoke-and-mirrors')
    assert.equal(view.finished, false)
    assert.equal(view.campaign, undefined)
    for (const member of members) {
      const investigator = view.investigators.find((i) => i.id === member.investigator)
      assert.equal(investigator.damage, member.physicalTrauma)
      assert.equal(investigator.horror, member.mentalTrauma)
    }
    assert.equal(view.investigators.filter((i) => i.hand).length, 1, 'Only own hand is visible')
  }
  await eventually(() => snapshots[0].revision === snapshots[1].revision)
  assert.deepEqual(snapshots[0].cards, snapshots[1].cards)
  await decideUntil((v) => v.phase === 'investigation' && v.round === 1, 100)
  for (let index = 0; index < 2; index++) {
    await reload(index)
    await pages[index].screenshot({
      path: join(output, `next-scenario-${index}.png`),
      fullPage: true,
    })
  }
  assert.deepEqual(errors, [])
  console.log(
    'PASS: invitation, decks, shared decisions, both purchases, persistence, readiness, next scenario and private hands',
  )
} catch (error) {
  for (const [index, page] of pages.entries())
    await page
      .screenshot({ path: join(output, `failure-${index}.png`), fullPage: true })
      .catch(() => {})
  throw error
} finally {
  for (const browser of browsers) await browser.close()
}
