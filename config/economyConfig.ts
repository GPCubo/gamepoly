// ─────────────────────────────────────────────────────────────────────────
// Modelo economico centralizado (SPEC-004)
//   Costo de casa/hotel, alquiler escalado, hipoteca y deshipoteca.
//   PRICE_MIN/MAX corresponden al tablero canónico español (60-400).
//   Si se agregan tableros con rangos distintos, revisar estos valores.
// ─────────────────────────────────────────────────────────────────────────

// Price range of the canonical Spanish board (Ronda de Arrieta 60 → Paseo del Arte 400).
export const PRICE_MIN = 60;
export const PRICE_MAX = 400;

// Rango de costo de construir una casa.
export const HOUSE_COST_MIN = 50;
export const HOUSE_COST_MAX = 200;

// El hotel se deriva del costo de casa.
export const HOTEL_COST_MULTIPLIER = 4;

// Multiplicadores de alquiler sobre el alquiler base (10% del precio).
// Indices 0..4 = numero de casas. Crecimiento aproximadamente exponencial.
export const HOUSE_RENT_MULTIPLIERS = [1, 5, 12, 25, 40];
export const HOTEL_RENT_MULTIPLIER = 50;

// Hipoteca: liquidez al hipotecar e interes al levantarla.
export const MORTGAGE_RATE = 0.5;
export const UNMORTGAGE_INTEREST = 0.1;

export function roundToStep(value: number, step = 10): number {
  return Math.round(value / step) * step;
}

function priceRatio(price: number): number {
  if (PRICE_MAX === PRICE_MIN) return 0;
  return Math.min(1, Math.max(0, (price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)));
}

export function houseCostForPrice(price: number): number {
  return roundToStep(
    HOUSE_COST_MIN + priceRatio(price) * (HOUSE_COST_MAX - HOUSE_COST_MIN),
  );
}

export function hotelCostForPrice(price: number): number {
  return roundToStep(houseCostForPrice(price) * HOTEL_COST_MULTIPLIER);
}

export function rentBaseForPrice(price: number): number {
  return Math.round(price * 0.1);
}

// Alquiler segun nivel de desarrollo: 0-4 casas o hotel.
export function rentForDevelopment(
  price: number,
  houses: number,
  hasHotel: boolean,
): number {
  const base = rentBaseForPrice(price);
  if (hasHotel) return base * HOTEL_RENT_MULTIPLIER;
  const level = Math.min(HOUSE_RENT_MULTIPLIERS.length - 1, Math.max(0, houses));
  return base * HOUSE_RENT_MULTIPLIERS[level];
}

export function mortgageValueForPrice(price: number): number {
  return roundToStep(price * MORTGAGE_RATE);
}

export function unmortgageCostForPrice(price: number): number {
  return roundToStep(mortgageValueForPrice(price) * (1 + UNMORTGAGE_INTEREST));
}
