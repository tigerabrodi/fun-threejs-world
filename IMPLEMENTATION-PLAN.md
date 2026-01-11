# Implementation Plan - Grass Field with Animated Character

A step-by-step guide to build the project. Each step is small and testable.

---

## Prerequisites

- [ ] Install dependencies: `bun add three @types/three`
- [ ] Receive character GLB model with animations: `Idle`, `Walk`, `Run`, `Sprint`, `Jump`
- [ ] Place GLB in `public/` folder

---

## Step 1: Basic Scene Setup

**Goal:** Get a WebGPU renderer running with a visible scene.

**Tasks:**
- [ ] Create `src/components/GrassScene.tsx` - React component with canvas container
- [ ] Initialize `WebGPURenderer` with async init
- [ ] Create basic scene, camera, and lighting
- [ ] Add a simple test cube to verify rendering
- [ ] Set up animation loop with `requestAnimationFrame`
- [ ] Handle window resize

**Test:** See a rotating cube on screen.

---

## Step 2: Game Loop Architecture

**Goal:** Centralized update system for all game systems.

**Tasks:**
- [ ] Create `src/core/GameLoop.ts` with callback registration
- [ ] Use `THREE.Clock` for delta time
- [ ] Integrate with React component

**Test:** Console log delta time each frame.

---

## Step 3: Terrain

**Goal:** Flat ground plane for the character to walk on.

**Tasks:**
- [ ] Create `src/world/Terrain.ts`
- [ ] Generate `PlaneGeometry` rotated to be horizontal
- [ ] Apply dirt/ground material
- [ ] Add to scene

**Test:** See a brown ground plane instead of void.

---

## Step 4: Character Loading

**Goal:** Load GLB model and display it in scene.

**Tasks:**
- [ ] Create `src/core/Character.ts`
- [ ] Use `GLTFLoader` to load the model
- [ ] Add model to scene at origin
- [ ] Position on top of terrain

**Test:** See static character model standing on terrain.

---

## Step 5: Animation Mixer

**Goal:** Play animations from the GLB.

**Tasks:**
- [ ] Create `AnimationMixer` for the character
- [ ] Extract animation clips and map by name
- [ ] Play `Idle` animation on load
- [ ] Update mixer in game loop

**Test:** Character plays idle animation.

---

## Step 6: Input System

**Goal:** Capture keyboard input for movement.

**Tasks:**
- [ ] Create `src/core/Input.ts`
- [ ] Track WASD keys and Space
- [ ] Provide `isMoving()`, `getDirection()`, `jump()` methods
- [ ] Initialize on app start

**Test:** Console log when keys pressed.

---

## Step 7: Animation State Machine

**Goal:** Smooth transitions between animation states.

**Tasks:**
- [ ] Create `src/core/AnimationStateMachine.ts`
- [ ] Define `State` interface with `enter`, `exit`, `update`
- [ ] Create `src/core/states/IdleState.ts`
- [ ] Create `src/core/states/WalkState.ts`
- [ ] Create `src/core/states/JumpState.ts`
- [ ] Implement crossfade transitions (0.2-0.3s)
- [ ] Handle jump as one-shot animation

**Test:** Press WASD to transition idle→walk, release to return to idle.

---

## Step 8: Character Controller

**Goal:** Move character based on input.

**Tasks:**
- [ ] Create `src/core/CharacterController.ts`
- [ ] Calculate movement direction from input
- [ ] Apply velocity to character position
- [ ] Rotate character to face movement direction (slerp)
- [ ] Add walk/run speed differentiation (optional: Sprint with Shift)

**Test:** WASD moves character across terrain, character faces movement direction.

---

## Step 9: Third-Person Camera

**Goal:** Camera that smoothly follows the character.

**Tasks:**
- [ ] Create `src/core/ThirdPersonCamera.ts`
- [ ] Define offset (behind and above character)
- [ ] Define look-ahead point
- [ ] Implement frame-rate independent smoothing
- [ ] Update camera each frame based on character transform

**Test:** Camera follows character smoothly as they move.

---

## Step 10: Camera-Relative Movement

**Goal:** WASD moves relative to camera view, not world axes.

**Tasks:**
- [ ] Get camera forward/right vectors (y=0, normalized)
- [ ] Transform input direction to world space
- [ ] Update CharacterController to use camera-relative movement

**Test:** W always moves "forward" from camera's perspective.

---

## Step 11: Grass Blade Geometry

**Goal:** Create a single grass blade mesh template.

**Tasks:**
- [ ] Create `src/grass/GrassGeometry.ts`
- [ ] Build tapered quad strip (4 segments)
- [ ] Generate UVs (v=0 at base, v=1 at tip)
- [ ] Compute normals

**Test:** Render single grass blade in scene.

---

## Step 12: Grass Instance Data (Compute Shader)

**Goal:** Generate positions for thousands of grass blades.

**Tasks:**
- [ ] Create `src/grass/GrassCompute.ts`
- [ ] Create `StorageBufferAttribute` for instance data (x, z, rotation, height)
- [ ] Write TSL compute shader to populate grid with jitter
- [ ] Run compute shader once on init

**Test:** Console log or visualize instance count.

---

## Step 13: Grass Instanced Mesh

**Goal:** Render many grass blades efficiently.

**Tasks:**
- [ ] Create `src/grass/GrassMesh.ts`
- [ ] Use `InstancedMesh` with blade geometry
- [ ] Create `MeshBasicNodeMaterial` (or `MeshStandardNodeMaterial`)
- [ ] Apply base-to-tip color gradient

**Test:** See field of static grass blades.

---

## Step 14: Grass Vertex Shader (Wind)

**Goal:** Animate grass with wind effect.

**Tasks:**
- [ ] Create `src/grass/GrassVertex.ts`
- [ ] Read instance data from storage buffer
- [ ] Apply per-instance rotation
- [ ] Apply per-instance height scale
- [ ] Add wind displacement (sin wave + time)
- [ ] Displacement stronger at tip (quadratic falloff)

**Test:** Grass sways in the wind.

---

## Step 15: Grass System Integration

**Goal:** Bundle grass into a reusable system.

**Tasks:**
- [ ] Create `src/grass/GrassSystem.ts`
- [ ] Combine geometry, compute, mesh creation
- [ ] Expose `init()` and `update()` methods
- [ ] Add to scene in GrassScene component

**Test:** Full grass field rendering with wind.

---

## Step 16: Wind Enhancement (Perlin Noise)

**Goal:** More natural, varied wind patterns.

**Tasks:**
- [ ] Import `mx_perlin_noise_float` from TSL
- [ ] Replace simple sin wave with noise-based wind
- [ ] Add wind direction uniform
- [ ] Tune frequency and amplitude

**Test:** Wind looks more organic and varied.

---

## Step 17: Character-Grass Interaction (Optional)

**Goal:** Grass bends away from character.

**Tasks:**
- [ ] Pass character position as uniform to grass shader
- [ ] Calculate distance from each blade to character
- [ ] Apply push displacement within radius
- [ ] Update uniform each frame

**Test:** Grass parts around character as they walk.

---

## Step 18: Polish & Optimization

**Goal:** Final touches and performance tuning.

**Tasks:**
- [ ] Add ambient + directional lighting
- [ ] Tune grass colors and density
- [ ] Tune camera smoothing
- [ ] Tune animation crossfade durations
- [ ] Profile and optimize if needed (reduce instance count, LOD)
- [ ] Add skybox or background color

**Test:** Looks good and runs at 60fps.

---

## File Structure (Final)

```
src/
├── components/
│   └── GrassScene.tsx
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
│   ├── GrassMesh.ts
│   └── GrassSystem.ts
├── world/
│   └── Terrain.ts
└── App.tsx
```

---

## Notes

- **WebGPU:** Requires `await renderer.init()` before rendering
- **TSL imports:** Use `three/tsl` for shader nodes
- **Compute shaders:** Use `renderer.computeAsync()` to execute
- **Forward vector:** glTF standard is +Z forward, +Y up
- **Start small:** Use 10k grass instances for debugging, scale to 100k+ later
- **Animation IDs:** Will be mapped by clip name from GLB

---

## Progress Tracker

| Step | Status | Notes |
|------|--------|-------|
| 1 | ⬜ | Basic scene |
| 2 | ⬜ | Game loop |
| 3 | ⬜ | Terrain |
| 4 | ⬜ | Character load |
| 5 | ⬜ | Animation mixer |
| 6 | ⬜ | Input system |
| 7 | ⬜ | State machine |
| 8 | ⬜ | Character controller |
| 9 | ⬜ | Third-person camera |
| 10 | ⬜ | Camera-relative movement |
| 11 | ⬜ | Grass geometry |
| 12 | ⬜ | Grass compute |
| 13 | ⬜ | Grass instancing |
| 14 | ⬜ | Grass wind shader |
| 15 | ⬜ | Grass system |
| 16 | ⬜ | Perlin wind |
| 17 | ⬜ | Character interaction |
| 18 | ⬜ | Polish |
