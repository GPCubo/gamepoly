<template>
  <Transition name="card">
    <div class="card-overlay" @click.self="resolveCard">
      <div class="card-inner" :class="cardGroup" @keydown.esc.stop.prevent="resolveCard">
        <button class="close-btn" @click="resolveCard" :disabled="closeDisabled" tabindex="-1">
          <span class="material-symbols-outlined">close</span>
        </button>

        <div class="card-band">
          <span class="band-label">{{ cardGroup === "chance" ? t("tile.7.name").toUpperCase() : t("tile.2.name").toUpperCase() }}</span>
          <span class="band-emoji">{{ cardGroup === "chance" ? "🃏" : "📦" }}</span>
        </div>

        <div class="card-body">
          <p class="card-text">{{ translatedCardText }}</p>
          <div class="card-effect">
            <span class="material-symbols-outlined effect-icon">{{ effectIcon }}</span>
            <span class="effect-text">{{ effectDescription }}</span>
          </div>
          <button
            ref="acceptBtnRef"
            class="accept-btn"
            :disabled="closeDisabled"
            :tabindex="closeDisabled ? -1 : 0"
            @click="resolveCard"
          >
            <span class="material-symbols-outlined">check</span>
            {{ closeDisabled ? t("game.action.moving") : t("common.accept") }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from "vue";
import type { GameCard } from "~/types/board";
import { useI18n } from "~/composables/useI18n";

const props = defineProps<{
  card: GameCard;
  closeDisabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "accept"): void;
}>();

const acceptBtnRef = ref<HTMLElement | null>(null);
const { t, cardText, tileName } = useI18n();

function resolveCard() {
  if (props.closeDisabled) return;
  emit("accept");
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  resolveCard();
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  nextTick(() => acceptBtnRef.value?.focus());
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});

const cardGroup = computed(() => props.card.group);
const translatedCardText = computed(() =>
  cardText(
    props.card.id,
    {
      tileName:
        props.card.tileIndex !== undefined
          ? tileName(props.card.tileIndex)
          : "",
    },
    props.card.text,
  ),
);

const effectIcon = computed(() => {
  switch (props.card.action) {
    case "moveTo": return "directions_run";
    case "moveSteps": return "fast_rewind";
    case "collect": return "savings";
    case "pay": return "payments";
    case "payEach": return "group";
    case "goToJail": return "gavel";
    default: return "help";
  }
});

const effectDescription = computed(() => {
  switch (props.card.action) {
    case "moveTo":
      return `${t("game.action.moving")} ${props.card.tileIndex !== undefined ? tileName(props.card.tileIndex) : ""}`;
    case "moveSteps":
      return `${(props.card.amount ?? 0) > 0 ? t("game.action.moving") : t("card.ch06.text")} ${Math.abs(props.card.amount ?? 0)}`;
    case "collect":
      return `+ $${props.card.amount ?? 0}`;
    case "pay":
      return `- $${props.card.amount ?? 0}`;
    case "payEach":
      return `- $${props.card.amount ?? 0} / ${t("common.player")}`;
    case "goToJail":
      return t("tile.30.name");
    default:
      return "";
  }
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=JetBrains+Mono:wght@700&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1");

.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
}

.card-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 210;
  pointer-events: auto;
  background: rgba(17, 19, 28, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.card-inner {
  position: relative;
  width: 320px;
  border-radius: 2rem;
  overflow: hidden;
  background: rgba(29, 31, 41, 0.97);
  border: 1px solid rgba(74, 222, 128, 0.15);
  box-shadow: 0 32px 64px -12px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
  font-family: "Hanken Grotesk", sans-serif;
}

.card-inner.chance {
  border-color: rgba(247, 148, 29, 0.3);
}

.card-inner.community {
  border-color: rgba(58, 166, 224, 0.3);
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.15s;
  padding: 0;
}

.close-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  transform: scale(1.1);
}

.close-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.card-band {
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px 28px 20px;
  position: relative;
}

.chance .card-band {
  background: linear-gradient(135deg, #f7941d 0%, #e6731a 100%);
}

.community .card-band {
  background: linear-gradient(135deg, #3aa6e0 0%, #2d7ab5 100%);
}

.band-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 4px;
}

.band-emoji {
  font-size: 40px;
  margin-top: 4px;
}

.card-body {
  padding: 24px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-text {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #e1e1ef;
  line-height: 1.5;
  text-align: center;
  margin: 0;
}

.card-effect {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(25, 27, 36, 0.8);
  border: 1px solid rgba(74, 222, 128, 0.08);
}

.chance .card-effect {
  border-color: rgba(247, 148, 29, 0.2);
}

.community .card-effect {
  border-color: rgba(58, 166, 224, 0.2);
}

.effect-icon {
  font-size: 22px;
  color: #00e38f;
}

.effect-text {
  font-family: "JetBrains Mono", monospace;
  font-size: 13px;
  font-weight: 700;
  color: rgba(225, 225, 239, 0.8);
}

.accept-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  background: #00f59b;
  color: #003920;
  border: none;
  border-radius: 16px;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 245, 155, 0.2);
  transition: all 0.15s;
}

.accept-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 12px 32px rgba(0, 245, 155, 0.3);
}

.accept-btn:active {
  transform: scale(0.97);
}

.accept-btn:focus-visible {
  outline: 2px solid #00f59b;
  outline-offset: 3px;
  box-shadow: 0 8px 24px rgba(0, 245, 155, 0.2), 0 0 0 4px rgba(0, 245, 155, 0.25);
}

.accept-btn .material-symbols-outlined {
  font-size: 20px;
  font-variation-settings: "FILL" 1, "wght" 400;
}

.card-enter-active {
  animation: cardSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.card-leave-active {
  animation: cardFadeOut 0.2s ease-in both;
}

@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: perspective(900px) rotateY(12deg) rotateX(6deg) scale(0.88) translateY(30px);
  }
  50% {
    opacity: 1;
  }
  to {
    opacity: 1;
    transform: perspective(900px) rotateY(0deg) rotateX(0deg) scale(1) translateY(0);
  }
}

@keyframes cardFadeOut {
  from {
    opacity: 1;
    transform: perspective(900px) rotateY(0deg) rotateX(0deg) scale(1);
  }
  to {
    opacity: 0;
    transform: perspective(900px) rotateY(-6deg) rotateX(-3deg) scale(0.93) translateY(-14px);
  }
}
</style>
