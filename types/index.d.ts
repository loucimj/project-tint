export type Project = { root: string; name: string; color: string }

/** A custom sidebar group of the desktop app's Code tab */
export type Group = { id: string; name: string }

/**
 * What marks this chat: the sidebar group it is filed under when it has one,
 * else the project folder. `name` and `color` are the ones drawn.
 */
export type Tint = {
  root: string
  group: Group | null
  name: string
  color: string
  /** The project's own display name, drawn beside the group's */
  project: string
}

declare module 'claude-code' {
  interface PluginState {
    'project-tint': { tint: Tint | null; tintPrompts: boolean }
  }
}
