export type Phase = 'dev' | 'review' | 'blocked' | 'integration' | 'done' | 'idle'

export type Progress = {
  prd: string
  done: number
  total: number
  phase: Phase
  task: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'flow-progress': { progress: Progress | null; isHidden: boolean }
  }
}
