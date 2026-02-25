import * as THREE from 'three/webgpu'
import { Input } from './Input'

export class ThirdPersonCamera {
  private camera: THREE.PerspectiveCamera
  private target: THREE.Object3D | null = null

  // Spherical coordinates
  private radius = 8
  private theta = Math.PI // horizontal angle - start behind character
  private phi = Math.PI / 3 // vertical angle (~60 degrees from top)

  // Constraints
  private minPhi = Math.PI / 18 // ~10 degrees
  private maxPhi = (Math.PI * 80) / 180 // ~80 degrees

  // Sensitivity
  private sensitivity = 0.002

  // Target offset (look at character's chest, not feet)
  private targetOffset = new THREE.Vector3(0, 1.5, 0)

  // Current position (used for initialization)
  private currentPosition = new THREE.Vector3()

  constructor({ camera }: { camera: THREE.PerspectiveCamera }) {
    this.camera = camera
  }

  setTarget({ target }: { target: THREE.Object3D }) {
    this.target = target
    // Initialize camera position
    this.updateCameraPosition()
    this.currentPosition.copy(this.camera.position)
  }

  update(_params: { delta: number }) {
    if (!this.target) return

    // Get mouse input
    const mouseDelta = Input.getMouseDelta()

    // Update angles based on mouse movement
    this.theta -= mouseDelta.x * this.sensitivity
    this.phi -= mouseDelta.y * this.sensitivity

    // Clamp vertical angle
    this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi))

    // Update camera position (no smoothing - directly follows character)
    this.updateCameraPosition()

    // Look at target
    const lookAtPoint = this.target.position.clone().add(this.targetOffset)
    this.camera.lookAt(lookAtPoint)
  }

  private updateCameraPosition() {
    if (!this.target) return

    // Convert spherical to cartesian
    const x = this.radius * Math.sin(this.phi) * Math.sin(this.theta)
    const y = this.radius * Math.cos(this.phi)
    const z = this.radius * Math.sin(this.phi) * Math.cos(this.theta)

    // Position relative to target
    const targetPos = this.target.position.clone().add(this.targetOffset)
    this.camera.position.set(targetPos.x + x, targetPos.y + y, targetPos.z + z)
  }

  getForwardDirection() {
    // Get camera's forward direction (projected onto XZ plane)
    const forward = new THREE.Vector3()
    this.camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    return forward
  }

  getRightDirection() {
    const forward = this.getForwardDirection()
    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0))
    return right
  }
}
