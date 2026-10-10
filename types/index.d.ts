export type Project = { root: string; name: string; color: string }

declare module 'claude-code' {
  interface PluginState {
    'project-tint': { project: Project | null; tintPrompts: boolean }
  }
}
