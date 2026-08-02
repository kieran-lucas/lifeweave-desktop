import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDayOfWeek, getLocalTimeZone, parseDate } from "@internationalized/date";
import type { CalendarDayProjection } from "../../ipc/generated/CalendarDayProjection";
import { getMonthProjection } from "../../ipc/commands";
import { CategoryIcon } from "../task/categoryIcons";
import * as styles from "./CalendarScreen.css";

type Props = { selectedDate: string; today: string; onActivateDate: (date: string) => void };

function monthKey(year: number, month: number) { return `${year}-${String(month).padStart(2, "0")}`; }
function formatDuration(minutes: number) { const hours=Math.floor(minutes/60), rest=minutes%60; return hours ? `${hours}h${rest ? ` ${rest}m` : ""}` : `${rest}m`; }

export function CalendarScreen({ selectedDate, today, onActivateDate }: Props) {
  const locale=navigator.language||"en-US", initial=parseDate(selectedDate);
  const [viewMonth,setViewMonth]=useState(initial.set({day:1}));
  const [focusedDate,setFocusedDate]=useState(selectedDate);
  const refs=useRef(new Map<string,HTMLButtonElement>()), client=useQueryClient();
  const query=useQuery({queryKey:["month-projection",viewMonth.year,viewMonth.month,selectedDate,today],queryFn:()=>getMonthProjection(viewMonth.year,viewMonth.month,selectedDate,today),placeholderData:previous=>previous});
  const grid=useMemo(()=>{
    const offset=getDayOfWeek(viewMonth,locale,"mon"), start=viewMonth.subtract({days:offset});
    const count=Math.ceil((offset+viewMonth.calendar.getDaysInMonth(viewMonth))/7)*7;
    return Array.from({length:count},(_,index)=>start.add({days:index}));
  },[viewMonth,locale]);
  const byDate=useMemo(()=>new Map((query.data?.days??[]).map(day=>[day.date,day])),[query.data]);
  const weekday=useMemo(()=>Array.from({length:7},(_,index)=>new Intl.DateTimeFormat(locale,{weekday:"short"}).format(grid[index]!.toDate(getLocalTimeZone()))),[grid,locale]);
  const monthLabel=new Intl.DateTimeFormat(locale,{month:"long",year:"numeric"}).format(viewMonth.toDate(getLocalTimeZone()));

  useEffect(()=>{const previous=viewMonth.subtract({months:1}),next=viewMonth.add({months:1});const timer=window.setTimeout(()=>{void client.prefetchQuery({queryKey:["month-projection",previous.year,previous.month,selectedDate,today],queryFn:()=>getMonthProjection(previous.year,previous.month,selectedDate,today)});void client.prefetchQuery({queryKey:["month-projection",next.year,next.month,selectedDate,today],queryFn:()=>getMonthProjection(next.year,next.month,selectedDate,today)});},0);return()=>window.clearTimeout(timer);},[client,viewMonth,selectedDate,today]);
  useEffect(()=>{if(!grid.some(day=>day.toString()===focusedDate))setFocusedDate(viewMonth.toString());},[grid,focusedDate,viewMonth]);

  const moveFocus=(next:string)=>{const date=parseDate(next);if(date.month!==viewMonth.month||date.year!==viewMonth.year)setViewMonth(date.set({day:1}));setFocusedDate(next);requestAnimationFrame(()=>refs.current.get(next)?.focus());};
  const changeMonth=(delta:number)=>{const next=viewMonth.add({months:delta});setViewMonth(next);const current=parseDate(focusedDate),clamped=next.set({day:Math.min(current.day,next.calendar.getDaysInMonth(next))});setFocusedDate(clamped.toString());requestAnimationFrame(()=>refs.current.get(clamped.toString())?.focus());};
  const onKey=(event:React.KeyboardEvent<HTMLButtonElement>,value:string)=>{const date=parseDate(value);let next:string|undefined;if(event.key==="ArrowLeft")next=date.subtract({days:1}).toString();if(event.key==="ArrowRight")next=date.add({days:1}).toString();if(event.key==="ArrowUp")next=date.subtract({weeks:1}).toString();if(event.key==="ArrowDown")next=date.add({weeks:1}).toString();if(event.key==="Home")next=date.subtract({days:getDayOfWeek(date,locale,"mon")}).toString();if(event.key==="End")next=date.add({days:6-getDayOfWeek(date,locale,"mon")}).toString();if(event.key==="PageUp"){event.preventDefault();changeMonth(-1);return;}if(event.key==="PageDown"){event.preventDefault();changeMonth(1);return;}if(event.key==="Enter"||event.key===" "){event.preventDefault();onActivateDate(value);return;}if(next){event.preventDefault();moveFocus(next);}};

  return <section className={styles.root} aria-labelledby="calendar-heading">
    <header className={styles.header}><div><p className={styles.eyebrow}>Schedule projection · algorithm v{query.data?.algorithm_version??1}</p><h1 id="calendar-heading" tabIndex={-1}>Calendar</h1></div><div className={styles.actions}><button className={styles.actionButton} type="button" aria-label="Previous month" onClick={()=>changeMonth(-1)}>‹</button><strong aria-live="polite">{monthLabel}</strong><button className={styles.actionButton} type="button" aria-label="Next month" onClick={()=>changeMonth(1)}>›</button><button className={styles.actionButton} type="button" onClick={()=>{const date=parseDate(today);setViewMonth(date.set({day:1}));setFocusedDate(today);}}>Today</button></div></header>
    {query.isError&&<p role="alert">Unable to load the calendar projection.</p>}
    {query.isLoading&&<p aria-live="polite">Loading calendar…</p>}
    <div role="grid" aria-label={monthLabel} aria-busy={query.isFetching} className={styles.grid}>
      <div role="row" className={styles.weekdays}>{weekday.map((label,index)=><div role="columnheader" key={`${label}-${index}`}>{label}</div>)}</div>
      {Array.from({length:grid.length/7},(_,week)=><div role="row" className={styles.week} key={week}>{grid.slice(week*7,week*7+7).map(date=>{
        const value=date.toString(),day=byDate.get(value),outside=date.month!==viewMonth.month;
        return <div role="gridcell" aria-selected={value===selectedDate} className={styles.cell} key={value}>
          <button ref={node=>{if(node)refs.current.set(value,node);else refs.current.delete(value);}} type="button" tabIndex={value===focusedDate?0:-1} aria-label={dayLabel(date,day,locale)} aria-current={value===today?"date":undefined} className={styles.cellButton} data-outside={outside||undefined} onFocus={()=>setFocusedDate(value)} onKeyDown={event=>onKey(event,value)} onClick={()=>onActivateDate(value)}>
            <span className={styles.dayNumber}>{date.day}</span>{day&&day.task_count>0&&<DaySummary day={day}/>}
          </button>
        </div>;
      })}</div>)}
    </div>
  </section>;
}

function DaySummary({day}:{day:CalendarDayProjection}) { return <div className={styles.summary}>
  <span>{day.task_count} {day.task_count===1?"task":"tasks"} · {formatDuration(day.scheduled_minutes)}</span>
  <span className={styles.icons}>{day.category_icon_keys.map((key,index)=><CategoryIcon key={`${key}-${index}`} iconKey={key} label={`Scheduled category ${index+1}`}/>)}{day.extra_category_count>0&&<span aria-label={`${day.extra_category_count} more categories`}>+{day.extra_category_count}</span>}</span>
  <span className={styles.loads} aria-label={`Period load: morning ${Math.round(day.morning_load_ratio*100)}%, afternoon ${Math.round(day.afternoon_load_ratio*100)}%, evening ${Math.round(day.evening_load_ratio*100)}%`}><progress className={styles.load} max={1} value={day.morning_load_ratio}/><progress className={styles.load} max={1} value={day.afternoon_load_ratio}/><progress className={styles.load} max={1} value={day.evening_load_ratio}/></span>
  {day.has_missed&&<span className={styles.missed} aria-label="Past scheduled tasks are unevaluated">!</span>}
 </div>; }

function dayLabel(date:ReturnType<typeof parseDate>,day:CalendarDayProjection|undefined,locale:string){const label=new Intl.DateTimeFormat(locale,{dateStyle:"full"}).format(date.toDate(getLocalTimeZone()));if(!day||day.task_count===0)return label;return `${label}, ${day.task_count} tasks, ${formatDuration(day.scheduled_minutes)} scheduled${day.has_missed?", unevaluated past tasks":""}`;}
