import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import BasicLeafTableTools from "./BasicLeafTableTools";
import * as styles from "./BasicLeafDocument.css";

const marks = [["B", "Bold", "bold", "toggleBold"], ["I", "Italic", "italic", "toggleItalic"]] as const;
const blocks = [
  ["Bullets", "bulletList", "toggleBulletList"],
  ["Numbers", "orderedList", "toggleOrderedList"],
  ["Quote", "blockquote", "toggleBlockquote"],
  ["Code", "codeBlock", "toggleCodeBlock"],
] as const;

function Tool({ label, active, text = label, run }: { label:string; active?:boolean; text?:string; run:()=>void }) {
  return <button type="button" className={styles.toolbarButton} aria-label={label} aria-pressed={active} onClick={run}>{text}</button>;
}

export default function BasicLeafToolbar({ editor, onLink, onImage }: { editor:Editor; onLink:(invoker:HTMLElement)=>void; onImage:(file?:File)=>Promise<void> }) {
  const active=useEditorState({editor,selector:({editor:e})=>({bold:e.isActive("bold"),italic:e.isActive("italic"),link:e.isActive("link"),table:e.isActive("table"),heading1:e.isActive("heading",{level:1}),heading2:e.isActive("heading",{level:2}),heading3:e.isActive("heading",{level:3}),bulletList:e.isActive("bulletList"),orderedList:e.isActive("orderedList"),blockquote:e.isActive("blockquote"),codeBlock:e.isActive("codeBlock")})});
  return <>
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
      <div className={styles.toolbarGroup}>{marks.map(([text,label,node,command])=><Tool key={node} label={label} text={text} active={active[node]} run={()=>editor.chain().focus()[command]().run()}/>)}</div>
      <div className={styles.toolbarGroup}>{([1,2,3] as const).map(level=><Tool key={level} label={`Heading ${level}`} text={`H${level}`} active={active[`heading${level}`]} run={()=>editor.chain().focus().toggleHeading({level}).run()}/>)}</div>
      <div className={styles.toolbarGroup}>{blocks.map(([label,node,command])=><Tool key={node} label={label} active={active[node]} run={()=>editor.chain().focus()[command]().run()}/>)}</div>
      <div className={styles.toolbarGroup}>
        <button type="button" className={styles.toolbarButton} aria-label="Link" aria-pressed={active.link} onClick={event=>onLink(event.currentTarget)}>Link</button>
        <Tool label="Table" run={()=>editor.chain().focus().insertTable({rows:2,cols:2,withHeaderRow:true}).run()}/>
        <label className={styles.toolbarFileLabel}>Image<input className={styles.editorHiddenFile} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value="";void onImage(file);}}/></label>
      </div>
      <span className={styles.pasteHint}>Ctrl+Shift+V pastes text as Markdown</span>
    </div>
    {active.table&&<BasicLeafTableTools editor={editor}/>}
  </>;
}
