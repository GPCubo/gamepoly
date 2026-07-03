<template>
  <header class="game-header">
    <div class="game-header-left">
      <button
        v-if="backTo"
        class="game-header-back"
        @click="navigateTo(backTo)"
      >
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <svg class="game-header-logo" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="24" cy="24" r="24" fill="#00f59b" />
        <rect x="14" y="14" width="20" height="20" rx="4.5" stroke="#0b1118" stroke-width="2.25" stroke-linejoin="round" />
        <circle cx="20" cy="20" r="1.9" fill="#0b1118" />
        <circle cx="28" cy="20" r="1.9" fill="#0b1118" />
        <circle cx="24" cy="24" r="1.9" fill="#0b1118" />
        <circle cx="20" cy="28" r="1.9" fill="#0b1118" />
        <circle cx="28" cy="28" r="1.9" fill="#0b1118" />
      </svg>
      <span class="game-header-brand">{{ brand }}</span>
      <span v-if="badge" class="game-header-badge">{{ badge }}</span>
    </div>

    <div class="game-header-actions">
      <slot name="actions" />
      <LanguageSwitcher />
      <span v-if="version" class="game-header-version">{{ version }}</span>
    </div>
  </header>
  <div class="game-header-spacer" aria-hidden="true" />
</template>

<script setup lang="ts">
import LanguageSwitcher from "~/components/LanguageSwitcher.vue";

withDefaults(
  defineProps<{
    brand?: string;
    badge?: string;
    version?: string;
    backTo?: string;
  }>(),
  {
    brand: "GamePoly",
    badge: "",
    version: "",
    backTo: "",
  },
);
</script>

<style scoped>
.game-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 61px;
  padding: 12px 24px;
  border-bottom: 1px solid rgba(132, 149, 136, 0.08);
  background:
    linear-gradient(180deg, rgba(17, 19, 28, 0.52), rgba(17, 19, 28, 0.24)),
    rgba(17, 19, 28, 0.16);
  backdrop-filter: blur(18px) saturate(1.18);
  -webkit-backdrop-filter: blur(18px) saturate(1.18);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.18);
}

.game-header-spacer {
  flex-shrink: 0;
  height: 61px;
}

.game-header-left,
.game-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.game-header-logo {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.game-header-brand {
  color: #e1e1ef;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.game-header-back {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.62);
  background: transparent;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
}

.game-header-back:hover {
  border-color: rgba(0, 245, 155, 0.24);
  color: #e1e1ef;
  background: rgba(255, 255, 255, 0.08);
}

.game-header-badge,
.game-header-version {
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  border-radius: 6px;
  text-transform: uppercase;
}

.game-header-badge {
  padding: 3px 8px;
  color: #00e38f;
  background: rgba(0, 245, 155, 0.12);
  border: 1px solid rgba(0, 245, 155, 0.22);
}

.game-header-version {
  padding: 4px 10px;
  color: rgba(132, 149, 136, 0.58);
  background: rgba(25, 27, 36, 0.6);
  border: 1px solid rgba(132, 149, 136, 0.08);
  text-transform: none;
}

@media (max-width: 600px) {
  .game-header {
    min-height: 57px;
    padding: 10px 14px;
  }

  .game-header-spacer {
    height: 57px;
  }

  .game-header-brand {
    font-size: 17px;
  }

  .game-header-logo {
    width: 24px;
    height: 24px;
  }

  .game-header-badge {
    display: none;
  }
}
</style>
