import { watch } from "vue";
import { useBoardStore } from "~/stores/boardStore";
import { useI18n } from "~/composables/useI18n";

// Fetch the board that matches the current locale.
// Watches locale changes to refetch when the user switches language.
export default defineNuxtPlugin(async () => {
  const boardStore = useBoardStore();
  const { locale } = useI18n();

  function slugForLocale(l: string): string {
    return l === "en" ? "board-en" : "board-es";
  }

  try {
    await boardStore.fetchBoard(slugForLocale(locale.value));
  } catch (err) {
    console.error("[board plugin] Failed to load board config:", err);
  }

  watch(locale, async (newLocale) => {
    try {
      await boardStore.fetchBoard(slugForLocale(newLocale));
    } catch (err) {
      console.error("[board plugin] Failed to refetch board on locale change:", err);
    }
  });
});
