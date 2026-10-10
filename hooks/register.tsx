import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Project } from '../types'
import { NAMED, parseArgs, resolveProject } from './project'
import type { SavedMap } from './project'

const project = atom({ plugin: 'project-tint', key: 'project' } as const, null)
const tintPrompts = atom({ plugin: 'project-tint', key: 'tintPrompts' } as const, true)

const STORE_PROJECTS = 'projects'
const STORE_PROMPTS = 'tintPrompts'

const loadSaved = async ($: EngineInterface): Promise<SavedMap> =>
  ((await $.store.get(STORE_PROJECTS)) as SavedMap | undefined) ?? {}

const refresh = async ($: EngineInterface): Promise<Project> => {
  const root = await $.session.root()
  const current = resolveProject(root, await loadSaved($))
  await update($, project, () => current)
  const stored = await $.store.get(STORE_PROMPTS)
  await update($, tintPrompts, () => stored !== false)
  $.ui.status(`◆ ${current.name}`)
  return current
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'project-color',
      description: 'Set the color and name that mark this project in the chat',
      argumentHint: '[color] [name] | list | reset | prompts on|off',
    })
    await refresh($)
    return next(e)
  })

  on('classic.CwdChanged', async ($, e, next) => {
    void refresh($).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'project-color' }, async ($, e) => {
    const parsed = parseArgs(e.args)
    const root = await $.session.root()
    const saved = await loadSaved($)

    if (parsed.kind === 'error') return { text: parsed.text }

    if (parsed.kind === 'show') {
      const now = resolveProject(root, saved)
      return {
        text: `This project is "${now.name}" in ${now.color}.\nChange it: /project-color <${Object.keys(NAMED).join('|')}|#hex> [name]`,
      }
    }

    if (parsed.kind === 'list') {
      const rows = Object.entries(saved).map(
        ([path, one]) => `${one.color ?? 'auto'}  ${one.name ?? '(folder name)'}  ${path}`,
      )
      return { text: rows.length ? rows.join('\n') : 'No projects customized yet.' }
    }

    if (parsed.kind === 'prompts') {
      await $.store.set(STORE_PROMPTS, parsed.isOn)
      await update($, tintPrompts, () => parsed.isOn)
      return { text: `Prompt framing ${parsed.isOn ? 'on' : 'off'}.` }
    }

    if (parsed.kind === 'reset') {
      const { [root]: _removed, ...others } = saved
      await $.store.set(STORE_PROJECTS, others)
      const now = await refresh($)
      return { text: `Back to the automatic color for "${now.name}".` }
    }

    const nextSaved: SavedMap = {
      ...saved,
      [root]: { ...saved[root], color: parsed.color, ...(parsed.name ? { name: parsed.name } : {}) },
    }
    await $.store.set(STORE_PROJECTS, nextSaved)
    const now = await refresh($)
    return { text: `"${now.name}" is now ${now.color}.` }
  })

  // A full-width colored strip above the prompt with the project name
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, project)
    if (e.props.hasSurvey || !current) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box width="100%" paddingX={1} backgroundColor={current.color}>
        <Text bold color="#ffffff" backgroundColor={current.color} wrap="truncate-end">
          ◆ {current.name}
        </Text>
        <Text color="#ffffff" backgroundColor={current.color} wrap="truncate-middle">
          {'  '}{current.root}
        </Text>
      </Box>
    )
  })

  // Frames each of your prompts in the project color, so scrollback shows the context too
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const current = await read($, project)
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
