import { getDayOfWeek, getLocalTimeZone, parseDate } from "@internationalized/date";
import { Icon, iconChevronLeft } from "../../design-system/visual/icons";
import * as styles from "./WeekStrip.css";

type Props = { selectedDate: string; today: string; onSelectDate: (date: string) => void };

export function WeekStrip({ selectedDate, today, onSelectDate }: Props) {
  const locale = navigator.language || "en-US";
  const selected = parseDate(selectedDate);
  const first = selected.subtract({ days: getDayOfWeek(selected, locale, "mon") });
  const days = Array.from({ length: 7 }, (_, index) => first.add({ days: index }));
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: "full" });
  return <nav className={styles.root} aria-label="Week navigation">
    <button type="button" className={styles.move} aria-label="Previous week" onClick={() => onSelectDate(selected.subtract({ weeks: 1 }).toString())}><Icon d={iconChevronLeft} size={18} /></button>
    <div className={styles.days}>{days.map(day => {
      const value = day.toString();
      const nativeDate = day.toDate(getLocalTimeZone());
      return <button type="button" className={styles.day} key={value} aria-label={fullDate.format(nativeDate)} aria-current={value === today ? "date" : undefined} aria-pressed={value === selectedDate} onClick={() => onSelectDate(value)}>
        <span>{weekday.format(nativeDate)}</span><strong>{day.day}</strong>{value === today && <small>Today</small>}
      </button>;
    })}</div>
    <button type="button" className={styles.move} aria-label="Next week" onClick={() => onSelectDate(selected.add({ weeks: 1 }).toString())}><Icon className={styles.nextIcon} d={iconChevronLeft} size={18} /></button>
  </nav>;
}
