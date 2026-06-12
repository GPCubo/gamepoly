import { type Ref } from 'vue'
import type { Group } from 'three'
import { useCameraOrbit, CAM_LERP } from './useCameraOrbit'

interface CameraFollowStore {
  isCamFollowActive: boolean
  activePlayerIndex: number
  players: any[]
}

interface CameraFollowState {
  cameraRef: Ref<Group | null>
  controlsRef: Ref<{ instance: any } | null>
  displayPositions: { x: number; y: number; z: number }[]
}

export function useCameraFollow(store: CameraFollowStore, state: CameraFollowState) {
  const { getCameraPosition } = useCameraOrbit()

  function updateCamera(delta: number) {
    const { cameraRef, controlsRef, displayPositions } = state
    if (!cameraRef.value || !controlsRef.value) return

    const camera = cameraRef.value
    const controls = controlsRef.value.instance
    if (!controls || typeof controls.update !== 'function') return

    if (!store.isCamFollowActive) {
      controls.enabled = true
      controls.update()
      return
    }

    controls.enabled = false

    const activeIdx = store.activePlayerIndex
    const activePos = displayPositions[activeIdx]
    if (!activePos) return

    const activeCasilla = store.players[activeIdx]?.position ?? 0

    controls.target.x = activePos.x
    controls.target.y = activePos.y
    controls.target.z = activePos.z

    const camTarget = getCameraPosition(activeCasilla, activePos)

    camera.position.x += (camTarget.x - camera.position.x) * CAM_LERP
    camera.position.y += (camTarget.y - camera.position.y) * CAM_LERP
    camera.position.z += (camTarget.z - camera.position.z) * CAM_LERP

    camera.lookAt(controls.target)
  }

  return {
    updateCamera,
  }
}