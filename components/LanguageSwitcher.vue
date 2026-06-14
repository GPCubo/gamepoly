<template>
  <label class="language-switcher" :title="t('language.label')">
    <span class="material-symbols-outlined" aria-hidden="true">translate</span>
    <select
      :value="locale"
      :aria-label="t('language.label')"
      @change="onChange"
    >
      <option
        v-for="option in availableLocales"
        :key="option.code"
        :value="option.code"
      >
        {{ option.code.toUpperCase() }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/useI18n";
import { isLocaleCode } from "~/locales";

const { availableLocales, locale, setLocale, t } = useI18n();

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (isLocaleCode(value)) setLocale(value);
}
</script>

<style scoped>
.language-switcher {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: rgba(226, 232, 240, 0.78);
  background: rgba(25, 27, 36, 0.62);
}

.language-switcher .material-symbols-outlined {
  font-size: 18px;
}

.language-switcher select {
  border: 0;
  outline: 0;
  color: #e1e1ef;
  background: transparent;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.language-switcher option {
  color: #e1e1ef;
  background: #1d1f29;
}
</style>
