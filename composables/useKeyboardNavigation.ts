import {
  ref,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  type Ref,
  type ComputedRef,
} from "vue";

export type Direction = "horizontal" | "vertical";

export interface UseKeyboardNavigationOptions {
  direction?: Direction;
  allowBothAxes?: boolean;
  autoFocusIndex?: number;
  autoFocusOn?: Ref<boolean> | ComputedRef<boolean>;
  enabled?: Ref<boolean> | ComputedRef<boolean>;
  loop?: boolean;
}

type MaybeRef<T> = Ref<T> | ComputedRef<T>;

export function useKeyboardNavigation(
  buttonRefs: MaybeRef<Ref<HTMLElement | null>[]>,
  options: UseKeyboardNavigationOptions = {},
) {
  const {
    direction = "horizontal",
    allowBothAxes = false,
    autoFocusIndex = 0,
    autoFocusOn,
    enabled,
    loop = true,
  } = options;

  const focusedIndex = ref(-1);

  function getRefs(): Ref<HTMLElement | null>[] {
    return buttonRefs.value as Ref<HTMLElement | null>[];
  }

  function isEnabled(): boolean {
    if (!enabled) return true;
    return enabled.value;
  }

  function isDisabled(el: HTMLElement): boolean {
    return (
      el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true"
    );
  }

  function findNextEnabled(
    refs: Ref<HTMLElement | null>[],
    from: number,
    delta: 1 | -1,
  ): number {
    let idx = from + delta;
    const len = refs.length;
    let iterations = 0;
    while (iterations < len) {
      if (loop) {
        if (idx < 0) idx = len - 1;
        if (idx >= len) idx = 0;
      } else {
        if (idx < 0 || idx >= len) return -1;
      }
      const el = refs[idx]?.value;
      if (el && !isDisabled(el)) return idx;
      idx += delta;
      iterations++;
    }
    return -1;
  }

  function findCurrentIndex(refs: Ref<HTMLElement | null>[]): number {
    const active = document.activeElement;
    if (!active) return -1;
    for (let i = 0; i < refs.length; i++) {
      if (refs[i].value === active) return i;
    }
    return -1;
  }

  function focusButton(refs: Ref<HTMLElement | null>[], index: number) {
    let target = index;
    if (loop) {
      if (target < 0) target = refs.length - 1;
      if (target >= refs.length) target = 0;
    } else {
      if (target < 0 || target >= refs.length) return;
    }

    const el = refs[target]?.value;
    if (el && !isDisabled(el)) {
      focusedIndex.value = target;
      el.focus();
    } else {
      const next = findNextEnabled(refs, target, 1);
      if (next !== -1) {
        focusedIndex.value = next;
        refs[next].value?.focus();
      }
    }
  }

  function autoFocus() {
    nextTick(() => {
      if (!isEnabled()) return;
      const refs = getRefs();
      if (refs.length === 0) return;
      const startIdx = autoFocusIndex >= 0 ? autoFocusIndex : 0;
      const idx = findNextEnabled(refs, startIdx - 1 < 0 ? 0 : startIdx, 1);
      if (idx !== -1) {
        focusButton(refs, idx);
      }
    });
  }

  function onKeydown(e: KeyboardEvent) {
    if (!isEnabled()) return;

    const refs = getRefs();
    if (refs.length === 0) return;

    const nextKeys = allowBothAxes
      ? ["ArrowRight", "ArrowDown"]
      : [direction === "horizontal" ? "ArrowRight" : "ArrowDown"];
    const prevKeys = allowBothAxes
      ? ["ArrowLeft", "ArrowUp"]
      : [direction === "horizontal" ? "ArrowLeft" : "ArrowUp"];

    const currentFromDom = findCurrentIndex(refs);
    const current =
      currentFromDom >= 0
        ? currentFromDom
        : focusedIndex.value >= 0
          ? focusedIndex.value
          : 0;

    if (nextKeys.includes(e.key)) {
      e.preventDefault();
      const next = findNextEnabled(refs, current, 1);
      if (next !== -1) focusButton(refs, next);
    } else if (prevKeys.includes(e.key)) {
      e.preventDefault();
      const prev = findNextEnabled(refs, current, -1);
      if (prev !== -1) focusButton(refs, prev);
    } else if (e.key === "Enter" || e.key === " ") {
      const domIdx = findCurrentIndex(refs);
      const activeIdx = domIdx >= 0 ? domIdx : focusedIndex.value;
      if (activeIdx >= 0 && activeIdx < refs.length) {
        const el = refs[activeIdx]?.value;
        if (el && !isDisabled(el)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          el.click();
        }
      }
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", onKeydown);
    autoFocus();
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", onKeydown);
  });

  if (autoFocusOn) {
    watch(autoFocusOn, (val) => {
      if (val) autoFocus();
    });
  }

  if (enabled) {
    watch(enabled, (val) => {
      if (!val) focusedIndex.value = -1;
    });
  }

  return {
    focusedIndex,
    focusButton,
    autoFocus,
  };
}
