export interface State {
  name: string
  enter({ prev }: { prev: State | null }): void
  update({ delta }: { delta: number }): string | null
}

export class AnimationStateMachine {
  private current: State | null = null
  private states: Map<string, State> = new Map()

  addState({ state }: { state: State }) {
    this.states.set(state.name, state)
  }

  setState({ name }: { name: string }) {
    const next = this.states.get(name)
    if (!next || next === this.current) return

    const prev = this.current
    next.enter({ prev })
    this.current = next
  }

  update({ delta }: { delta: number }) {
    if (!this.current) return

    const nextState = this.current.update({ delta })
    if (nextState) {
      this.setState({ name: nextState })
    }
  }

  getCurrentState() {
    return this.current
  }
}
