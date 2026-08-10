import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssessmentControl } from "./AssessmentControl";

const states=[
 {id:"completion-none",internal_key:"none",label:"Not done",sort_key:0,visual_token:"none"},
 {id:"completion-below",internal_key:"below",label:"Below expectation",sort_key:1,visual_token:"below"},
 {id:"completion-met",internal_key:"met",label:"Met expectation",sort_key:2,visual_token:"met"},
 {id:"completion-excellent",internal_key:"excellent",label:"Very good",sort_key:3,visual_token:"excellent"},
];
const renderControl=(props:Partial<Parameters<typeof AssessmentControl>[0]>={})=>{
 const select=props.onSelect??vi.fn();
 function Harness(){const [open,setOpen]=useState(false);return <AssessmentControl itemId="task" states={states} evaluation={null} eligible open={open} onOpen={()=>setOpen(true)} onClose={()=>setOpen(false)} onSelect={select} {...props}/>;}
 return {select,...render(<Harness/>)};
};

describe("equal-emphasis assessment fan",()=>{
 it("exposes an empty eligible ring and an unavailable disabled state",()=>{const view=renderControl();expect(screen.getByRole("button",{name:"Assess task. Current state: Unevaluated"})).toBeEnabled();view.unmount();renderControl({eligible:false});expect(screen.getByRole("button",{name:"Assessment unavailable until task ends"})).toBeDisabled();});
 it("keeps assessment loading state accessible",()=>{renderControl({states:[]});expect(screen.getByRole("button",{name:"Assessment options are loading"})).toBeDisabled();});
 it("renders compact visible labels while preserving full accessible names and equal option classes",()=>{renderControl();fireEvent.click(screen.getByRole("button",{name:/Assess task/}));const options=screen.getAllByRole("option");expect(options.map(option=>option.textContent)).toEqual(["None","Low","Met","Great"]);expect(options.map(option=>option.getAttribute("aria-label"))).toEqual(states.map(state=>state.label));expect(options.map(option=>option.getAttribute("data-visual"))).toEqual(["none","below","met","excellent"]);expect(new Set(options.map(option=>option.className)).size).toBe(1);});
 it("uses distinct polar slots rather than a vertical menu",()=>{renderControl();fireEvent.click(screen.getByRole("button",{name:/Assess task/}));expect(screen.getAllByRole("option").map(option=>option.getAttribute("data-option"))).toEqual(["0","1","2","3"]);expect(screen.getByRole("listbox")).toHaveAttribute("data-orientation","down");});
 it("supports roving arrows, Home, End and keyboard selection",async()=>{const {select}=renderControl();fireEvent.click(screen.getByRole("button",{name:/Assess task/}));const options=screen.getAllByRole("option");await waitFor(()=>expect(options[0]).toHaveFocus());fireEvent.keyDown(options[0]!,{key:"End"});await waitFor(()=>expect(options[3]).toHaveFocus());fireEvent.keyDown(options[3]!,{key:"Enter"});expect(select).toHaveBeenCalledWith(states[3]);});
 it("distinguishes the active roving option from the saved selection",async()=>{renderControl({evaluation:{state_id:"completion-met",label:"Met expectation",visual_token:"met",evaluated_at:"2026-08-09T00:00:00Z",operation_id:"operation"}});fireEvent.click(screen.getByRole("button",{name:/Assess task/}));const options=screen.getAllByRole("option");await waitFor(()=>expect(options[2]).toHaveAttribute("data-active","true"));expect(options[2]).toHaveAttribute("aria-selected","true");fireEvent.keyDown(options[2]!,{key:"ArrowRight"});await waitFor(()=>expect(options[3]).toHaveAttribute("data-active","true"));expect(options[3]).toHaveAttribute("aria-selected","false");expect(options[2]).toHaveAttribute("aria-selected","true");});
 it("Escape closes and restores trigger focus",async()=>{renderControl();const trigger=screen.getByRole("button",{name:/Assess task/});fireEvent.click(trigger);const option=screen.getAllByRole("option")[0]!;await waitFor(()=>expect(option).toHaveFocus());fireEvent.keyDown(option,{key:"Escape"});await waitFor(()=>expect(trigger).toHaveFocus());expect(screen.queryByRole("listbox")).not.toBeInTheDocument();});
 it("outside pointer closes without selecting",()=>{const {select}=renderControl();fireEvent.click(screen.getByRole("button",{name:/Assess task/}));fireEvent.pointerDown(document.body);expect(screen.queryByRole("listbox")).not.toBeInTheDocument();expect(select).not.toHaveBeenCalled();});
 it("uses compact collision fallback inside a narrow viewport",()=>{const width=window.innerWidth;Object.defineProperty(window,"innerWidth",{configurable:true,value:260});renderControl();fireEvent.click(screen.getByRole("button",{name:/Assess task/}));const fan=screen.getByRole("listbox");expect(fan).toHaveAttribute("data-compact","true");expect(Number.parseFloat(fan.style.left)).toBeGreaterThanOrEqual(12);Object.defineProperty(window,"innerWidth",{configurable:true,value:width});});
 it("remains operable when reduced motion is requested",()=>{const original=window.matchMedia;window.matchMedia=vi.fn().mockReturnValue({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()});const {select}=renderControl();fireEvent.click(screen.getByRole("button",{name:/Assess task/}));fireEvent.click(screen.getByRole("option",{name:"Met expectation"}));expect(select).toHaveBeenCalledWith(states[2]);window.matchMedia=original;});
});
