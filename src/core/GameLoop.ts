import * as THREE from 'three'

type UpdateCallback = (params: { delta: number; elapsed: number }) => void

export class GameLoop {
  private callbacks: UpdateCallback[] = []
  private clock = new THREE.Clock()

  register({ callback }: { callback: UpdateCallback }) {
    this.callbacks.push(callback)
  }

  tick() {
    const delta = this.clock.getDelta()
    const elapsed = this.clock.getElapsedTime()
    this.callbacks.forEach((cb) => cb({ delta, elapsed }))
  }
}
