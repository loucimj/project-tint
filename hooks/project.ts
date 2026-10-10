import type { Project } from '../types'

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

// Stable color per path, so a project keeps its color without setup
export const autoColor = (root: string) => {
  let hash = 0
  for (const ch of root) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
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

export type Parsed =
  | { kind: 'show' }
  | { kind: 'list' }
  | { kind: 'reset' }
  | { kind: 'prompts'; isOn: boolean }
  | { kind: 'set'; color: string; name?: string }
  | { kind: 'error'; text: string }

export const parseArgs = (args: string): Parsed => {
  const [first = '', ...rest] = args.trim().split(/\s+/).filter(Boolean)
  const word = first.toLowerCase()
  if (!word) return { kind: 'show' }
  if (word === 'list') return { kind: 'list' }
  if (word === 'reset') return { kind: 'reset' }
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
  return name ? { kind: 'set', color, name } : { kind: 'set', color }
}
