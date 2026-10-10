import type { Group, Project, Tint } from '../types'

export type Saved = { name?: string; color?: string }
export type SavedMap = Record<string, Saved>

export const NAMED: Record<string, string> = {
  purple: '#7c3aed',
  blue: '#2563eb',
  sky: '#0284c7',
  teal: '#0d9488',
  green: '#16a34a',
  amber: '#b45309',
  orange: '#ea580c',
  red: '#dc2626',
  pink: '#db2777',
  slate: '#475569',
}

const PALETTE = Object.values(NAMED)

export const baseName = (root: string) =>
  root.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || root

// Stable color per key (a path or a group id), so nothing needs setup
export const autoColor = (key: string) => {
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length] ?? '#7c3aed'
}

export const toColor = (input: string): string | null => {
  const value = input.trim().toLowerCase()
  if (NAMED[value]) return NAMED[value]
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(value)) return value
  return null
}

export const resolveProject = (root: string, saved: SavedMap): Project => {
  const own = saved[root] ?? {}
  return {
    root,
    name: own.name ?? baseName(root),
    color: own.color ?? autoColor(root),
  }
}

// The group wins when the chat is in one: its color marks every chat filed under it
export const resolveTint = (
  root: string,
  group: Group | null,
  projects: SavedMap,
  groups: SavedMap,
): Tint => {
  const project = resolveProject(root, projects)
  if (!group) return { root, group: null, name: project.name, color: project.color, project: project.name }
  const own = groups[group.id] ?? {}
  return {
    root,
    group,
    name: own.name ?? group.name,
    color: own.color ?? autoColor(group.id),
    project: project.name,
  }
}

export type Parsed =
  | { kind: 'show' }
  | { kind: 'list' }
  | { kind: 'reset'; forProject: boolean }
  | { kind: 'prompts'; isOn: boolean }
  | { kind: 'set'; color: string; name?: string; forProject: boolean }
  | { kind: 'error'; text: string }

// A leading `project` aims the change at the folder even while the chat is in a group
export const parseArgs = (args: string): Parsed => {
  const words = args.trim().split(/\s+/).filter(Boolean)
  const forProject = (words[0] ?? '').toLowerCase() === 'project'
  if (forProject) words.shift()
  const [first = '', ...rest] = words
  const word = first.toLowerCase()
  if (!word) return { kind: 'show' }
  if (word === 'list') return { kind: 'list' }
  if (word === 'reset') return { kind: 'reset', forProject }
  if (word === 'prompts') {
    const flag = (rest[0] ?? '').toLowerCase()
    if (flag === 'on' || flag === 'off') return { kind: 'prompts', isOn: flag === 'on' }
    return { kind: 'error', text: 'Use /project-color prompts on|off' }
  }
  const color = toColor(first)
  if (!color) {
    return {
      kind: 'error',
      text: `"${first}" is not a color. Use a hex like #7c3aed or one of: ${Object.keys(NAMED).join(', ')}`,
    }
  }
  const name = rest.join(' ').trim()
  return name ? { kind: 'set', color, name, forProject } : { kind: 'set', color, forProject }
}
