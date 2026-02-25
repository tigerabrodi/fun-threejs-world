import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { AnimationStateMachine } from './AnimationStateMachine'
import { IdleState } from './states/IdleState'
import { WalkState } from './states/WalkState'
import { SprintState } from './states/SprintState'
import { CharacterController } from './CharacterController'
import type { ThirdPersonCamera } from './ThirdPersonCamera'

const CHARACTER_URL =
  'https://spawnfile.io/dev/character-assets/1768117533506-e15f88b3-49f2-433e-9f48-c16e4aeeb726.glb'

const TARGET_HEIGHT = 1.75 // meters

export class Character {
  model!: THREE.Group
  mixer!: THREE.AnimationMixer
  animations: Map<string, THREE.AnimationAction> = new Map()
  stateMachine = new AnimationStateMachine()
  controller = new CharacterController()

  async load({
    renderer,
    camera,
    scene,
  }: {
    renderer: THREE.WebGPURenderer
    camera: THREE.Camera
    scene: THREE.Scene
  }) {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    const gltf = await loader.loadAsync(CHARACTER_URL)

    this.model = gltf.scene
    this.mixer = new THREE.AnimationMixer(this.model)

    // Scale model to target height
    const box = new THREE.Box3().setFromObject(this.model)
    const currentHeight = box.max.y - box.min.y
    const scale = TARGET_HEIGHT / currentHeight
    this.model.scale.setScalar(scale)

    // Compile shaders before rendering (required for WebGPU)
    await renderer.compileAsync(this.model, camera, scene)

    // Map animations by name
    for (const clip of gltf.animations) {
      const action = this.mixer.clipAction(clip)
      this.animations.set(clip.name, action)
    }

    // Setup animation state machine
    this.stateMachine.addState({ state: new IdleState(this) })
    this.stateMachine.addState({ state: new WalkState(this) })
    this.stateMachine.addState({ state: new SprintState(this) })
    this.stateMachine.setState({ name: 'idle' })

    return this
  }

  update({
    delta,
    camera,
  }: {
    delta: number
    camera: ThirdPersonCamera
  }) {
    // Update animation mixer
    this.mixer.update(delta)

    // Update state machine (handles animation transitions)
    this.stateMachine.update({ delta })

    // Update character movement
    this.controller.update({ delta, model: this.model, camera })
  }
}
