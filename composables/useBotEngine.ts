import { useGameStore, type BotDifficulty, type ExchangeProposal } from "~/stores/gameStore";
import { BOARD_TILES, type BoardTile, type TileGroup } from "~/config/boardTilesConfig";

type GameStore = ReturnType<typeof useGameStore>;
type ExchangeSide = "incoming" | "outgoing";

const CASH_RESERVE_AFTER_EXCHANGE = 120;
const BOT_PROPOSAL_CASH_RESERVE = 350;
const DIFFICULT_ACCEPT_MIN_ADVANTAGE = 20;
const DIFFICULT_PROPOSAL_MIN_ADVANTAGE = 70;
const DIFFICULT_RENEGOTIATE_MAX_ROUNDS = 2;
const DIFFICULT_RENEGOTIATE_CLOSE_GAP = 180;
const DIFFICULT_AUCTION_BARGAIN_DISCOUNT = 0.82;
const DIFFICULT_AUCTION_SAFE_CASH_MULTIPLIER = 1.7;
const JAIL_SAFE_CASH_AFTER_BAIL = 180;
const JAIL_DANGER_RENT_RATIO = 0.24;
const JAIL_OPPORTUNITY_SCORE_TO_LEAVE = 0.9;
const JAIL_DANGER_SCORE_TO_STAY = 1.35;

const DICE_TOTAL_WEIGHTS: Record<number, number> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1,
};

function getPropertyGroupTiles(group: TileGroup): BoardTile[] {
  return BOARD_TILES.filter(
    (tile) => tile.type === "property" && tile.group === group,
  );
}

export type BuyDecision = "buy" | "auction" | "skip";
export type JailDecision = "payBail" | "rollForDoubles";
export type ExchangeResponse = "accept" | "reject" | "renegotiate";

export interface BuildAction {
  tileIndex: number;
  action: "house" | "hotel";
}

export interface MortgageAction {
  tileIndex: number;
  action: "mortgage" | "unmortgage";
}

export interface BotEngine {
  decideBuy: (tile: BoardTile, playerCash: number, state: GameStore) => BuyDecision;
  decideAuctionBid: (tile: BoardTile, currentBid: number, playerId: number, state: GameStore) => number;
  decideJailAction: (playerCash: number, state: GameStore) => JailDecision;
  decideBuild: (playerCash: number, state: GameStore) => BuildAction[];
  decideMortgage: (playerCash: number, state: GameStore) => MortgageAction[];
  decideExchangeResponse: (proposal: ExchangeProposal, playerId: number, state: GameStore) => ExchangeResponse;
  decideExchangeCounterProposal: (proposal: ExchangeProposal, playerId: number, state: GameStore) => ExchangeProposal | null;
  decideProposeExchange: (playerId: number, state: GameStore) => ExchangeProposal | null;
}

function countGroupTiles(playerId: number, group: TileGroup, state: GameStore): number {
  const groupTiles = getPropertyGroupTiles(group);
  return groupTiles.filter((t) => state.propertyOwners[t.index] === playerId).length;
}

function ownsFullGroup(playerId: number, group: TileGroup, state: GameStore): boolean {
  const groupTiles = getPropertyGroupTiles(group);
  if (groupTiles.length === 0) return false;
  return groupTiles.every((t) => state.propertyOwners[t.index] === playerId);
}

function getPlayerProperties(playerId: number, state: GameStore): BoardTile[] {
  return BOARD_TILES.filter((t) => state.propertyOwners[t.index] === playerId && t.price !== undefined);
}

function getPropertyCount(playerId: number, state: GameStore): number {
  return getPlayerProperties(playerId, state).length;
}

function isOwnableTile(tile: BoardTile): boolean {
  return tile.type === "property" || tile.type === "railroad" || tile.type === "utility";
}

function getTile(tileIndex: number): BoardTile | undefined {
  return BOARD_TILES.find((tile) => tile.index === tileIndex);
}

function getOwnableGroupTiles(tile: BoardTile): BoardTile[] {
  if (tile.type === "property") return getPropertyGroupTiles(tile.group);
  if (tile.type === "railroad") return BOARD_TILES.filter((candidate) => candidate.type === "railroad");
  if (tile.type === "utility") return BOARD_TILES.filter((candidate) => candidate.type === "utility");
  return [];
}

function countOwnedTiles(playerId: number, tiles: BoardTile[], state: GameStore): number {
  return tiles.filter((tile) => state.propertyOwners[tile.index] === playerId).length;
}

function roundMoney(amount: number): number {
  return Math.max(0, Math.round(amount / 10) * 10);
}

function isActivePlayer(playerId: number, state: GameStore): boolean {
  return state.players.some((player) => player.id === playerId) && !state.bankruptPlayers.includes(playerId);
}

function improvementInvestmentValue(tile: BoardTile, state: GameStore): number {
  if (tile.type !== "property") return 0;
  const development = state.getPropertyDevelopment(tile.index);
  if (development.hotel) {
    return state.getHotelCost(tile.index) + (4 * state.getHouseCost(tile.index));
  }
  return development.houses * state.getHouseCost(tile.index);
}

function groupImprovementInvestmentValue(playerId: number, group: TileGroup, state: GameStore): number {
  return getPropertyGroupTiles(group).reduce((total, tile) => {
    if (state.propertyOwners[tile.index] !== playerId) return total;
    return total + improvementInvestmentValue(tile, state);
  }, 0);
}

function tileValueForPlayer(
  tile: BoardTile,
  playerId: number,
  state: GameStore,
  side: ExchangeSide,
): number {
  const base = tile.price ?? 0;
  if (base <= 0) return 0;

  let value = base;
  const groupTiles = getOwnableGroupTiles(tile);
  const groupSize = groupTiles.length;
  const ownsTile = state.propertyOwners[tile.index] === playerId;
  const ownedCount = countOwnedTiles(playerId, groupTiles, state);
  const development = state.getPropertyDevelopment(tile.index);

  if (development.mortgaged) {
    value *= side === "incoming" ? 0.65 : 0.75;
  }

  if (tile.type === "property" && groupSize > 0) {
    const countAfterReceive = ownsTile ? ownedCount : ownedCount + 1;

    if (side === "incoming") {
      if (countAfterReceive === groupSize) {
        const groupPrice = groupTiles.reduce((total, groupTile) => total + (groupTile.price ?? 0), 0);
        value += base * 2.1 + groupPrice * 0.35;
      } else if (countAfterReceive === groupSize - 1) {
        value += base * 0.85;
      } else if (countAfterReceive > ownedCount) {
        value += base * 0.2;
      }
    } else {
      if (ownedCount === groupSize) {
        value += base * 2.5 + groupImprovementInvestmentValue(playerId, tile.group, state) * 1.35;
      } else if (ownedCount === groupSize - 1) {
        value += base * 1.1;
      } else if (ownedCount > 1) {
        value += base * 0.25;
      }
      value += improvementInvestmentValue(tile, state) * 1.25;
    }
  }

  if ((tile.type === "railroad" || tile.type === "utility") && groupSize > 0) {
    const setMultiplier = tile.type === "railroad" ? 0.42 : 0.34;
    const completionMultiplier = tile.type === "railroad" ? 0.5 : 0.45;
    const countAfterReceive = ownsTile ? ownedCount : ownedCount + 1;

    if (side === "incoming") {
      value += base * Math.max(0, countAfterReceive - 1) * setMultiplier;
      if (countAfterReceive === groupSize) value += base * completionMultiplier;
    } else {
      value += base * Math.max(0, ownedCount - 1) * setMultiplier;
      if (ownedCount === groupSize) value += base * completionMultiplier;
    }
  }

  return value;
}

function opponentCompletionPenalty(tile: BoardTile, opponentId: number, state: GameStore): number {
  if (!isActivePlayer(opponentId, state)) return 0;

  const groupTiles = getOwnableGroupTiles(tile);
  if (groupTiles.length <= 1) return 0;
  if (state.propertyOwners[tile.index] === opponentId) return 0;

  const ownedByOpponent = countOwnedTiles(opponentId, groupTiles, state);
  const price = tile.price ?? 0;

  if (ownedByOpponent === groupTiles.length - 1) {
    return tile.type === "property" ? price * 1.35 : price * 0.45;
  }
  if (tile.type === "property" && ownedByOpponent === groupTiles.length - 2) {
    return price * 0.3;
  }
  return 0;
}

function evaluateExchangeForPlayer(
  proposal: ExchangeProposal,
  playerId: number,
  state: GameStore,
) {
  const isRecipient = proposal.toPlayerId === playerId;
  const isSender = proposal.fromPlayerId === playerId;
  const player = state.players.find((candidate) => candidate.id === playerId);

  if (!player || (!isRecipient && !isSender)) {
    return {
      incomingValue: 0,
      outgoingValue: Number.POSITIVE_INFINITY,
      advantage: Number.NEGATIVE_INFINITY,
      advantageRatio: Number.NEGATIVE_INFINITY,
      cashAfter: Number.NEGATIVE_INFINITY,
    };
  }

  const incomingProperties = isRecipient ? proposal.offerProperties : proposal.requestProperties;
  const outgoingProperties = isRecipient ? proposal.requestProperties : proposal.offerProperties;
  const incomingMoney = isRecipient ? proposal.offerMoney : proposal.requestMoney;
  const outgoingMoney = isRecipient ? proposal.requestMoney : proposal.offerMoney;
  const opponentId = isRecipient ? proposal.fromPlayerId : proposal.toPlayerId;

  let incomingValue = incomingMoney;
  let outgoingValue = outgoingMoney;

  for (const tileIndex of incomingProperties) {
    const tile = getTile(tileIndex);
    if (!tile) continue;
    incomingValue += tileValueForPlayer(tile, playerId, state, "incoming");
  }

  for (const tileIndex of outgoingProperties) {
    const tile = getTile(tileIndex);
    if (!tile) continue;
    outgoingValue += tileValueForPlayer(tile, playerId, state, "outgoing");
    outgoingValue += opponentCompletionPenalty(tile, opponentId, state);
  }

  const cashAfter = player.cash + incomingMoney - outgoingMoney;
  if (outgoingMoney > player.cash) {
    outgoingValue += 100_000;
  } else if (cashAfter < 0) {
    outgoingValue += Math.abs(cashAfter) * 1_000;
  } else if (cashAfter < CASH_RESERVE_AFTER_EXCHANGE) {
    outgoingValue += (CASH_RESERVE_AFTER_EXCHANGE - cashAfter) * 1.4;
  }

  const advantage = incomingValue - outgoingValue;
  const advantageRatio = advantage / Math.max(1, outgoingValue);

  return {
    incomingValue,
    outgoingValue,
    advantage,
    advantageRatio,
    cashAfter,
  };
}

function canOfferTileSafely(tile: BoardTile, playerId: number, targetGroup: TileGroup, state: GameStore): boolean {
  if (tile.group === targetGroup) return false;

  if (tile.type === "property") {
    const groupTiles = getPropertyGroupTiles(tile.group);
    const ownedCount = countGroupTiles(playerId, tile.group, state);
    if (ownedCount >= groupTiles.length - 1) return false;
    if (ownsFullGroup(playerId, tile.group, state)) return false;
    if (groupImprovementInvestmentValue(playerId, tile.group, state) > 0) return false;
  }

  return true;
}

function proposalIsWorthMaking(proposal: ExchangeProposal, playerId: number, state: GameStore): boolean {
  const evaluation = evaluateExchangeForPlayer(proposal, playerId, state);
  const minimumAdvantage = Math.max(
    DIFFICULT_PROPOSAL_MIN_ADVANTAGE,
    evaluation.outgoingValue * 0.12,
  );
  return evaluation.advantage >= minimumAdvantage;
}

function shouldDifficultForceBargainAuction(
  tile: BoardTile,
  playerId: number,
  playerCash: number,
  state: GameStore,
): boolean {
  const price = tile.price ?? 0;
  if (price <= 0) return false;
  if (playerCash < price * DIFFICULT_AUCTION_SAFE_CASH_MULTIPLIER) return false;

  const opponents = state.players.filter(
    (player) => player.id !== playerId && !state.bankruptPlayers.includes(player.id),
  );
  if (opponents.length === 0) return false;

  const strongestOpponentCash = Math.max(...opponents.map((player) => player.cash));
  const expectedWinningBid = Math.min(
    price * DIFFICULT_AUCTION_BARGAIN_DISCOUNT,
    strongestOpponentCash + 10,
  );

  if (expectedWinningBid >= price * DIFFICULT_AUCTION_BARGAIN_DISCOUNT) return false;

  if (tile.type === "property" && tile.group) {
    const groupTiles = getPropertyGroupTiles(tile.group);
    const owned = countGroupTiles(playerId, tile.group, state);
    if (owned === groupTiles.length - 1) {
      return strongestOpponentCash < price * 0.72;
    }
  }

  return strongestOpponentCash < price * 0.68;
}

function makeCounterProposal(
  proposal: ExchangeProposal,
  playerId: number,
  state: GameStore,
  targetAdvantage: number,
): ExchangeProposal | null {
  if (proposal.toPlayerId !== playerId) return null;
  if ((proposal.renegotiationCount ?? 0) >= DIFFICULT_RENEGOTIATE_MAX_ROUNDS) return null;

  const player = state.players.find((candidate) => candidate.id === playerId);
  const opponent = state.players.find((candidate) => candidate.id === proposal.fromPlayerId);
  if (!player || !opponent) return null;

  const evaluation = evaluateExchangeForPlayer(proposal, playerId, state);
  const needed = roundMoney(Math.max(40, targetAdvantage - evaluation.advantage + 40));
  let offerMoney = proposal.requestMoney;
  let requestMoney = proposal.offerMoney;

  if (offerMoney > 0) {
    offerMoney = Math.max(0, offerMoney - Math.min(offerMoney, needed));
  } else {
    requestMoney += Math.min(needed, Math.max(0, opponent.cash - requestMoney));
  }

  if (offerMoney > player.cash || requestMoney > opponent.cash) return null;

  const counter: ExchangeProposal = {
    fromPlayerId: playerId,
    toPlayerId: proposal.fromPlayerId,
    offerProperties: [...proposal.requestProperties],
    offerMoney,
    requestProperties: [...proposal.offerProperties],
    requestMoney,
    renegotiationCount: (proposal.renegotiationCount ?? 0) + 1,
  };

  if (
    counter.offerProperties.length === 0 &&
    counter.requestProperties.length === 0 &&
    counter.offerMoney === 0 &&
    counter.requestMoney === 0
  ) {
    return null;
  }

  return counter;
}

function jailLandingDangerScore(playerId: number, playerCash: number, state: GameStore): number {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return 0;

  let weightedRent = 0;
  let highDangerHits = 0;

  for (const [totalText, weight] of Object.entries(DICE_TOTAL_WEIGHTS)) {
    const total = Number(totalText);
    const tile = getTile((player.position + total) % 40);
    if (!tile || !isOwnableTile(tile)) continue;

    const ownerId = state.propertyOwners[tile.index];
    if (ownerId === undefined || ownerId === playerId || state.bankruptPlayers.includes(ownerId)) continue;

    const rent = state.calculateRent(tile, ownerId);
    weightedRent += rent * weight;
    if (rent >= Math.max(80, playerCash * JAIL_DANGER_RENT_RATIO)) {
      highDangerHits += weight;
    }
  }

  const expectedRent = weightedRent / 36;
  const expectedRentPressure = expectedRent / Math.max(1, playerCash);
  const highDangerPressure = highDangerHits / 36;

  return expectedRentPressure * 4 + highDangerPressure * 3;
}

function jailBoardOpportunityScore(playerId: number, state: GameStore): number {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return 0;

  let score = 0;

  for (const [totalText, weight] of Object.entries(DICE_TOTAL_WEIGHTS)) {
    const total = Number(totalText);
    const tile = getTile((player.position + total) % 40);
    if (!tile || !isOwnableTile(tile)) continue;

    const ownerId = state.propertyOwners[tile.index];
    if (ownerId !== undefined) continue;

    const price = tile.price ?? 0;
    if (price <= 0 || player.cash < price + state.jailBailCost) continue;

    let tileScore = price / 200;
    if (tile.type === "property") {
      const groupTiles = getPropertyGroupTiles(tile.group);
      const owned = countGroupTiles(playerId, tile.group, state);
      if (owned === groupTiles.length - 1) tileScore += 2.6;
      else if (owned > 0) tileScore += 0.75;
    } else {
      const owned = countOwnedTiles(playerId, getOwnableGroupTiles(tile), state);
      tileScore += owned * 0.45;
    }

    score += tileScore * (weight / 36);
  }

  return score;
}

function difficultJailDecision(playerCash: number, state: GameStore): JailDecision {
  const player = state.activePlayer;
  if (!player) return "rollForDoubles";
  if (playerCash < state.jailBailCost) return "rollForDoubles";

  const cashAfterBail = playerCash - state.jailBailCost;
  if (player.jailTurns >= 2 && cashAfterBail >= 0) return "payBail";

  const dangerScore = jailLandingDangerScore(player.id, playerCash, state);
  const opportunityScore = jailBoardOpportunityScore(player.id, state);
  const ownsMonopoly = getPlayerProperties(player.id, state).some(
    (tile) => tile.type === "property" && ownsFullGroup(player.id, tile.group, state),
  );
  const unownedOwnableCount = BOARD_TILES.filter(
    (tile) => isOwnableTile(tile) && state.propertyOwners[tile.index] === undefined,
  ).length;
  const gameStillHasGoodTargets = unownedOwnableCount >= 6;

  if (cashAfterBail < JAIL_SAFE_CASH_AFTER_BAIL && dangerScore > 0.35) {
    return "rollForDoubles";
  }

  if (dangerScore >= JAIL_DANGER_SCORE_TO_STAY && opportunityScore < JAIL_OPPORTUNITY_SCORE_TO_LEAVE) {
    return "rollForDoubles";
  }

  if (ownsMonopoly && dangerScore > opportunityScore + 0.45) {
    return "rollForDoubles";
  }

  if (gameStillHasGoodTargets && opportunityScore >= JAIL_OPPORTUNITY_SCORE_TO_LEAVE) {
    return "payBail";
  }

  if (cashAfterBail >= 450 && dangerScore < 0.8) {
    return "payBail";
  }

  return dangerScore > opportunityScore ? "rollForDoubles" : "payBail";
}

const regularEngine: BotEngine = {
  decideBuy(tile, playerCash, state) {
    const price = tile.price ?? 0;
    if (playerCash <= price * 1.5) {
      return state.canSkipBuy ? "skip" : "auction";
    }
    if (playerCash > price) {
      return "buy";
    }
    return state.canSkipBuy ? "skip" : "auction";
  },

  decideAuctionBid(tile, currentBid, playerId, state) {
    const price = tile.price ?? 0;
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return 0;
    if (currentBid >= price) return 0;
    const maxBid = Math.min(price, player.cash * 0.6);
    if (maxBid <= currentBid) return 0;
    const jitter = Math.random() * 0.2 - 0.1;
    const bidTarget = currentBid + 10 + Math.round(jitter * price);
    if (bidTarget > maxBid) return 0;
    return Math.ceil(bidTarget / 10) * 10;
  },

  decideJailAction(playerCash) {
    if (playerCash > 150) return "payBail";
    return "rollForDoubles";
  },

  decideBuild(playerCash, state) {
    const actions: BuildAction[] = [];
    const playerId = state.activePlayerIndex;
    const properties = getPlayerProperties(playerId, state);
    for (const tile of properties) {
      if (tile.type !== "property") continue;
      if (!ownsFullGroup(playerId, tile.group, state)) continue;
      const dev = state.getPropertyDevelopment(tile.index);
      if (dev.mortgaged || dev.hotel || dev.houses >= 4) continue;
      const cost = state.getHouseCost(tile.index);
      if (playerCash > cost * 3) {
        if (state.canBuildHouse(tile.index, playerId)) {
          actions.push({ tileIndex: tile.index, action: "house" });
          playerCash -= cost;
        }
      }
    }
    return actions;
  },

  decideMortgage(playerCash) {
    if (playerCash >= 200) return [];
    const actions: MortgageAction[] = [];
    return actions;
  },

  decideExchangeResponse(proposal, playerId, state) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player || proposal.requestMoney > player.cash) return "reject";

    const netPropertiesGain = proposal.offerProperties.length - proposal.requestProperties.length;
    const netMoneyGain = proposal.offerMoney - proposal.requestMoney;
    if (netPropertiesGain > 0 || netMoneyGain > 0) {
      return Math.random() > 0.5 ? "accept" : "reject";
    }
    return "reject";
  },

  decideExchangeCounterProposal() {
    return null;
  },

  decideProposeExchange() {
    return null;
  },
};

const difficultEngine: BotEngine = {
  decideBuy(tile, playerCash, state) {
    const price = tile.price ?? 0;
    const playerId = state.activePlayer?.id ?? state.activePlayerIndex;
    if (playerCash < price * 1.2) {
      return state.canSkipBuy ? "skip" : "auction";
    }
    if (tile.type === "property" && tile.group) {
      const group = tile.group as TileGroup;
      const owned = countGroupTiles(playerId, group, state);
      const groupTiles = getPropertyGroupTiles(group);
      if (owned === groupTiles.length - 1 && !state.propertyOwners[tile.index]) {
        if (shouldDifficultForceBargainAuction(tile, playerId, playerCash, state)) {
          return "auction";
        }
        return "buy";
      }
    }
    if (shouldDifficultForceBargainAuction(tile, playerId, playerCash, state)) {
      return "auction";
    }
    if (playerCash > price * 1.5) {
      return "buy";
    }
    return "buy";
  },

  decideAuctionBid(tile, currentBid, playerId, state) {
    const price = tile.price ?? 0;
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return 0;
    let maxBid = player.cash * 0.6;
    if (tile.type === "property" && tile.group) {
      const group = tile.group as TileGroup;
      const owned = countGroupTiles(playerId, group, state);
      const groupTiles = getPropertyGroupTiles(group);
      if (owned === groupTiles.length - 1) {
        maxBid = player.cash * 0.8;
      }
    }
    if (maxBid <= currentBid) return 0;
    if (currentBid >= price * 1.5) return 0;
    const increment = 10;
    return Math.min(Math.ceil((currentBid + increment) / 10) * 10, Math.floor(maxBid));
  },

  decideJailAction(playerCash, state) {
    return difficultJailDecision(playerCash, state);
  },

  decideBuild(playerCash, state) {
    const actions: BuildAction[] = [];
    const playerId = state.activePlayerIndex;
    const properties = getPlayerProperties(playerId, state);
    const buildableGroups = new Set<TileGroup>();
    for (const tile of properties) {
      if (tile.type === "property" && ownsFullGroup(playerId, tile.group, state)) {
        buildableGroups.add(tile.group);
      }
    }
    for (const group of buildableGroups) {
      const groupTiles = getPropertyGroupTiles(group);
      const sorted = [...groupTiles].sort((a, b) => {
        const priceDiff = (b.price ?? 0) - (a.price ?? 0);
        return priceDiff;
      });
      for (const tile of sorted) {
        const dev = state.getPropertyDevelopment(tile.index);
        if (dev.mortgaged) continue;
        if (dev.hotel) continue;
        if (dev.houses >= 4) {
          const cost = state.getHotelCost(tile.index);
          if (playerCash > cost * 1.2 && state.canBuildHotel(tile.index, playerId)) {
            actions.push({ tileIndex: tile.index, action: "hotel" });
            playerCash -= cost;
          }
        } else {
          const cost = state.getHouseCost(tile.index);
          if (playerCash > cost * 1.2 && state.canBuildHouse(tile.index, playerId)) {
            actions.push({ tileIndex: tile.index, action: "house" });
            playerCash -= cost;
          }
        }
      }
    }
    return actions.slice(0, 3);
  },

  decideMortgage(playerCash, state) {
    const actions: MortgageAction[] = [];
    const playerId = state.activePlayerIndex;
    if (playerCash >= 300) return actions;
    const properties = getPlayerProperties(playerId, state);
    for (const tile of properties) {
      if (tile.type !== "property") continue;
      if (ownsFullGroup(playerId, tile.group, state)) continue;
      const dev = state.getPropertyDevelopment(tile.index);
      if (!dev.mortgaged) {
        actions.push({ tileIndex: tile.index, action: "mortgage" });
        if (actions.length >= 2) break;
      }
    }
    // Also try to unmortgage properties in complete groups when cash is available
    for (const tile of properties) {
      if (tile.type !== "property") continue;
      const dev = state.getPropertyDevelopment(tile.index);
      const cost = state.getUnmortgageCost(tile.index);
      if (dev.mortgaged && playerCash > cost * 2 && state.canUnmortgageProperty(tile.index, playerId)) {
        actions.push({ tileIndex: tile.index, action: "unmortgage" });
      }
    }
    return actions;
  },

  decideExchangeResponse(proposal, playerId, state) {
    const evaluation = evaluateExchangeForPlayer(proposal, playerId, state);
    const minimumAdvantage = Math.max(
      DIFFICULT_ACCEPT_MIN_ADVANTAGE,
      evaluation.outgoingValue * 0.06,
    );

    if (evaluation.cashAfter < 60 && evaluation.advantage < 150) {
      return "reject";
    }

    if (evaluation.advantage >= minimumAdvantage) return "accept";
    if (
      (proposal.renegotiationCount ?? 0) < DIFFICULT_RENEGOTIATE_MAX_ROUNDS &&
      evaluation.advantage >= minimumAdvantage - DIFFICULT_RENEGOTIATE_CLOSE_GAP &&
      makeCounterProposal(proposal, playerId, state, minimumAdvantage)
    ) {
      return "renegotiate";
    }
    return "reject";
  },

  decideExchangeCounterProposal(proposal, playerId, state) {
    const evaluation = evaluateExchangeForPlayer(proposal, playerId, state);
    const minimumAdvantage = Math.max(
      DIFFICULT_ACCEPT_MIN_ADVANTAGE,
      evaluation.outgoingValue * 0.06,
    );
    return makeCounterProposal(proposal, playerId, state, minimumAdvantage);
  },

  decideProposeExchange(playerId, state) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return null;
    if (player.cash < CASH_RESERVE_AFTER_EXCHANGE) return null;

    const myProperties = getPlayerProperties(playerId, state);
    const candidateProposals: Array<{ proposal: ExchangeProposal; score: number }> = [];
    const oneAwayGroups = new Set<TileGroup>();

    for (const tile of myProperties) {
      if (tile.type !== "property" || !tile.group) continue;
      const groupTiles = getPropertyGroupTiles(tile.group);
      if (countGroupTiles(playerId, tile.group, state) === groupTiles.length - 1) {
        oneAwayGroups.add(tile.group);
      }
    }

    if (oneAwayGroups.size === 0) return null;

    for (const group of oneAwayGroups) {
      const groupTiles = getPropertyGroupTiles(group);
      const missingTile = groupTiles.find((t) => state.propertyOwners[t.index] !== playerId);
      if (!missingTile) continue;

      const owner = state.propertyOwners[missingTile.index];
      if (owner === undefined || owner === playerId || !isActivePlayer(owner, state)) continue;

      const availableCash = Math.max(0, player.cash - BOT_PROPOSAL_CASH_RESERVE);
      const offerable = myProperties
        .filter((tile) => canOfferTileSafely(tile, playerId, group, state))
        .sort(
          (a, b) =>
            tileValueForPlayer(a, playerId, state, "outgoing") -
            tileValueForPlayer(b, playerId, state, "outgoing"),
        )
        .slice(0, 3);

      const cashWithProperty = roundMoney(Math.min(availableCash, (missingTile.price ?? 0) * 0.35));
      for (const offer of offerable) {
        const proposal: ExchangeProposal = {
          fromPlayerId: playerId,
          toPlayerId: owner,
          offerProperties: [offer.index],
          offerMoney: cashWithProperty,
          requestProperties: [missingTile.index],
          requestMoney: 0,
        };
        if (proposalIsWorthMaking(proposal, playerId, state)) {
          candidateProposals.push({
            proposal,
            score: evaluateExchangeForPlayer(proposal, playerId, state).advantage,
          });
        }
      }

      const cashOnlyOffer = roundMoney(Math.min(availableCash, (missingTile.price ?? 0) * 1.25));
      if (cashOnlyOffer >= 50) {
        const proposal: ExchangeProposal = {
          fromPlayerId: playerId,
          toPlayerId: owner,
          offerProperties: [],
          offerMoney: cashOnlyOffer,
          requestProperties: [missingTile.index],
          requestMoney: 0,
        };
        if (proposalIsWorthMaking(proposal, playerId, state)) {
          candidateProposals.push({
            proposal,
            score: evaluateExchangeForPlayer(proposal, playerId, state).advantage,
          });
        }
      }

      const lowValueOffer = offerable[0];
      if (lowValueOffer && cashWithProperty === 0) {
        const proposal: ExchangeProposal = {
          fromPlayerId: playerId,
          toPlayerId: owner,
          offerProperties: [lowValueOffer.index],
          offerMoney: 0,
          requestProperties: [missingTile.index],
          requestMoney: 0,
        };
        if (proposalIsWorthMaking(proposal, playerId, state)) {
          candidateProposals.push({
            proposal,
            score: evaluateExchangeForPlayer(proposal, playerId, state).advantage,
          });
        }
      }
    }

    candidateProposals.sort((a, b) => b.score - a.score);
    return candidateProposals[0]?.proposal ?? null;
  },
};

export function getBotEngine(difficulty: BotDifficulty): BotEngine {
  return difficulty === "difficult" ? difficultEngine : regularEngine;
}
