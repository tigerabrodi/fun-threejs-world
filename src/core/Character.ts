import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

const CHARACTER_URL =
  'https://spawnfile.io/dev/character-assets/1768117533506-e15f88b3-49f2-433e-9f48-c16e4aeeb726.glb'

const TARGET_HEIGHT = 1.75 // meters

export class Character {
  model!: THREE.Group
  mixer!: THREE.AnimationMixer
  animations: Map<string, THREE.AnimationAction> = new Map()

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

    // Play idle by default
    const idle = this.animations.get('Idle')
    if (idle) {
      idle.play()
    }

    return this
  }

  update({ delta }: { delta: number }) {
    this.mixer.update(delta)
  }

  playAnimation({ name }: { name: string }) {
    const action = this.animations.get(name)
    if (action) {
      this.mixer.stopAllAction()
      action.reset()
      action.play()
    }
  }
}
