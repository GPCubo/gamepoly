export function useBoardGeometry() {
  // Tus puntos de partida verificados y fijados con precisión 🎯
  const ySuelo = 0;
  const inicioX = 0.1;
  const inicioZ = -0.1;
  const pasoCasilla = 0.4;

  const getCasillaCoordinates = (casillaIndex: number) => {
    // Normalizamos a 40 casillas para soportar múltiples vueltas al tablero
    const indexNormalizado = casillaIndex % 40;

    // Casilla 0: Salida (GO)
    if (indexNormalizado === 0) {
      return { x: inicioX, y: ySuelo, z: inicioZ };
    }

    // LADO 1 (Casillas 1 a 9): Avanza hacia la derecha (Sumamos en X, Z fijo con offset)
    if (indexNormalizado < 10) {
      return {
        x: inicioX + indexNormalizado * pasoCasilla,
        y: ySuelo,
        z: inicioZ + 0.05,
      };
    }

    // LADO 2 (Casillas 10 a 19): Sube por el lateral derecho hacia el fondo (Restamos en Z, X fijo en la esquina derecha)
    if (indexNormalizado < 20) {
      const esquina1X = inicioX + 10 * pasoCasilla;
      return {
        x: esquina1X + 0.1,
        y: ySuelo,
        z: inicioZ - (indexNormalizado - 10) * pasoCasilla,
      };
    }

    // LADO 3 (Casillas 20 a 29): Regresa por el fondo hacia la izquierda (Restamos en X, Z fijo al fondo)
    if (indexNormalizado < 30) {
      const esquina1X = inicioX + 10 * pasoCasilla;
      const esquina2Z = inicioZ - 10 * pasoCasilla;
      return {
        x: esquina1X - (indexNormalizado - 20) * pasoCasilla,
        y: ySuelo,
        z: esquina2Z - 0.1,
      };
    }

    // LADO 4 (Casillas 30 a 39): Baja por el lateral izquierdo de vuelta a la salida (Sumamos en Z para regresar a inicioZ)
    const esquina2Z = inicioZ - 10 * pasoCasilla;
    return {
      x: inicioX - 0.05, // Tu pequeño ajuste para que no se salga del tablero
      y: ySuelo,
      z: esquina2Z + (indexNormalizado - 30) * pasoCasilla,
    };
  };

  return {
    getCasillaCoordinates,
  };
}
