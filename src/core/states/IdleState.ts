import type { State } from '../AnimationStateMachine'
import type { Character } from '../Character'
import { Input } from '../Input'

export class IdleState implements State {
  name = 'idle'
  private character: Character

  constructor(character: Character) {
    this.character = character
  }

  enter({ prev }: { prev: State | null }) {
    const action = this.character.animations.get('Idle')
    if (!action) return

    action.enabled = true
    action.setEffectiveWeight(1.0)
    action.timeScale = 1.0 // Set BEFORE crossfade

    if (prev) {
      const prevAction = this.character.animations.get(
        prev.name === 'idle'
          ? 'Idle'
          : prev.name === 'walk'
            ? 'Walk'
            : prev.name === 'sprint'
              ? 'Sprint'
              : ''
      )
      if (prevAction) {
        action.crossFadeFrom(prevAction, 0.2, true)
      }
    }

    action.play()
  }

  update(_params: { delta: number }): string | null {
    if (Input.isMoving()) {
      return Input.isSprinting() ? 'sprint' : 'walk'
    }
    return null
  }
}
