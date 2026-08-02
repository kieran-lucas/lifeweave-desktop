import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarScreen } from "./CalendarScreen";
import type { MonthProjection } from "../../ipc/generated/MonthProjection";

const getMonthProjection=vi.hoisted(()=>vi.fn());
vi.mock("../../ipc/commands",()=>({getMonthProjection}));
const emptyDay=(day:number)=>({date:`2026-08-${String(day).padStart(2,"0")}`,is_today:day===2,is_selected:day===3,task_count:0,scheduled_minutes:0,category_icon_keys:[],extra_category_count:0,morning_load_ratio:0,afternoon_load_ratio:0,evening_load_ratio:0,has_missed:false});
const projection:MonthProjection={month:"2026-08",algorithm_version:1,days:Array.from({length:31},(_,index)=>emptyDay(index+1))};
projection.days[2]={...projection.days[2]!,task_count:2,scheduled_minutes:127,category_icon_keys:["category-general","focus","health"],extra_category_count:2,morning_load_ratio:.5,afternoon_load_ratio:.25,evening_load_ratio:1,has_missed:true};
const renderCalendar=(activate=vi.fn())=>render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><CalendarScreen selectedDate="2026-08-03" today="2026-08-02" onActivateDate={activate}/></QueryClientProvider>);

describe("CalendarScreen",()=>{
  beforeEach(()=>getMonthProjection.mockResolvedValue(projection));

  it("renders a seven-column, six-row August grid",async()=>{
    renderCalendar();
    const grid=await screen.findByRole("grid");
    expect(within(grid).getAllByRole("columnheader")).toHaveLength(7);
    expect(within(grid).getAllByRole("row")).toHaveLength(7);
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(42);
  });

  it("renders aggregate details without task titles",async()=>{
    renderCalendar();
    const day=await screen.findByRole("button",{name:/2 tasks, 2h 7m scheduled/});
    expect(within(day).getByText("2 tasks · 2h 7m")).toBeInTheDocument();
    expect(within(day).getByLabelText("2 more categories")).toHaveTextContent("+2");
    expect(within(day).getByLabelText(/Period load/)).toBeInTheDocument();
    expect(within(day).getByLabelText("Past scheduled tasks are unevaluated")).toBeInTheDocument();
    expect(day).not.toHaveTextContent("Secret task title");
  });

  it("keeps today and selected semantics distinct",async()=>{
    renderCalendar();
    const grid=await screen.findByRole("grid");
    const current=within(grid).getByRole("button",{current:"date"});
    const selected=within(grid).getAllByRole("gridcell").find(cell=>cell.getAttribute("aria-selected")==="true");
    expect(selected).toBeDefined();
    expect(selected).not.toContainElement(current);
  });

  it("supports arrow, Home and End roving focus",async()=>{
    renderCalendar();
    const grid=await screen.findByRole("grid");
    const current=within(grid).getAllByRole("button").find(button=>button.tabIndex===0)!;
    current.focus();
    fireEvent.keyDown(current,{key:"ArrowRight"});
    await waitFor(()=>expect(document.activeElement).not.toBe(current));
    const moved=document.activeElement as HTMLElement;
    fireEvent.keyDown(moved,{key:"Home"});
    await waitFor(()=>expect((document.activeElement as HTMLElement).tabIndex).toBe(0));
    fireEvent.keyDown(document.activeElement!,{key:"End"});
    await waitFor(()=>expect((document.activeElement as HTMLElement).tabIndex).toBe(0));
  });

  it("uses PageUp/PageDown and header controls for bounded month queries",async()=>{
    renderCalendar();
    await screen.findByRole("grid");
    fireEvent.click(screen.getByRole("button",{name:"Next month"}));
    await waitFor(()=>expect(getMonthProjection).toHaveBeenCalledWith(2026,9,"2026-08-03","2026-08-02"));
    const focused=screen.getByRole("grid").querySelector<HTMLButtonElement>("button[tabindex='0']")!;
    fireEvent.keyDown(focused,{key:"PageUp"});
    await waitFor(()=>expect(getMonthProjection).toHaveBeenCalledWith(2026,8,"2026-08-03","2026-08-02"));
  });

  it("activates with Enter and never exposes a create action",async()=>{
    const activate=vi.fn();renderCalendar(activate);
    const grid=await screen.findByRole("grid");
    const focused=within(grid).getAllByRole("button").find(button=>button.tabIndex===0)!;
    fireEvent.keyDown(focused,{key:"Enter"});
    expect(activate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button",{name:"Create task"})).not.toBeInTheDocument();
  });
});
