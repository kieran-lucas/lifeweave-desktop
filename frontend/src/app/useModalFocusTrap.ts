import { useEffect, useRef, type RefObject } from "react";

const focusable = ":is(button,input,select,textarea,[tabindex]):not(:disabled,[tabindex='-1'])";

export function useModalFocusTrap({
  container,
  initialFocus,
  onEscape,
  escapeEnabled = true,
  active = true,
  returnFocus,
  returnFocusRef,
}: {
  container: RefObject<HTMLElement | null>;
  initialFocus: RefObject<HTMLElement | null>;
  onEscape: () => void;
  escapeEnabled?: boolean;
  active?: boolean;
  returnFocus?: HTMLElement | null | undefined;
  returnFocusRef?: RefObject<HTMLElement | null> | undefined;
}) {
  const escape = useRef(onEscape);
  const enabled = useRef(escapeEnabled);
  escape.current = onEscape;
  enabled.current = escapeEnabled;

  useEffect(() => {
    if (!active) return;
    initialFocus.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && enabled.current) {
        event.preventDefault();
        escape.current();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        container.current?.querySelectorAll<HTMLElement>("*") ?? [],
      ).filter((element) => element.matches(focusable));
      const first = controls[0];
      const last = controls.at(-1);
      const active = document.activeElement;
      if (event.shiftKey && (active === initialFocus.current || active === first)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      (returnFocusRef?.current ?? returnFocus)?.focus();
    };
  }, [active, container, initialFocus, returnFocus, returnFocusRef]);
}
