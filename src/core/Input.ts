import * as THREE from 'three/webgpu'

class InputManager {
  private keys: Set<string> = new Set()
  private mouseDelta = { x: 0, y: 0 }
  private initialized = false

  init() {
    if (this.initialized) return
    this.initialized = true

    window.addEventListener('keydown', (e) => this.keys.add(e.code))
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
  }

  addMouseDelta({ x, y }: { x: number; y: number }) {
    this.mouseDelta.x += x
    this.mouseDelta.y += y
  }

  getMouseDelta() {
    const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y }
    this.mouseDelta.x = 0
    this.mouseDelta.y = 0
    return delta
  }

  isMoving() {
    return (
      this.keys.has('KeyW') ||
      this.keys.has('KeyA') ||
      this.keys.has('KeyS') ||
      this.keys.has('KeyD')
    )
  }

  getDirection() {
    const dir = new THREE.Vector2()
    if (this.keys.has('KeyW')) dir.y += 1
    if (this.keys.has('KeyS')) dir.y -= 1
    if (this.keys.has('KeyA')) dir.x -= 1
    if (this.keys.has('KeyD')) dir.x += 1
    return dir.normalize()
  }

  jump() {
    return this.keys.has('Space')
  }

  isKeyDown({ code }: { code: string }) {
    return this.keys.has(code)
  }
}

export const Input = new InputManager()
