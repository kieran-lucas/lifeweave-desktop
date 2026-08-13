import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import type { TaskCategoryView } from "../../../ipc/generated/TaskCategoryView";
import { CategoryIcon } from "../categoryIcons";
import * as styles from "./TaskCategoryPicker.css";

type CategorySnapshot = Pick<TaskCategoryView, "id" | "name" | "icon_key" | "color_key">;

export function TaskCategoryPicker({
  value,
  categories,
  current,
  loading,
  error,
  onChange,
}: {
  value: string;
  categories: TaskCategoryView[];
  current?: CategorySnapshot | null;
  loading: boolean;
  error: boolean;
  onChange: (value: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const options = useMemo(() => {
    if (!current || categories.some((category) => category.id === current.id)) return categories;
    return [{ ...current, weekly_minimum_minutes: null, weekly_target_minutes: null, goal_revision: 0 }, ...categories];
  }, [categories, current]);
  const selected = options.find((category) => category.id === value) ?? current;
  const selectedIndex = Math.max(0, options.findIndex((category) => category.id === value));

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      setOpen(false);
    };
    const closeEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  const openAndFocus = (index: number) => {
    setOpen(true);
    requestAnimationFrame(() => optionRefs.current[index]?.focus());
  };
  const select = (category: CategorySnapshot) => {
    onChange(category.id);
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const columns = 2;
    const next = event.key === "ArrowRight" ? index + 1
      : event.key === "ArrowLeft" ? index - 1
        : event.key === "ArrowDown" ? index + columns
          : event.key === "ArrowUp" ? index - columns
            : event.key === "Home" ? 0
              : event.key === "End" ? options.length - 1
                : index;
    if (next === index) return;
    event.preventDefault();
    optionRefs.current[Math.min(options.length - 1, Math.max(0, next))]?.focus();
  };

  return <div ref={root} className={styles.root}>
    <span className={styles.label}>Category</span>
    <button
      ref={trigger}
      className={styles.trigger}
      type="button"
      aria-label={`Category, ${selected?.name ?? "General"}`}
      aria-haspopup="listbox"
      aria-expanded={open}
      disabled={loading || error}
      data-color={selected?.color_key ?? "neutral"}
      onClick={() => open ? setOpen(false) : openAndFocus(selectedIndex)}
      onKeyDown={(event) => {
        if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openAndFocus(selectedIndex);
        }
      }}
    >
      <span className={styles.triggerIcon} aria-hidden="true"><CategoryIcon iconKey={selected?.icon_key ?? "category-general"} label={selected?.name ?? "General"} /></span>
      <strong>{loading ? "Loading categories…" : error ? "Categories unavailable" : selected?.name ?? "General"}</strong>
      <span className={styles.chevron} aria-hidden="true" />
    </button>
    {open ? <div className={styles.popover} role="listbox" aria-label="Task category">
      <header><strong>Choose a workstream</strong><span>{options.length} categories</span></header>
      <div className={styles.optionGrid}>
        {options.map((category, index) => <button
          ref={(element) => { optionRefs.current[index] = element; }}
          key={category.id}
          className={styles.option}
          type="button"
          role="option"
          aria-selected={category.id === value}
          data-color={category.color_key}
          onClick={() => select(category)}
          onKeyDown={(event) => navigate(event, index)}
        >
          <span className={styles.optionIcon} aria-hidden="true"><CategoryIcon iconKey={category.icon_key} label={category.name} /></span>
          <span>{category.name}</span>
          <span className={styles.check} aria-hidden="true">✓</span>
        </button>)}
      </div>
    </div> : null}
  </div>;
}
