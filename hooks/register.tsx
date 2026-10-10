import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Group, Tint } from '../types'
import { NAMED, parseArgs, resolveTint } from './project'
import type { SavedMap } from './project'

const tint = atom({ plugin: 'project-tint', key: 'tint' } as const, null)
const tintPrompts = atom({ plugin: 'project-tint', key: 'tintPrompts' } as const, true)

const STORE_PROJECTS = 'projects'
const STORE_GROUPS = 'groups'
const STORE_PROMPTS = 'tintPrompts'

// The sidebar has no event for a chat moving between groups, so ask the app now and then
const GROUP_POLL_MS = 10_000

const loadMap = async ($: EngineInterface, key: string): Promise<SavedMap> =>
  ((await $.store.get(key)) as SavedMap | undefined) ?? {}

// The sidebar group the desktop app files this chat under: null when ungrouped,
// undefined when unknown (no desktop app, or it has not reported groups yet).
// Asked by this process's own host session id: a `self` lookup from a plugin
// resolves to whichever window the app last fronted, not to this chat.
const readGroup = async ($: EngineInterface): Promise<Group | null | undefined> => {
  try {
    const hostId = await $.env.get('CLAUDE_CODE_HOST_SESSION_ID')
    const result = await $.mcp.call('ccd_session_mgmt', 'get_session', { session_id: hostId ?? 'self' })
    if (result.isError) return undefined
    const text = result.content.find(block => block.type === 'text')?.text
    if (!text) return undefined
    const info = JSON.parse(text) as { sessionId?: unknown; group?: { id?: unknown; name?: unknown } | null }
    if (hostId && info.sessionId !== hostId) return undefined
    if (!('group' in info)) return undefined
    const found = info.group
    if (!found || typeof found.id !== 'string') return null
    return { id: found.id, name: typeof found.name === 'string' && found.name ? found.name : found.id }
  } catch {
    return undefined
  }
}

let knownGroup: Group | null = null

const refresh = async ($: EngineInterface, group?: Group | null): Promise<Tint> => {
  if (group !== undefined) knownGroup = group
  const root = await $.session.root()
  const current = resolveTint(root, knownGroup, await loadMap($, STORE_PROJECTS), await loadMap($, STORE_GROUPS))
  await update($, tint, () => current)
  const stored = await $.store.get(STORE_PROMPTS)
  await update($, tintPrompts, () => stored !== false)
  $.ui.status(`◆ ${current.name}`)
  return current
}

const sameGroup = (a: Group | null, b: Group | null) =>
  a === b || (a !== null && b !== null && a.id === b.id && a.name === b.name)

const refreshGroup = async ($: EngineInterface) => {
  const found = await readGroup($)
  if (found === undefined || sameGroup(found, knownGroup)) return
  await refresh($, found)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'project-color',
      description: 'Set the color and name that mark this chat: its sidebar group, or else its project',
      argumentHint: '[project] [color] [name] | list | reset | prompts on|off',
    })
    await refresh($, await readGroup($))
    $.clock.every(GROUP_POLL_MS, () => {
      void refreshGroup($).catch(() => undefined)
    })
    return next(e)
  })

  on('classic.CwdChanged', async ($, e, next) => {
    void refresh($).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'project-color' }, async ($, e) => {
    const parsed = parseArgs(e.args)
    if (parsed.kind === 'error') return { text: parsed.text }

    const current = await refresh($, await readGroup($))
    const inGroup = current.group !== null

    if (parsed.kind === 'show') {
      const colors = Object.keys(NAMED).join('|')
      const lines = inGroup
        ? [
            `This chat is in the group "${current.name}", in ${current.color}.`,
            `Project: ${current.project}.`,
            `Change the group: /project-color <${colors}|#hex> [name]`,
            `Change the project instead: /project-color project <color> [name]`,
          ]
        : [
            `This project is "${current.name}" in ${current.color}. It is in no sidebar group.`,
            `Change it: /project-color <${colors}|#hex> [name]`,
          ]
      return { text: lines.join('\n') }
    }

    if (parsed.kind === 'list') {
      const groups = Object.entries(await loadMap($, STORE_GROUPS)).map(
        ([id, one]) => `${one.color ?? 'auto'}  ${one.name ?? '(group name)'}  group ${id}`,
      )
      const projects = Object.entries(await loadMap($, STORE_PROJECTS)).map(
        ([path, one]) => `${one.color ?? 'auto'}  ${one.name ?? '(folder name)'}  ${path}`,
      )
      const rows = [...groups, ...projects]
      return { text: rows.length ? rows.join('\n') : 'Nothing customized yet.' }
    }

    if (parsed.kind === 'prompts') {
      await $.store.set(STORE_PROMPTS, parsed.isOn)
      await update($, tintPrompts, () => parsed.isOn)
      return { text: `Prompt framing ${parsed.isOn ? 'on' : 'off'}.` }
    }

    // What the change aims at: the group this chat is in, unless told `project` or there is none
    const onGroup = inGroup && !parsed.forProject
    const storeKey = onGroup ? STORE_GROUPS : STORE_PROJECTS
    const entryKey = onGroup && current.group ? current.group.id : current.root
    const saved = await loadMap($, storeKey)

    if (parsed.kind === 'reset') {
      const { [entryKey]: _removed, ...others } = saved
      await $.store.set(storeKey, others)
      const now = await refresh($)
      return { text: `Back to the automatic color for "${onGroup ? now.name : now.project}".` }
    }

    const nextSaved: SavedMap = {
      ...saved,
      [entryKey]: { ...saved[entryKey], color: parsed.color, ...(parsed.name ? { name: parsed.name } : {}) },
    }
    await $.store.set(storeKey, nextSaved)
    const now = await refresh($)
    const label = onGroup ? `Group "${now.name}"` : `Project "${now.project}"`
    return { text: `${label} is now ${parsed.color}.` }
  })

  // A full-width colored strip above the prompt: the group (or project) name and the path
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, tint)
    if (e.props.hasSurvey || !current) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const detail = current.group ? `${current.project}  ${current.root}` : current.root
    return (
      <Box width="100%" paddingX={1} backgroundColor={current.color}>
        <Text bold color="#ffffff" backgroundColor={current.color} wrap="truncate-end">
          ◆ {current.name}
        </Text>
        <Text color="#ffffff" backgroundColor={current.color} wrap="truncate-middle">
          {'  '}{detail}
        </Text>
      </Box>
    )
  })

  // Frames each of your prompts in the chat's color, so scrollback shows the context too
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const current = await read($, tint)
    const isOwnPrompt = e.props.origin.kind === 'composer' || e.props.origin.kind === 'bridge'
    if (!current || !isOwnPrompt || !(await read($, tintPrompts))) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box borderStyle="round" borderColor={current.color} paddingX={1}>
        <Text>{e.props.text}</Text>
      </Box>
    )
  })
}
