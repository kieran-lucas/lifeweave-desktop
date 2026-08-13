import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveLifeNode, createLifeNode, getLifeEditProjection, renameLifeNode,
  reparentLifeNode, reorderLifeSibling, restoreLifeNode, setLifeNodeTags, undoLifeOperation,
  updateLifeNodeSummary,
} from "../../ipc/commands";
import type { LifeEditNodeView } from "../../ipc/generated/LifeEditNodeView";
import type { TagSummaryView } from "../../ipc/generated/TagSummaryView";
import * as styles from "./LifeEditWorkspace.css";

// Lazy so branch interchange never enters the startup chunk: LifeEditWorkspace is imported eagerly.
const LifeBranchControls = lazy(() => import("./branch/LifeBranchControls"));
import { TagChipList } from "../tag/TagChipList";
import { TagPicker } from "../tag/TagPicker";
import { invalidateTaskSavedViewReferenceData } from "../task/saved-views/savedViewQueries";
import { invalidateLifeLinkLifecycle } from "./links/lifeLinkQueries";
import { buildLifeTreeLayout, type LayoutPoint } from "./lifeTreeLayout";
import { EmptyState, LoadingRow } from "../../design-system/primitives/States";
import { DecisionDialog } from "../../app/layout/DialogSurface";
import { Icon, iconDetails, iconDismiss, iconLife, iconNote } from "../../design-system/visual/icons";
import { LIFE_ICON_OPTIONS, lifeIconGlyph } from "./lifeIconCatalog";

type Point=LayoutPoint;
const legacyIcons=["life-root","life-branch","life-leaf","life-focus","life-note"];
const themes=["neutral","blue","green","amber","violet"];
const operationId=()=>`life-${crypto.randomUUID()}`;

/** Life Edit geometry is the shared layout's default, so this is a pure re-export with a name. */
export const buildLifeEditLayout=(nodes:LifeEditNodeView[])=>buildLifeTreeLayout(nodes);

function descendantsOf(nodes:LifeEditNodeView[],id:string){const found=new Set<string>();let changed=true;while(changed){changed=false;for(const node of nodes)if(node.parent_id&& (node.parent_id===id||found.has(node.parent_id))&&!found.has(node.id)){found.add(node.id);changed=true;}}return found;}

function Positioner({node,point,selected,menuOpen,onSelect,onAdd,onEdit}:{node:LifeEditNodeView;point:Point;selected:boolean;menuOpen:boolean;onSelect:()=>void;onAdd:()=>void;onEdit:()=>void}){
 const positionRef=useRef<HTMLDivElement|null>(null);
 const glyph=lifeIconGlyph(node.icon_key);
 useEffect(()=>{const el=positionRef.current;if(el){el.style.setProperty("--life-x",`${point.x}px`);el.style.setProperty("--life-y",`${point.y}px`);el.style.setProperty("--life-node-width",`${point.width}px`);}},[point]);
 return <div ref={positionRef} className={styles.positioner} role="treeitem" aria-level={node.depth+1} aria-expanded={node.child_count?true:undefined}>
   <div className={styles.nodeShell}>
    <button className={styles.nodeCard} type="button" draggable={false} onClick={onSelect} aria-pressed={selected} aria-expanded={menuOpen} aria-controls={menuOpen?`life-node-actions-${node.id}`:undefined} data-life-edit-id={node.id}>
      <span className={styles.nodeIcon} aria-hidden="true">{glyph??<Icon d={node.is_leaf?iconNote:iconLife} size={15}/>}</span><span><span className={styles.compactTitle}>{node.title}</span>{(node.is_leaf||node.is_pinned)&&<span className={styles.compactMeta}>{[node.is_leaf?"Leaf":null,node.is_pinned?"Pinned":null].filter(Boolean).join(" · ")}</span>}<TagChipList tags={node.tags} /></span>
    </button>
    {menuOpen&&<div id={`life-node-actions-${node.id}`} className={styles.nodeActions} data-life-node-actions="" data-placement={node.is_leaf?"above":"below"} role="group" aria-label={`Actions for ${node.title}`}>
      <button type="button" className={styles.nodeAction} onClick={onAdd}><span className={styles.nodeActionIcon} aria-hidden="true">+</span><span>Add child</span></button>
      <button type="button" className={styles.nodeAction} onClick={onEdit}><span className={styles.nodeActionIcon} aria-hidden="true"><Icon d={iconDetails} size={13}/></span><span>Edit node</span></button>
    </div>}
   </div>
  </div>;
}

export function LifeEditWorkspace({initialNodeId,onBrowse}:{initialNodeId:string;onBrowse:(id:string)=>void}){
 const client=useQueryClient();const query=useQuery({queryKey:["life","edit"],queryFn:getLifeEditProjection});
 const [selectedId,setSelectedId]=useState<string>();const [menuNodeId,setMenuNodeId]=useState<string>();const [editorOpen,setEditorOpen]=useState(false);const [createOpen,setCreateOpen]=useState(false);const [message,setMessage]=useState("");
 const [title,setTitle]=useState("");const [description,setDescription]=useState("");const [icon,setIcon]=useState("life-branch");const [theme,setTheme]=useState("neutral");const [moveParent,setMoveParent]=useState("");
 const canvasRef=useRef<HTMLDivElement|null>(null);const viewportRef=useRef<HTMLDivElement|null>(null);const initialPositioned=useRef(false);const panSession=useRef<{pointerId:number;x:number;y:number;left:number;top:number}|null>(null);const focusAfter=useRef<string|undefined>(undefined);const menuAfter=useRef<string|undefined>(undefined);const dialogReturnFocus=useRef<HTMLElement|null>(null);
 const projection=query.data;const selected=projection?.nodes.find(node=>node.id===selectedId);const layout=useMemo(()=>buildLifeEditLayout(projection?.nodes??[]),[projection?.nodes]);
 const selectedDescendants=useMemo(()=>selected&&projection?descendantsOf(projection.nodes,selected.id):new Set<string>(),[projection?.nodes,selected?.id]);
 useEffect(()=>{const el=canvasRef.current;if(el){el.style.width=`${layout.width}px`;el.style.height=`${layout.height}px`;}},[layout]);
 useEffect(()=>{if(initialPositioned.current)return;const viewport=viewportRef.current;const point=layout.points.get(initialNodeId);if(!viewport||!point)return;viewport.scrollLeft=Math.max(0,point.x-24);viewport.scrollTop=Math.max(0,point.y-(viewport.clientHeight-point.height)/2);initialPositioned.current=true;},[initialNodeId,layout]);
 useEffect(()=>{if(!selected)return;setSelectedId(selected.id);setTitle(selected.title);setDescription(selected.short_description);setIcon(selected.icon_key);setTheme(selected.theme_variant);setMoveParent(selected.parent_id??"");},[selected?.id,selected?.revision]);
 useEffect(()=>{const id=focusAfter.current;if(!id||!projection?.nodes.some(node=>node.id===id))return;if(menuAfter.current===id){setSelectedId(id);setMenuNodeId(id);menuAfter.current=undefined;}requestAnimationFrame(()=>document.querySelector<HTMLElement>(`[data-life-edit-id="${id}"]`)?.focus({preventScroll:true}));focusAfter.current=undefined;},[projection?.tree_revision]);
 useEffect(()=>{if(!menuNodeId)return;const closeOnOutside=(event:PointerEvent)=>{const target=event.target;if(target instanceof Element&&(target.closest("[data-life-node-actions]")||target.closest("[data-life-edit-id]")))return;setMenuNodeId(undefined);setSelectedId(undefined);};const closeOnEscape=(event:KeyboardEvent)=>{if(event.key!=="Escape")return;event.preventDefault();const id=menuNodeId;setMenuNodeId(undefined);setSelectedId(undefined);requestAnimationFrame(()=>document.querySelector<HTMLElement>(`[data-life-edit-id="${id}"]`)?.focus({preventScroll:true}));};document.addEventListener("pointerdown",closeOnOutside);document.addEventListener("keydown",closeOnEscape);return()=>{document.removeEventListener("pointerdown",closeOnOutside);document.removeEventListener("keydown",closeOnEscape);};},[menuNodeId]);
 const mutation=useMutation({mutationFn:(work:()=>Promise<unknown>)=>work(),onSuccess:async()=>{setMessage("Life tree updated.");await Promise.all([client.invalidateQueries({queryKey:["life"]}),invalidateTaskSavedViewReferenceData(client),invalidateLifeLinkLifecycle(client)]);},onError:(error)=>setMessage(error instanceof Error?error.message:"Life tree update failed; authoritative geometry was restored.")});
 const [tagError,setTagError]=useState<string|null>(null);
 const tagMutation=useMutation({mutationFn:({nodeId,revision,tagIds}:{nodeId:string;revision:number;tagIds:string[]})=>setLifeNodeTags({node_id:nodeId,expected_node_revision:revision,tag_ids:tagIds}),onSuccess:async()=>{setTagError(null);await client.invalidateQueries({queryKey:["life"]});},onError:(e)=>setTagError(e instanceof Error?e.message:"Could not save tags.")});
 const handleTagChange=(node:LifeEditNodeView,next:TagSummaryView[])=>{tagMutation.mutate({nodeId:node.id,revision:node.revision,tagIds:next.map(t=>t.id)});};
 const context=()=>({operation_id:operationId(),expected_tree_revision:projection!.tree_revision});
 const run=(nodeId:string,work:()=>Promise<unknown>)=>{focusAfter.current=nodeId;mutation.mutate(work);};
 const createChild=(value:string)=>{if(!selected)return;const parent=selected.id;setCreateOpen(false);mutation.mutate(async()=>{const created=await createLifeNode({context:context(),parent_id:parent,title:value,short_description:"",icon_key:"life-branch",theme_variant:"neutral"});focusAfter.current=created.node.id;menuAfter.current=created.node.id;return created;});};
 const siblings=(node:LifeEditNodeView)=>projection?.nodes.filter(item=>item.parent_id===node.parent_id).sort((a,b)=>a.sort_key-b.sort_key||a.id.localeCompare(b.id))??[];
 const reorder=(node:LifeEditNodeView,index:number)=>run(node.id,()=>reorderLifeSibling({context:context(),node_id:node.id,new_index:index,expected_node_revision:node.revision}));
 const reparent=(node:LifeEditNodeView,parent:string,index:number)=>run(node.id,()=>reparentLifeNode({context:context(),node_id:node.id,new_parent_id:parent,new_index:index,expected_node_revision:node.revision}));
 const startPan=(event:ReactPointerEvent<HTMLDivElement>)=>{const target=event.target;if(event.button!==0||!(target instanceof Element)||target.closest("button,input,textarea,select,a"))return;const viewport=event.currentTarget;panSession.current={pointerId:event.pointerId,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.dataset.panning="true";viewport.setPointerCapture?.(event.pointerId);event.preventDefault();};
 const movePan=(event:ReactPointerEvent<HTMLDivElement>)=>{const session=panSession.current;if(!session||session.pointerId!==event.pointerId)return;const viewport=event.currentTarget;viewport.scrollLeft=session.left-(event.clientX-session.x);viewport.scrollTop=session.top-(event.clientY-session.y);event.preventDefault();};
 const stopPan=(event:ReactPointerEvent<HTMLDivElement>)=>{const session=panSession.current;if(!session||session.pointerId!==event.pointerId)return;const viewport=event.currentTarget;panSession.current=null;viewport.dataset.panning="false";if(viewport.hasPointerCapture?.(event.pointerId))viewport.releasePointerCapture(event.pointerId);};
 const scrollTree=(event:ReactWheelEvent<HTMLDivElement>)=>{if(event.ctrlKey)return;const viewport=event.currentTarget;const unit=event.deltaMode===1?16:event.deltaMode===2?Math.max(1,viewport.clientHeight):1;const damp=(delta:number)=>Math.sign(delta)*Math.min(42,Math.abs(delta*unit)*.38);const horizontal=event.shiftKey&&event.deltaX===0?event.deltaY:event.deltaX;const vertical=event.shiftKey&&event.deltaX===0?0:event.deltaY;if(horizontal===0&&vertical===0)return;viewport.scrollLeft+=damp(horizontal);viewport.scrollTop+=damp(vertical);event.preventDefault();};
 const panWithKeyboard=(event:ReactKeyboardEvent<HTMLDivElement>)=>{const viewport=event.currentTarget;const step=event.shiftKey?180:80;if(event.key==="ArrowLeft")viewport.scrollLeft-=step;else if(event.key==="ArrowRight")viewport.scrollLeft+=step;else if(event.key==="ArrowUp")viewport.scrollTop-=step;else if(event.key==="ArrowDown")viewport.scrollTop+=step;else if(event.key==="Home"){viewport.scrollLeft=0;viewport.scrollTop=0;}else return;event.preventDefault();};
 if(query.isLoading)return <LoadingRow label="Loading full Life tree…" />;if(query.isError||!projection)return <p role="alert">Life Tree could not load. Browse remains available.</p>;
 return <>
  <span id="life-edit-instructions" className={styles.srOnly}>Node drag and drop is disabled. Open Edit node to use the explicit Move controls.</span><span id="life-pan-instructions" className={styles.srOnly}>Use the mouse wheel or trackpad to scroll the tree at a controlled speed. Shift plus the mouse wheel scrolls horizontally. You can also hold and drag empty tree space, use the arrow keys to pan, or press Home to return to the origin.</span>
  <div className={styles.workspace} data-editor-open={editorOpen?"true":"false"}>
   <div ref={viewportRef} className={styles.canvasViewport} aria-label="Full Life tree editor" aria-describedby="life-pan-instructions" aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home" tabIndex={0} data-life-pan-surface="" data-panning="false" onWheel={scrollTree} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={stopPan} onPointerCancel={stopPan} onLostPointerCapture={stopPan} onKeyDown={panWithKeyboard}>
    <div ref={canvasRef} className={styles.canvas} role="tree" aria-label="Full Life tree editor" aria-describedby="life-edit-instructions">
     <svg className={styles.links} width={layout.width} height={layout.height} aria-hidden="true">{layout.links.map(link=><path key={link.id} d={link.d}/>)}</svg>
     {projection.nodes.map(node=><Positioner key={node.id} node={node} point={layout.points.get(node.id)??{x:0,y:0,width:196,height:62}} selected={node.id===selected?.id} menuOpen={node.id===menuNodeId} onSelect={()=>{if(selectedId===node.id){setSelectedId(undefined);setMenuNodeId(undefined);setEditorOpen(false);return;}setSelectedId(node.id);setMenuNodeId(node.id);setEditorOpen(false);}} onAdd={()=>{setSelectedId(node.id);setMenuNodeId(undefined);dialogReturnFocus.current=document.querySelector<HTMLElement>(`[data-life-edit-id="${node.id}"]`);setCreateOpen(true);}} onEdit={()=>{setSelectedId(node.id);setMenuNodeId(undefined);setEditorOpen(true);}}/>) }
    </div>
   </div>
   {selected&&editorOpen&&<aside className={styles.inspector} aria-label="Life node editor">
    <button type="button" className={styles.closeInspector} aria-label="Close node editor" onClick={()=>{const id=selected.id;setEditorOpen(false);setSelectedId(undefined);setMenuNodeId(undefined);requestAnimationFrame(()=>document.querySelector<HTMLElement>(`[data-life-edit-id="${id}"]`)?.focus({preventScroll:true}));}}><Icon d={iconDismiss} size={14}/></button>
    <h2 className={styles.inspectorTitle}>Edit {selected.title}</h2><p className={styles.instructions}>{selected.depth===0?"Protected root · cannot archive or move":`Depth ${selected.depth} · ${selected.is_leaf?"leaf":"branch"}`}</p>
    <label className={styles.field}>Title<input className={styles.input} value={title} maxLength={120} onChange={event=>setTitle(event.target.value)}/></label>
    <button className={styles.button} disabled={mutation.isPending||title.trim()===selected.title} onClick={()=>run(selected.id,()=>renameLifeNode({context:context(),node_id:selected.id,value:title,expected_node_revision:selected.revision}))}>Save title</button>
    <label className={styles.field}>Short description<textarea className={styles.input} rows={3} maxLength={320} value={description} onChange={event=>setDescription(event.target.value)}/></label>
    <label className={styles.field}>Local icon<select className={styles.input} value={icon} onChange={event=>setIcon(event.target.value)}>{legacyIcons.map(value=><option key={value} value={value}>{value}</option>)}{LIFE_ICON_OPTIONS.map(option=><option key={option.key} value={option.key}>{option.glyph} {option.label}</option>)}</select></label>
    <label className={styles.field}>Theme variant<select className={styles.input} value={theme} onChange={event=>setTheme(event.target.value)}>{themes.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
    <button className={styles.button} disabled={mutation.isPending} onClick={()=>run(selected.id,()=>updateLifeNodeSummary({context:context(),node_id:selected.id,short_description:description,icon_key:icon,theme_variant:theme,expected_node_revision:selected.revision}))}>Save details</button>
    {selected.depth===0?<p className={styles.instructions}>The Life root cannot have tags.</p>:<TagPicker selectedTags={selected.tags} onChange={(next)=>handleTagChange(selected,next)} busy={tagMutation.isPending} error={tagError} allowCreate/>}
    {selected.parent_id&&<><div className={styles.actions}><button className={styles.button} disabled={mutation.isPending||siblings(selected).findIndex(item=>item.id===selected.id)===0} onClick={()=>reorder(selected,siblings(selected).findIndex(item=>item.id===selected.id)-1)}>Move up</button><button className={styles.button} disabled={mutation.isPending||siblings(selected).findIndex(item=>item.id===selected.id)===siblings(selected).length-1} onClick={()=>reorder(selected,siblings(selected).findIndex(item=>item.id===selected.id)+1)}>Move down</button>{projection.nodes.find(node=>node.id===selected.parent_id)?.parent_id&&<button className={styles.button} disabled={mutation.isPending} onClick={()=>{const parent=projection.nodes.find(node=>node.id===selected.parent_id)!;const grand=parent.parent_id!;reparent(selected,grand,projection.nodes.filter(node=>node.parent_id===grand).length);}}>Move to parent level</button>}</div>
    <label className={styles.field}>Move into branch<select className={styles.input} value={moveParent} onChange={event=>setMoveParent(event.target.value)}>{projection.nodes.filter(node=>node.id!==selected.id&&!selectedDescendants.has(node.id)).map(node=><option key={node.id} value={node.id}>{node.title}</option>)}</select></label><button className={styles.button} disabled={mutation.isPending||!moveParent||moveParent===selected.parent_id} onClick={()=>reparent(selected,moveParent,projection.nodes.filter(node=>node.parent_id===moveParent).length)}>Move into selected branch</button>
    <div className={styles.actions}><button className={styles.button} onClick={()=>onBrowse(selected.id)}>Open in Browse</button><button className={styles.destructive} disabled={mutation.isPending} onClick={()=>run(selected.parent_id!,()=>archiveLifeNode({context:context(),node_id:selected.id,expected_node_revision:selected.revision}))}>Archive subtree</button></div></>}
    <Suspense fallback={<LoadingRow label="Loading Life interchange…" />}><LifeBranchControls nodeId={selected.id} nodeTitle={selected.title} parentId={selected.parent_id} childCount={selected.child_count} hasDocument={selected.has_document} treeRevision={projection.tree_revision} onImported={id=>{focusAfter.current=id;menuAfter.current=id;void client.invalidateQueries({queryKey:["life"]});}}/></Suspense>
    <button className={styles.button} disabled={!projection.latest_undo||mutation.isPending} onClick={()=>projection.latest_undo&&run(selected.id,()=>undoLifeOperation({undo_token:projection.latest_undo!,expected_tree_revision:projection.tree_revision}))}>Undo latest tree change</button>
    <section className={styles.archived} aria-labelledby="archived-life-title"><h3 id="archived-life-title" className={styles.inspectorTitle}>Archived nodes</h3>{projection.archived_nodes.length===0?<EmptyState compact title="No archived nodes." body="Nodes you archive stay recoverable and appear here." />:<ul className={styles.archivedList}>{projection.archived_nodes.map(node=><li className={styles.archivedRow} key={node.id}><span>{node.title}</span><button className={styles.button} disabled={mutation.isPending} onClick={()=>run(node.id,()=>restoreLifeNode({context:context(),node_id:node.id,expected_node_revision:node.revision}))}>Restore</button></li>)}</ul>}</section>
   </aside>}
   <p className={styles.status} role="status" aria-live="polite">{mutation.isPending?"Saving one atomic tree operation…":message||`${projection.nodes.length} active nodes · tree revision ${projection.tree_revision}`}</p>
    </div>
   {createOpen&&selected?<DecisionDialog title={`Add child to ${selected.title}`} description="Create one direct child in this branch." confirmLabel="Add child" inputLabel="Child title" inputPlaceholder="New branch" inputMaxLength={120} returnFocus={dialogReturnFocus.current} onCancel={()=>setCreateOpen(false)} onConfirm={value=>createChild(value.trim())}/>:null}
 </>;
}
