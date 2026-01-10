# Grass Field with Animated Character - Project Plan

## Tech Stack

- Bun + Vite + React + TypeScript
- Three.js with WebGPU renderer
- TSL (Three Shading Language) for compute/vertex shaders

## Dependencies

```bash
bun add three @types/three
```

---

## Phase 1: Project Scaffolding

### 1.1 Basic Scene Setup

```tsx
// src/components/GrassScene.tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three/webgpu'

export function GrassScene() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const renderer = new THREE.WebGPURenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current?.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    // Initialize and start loop
    renderer.init().then(() => {
      // game loop here
    })

    return () => {
      /* cleanup */
    }
  }, [])

  return <div ref={containerRef} />
}
```

### 1.2 Game Loop Architecture

```ts
// src/core/GameLoop.ts
type UpdateCallback = (delta: number, elapsed: number) => void

export class GameLoop {
  private callbacks: UpdateCallback[] = []
  private clock = new THREE.Clock()

  register(cb: UpdateCallback) {
    this.callbacks.push(cb)
  }

  tick() {
    const delta = this.clock.getDelta()
    const elapsed = this.clock.getElapsedTime()
    this.callbacks.forEach((cb) => cb(delta, elapsed))
  }
}
```

---

## Phase 2: Character System

### 2.1 Load GLB with Animations

```ts
// src/core/Character.ts
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export class Character {
  model: THREE.Group
  mixer: THREE.AnimationMixer
  animations: Map<string, THREE.AnimationAction> = new Map()

  async load(url: string, animationIds: Record<string, number>) {
    const gltf = await new GLTFLoader().loadAsync(url)
    this.model = gltf.scene
    this.mixer = new THREE.AnimationMixer(this.model)

    // Map animation IDs to actions
    for (const [name, id] of Object.entries(animationIds)) {
      const clip = gltf.animations[id]
      if (clip) this.animations.set(name, this.mixer.clipAction(clip))
    }
  }

  update(delta: number) {
    this.mixer.update(delta)
  }
}
```

### 2.2 Animation State Machine

States: `idle`, `walk`, `jump`

```ts
// src/core/AnimationStateMachine.ts
interface State {
  name: string
  enter(prev: State | null): void
  exit(): void
  update(delta: number): string | null // returns next state or null
}

export class AnimationStateMachine {
  private current: State
  private states: Map<string, State> = new Map()

  addState(state: State) {
    this.states.set(state.name, state)
  }

  setState(name: string) {
    const next = this.states.get(name)
    if (!next || next === this.current) return
    this.current?.exit()
    next.enter(this.current)
    this.current = next
  }

  update(delta: number) {
    const next = this.current?.update(delta)
    if (next) this.setState(next)
  }
}
```

### 2.3 Animation Transitions with Crossfade

```ts
// src/core/states/WalkState.ts
class WalkState implements State {
  name = 'walk'

  constructor(private character: Character) {}

  enter(prev: State | null) {
    const action = this.character.animations.get('walk')!
    action.enabled = true
    action.setEffectiveTimeScale(1.0)
    action.setEffectiveWeight(1.0)

    if (prev) {
      const prevAction = this.character.animations.get(prev.name)
      if (prevAction) {
        // Sync time for cyclical animations (walk/run)
        if (prev.name === 'run') {
          const ratio =
            action.getClip().duration / prevAction.getClip().duration
          action.time = prevAction.time * ratio
        }
        action.crossFadeFrom(prevAction, 0.3, true)
      }
    }
    action.play()
  }

  exit() {}

  update(delta: number): string | null {
    // Transition logic based on input
    if (!Input.isMoving()) return 'idle'
    if (Input.jump()) return 'jump'
    return null
  }
}
```

### 2.4 Jump State (special case)

Jump is non-looping, returns to idle/walk when done.

```ts
class JumpState implements State {
  name = 'jump'
  private finished = false

  enter(prev: State | null) {
    const action = this.character.animations.get('jump')!
    action.reset()
    action.setLoop(THREE.LoopOnce, 1)
    action.clampWhenFinished = true

    // Listen for completion
    this.mixer.addEventListener('finished', this.onFinished)

    if (prev) {
      const prevAction = this.character.animations.get(prev.name)
      if (prevAction) action.crossFadeFrom(prevAction, 0.15, true)
    }
    action.play()
  }

  onFinished = () => {
    this.finished = true
  }

  update(): string | null {
    if (this.finished) return Input.isMoving() ? 'walk' : 'idle'
    return null
  }
}
```

---

## Phase 3: Input System

### 3.1 Input Handler

```ts
// src/core/Input.ts
export class Input {
  private static keys: Set<string> = new Set()

  static init() {
    window.addEventListener('keydown', (e) => this.keys.add(e.code))
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
  }

  static isMoving() {
    return (
      this.keys.has('KeyW') ||
      this.keys.has('KeyA') ||
      this.keys.has('KeyS') ||
      this.keys.has('KeyD')
    )
  }

  static getDirection(): THREE.Vector2 {
    const dir = new THREE.Vector2()
    if (this.keys.has('KeyW')) dir.y += 1
    if (this.keys.has('KeyS')) dir.y -= 1
    if (this.keys.has('KeyA')) dir.x -= 1
    if (this.keys.has('KeyD')) dir.x += 1
    return dir.normalize()
  }

  static jump() {
    return this.keys.has('Space')
  }
}
```

### 3.2 Character Controller

```ts
// src/core/CharacterController.ts
export class CharacterController {
  private velocity = new THREE.Vector3()
  private moveSpeed = 5

  update(delta: number, character: Character, camera: THREE.Camera) {
    const input = Input.getDirection()
    if (input.length() === 0) return

    // Get camera-relative direction
    const cameraForward = new THREE.Vector3()
    camera.getWorldDirection(cameraForward)
    cameraForward.y = 0
    cameraForward.normalize()

    const cameraRight = new THREE.Vector3()
    cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0))

    // Calculate move direction
    const moveDir = new THREE.Vector3()
    moveDir.addScaledVector(cameraRight, input.x)
    moveDir.addScaledVector(cameraForward, input.y)
    moveDir.normalize()

    // Apply movement
    character.model.position.addScaledVector(moveDir, this.moveSpeed * delta)

    // Rotate to face movement direction
    if (moveDir.length() > 0) {
      const targetQuat = new THREE.Quaternion()
      targetQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), moveDir)
      character.model.quaternion.slerp(targetQuat, 0.1)
    }
  }
}
```

---

## Phase 4: Third-Person Camera

### 4.1 Camera Controller

```ts
// src/core/ThirdPersonCamera.ts
export class ThirdPersonCamera {
  private currentPosition = new THREE.Vector3()
  private currentLookAt = new THREE.Vector3()

  // Tunable offsets (local space)
  private offset = new THREE.Vector3(-2, 3, -5) // behind and above
  private lookAheadOffset = new THREE.Vector3(0, 1, 10) // in front

  // Smoothing factor (lower = more lag)
  private smoothing = 0.001

  constructor(private camera: THREE.PerspectiveCamera) {}

  update(delta: number, target: THREE.Object3D) {
    // Calculate ideal positions in world space
    const idealOffset = this.offset
      .clone()
      .applyQuaternion(target.quaternion)
      .add(target.position)

    const idealLookAt = this.lookAheadOffset
      .clone()
      .applyQuaternion(target.quaternion)
      .add(target.position)

    // Frame-rate independent smoothing
    const t = 1.0 - Math.pow(this.smoothing, delta)

    this.currentPosition.lerp(idealOffset, t)
    this.currentLookAt.lerp(idealLookAt, t)

    this.camera.position.copy(this.currentPosition)
    this.camera.lookAt(this.currentLookAt)
  }
}
```

---

## Phase 5: Terrain

### 5.1 Simple Flat Terrain

```ts
// src/core/Terrain.ts
export function createTerrain(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(200, 200, 100, 100)
  geometry.rotateX(-Math.PI / 2)

  const material = new THREE.MeshStandardMaterial({
    color: 0x3d2817, // dirt brown
    roughness: 0.9,
  })

  return new THREE.Mesh(geometry, material)
}
```

Optional: Add subtle noise-based height variation later.

---

## Phase 6: Grass System (WebGPU/TSL)

### 6.1 Grass Geometry (Single Blade Template)

```ts
// src/grass/GrassGeometry.ts
export function createBladeGeometry(segments = 4): THREE.BufferGeometry {
  const vertices: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  // Blade is tapered quad strip
  for (let i = 0; i <= segments; i++) {
    const t = i / segments // 0 at base, 1 at tip
    const width = 0.05 * (1 - t * 0.9) // taper toward tip
    const y = t * 0.5 // height

    // Left and right vertices
    vertices.push(-width, y, 0)
    vertices.push(width, y, 0)
    uvs.push(0, t, 1, t)

    if (i < segments) {
      const base = i * 2
      indices.push(base, base + 1, base + 2)
      indices.push(base + 1, base + 3, base + 2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}
```

### 6.2 Instance Data Generation (Compute Shader)

```ts
// src/grass/GrassCompute.ts
import {
  fn,
  instanceIndex,
  storage,
  uniform,
  vec3,
  float,
  sin,
  cos,
} from 'three/tsl'

export function createGrassInstances(count: number, fieldSize: number) {
  // Storage buffer for instance data
  const instanceBuffer = new THREE.StorageBufferAttribute(
    new Float32Array(count * 4),
    4 // x, z, rotation, height
  )

  const computeInit = fn(() => {
    const i = instanceIndex

    // Grid position with jitter
    const gridSize = Math.sqrt(count)
    const gridX = float(i).mod(gridSize)
    const gridZ = float(i).div(gridSize).floor()

    // Hash for randomness
    const hash = sin(float(i).mul(127.1)).fract()
    const hash2 = sin(float(i).mul(269.5)).fract()

    // Jittered position
    const spacing = fieldSize / gridSize
    const x = gridX.mul(spacing).add(hash.mul(spacing).sub(spacing * 0.5))
    const z = gridZ.mul(spacing).add(hash2.mul(spacing).sub(spacing * 0.5))

    // Random rotation and height
    const rotation = hash.mul(Math.PI * 2)
    const height = float(0.3).add(hash2.mul(0.4)) // 0.3 to 0.7

    storage(instanceBuffer, 'vec4', i).assign(vec4(x, z, rotation, height))
  })

  return { instanceBuffer, computeInit }
}
```

### 6.3 Grass Vertex Shader (TSL)

```ts
// src/grass/GrassVertex.ts
import {
  attribute,
  uniform,
  varying,
  vec3,
  vec4,
  float,
  sin,
  cos,
  mat2,
  positionLocal,
  time,
} from 'three/tsl'

export function createGrassVertexShader(
  instanceBuffer: StorageBufferAttribute
) {
  // Instance data
  const instanceData = storage(instanceBuffer, 'vec4', instanceIndex)
  const instancePos = instanceData.xy
  const instanceRotation = instanceData.z
  const instanceHeight = instanceData.w

  // Wind uniforms
  const windStrength = uniform(0.3)
  const windFrequency = uniform(0.5)

  // Get blade-local position
  const localPos = positionLocal.xyz
  const t = localPos.y.div(0.5) // 0 at base, 1 at tip

  // Scale height
  const scaledY = localPos.y.mul(instanceHeight)

  // Wind displacement (stronger at tip)
  const windOffset = sin(
    instancePos.x
      .mul(windFrequency)
      .add(instancePos.y.mul(windFrequency))
      .add(time.mul(2.0))
  )
    .mul(windStrength)
    .mul(t.mul(t)) // quadratic falloff

  // Apply rotation
  const cosR = cos(instanceRotation)
  const sinR = sin(instanceRotation)
  const rotatedX = localPos.x.mul(cosR).sub(windOffset.mul(sinR))
  const rotatedZ = localPos.x.mul(sinR).add(windOffset.mul(cosR))

  // Final world position
  const worldPos = vec3(
    instancePos.x.add(rotatedX),
    scaledY,
    instancePos.y.add(rotatedZ) // instancePos.y is actually z
  )

  return worldPos
}
```

### 6.4 Grass Material & Mesh

```ts
// src/grass/GrassMesh.ts
import { MeshBasicNodeMaterial } from 'three/webgpu'

export function createGrassMesh(
  geometry: THREE.BufferGeometry,
  instanceCount: number,
  instanceBuffer: StorageBufferAttribute
) {
  const material = new MeshBasicNodeMaterial()

  // Color gradient: dark at base, lighter at tip
  const t = attribute('uv').y
  const baseColor = vec3(0.05, 0.15, 0.02)
  const tipColor = vec3(0.3, 0.5, 0.1)
  material.colorNode = mix(baseColor, tipColor, t)

  // Apply custom vertex position
  material.positionNode = createGrassVertexShader(instanceBuffer)

  const mesh = new THREE.InstancedMesh(geometry, material, instanceCount)
  mesh.frustumCulled = false // we handle culling in compute

  return mesh
}
```

### 6.5 Putting Grass Together

```ts
// src/grass/GrassSystem.ts
export class GrassSystem {
  mesh: THREE.InstancedMesh
  private computeInit: any

  constructor(count = 100000, fieldSize = 50) {
    const geometry = createBladeGeometry(4)
    const { instanceBuffer, computeInit } = createGrassInstances(
      count,
      fieldSize
    )
    this.mesh = createGrassMesh(geometry, count, instanceBuffer)
    this.computeInit = computeInit
  }

  async init(renderer: THREE.WebGPURenderer) {
    // Run compute shader once to populate instance buffer
    await renderer.computeAsync(this.computeInit)
  }
}
```

---

## Phase 7: Wind System

### 7.1 Perlin Noise for Wind

Three.js TSL has built-in noise functions.

```ts
import { mx_perlin_noise_float } from 'three/tsl'

// In vertex shader
const noiseInput = vec2(
  instancePos.x.mul(0.1).add(time.mul(0.5)),
  instancePos.y.mul(0.1)
)
const windNoise = mx_perlin_noise_float(noiseInput)
const windDisplacement = windNoise.mul(windStrength).mul(t.mul(t))
```

---

## Phase 8: LOD System (Optional for v1)

### 8.1 Simple Distance-Based LOD

```ts
// Two grass meshes: highDetail (segments=4), lowDetail (segments=2)
// In render loop, swap based on camera distance

const distToCamera = camera.position.distanceTo(grassCenter)
highDetailGrass.visible = distToCamera < 30
lowDetailGrass.visible = distToCamera >= 30
```

Or: reduce instance count for far tiles.

---

## Phase 9: Character-Grass Interaction (Optional for v1)

### 9.1 Displacement via Uniform

Pass character position to grass shader, bend nearby blades away.

```ts
// In grass vertex shader
const charPos = uniform(new THREE.Vector2()) // updated each frame
const toChar = instancePos.sub(charPos)
const distToChar = toChar.length()
const pushStrength = float(1.0).sub(distToChar.div(2.0)).max(0) // radius of 2
const pushDir = toChar.normalize().mul(pushStrength).mul(0.5)

// Add to wind displacement
const totalDisplacement = windDisplacement.add(pushDir)
```

---

## Integration Order

1. **Scene + renderer + loop** - get something rendering
2. **Terrain** - flat plane so we have ground
3. **Character loading** - GLB in scene, static
4. **Animation mixer** - play idle animation
5. **Input system** - capture WASD + space
6. **Animation state machine** - idle/walk/jump with crossfade
7. **Character controller** - movement based on input
8. **Third-person camera** - follows character smoothly
9. **Grass geometry** - single instanced blade, no wind
10. **Grass compute shader** - populate instances
11. **Grass vertex shader** - add wind animation
12. **Polish** - lighting, colors, interaction

---

## File Structure

```
src/
├── components/
│   └── GrassScene.tsx        # React wrapper
├── core/
│   ├── GameLoop.ts
│   ├── Input.ts
│   ├── Character.ts
│   ├── CharacterController.ts
│   ├── AnimationStateMachine.ts
│   ├── ThirdPersonCamera.ts
│   └── states/
│       ├── IdleState.ts
│       ├── WalkState.ts
│       └── JumpState.ts
├── grass/
│   ├── GrassGeometry.ts
│   ├── GrassCompute.ts
│   ├── GrassVertex.ts
│   └── GrassSystem.ts
├── world/
│   └── Terrain.ts
└── App.tsx
```

---

## Notes for Implementation

- WebGPU renderer requires async init: `await renderer.init()`
- TSL imports come from `three/tsl`
- Storage buffers need `renderer.computeAsync()` to execute compute shaders
- Character GLB path and animation IDs should be configurable
- Start with small instance count (10k) for debugging, scale up later
- Console.log frame time to catch performance issues early
