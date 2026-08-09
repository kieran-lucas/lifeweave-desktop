import { HiddenText, LiveRegion } from "@dnd-kit/accessibility";
import {
  DndContext, DragOverlay, KeyboardCode, KeyboardSensor, PointerSensor, closestCenter,
  useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion, useReducedMotion } from "motion/react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveLifeNode, createLifeNode, getLifeEditProjection, renameLifeNode,
  reparentLifeNode, reorderLifeSibling, restoreLifeNode, setLifeNodeTags, undoLifeOperation,
  updateLifeNodeSummary,
} from "../../ipc/commands";
import type { LifeEditNodeView } from "../../ipc/generated/LifeEditNodeView";
import type { LifeEditProjection } from "../../ipc/generated/LifeEditProjection";
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
import { Icon, iconLife, iconNote } from "../../design-system/visual/icons";

type Point=LayoutPoint;
const icons=["life-root","life-branch","life-leaf","life-focus","life-note"];
const themes=["neutral","blue","green","amber","violet"];
const operationId=()=>`life-${crypto.randomUUID()}`;

/** Life Edit geometry is the shared layout's default, so this is a pure re-export with a name. */
export const buildLifeEditLayout=(nodes:LifeEditNodeView[])=>buildLifeTreeLayout(nodes);

function descendantsOf(nodes:LifeEditNodeView[],id:string){const found=new Set<string>();let changed=true;while(changed){changed=false;for(const node of nodes)if(node.parent_id&& (node.parent_id===id||found.has(node.parent_id))&&!found.has(node.id)){found.add(node.id);changed=true;}}return found;}

function Positioner({node,point,selected,onSelect,invalid,active}:{node:LifeEditNodeView;point:Point;selected:boolean;onSelect:()=>void;invalid:boolean;active:boolean}){
 const positionRef=useRef<HTMLDivElement|null>(null);const dndRef=useRef<HTMLDivElement|null>(null);
 const sortable=useSortable({id:`node:${node.id}`,data:{nodeId:node.id},disabled:node.parent_id===null});
 const parentDrop=useDroppable({id:`parent:${node.id}`,data:{nodeId:node.id,kind:"parent"},disabled:invalid});
 const beforeDrop=useDroppable({id:`before:${node.id}`,data:{nodeId:node.id,kind:"before"},disabled:invalid||node.parent_id===null});
 useEffect(()=>{const el=positionRef.current;if(el){el.style.setProperty("--life-x",`${point.x}px`);el.style.setProperty("--life-y",`${point.y}px`);}},[point]);
 useEffect(()=>{const el=dndRef.current;if(!el)return;const transform=sortable.transform;el.style.transform=transform?`translate3d(${transform.x}px,${transform.y}px,0)`:"";el.style.transition=sortable.transition??"";el.style.opacity=sortable.isDragging?"0.28":"1";},[sortable.transform,sortable.transition,sortable.isDragging]);
 const setRefs=(el:HTMLDivElement|null)=>{dndRef.current=el;sortable.setNodeRef(el);parentDrop.setNodeRef(el);};
 return <div ref={positionRef} className={styles.positioner} role="treeitem" aria-level={node.depth+1} aria-expanded={node.child_count?true:undefined}>
   <button ref={beforeDrop.setNodeRef} className={styles.dropBefore} data-over={beforeDrop.isOver} tabIndex={-1} aria-label={`Insert before ${node.title}`}/>
   <div ref={setRefs} className={styles.dndOwner}>
    <motion.button layout className={styles.nodeCard} onClick={onSelect} {...sortable.attributes} {...sortable.listeners} aria-pressed={selected} data-life-edit-id={node.id}>
      <span aria-hidden="true"><Icon d={node.is_leaf?iconNote:iconLife} size={15}/></span><span><span className={styles.compactTitle}>{node.title}</span><span className={styles.compactMeta}>{node.is_leaf?"Leaf":`${node.child_count} children`}{node.is_pinned?" · Pinned":""}</span><TagChipList tags={node.tags} /></span>
    </motion.button>
   </div>
   {parentDrop.isOver&&active&&<span className={styles.compactMeta} role="status">Move into {node.title}</span>}
  </div>;
}

export function LifeEditWorkspace({initialNodeId,onBrowse}:{initialNodeId:string;onBrowse:(id:string)=>void}){
 const client=useQueryClient();const reduced=useReducedMotion();const query=useQuery({queryKey:["life","edit"],queryFn:getLifeEditProjection});
 const [selectedId,setSelectedId]=useState(initialNodeId);const [activeId,setActiveId]=useState<string>();const [overId,setOverId]=useState<string>();const [message,setMessage]=useState("");const [createTitle,setCreateTitle]=useState("");
 const [title,setTitle]=useState("");const [description,setDescription]=useState("");const [icon,setIcon]=useState("life-branch");const [theme,setTheme]=useState("neutral");const [moveParent,setMoveParent]=useState("");
 const canvasRef=useRef<HTMLDivElement|null>(null);const viewportRef=useRef<HTMLDivElement|null>(null);const focusAfter=useRef<string|undefined>(undefined);
 const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}),useSensor(KeyboardSensor,{keyboardCodes:{start:[KeyboardCode.Space,KeyboardCode.Enter],end:[KeyboardCode.Space,KeyboardCode.Enter],cancel:[KeyboardCode.Esc]}}));
 const projection=query.data;const selected=projection?.nodes.find(node=>node.id===selectedId)??projection?.nodes[0];const layout=useMemo(()=>buildLifeEditLayout(projection?.nodes??[]),[projection?.nodes]);
 const selectedDescendants=useMemo(()=>selected&&projection?descendantsOf(projection.nodes,selected.id):new Set<string>(),[projection?.nodes,selected?.id]);
 const invalidDescendants=useMemo(()=>activeId&&projection?descendantsOf(projection.nodes,activeId):new Set<string>(),[projection?.nodes,activeId]);
 useEffect(()=>{const el=canvasRef.current;if(el){el.style.width=`${layout.width}px`;el.style.height=`${layout.height}px`;}},[layout]);
 useEffect(()=>{if(!selected)return;setSelectedId(selected.id);setTitle(selected.title);setDescription(selected.short_description);setIcon(selected.icon_key);setTheme(selected.theme_variant);setMoveParent(selected.parent_id??"");},[selected?.id,selected?.revision]);
 useEffect(()=>{const id=focusAfter.current;if(!id)return;requestAnimationFrame(()=>document.querySelector<HTMLElement>(`[data-life-edit-id="${id}"]`)?.focus({preventScroll:true}));focusAfter.current=undefined;},[projection?.tree_revision]);
 const mutation=useMutation({mutationFn:(work:()=>Promise<unknown>)=>work(),onSuccess:async()=>{setMessage("Life tree updated.");await Promise.all([client.invalidateQueries({queryKey:["life"]}),invalidateTaskSavedViewReferenceData(client),invalidateLifeLinkLifecycle(client)]);},onError:(error)=>setMessage(error instanceof Error?error.message:"Life tree update failed; authoritative geometry was restored.")});
 const [tagError,setTagError]=useState<string|null>(null);
 const tagMutation=useMutation({mutationFn:({nodeId,revision,tagIds}:{nodeId:string;revision:number;tagIds:string[]})=>setLifeNodeTags({node_id:nodeId,expected_node_revision:revision,tag_ids:tagIds}),onSuccess:async()=>{setTagError(null);await client.invalidateQueries({queryKey:["life"]});},onError:(e)=>setTagError(e instanceof Error?e.message:"Could not save tags.")});
 const handleTagChange=(node:LifeEditNodeView,next:TagSummaryView[])=>{tagMutation.mutate({nodeId:node.id,revision:node.revision,tagIds:next.map(t=>t.id)});};
 const context=()=>({operation_id:operationId(),expected_tree_revision:projection!.tree_revision});
 const run=(nodeId:string,work:()=>Promise<unknown>)=>{focusAfter.current=nodeId;mutation.mutate(work);};
 const siblings=(node:LifeEditNodeView)=>projection?.nodes.filter(item=>item.parent_id===node.parent_id).sort((a,b)=>a.sort_key-b.sort_key||a.id.localeCompare(b.id))??[];
 const reorder=(node:LifeEditNodeView,index:number)=>run(node.id,()=>reorderLifeSibling({context:context(),node_id:node.id,new_index:index,expected_node_revision:node.revision}));
 const reparent=(node:LifeEditNodeView,parent:string,index:number)=>run(node.id,()=>reparentLifeNode({context:context(),node_id:node.id,new_parent_id:parent,new_index:index,expected_node_revision:node.revision}));
 const onDragOver=(event:DragOverEvent)=>setOverId(event.over?.id.toString());
 const onDragEnd=(event:DragEndEvent)=>{const id=event.active.id.toString().replace("node:","");const node=projection?.nodes.find(item=>item.id===id);const over=event.over?.id.toString();setActiveId(undefined);setOverId(undefined);if(!projection||!node||!over)return;const targetId=over.split(":")[1];if(!targetId)return;const target=projection.nodes.find(item=>item.id===targetId);if(!target)return;if(over.startsWith("parent:")){const targetChildren=projection.nodes.filter(item=>item.parent_id===target.id);reparent(node,target.id,targetChildren.length);}else{const targetSiblings=projection.nodes.filter(item=>item.parent_id===target.parent_id&&item.id!==node.id).sort((a,b)=>a.sort_key-b.sort_key||a.id.localeCompare(b.id));const index=Math.max(0,targetSiblings.findIndex(item=>item.id===target.id));if(target.parent_id===node.parent_id)reorder(node,index);else if(target.parent_id)reparent(node,target.parent_id,index);}};
 if(query.isLoading)return <LoadingRow label="Loading full Life tree…" />;if(query.isError||!projection)return <p role="alert">Life Edit could not load. Browse remains available.</p>;
 const active=projection.nodes.find(node=>node.id===activeId);const overNodeId=overId?.split(":")[1];const point=active&&overNodeId?layout.points.get(overNodeId):undefined;const activePoint=active?layout.points.get(active.id):undefined;
 return <DndContext sensors={sensors} collisionDetection={closestCenter} accessibility={{screenReaderInstructions:{draggable:"To move a Life node, press Space. Use arrow keys to choose a valid target, Space to commit, or Escape to cancel."}}} onDragStart={event=>{setActiveId(event.active.id.toString().replace("node:",""));setMessage("Moving Life node. Descendants and the node itself are unavailable targets.");}} onDragOver={onDragOver} onDragCancel={()=>{setActiveId(undefined);setOverId(undefined);setMessage("Move cancelled.");}} onDragEnd={onDragEnd}>
  <HiddenText id="life-edit-instructions" value="Use drag and drop or the inspector Move controls. Rust validates every parent and prevents cycles."/><LiveRegion id="life-edit-live" announcement={message} ariaLiveType="polite"/>
  <div className={styles.workspace}>
   <div ref={viewportRef} className={styles.canvasViewport} aria-label="Full Life tree editor" data-reduced-motion={reduced?"true":"false"}>
    <div ref={canvasRef} className={styles.canvas} role="tree" aria-label="Full Life tree editor" aria-describedby="life-edit-instructions">
     <svg className={styles.links} width={layout.width} height={layout.height} aria-hidden="true">{layout.links.map(link=><path key={link.id} d={link.d}/>)}{activePoint&&point&&<path className={styles.preview} d={`M ${activePoint.x+82} ${activePoint.y+66} C ${activePoint.x+82} ${(activePoint.y+point.y)/2}, ${point.x+82} ${(activePoint.y+point.y)/2}, ${point.x+82} ${point.y}`}/>}</svg>
     <SortableContext items={projection.nodes.filter(node=>node.parent_id!==null).map(node=>`node:${node.id}`)} strategy={verticalListSortingStrategy}>{projection.nodes.map(node=><Positioner key={node.id} node={node} point={layout.points.get(node.id)??{x:0,y:0}} selected={node.id===selected?.id} onSelect={()=>setSelectedId(node.id)} invalid={node.id===activeId||invalidDescendants.has(node.id)} active={Boolean(activeId)}/>)}</SortableContext>
    </div>
   </div>
   {selected&&<aside className={styles.inspector} aria-label="Life node inspector">
    <h2 className={styles.inspectorTitle}>Edit {selected.title}</h2><p className={styles.instructions}>{selected.depth===0?"Protected root · cannot archive or move":`Depth ${selected.depth} · ${selected.is_leaf?"leaf":"branch"}`}</p>
    <label className={styles.field}>Title<input className={styles.input} value={title} maxLength={120} onChange={event=>setTitle(event.target.value)}/></label>
    <button className={styles.button} disabled={mutation.isPending||title.trim()===selected.title} onClick={()=>run(selected.id,()=>renameLifeNode({context:context(),node_id:selected.id,value:title,expected_node_revision:selected.revision}))}>Save title</button>
    <label className={styles.field}>Short description<textarea className={styles.input} rows={3} maxLength={320} value={description} onChange={event=>setDescription(event.target.value)}/></label>
    <label className={styles.field}>Local icon<select className={styles.input} value={icon} onChange={event=>setIcon(event.target.value)}>{icons.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
    <label className={styles.field}>Theme variant<select className={styles.input} value={theme} onChange={event=>setTheme(event.target.value)}>{themes.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
    <button className={styles.button} disabled={mutation.isPending} onClick={()=>run(selected.id,()=>updateLifeNodeSummary({context:context(),node_id:selected.id,short_description:description,icon_key:icon,theme_variant:theme,expected_node_revision:selected.revision}))}>Save details</button>
    {selected.depth===0?<p className={styles.instructions}>The Life root cannot have tags.</p>:<TagPicker selectedTags={selected.tags} onChange={(next)=>handleTagChange(selected,next)} busy={tagMutation.isPending} error={tagError} allowCreate/>}
    <div className={styles.actions}><input className={styles.input} aria-label="New child title" placeholder="New child" value={createTitle} onChange={event=>setCreateTitle(event.target.value)}/><button className={styles.button} disabled={mutation.isPending||!createTitle.trim()} onClick={()=>{const parent=selected.id;run(parent,async()=>{const value=await createLifeNode({context:context(),parent_id:parent,title:createTitle,short_description:"",icon_key:"life-branch",theme_variant:"neutral"});setCreateTitle("");setSelectedId(value.node.id);return value;});}}>Create child</button></div>
    {selected.parent_id&&<><div className={styles.actions}><button className={styles.button} disabled={mutation.isPending||siblings(selected).findIndex(item=>item.id===selected.id)===0} onClick={()=>reorder(selected,siblings(selected).findIndex(item=>item.id===selected.id)-1)}>Move up</button><button className={styles.button} disabled={mutation.isPending||siblings(selected).findIndex(item=>item.id===selected.id)===siblings(selected).length-1} onClick={()=>reorder(selected,siblings(selected).findIndex(item=>item.id===selected.id)+1)}>Move down</button>{projection.nodes.find(node=>node.id===selected.parent_id)?.parent_id&&<button className={styles.button} disabled={mutation.isPending} onClick={()=>{const parent=projection.nodes.find(node=>node.id===selected.parent_id)!;const grand=parent.parent_id!;reparent(selected,grand,projection.nodes.filter(node=>node.parent_id===grand).length);}}>Move to parent level</button>}</div>
    <label className={styles.field}>Move into branch<select className={styles.input} value={moveParent} onChange={event=>setMoveParent(event.target.value)}>{projection.nodes.filter(node=>node.id!==selected.id&&!selectedDescendants.has(node.id)).map(node=><option key={node.id} value={node.id}>{node.title}</option>)}</select></label><button className={styles.button} disabled={mutation.isPending||!moveParent||moveParent===selected.parent_id} onClick={()=>reparent(selected,moveParent,projection.nodes.filter(node=>node.parent_id===moveParent).length)}>Move into selected branch</button>
    <div className={styles.actions}><button className={styles.button} onClick={()=>onBrowse(selected.id)}>Open in Browse</button><button className={styles.destructive} disabled={mutation.isPending} onClick={()=>run(selected.parent_id!,()=>archiveLifeNode({context:context(),node_id:selected.id,expected_node_revision:selected.revision}))}>Archive subtree</button></div></>}
    <Suspense fallback={<LoadingRow label="Loading Life interchange…" />}><LifeBranchControls nodeId={selected.id} nodeTitle={selected.title} parentId={selected.parent_id} childCount={selected.child_count} hasDocument={selected.has_document} treeRevision={projection.tree_revision} onImported={id=>{focusAfter.current=id;setSelectedId(id);void client.invalidateQueries({queryKey:["life"]});}}/></Suspense>
    <button className={styles.button} disabled={!projection.latest_undo||mutation.isPending} onClick={()=>projection.latest_undo&&run(selected.id,()=>undoLifeOperation({undo_token:projection.latest_undo!,expected_tree_revision:projection.tree_revision}))}>Undo latest tree change</button>
    <section className={styles.archived} aria-labelledby="archived-life-title"><h3 id="archived-life-title" className={styles.inspectorTitle}>Archived nodes</h3>{projection.archived_nodes.length===0?<EmptyState compact title="No archived nodes." body="Nodes you archive stay recoverable and appear here." />:<ul className={styles.archivedList}>{projection.archived_nodes.map(node=><li className={styles.archivedRow} key={node.id}><span>{node.title}</span><button className={styles.button} disabled={mutation.isPending} onClick={()=>run(node.id,()=>restoreLifeNode({context:context(),node_id:node.id,expected_node_revision:node.revision}))}>Restore</button></li>)}</ul>}</section>
   </aside>}
   <p className={styles.status} role="status" aria-live="polite">{mutation.isPending?"Saving one atomic tree operation…":message||`${projection.nodes.length} active nodes · tree revision ${projection.tree_revision}`}</p>
  </div><DragOverlay>{active?<div className={styles.overlay}>Moving {active.title}</div>:null}</DragOverlay>
 </DndContext>;
}
