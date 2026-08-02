import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { TodayScreen, localToday } from "./TodayScreen";

const commands = vi.hoisted(() => ({ listTasksForDate: vi.fn().mockResolvedValue([{id:"1",local_date:"2026-08-02",start_minute:487,end_minute:833,title:"Focus",description:"Deep work",category_id:"general",priority:"high",created_at:"1",updated_at:"1"}]), listTaskCategories: vi.fn().mockResolvedValue([{id:"general",name:"General",icon_key:"category-general",color_key:"blue"}]), createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn() }));
vi.mock("../../../ipc/commands", () => commands);
const renderToday=()=>render(<QueryClientProvider client={new QueryClient()}><TodayScreen/></QueryClientProvider>);

describe("Today task vertical slice",()=>{
  it("renders all periods and exact minute values",async()=>{renderToday(); expect(await screen.findByText("Focus")).toBeInTheDocument(); expect(screen.getByRole("heading",{name:/Morning/})).toBeInTheDocument(); expect(screen.getByRole("heading",{name:/Afternoon/})).toBeInTheDocument(); expect(screen.getByRole("heading",{name:/Evening/})).toBeInTheDocument(); expect(screen.getByText("08:07–13:53")).toBeInTheDocument();});
  it("opens create dialog with date and minute options",async()=>{renderToday(); fireEvent.click(await screen.findByRole("button",{name:"Create task"})); expect(screen.getByLabelText("Date")).toHaveValue(localToday()); expect(screen.getAllByRole("option",{name:"07"}).length).toBeGreaterThan(0);});
  it("single click selects without opening edit",async()=>{renderToday(); const row=await screen.findByRole("listitem"); fireEvent.click(row); expect(row.className).toContain("selected"); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();});
});
