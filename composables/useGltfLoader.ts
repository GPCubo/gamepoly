import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

let dracoLoader: DRACOLoader | null = null;

/**
 * Crea un GLTFLoader con soporte Draco. Los modelos de tablero están
 * comprimidos con Draco (~90% menos peso), por lo que cualquier loader
 * que los cargue necesita el DRACOLoader configurado.
 *
 * El decoder se sirve desde /public/draco (decoder.wasm + wrapper).
 */
export function createGltfLoader(): GLTFLoader {
  const loader = new GLTFLoader();
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
  }
  loader.setDRACOLoader(dracoLoader);
  return loader;
}
