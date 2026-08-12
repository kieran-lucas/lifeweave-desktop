import { Icon, iconChevronLeft } from "../../design-system/visual/icons";
import { addCalendarDays, calendarDateToDate, mondayWeekdayIndex } from "./date";
import * as styles from "./WeekStrip.css";

type Props = { selectedDate: string; today: string; onSelectDate: (date: string) => void };

export function WeekStrip({ selectedDate, today, onSelectDate }: Props) {
  const locale = navigator.language || "en-US";
  const first = addCalendarDays(selectedDate, -mondayWeekdayIndex(selectedDate));
  const days = Array.from({ length: 7 }, (_, index) => addCalendarDays(first, index));
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" });
  return <nav className={styles.root} aria-label="Week navigation">
    <button type="button" className={styles.move} aria-label="Previous week" onClick={() => onSelectDate(addCalendarDays(selectedDate, -7))}><Icon d={iconChevronLeft} size={18} /></button>
    <div className={styles.days}>{days.map(value => {
      const nativeDate = calendarDateToDate(value);
      return <button type="button" className={styles.day} key={value} aria-label={fullDate.format(nativeDate)} aria-current={value === today ? "date" : undefined} aria-pressed={value === selectedDate} onClick={() => onSelectDate(value)}>
        <span>{weekday.format(nativeDate)}</span><strong>{nativeDate.getUTCDate()}</strong>{value === today && <small className={styles.todayLabel}>Today</small>}
      </button>;
    })}</div>
    <button type="button" className={styles.move} aria-label="Next week" onClick={() => onSelectDate(addCalendarDays(selectedDate, 7))}><Icon className={styles.nextIcon} d={iconChevronLeft} size={18} /></button>
  </nav>;
}
