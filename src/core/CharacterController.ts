import * as THREE from 'three/webgpu'
import { Input } from './Input'
import type { ThirdPersonCamera } from './ThirdPersonCamera'

const WALK_SPEED = 12 // meters per second
const SPRINT_SPEED = 24 // meters per second (2x walk)
const ROTATION_SMOOTHING = 0.15

export class CharacterController {
  private targetRotation = new THREE.Quaternion()

  update({
    delta,
    model,
    camera,
  }: {
    delta: number
    model: THREE.Object3D
    camera: ThirdPersonCamera
  }) {
    const inputDir = Input.getDirection()
    if (inputDir.length() === 0) return

    // Get camera-relative directions
    const forward = camera.getForwardDirection()
    const right = camera.getRightDirection()

    // Calculate world-space movement direction
    const moveDir = new THREE.Vector3()
    moveDir.addScaledVector(right, inputDir.x)
    moveDir.addScaledVector(forward, inputDir.y)
    moveDir.normalize()

    // Apply movement
    const speed = Input.isSprinting() ? SPRINT_SPEED : WALK_SPEED
    model.position.addScaledVector(moveDir, speed * delta)

    // Rotate character to face movement direction
    if (moveDir.lengthSq() > 0) {
      this.targetRotation.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        moveDir
      )
      model.quaternion.slerp(this.targetRotation, ROTATION_SMOOTHING)
    }
  }

  getSpeed() {
    return Input.isSprinting() ? SPRINT_SPEED : WALK_SPEED
  }
}
