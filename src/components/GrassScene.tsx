import { useEffect, useRef } from 'react'
import * as THREE from 'three/webgpu'
import { Character } from '../core/Character'
import { GameLoop } from '../core/GameLoop'
import { Input } from '../core/Input'
import { ThirdPersonCamera } from '../core/ThirdPersonCamera'
import { createTerrain } from '../world/Terrain'

export function GrassScene() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new THREE.WebGPURenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87ceeb)

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(10, 20, 10)
    scene.add(directionalLight)

    // Terrain
    const terrain = createTerrain()
    scene.add(terrain)

    // Initialize input
    Input.init()

    // Third-person camera
    const thirdPersonCamera = new ThirdPersonCamera({ camera })

    // Game loop
    const gameLoop = new GameLoop()
    let character: Character | null = null

    // Pointer lock
    const handleClick = () => {
      container.requestPointerLock()
    }
    container.addEventListener('click', handleClick)

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === container) {
        Input.addMouseDelta({ x: e.movementX, y: e.movementY })
      }
    }
    document.addEventListener('mousemove', handleMouseMove)

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Animation loop
    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      gameLoop.tick()
    }

    // Initialize
    const init = async () => {
      await renderer.init()

      // Load character
      character = new Character()
      await character.load({ renderer, camera, scene })
      scene.add(character.model)

      // Set camera target
      thirdPersonCamera.setTarget({ target: character.model })

      // Register update callbacks
      gameLoop.register({
        callback: ({ delta }) => {
          if (character) {
            character.update({ delta })
          }
          thirdPersonCamera.update({ delta })
          renderer.render(scene, camera)
        },
      })

      animate()
    }

    init()

    return () => {
      container.removeEventListener('click', handleClick)
      document.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="w-screen h-screen" />
}
