import type { State } from '../AnimationStateMachine'
import type { Character } from '../Character'
import { Input } from '../Input'

const ANIMATION_SPEED = 4.0

export class SprintState implements State {
  name = 'sprint'
  private character: Character

  constructor(character: Character) {
    this.character = character
  }

  enter({ prev }: { prev: State | null }) {
    const action = this.character.animations.get('Sprint')
    if (!action) return

    action.enabled = true
    action.setEffectiveWeight(1.0)
    action.timeScale = ANIMATION_SPEED // Set BEFORE crossfade so warp targets this speed

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
    if (!Input.isMoving()) {
      return 'idle'
    }
    if (!Input.isSprinting()) {
      return 'walk'
    }
    return null
  }
}
