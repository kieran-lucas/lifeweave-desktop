/*
 * GENERATED FILE — do not edit by hand.
 * Regenerate with:  python scripts/generate_visual_icons.py
 *
 * The Lifeweave icon vocabulary (ADR 0045): a curated 22-icon subset of Fluent System Icons
 * plus the Lifeweave infinity brand mark, vendored as inline geometry.
 *
 * Source:  @fluentui/svg-icons 1.1.334  (npm)
 * License: MIT — Copyright (c) Microsoft Corporation
 *          upstream repository: github.com/microsoft/fluentui-system-icons
 *
 * The attribution deliberately omits the URL scheme: `scripts/verify_no_remote_assets.py` rejects
 * any `https?://` under `frontend/src`, and that gate is more valuable than a clickable comment.
 *
 * **Each path is a separate named export, deliberately.** An earlier version kept them in one
 * `Record<IconName, string>` and let `Icon` look the path up by name. That reads nicely and cannot
 * tree-shake: a dynamic lookup forces every entry into the bundle, so production shipped all
 * 22 icons to render the seven the shell actually uses, and `index.js` went 1,551 bytes over
 * its locked ceiling. Named exports let the bundler drop what no one imports.
 *
 * Predominantly 20px regular weight, themed with `currentColor`. Filled variants appear only where
 * state semantics benefit — a completed task, a raised priority. No colour-icon variants.
 *
 * Every icon is `aria-hidden` and focusable={false}: an icon is never the accessible name. A
 * control that renders only an icon must carry its own `aria-label`.
 */
import type { SVGProps } from "react";

/** weather_sunny_20_regular */
export const iconToday =
  "M10 2c.28 0 .5.22.5.5v1a.5.5 0 0 1-1 0v-1c0-.28.22-.5.5-.5Zm0 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-1a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm7.5-2.5a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1h1ZM10 16c.28 0 .5.22.5.5v1a.5.5 0 0 1-1 0v-1c0-.28.22-.5.5-.5Zm-6.5-5.5a.5.5 0 0 0 0-1H2.46a.5.5 0 0 0 0 1H3.5Zm.65-6.35c.2-.2.5-.2.7 0l1 1a.5.5 0 1 1-.7.7l-1-1a.5.5 0 0 1 0-.7Zm.7 11.7a.5.5 0 0 1-.7-.7l1-1a.5.5 0 0 1 .7.7l-1 1Zm11-11.7a.5.5 0 0 0-.7 0l-1 1a.5.5 0 0 0 .7.7l1-1a.5.5 0 0 0 0-.7Zm-.7 11.7a.5.5 0 0 0 .7-.7l-1-1a.5.5 0 0 0-.7.7l1 1Z";

/** calendar_ltr_20_regular */
export const iconCalendar =
  "M7 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2-2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2-2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm4-5.5A2.5 2.5 0 0 0 14.5 3h-9A2.5 2.5 0 0 0 3 5.5v9A2.5 2.5 0 0 0 5.5 17h9a2.5 2.5 0 0 0 2.5-2.5v-9ZM4 7h12v7.5c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 0 1 4 14.5V7Zm1.5-3h9c.83 0 1.5.67 1.5 1.5V6H4v-.5C4 4.67 4.67 4 5.5 4Z";

/** data_trending_20_regular */
export const iconAnalytics =
  "M2.5 2c.28 0 .5.22.5.5v13c0 .83.67 1.5 1.5 1.5h13a.5.5 0 0 1 0 1h-13A2.5 2.5 0 0 1 2 15.5v-13c0-.28.22-.5.5-.5ZM12 5.5c0-.28.22-.5.5-.5h4c.28 0 .5.22.5.5v4a.5.5 0 0 1-1 0V6.7l-4.65 4.65a.5.5 0 0 1-.7 0L9 9.71l-3.15 3.14a.5.5 0 0 1-.7-.7l3.5-3.5a.5.5 0 0 1 .7 0L11 10.29 15.3 6h-2.8a.5.5 0 0 1-.5-.5Z";

/** target_20_regular */
export const iconPlans =
  "M10 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5 10a5 5 0 1 1 10 0 5 5 0 0 1-10 0Zm5-4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-8 4a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm8-7a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z";

/** leaf_three_20_regular */
export const iconLife =
  "M16 7c0 .34-.03.68-.1 1h.76C17.4 8 18 8.6 18 9.34V13a5 5 0 0 1-8.16 3.87l-.99.98a.5.5 0 0 1-.7-.7l.98-.99a5 5 0 0 1-.79-1.34A5 5 0 0 1 2 10V6.34C2 5.6 2.6 5 3.34 5h3.08A5 5 0 0 1 11 2h3.66C15.4 2 16 2.6 16 3.34V7ZM7.52 5.03a5 5 0 0 1 4.14 3.15A5 5 0 0 1 13 8h1.87A4 4 0 0 0 15 7V3.34a.34.34 0 0 0-.34-.34H11a4 4 0 0 0-3.48 2.03Zm3.03 11.13A4 4 0 0 0 17 13V9.34a.34.34 0 0 0-.34-.34H13a4 4 0 0 0-3.16 6.45l3.3-3.3a.5.5 0 0 1 .71.7l-3.3 3.31ZM8 13c0-.4.05-.79.13-1.16L5.65 9.35a.5.5 0 1 1 .7-.7l2.16 2.15a5.02 5.02 0 0 1 2.22-2.25A4 4 0 0 0 7 6H3.34a.34.34 0 0 0-.34.34V10a4 4 0 0 0 5.07 3.85A5.03 5.03 0 0 1 8 13Z";

/** book_open_20_regular */
export const iconReader =
  "M10 16c-.46.6-1.18 1-2 1H3.5A1.5 1.5 0 0 1 2 15.5v-11C2 3.67 2.67 3 3.5 3H8c.82 0 1.54.4 2 1 .46-.6 1.18-1 2-1h4.5c.83 0 1.5.67 1.5 1.5v11c0 .83-.67 1.5-1.5 1.5H12a2.5 2.5 0 0 1-2-1ZM3 4.5v11c0 .28.22.5.5.5H8c.83 0 1.5-.67 1.5-1.5v-9C9.5 4.67 8.83 4 8 4H3.5a.5.5 0 0 0-.5.5Zm7.5 10c0 .83.67 1.5 1.5 1.5h4.5a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5H12c-.83 0-1.5.67-1.5 1.5v9Z";

/** search_20_regular */
export const iconSearch =
  "M13.73 14.44a6.5 6.5 0 1 1 .7-.7l3.42 3.4a.5.5 0 0 1-.63.77l-.07-.06-3.42-3.41Zm-.71-.71A5.54 5.54 0 0 0 15 9.5a5.5 5.5 0 1 0-1.98 4.23Z";

/** settings_20_regular */
export const iconSettings =
  "M1.91 7.38A8.5 8.5 0 0 1 3.7 4.3a.5.5 0 0 1 .54-.13l1.92.68a1 1 0 0 0 1.32-.76l.36-2a.5.5 0 0 1 .4-.4 8.53 8.53 0 0 1 3.55 0c.2.04.35.2.38.4l.37 2a1 1 0 0 0 1.32.76l1.92-.68a.5.5 0 0 1 .54.13 8.5 8.5 0 0 1 1.78 3.08c.06.2 0 .4-.15.54l-1.56 1.32a1 1 0 0 0 0 1.52l1.56 1.32a.5.5 0 0 1 .15.54 8.5 8.5 0 0 1-1.78 3.08.5.5 0 0 1-.54.13l-1.92-.68a1 1 0 0 0-1.32.76l-.37 2a.5.5 0 0 1-.38.4 8.53 8.53 0 0 1-3.56 0 .5.5 0 0 1-.39-.4l-.36-2a1 1 0 0 0-1.32-.76l-1.92.68a.5.5 0 0 1-.54-.13 8.5 8.5 0 0 1-1.78-3.08.5.5 0 0 1 .15-.54l1.56-1.32a1 1 0 0 0 0-1.52L2.06 7.92a.5.5 0 0 1-.15-.54Zm1.06 0 1.3 1.1a2 2 0 0 1 0 3.04l-1.3 1.1c.3.79.72 1.51 1.25 2.16l1.6-.58a2 2 0 0 1 2.63 1.53l.3 1.67a7.56 7.56 0 0 0 2.5 0l.3-1.67a2 2 0 0 1 2.64-1.53l1.6.58a7.5 7.5 0 0 0 1.24-2.16l-1.3-1.1a2 2 0 0 1 0-3.04l1.3-1.1a7.5 7.5 0 0 0-1.25-2.16l-1.6.58a2 2 0 0 1-2.63-1.53l-.3-1.67a7.55 7.55 0 0 0-2.5 0l-.3 1.67A2 2 0 0 1 5.81 5.8l-1.6-.58a7.5 7.5 0 0 0-1.24 2.16ZM7.5 10a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Zm1 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z";

/** chevron_left_20_regular */
export const iconChevronLeft =
  "M12.35 15.85a.5.5 0 0 1-.7 0L6.16 10.4a.55.55 0 0 1 0-.78l5.49-5.46a.5.5 0 1 1 .7.7L7.2 10l5.16 5.15c.2.2.2.5 0 .7Z";

/** chevron_right_20_regular */
export const iconChevronRight =
  "M7.65 4.15c.2-.2.5-.2.7 0l5.49 5.46c.21.22.21.57 0 .78l-5.49 5.46a.5.5 0 0 1-.7-.7L12.8 10 7.65 4.85a.5.5 0 0 1 0-.7Z";

/** weather_moon_20_regular */
export const iconMoon =
  "M15.5 13.5A6.98 6.98 0 0 1 4 14.39c2.83-1.09 4.56-2.42 5.6-4.4 1.04-2 1.33-4.16.75-6.9A6.98 6.98 0 0 1 15.5 13.5ZM5.45 16.92A7.98 7.98 0 1 0 9.88 2.04a.6.6 0 0 0-.61.73c.69 2.82.43 4.88-.55 6.76-.94 1.78-2.55 3.03-5.55 4.1a.6.6 0 0 0-.3.9 7.95 7.95 0 0 0 2.59 2.39Z";

/** panel_left_20_regular */
export const iconPanelLeft =
  "M2 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V6Zm6.5-2v11H15a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H8.5Zm-1 0H5a2 2 0 0 0-2 2v7c0 1.1.9 2 2 2h2.5V4Z";

/** circle_20_regular */
export const iconCircle =
  "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-8 7a8 8 0 1 1 16 0 8 8 0 0 1-16 0Z";

/** checkmark_circle_20_filled */
export const iconCheckCircle =
  "M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm3.36 5.65a.5.5 0 0 0-.64-.06l-.07.06L9 11.3 7.35 9.65l-.07-.06a.5.5 0 0 0-.7.7l.07.07 2 2 .07.06c.17.11.4.11.56 0l.07-.06 4-4 .07-.08a.5.5 0 0 0-.06-.63Z";

/** flag_20_regular */
export const iconFlag =
  "M5 13h11.5a.5.5 0 0 0 .42-.78L14.1 8l2.82-4.22A.5.5 0 0 0 16.5 3h-12a.5.5 0 0 0-.5.5v14a.5.5 0 0 0 1 0V13Zm0-1V4h10.57l-2.49 3.72a.5.5 0 0 0 0 .56L15.57 12H5Z";

/** flag_20_filled */
export const iconFlagFilled =
  "M5 13h11.5a.5.5 0 0 0 .42-.78L14.1 8l2.82-4.22A.5.5 0 0 0 16.5 3h-12a.5.5 0 0 0-.5.5v14a.5.5 0 0 0 1 0V13Z";

/** document_text_20_regular */
export const iconNote =
  "M6.5 10a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7Zm0 2a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7Zm0 2a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7ZM4 4c0-1.1.9-2 2-2h4.59c.4 0 .78.16 1.06.44l3.91 3.91c.28.28.44.67.44 1.06V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8h-3.5A1.5 1.5 0 0 1 10 6.5V3H6Zm5.5 4h3.3L11 3.2v3.3c0 .28.22.5.5.5Z";

/** info_20_regular */
export const iconDetails =
  "M10.5 8.91a.5.5 0 0 0-1 .09v4.6a.5.5 0 0 0 1-.1V8.91Zm.3-2.16a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0ZM18 10a8 8 0 1 0-16 0 8 8 0 0 0 16 0ZM3 10a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z";

/** task_list_ltr_20_regular */
export const iconSubtasks =
  "M5.85 4.35a.5.5 0 1 0-.7-.7L3.5 5.29l-.65-.64a.5.5 0 1 0-.7.7l1 1c.2.2.5.2.7 0l2-2ZM8.5 5a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9Zm0 5a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9ZM8 15.5c0-.28.22-.5.5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5ZM5.85 9.85a.5.5 0 1 0-.7-.7L3.5 10.79l-.65-.64a.5.5 0 0 0-.7.7l1 1c.2.2.5.2.7 0l2-2Zm0 4.3c.2.2.2.5 0 .7l-2 2a.5.5 0 0 1-.7 0l-1-1a.5.5 0 0 1 .7-.7l.65.64 1.65-1.64c.2-.2.5-.2.7 0Z";

/** link_20_regular */
export const iconLink =
  "M8 6a.5.5 0 0 1 .09 1H6a3 3 0 0 0-.2 6H8a.5.5 0 0 1 .09 1H6a4 4 0 0 1-.22-8H8Zm6 0a4 4 0 0 1 .22 8H12a.5.5 0 0 1-.09-1H14a3 3 0 0 0 .2-6H12a.5.5 0 0 1-.09-1H14ZM6 9.5h8a.5.5 0 0 1 .09 1H6a.5.5 0 0 1-.09-1H14 6Z";

/** more_horizontal_20_regular */
export const iconMore =
  "M6.25 10a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm5 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0ZM15 11.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z";

/** dismiss_20_regular */
export const iconDismiss =
  "m4.09 4.22.06-.07a.5.5 0 0 1 .63-.06l.07.06L10 9.29l5.15-5.14a.5.5 0 0 1 .63-.06l.07.06c.18.17.2.44.06.63l-.06.07L10.71 10l5.14 5.15c.18.17.2.44.06.63l-.06.07a.5.5 0 0 1-.63.06l-.07-.06L10 10.71l-5.15 5.14a.5.5 0 0 1-.63.06l-.07-.06a.5.5 0 0 1-.06-.63l.06-.07L9.29 10 4.15 4.85a.5.5 0 0 1-.06-.63l.06-.07-.06.07Z";

/** Lifeweave infinity mark â€” simple stroke geometry, never a feature glyph or status icon. */
export const iconBrand =
  "M2 10c3-5 5-5 8 0s5 5 8 0M2 10c3 5 5 5 8 0s5-5 8 0";

export function Icon({
  d,
  size = 20,
  ...rest
}: { d: string; size?: number } & Omit<SVGProps<SVGSVGElement>, "d">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      focusable={false}
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}
