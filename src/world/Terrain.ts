import * as THREE from 'three/webgpu'

export function createTerrain(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(200, 200, 100, 100)
  geometry.rotateX(-Math.PI / 2)

  const material = new THREE.MeshStandardNodeMaterial({
    color: 0x3d2817,
    roughness: 0.9,
  })

  return new THREE.Mesh(geometry, material)
}
