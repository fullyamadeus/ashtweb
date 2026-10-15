'use client';

import { useState } from 'react';
import { useEditor, EditorContent, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Link as LinkIcon, Undo2, Redo2, Minus } from 'lucide-react';
import { useLanguage } from './language-provider';
import { Modal } from './modal';

const selectToolbarState = ({ editor }: { editor: Editor | null }) => editor ? {
  bold: editor.isActive('bold'), italic: editor.isActive('italic'), underline: editor.isActive('underline'),
  strike: editor.isActive('strike'), bullets: editor.isActive('bulletList'), numbers: editor.isActive('orderedList'),
  quote: editor.isActive('blockquote'), link: editor.isActive('link'),
  heading: editor.isActive('heading') ? String(editor.getAttributes('heading').level) : 'p',
  size: editor.getAttributes('textStyle').fontSize || '18px',
  undo: editor.can().undo(), redo: editor.can().redo(),
} : null;

export function RichEditor({ initialHtml, onChange, readOnly = false }: { initialHtml: string; onChange: (html: string) => void; readOnly?: boolean }) {
  const { t } = useLanguage();
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, defaultProtocol: 'https', protocols: ['https', 'http', 'mailto'] } }),
      TextStyle, FontSize,
      Placeholder.configure({ placeholder: () => document.documentElement.lang === 'sq' ? 'Filloni të shkruani…' : 'Begin writing…' }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    editable: !readOnly,
    editorProps: { attributes: { class: 'prose editor-prose', 'aria-label': t.editor, role: 'textbox', 'aria-multiline': 'true', spellcheck: 'true' } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const observedState = useEditorState({ editor, selector: selectToolbarState });
  // With deferred SSR rendering, the subscription's first snapshot is null until the editor mounts.
  const state = observedState ?? selectToolbarState({ editor });

  if (!editor || !state) return <div className="editor-loading">{t.loading}</div>;
  const tool = (label: string, icon: React.ReactNode, action: () => void, active = false, disabled = false) =>
    <button type="button" className={`toolbar-button ${active ? 'active' : ''}`} title={label} aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={action}>{icon}</button>;
  return <div className="rich-editor"><div className="editor-toolbar" role="toolbar" aria-label={t.editor}>
    <select aria-label={t.heading} value={state.heading} onChange={e => e.target.value === 'p' ? editor.chain().focus().setParagraph().run() : editor.chain().focus().toggleHeading({ level: Number(e.target.value) as 1 | 2 | 3 }).run()}>
      <option value="p">{t.paragraph}</option><option value="1">{t.heading1}</option><option value="2">{t.heading2}</option><option value="3">{t.heading3}</option>
    </select>
    <select className="font-size-select" aria-label={t.fontSize} value={state.size} onChange={e => editor.chain().focus().setFontSize(e.target.value).run()}>
      {[12,14,16,18,20,24,28,32,36,48].map(size => <option value={`${size}px`} key={size}>{size}</option>)}
    </select><span className="toolbar-divider"/>
    {tool(`${t.bold} (Ctrl/⌘ B)`, <Bold size={16}/>, () => editor.chain().focus().toggleBold().run(), state.bold)}
    {tool(`${t.italic} (Ctrl/⌘ I)`, <Italic size={16}/>, () => editor.chain().focus().toggleItalic().run(), state.italic)}
    {tool(t.underline, <Underline size={16}/>, () => editor.chain().focus().toggleUnderline().run(), state.underline)}
    {tool(t.strike, <Strikethrough size={16}/>, () => editor.chain().focus().toggleStrike().run(), state.strike)}
    <span className="toolbar-divider"/>
    {tool(t.bulletList, <List size={17}/>, () => editor.chain().focus().toggleBulletList().run(), state.bullets)}
    {tool(t.numberedList, <ListOrdered size={17}/>, () => editor.chain().focus().toggleOrderedList().run(), state.numbers)}
    {tool(t.quote, <Quote size={16}/>, () => editor.chain().focus().toggleBlockquote().run(), state.quote)}
    {tool(t.link, <LinkIcon size={16}/>, () => { setLink(editor.getAttributes('link').href || ''); setLinkError(false); setLinkOpen(true); }, state.link)}
    {tool(t.rule, <Minus size={16}/>, () => editor.chain().focus().setHorizontalRule().run())}
    <span className="toolbar-divider"/>
    {tool(t.undo, <Undo2 size={16}/>, () => editor.chain().focus().undo().run(), false, !state.undo)}
    {tool(t.redo, <Redo2 size={16}/>, () => editor.chain().focus().redo().run(), false, !state.redo)}
  </div><EditorContent editor={editor}/>
    {linkOpen && <Modal title={t.link} onClose={() => setLinkOpen(false)}><form onSubmit={e => {
      e.preventDefault();
      const value = link.trim();
      if (!/^(https?:\/\/[^\s]+|mailto:[^\s]+@[^\s]+)$/i.test(value)) { setLinkError(true); return; }
      editor.chain().focus().extendMarkRange('link').setLink({ href: value }).run(); setLinkOpen(false);
    }}><label>{t.linkUrl}<input value={link} onChange={e => setLink(e.target.value)} placeholder="https://" autoFocus/></label>
      <p className={linkError ? 'error-message' : 'small-text muted'}>{t.linkHint}</p>
      <div className="modal-actions">{state.link && <button type="button" className="button quiet" onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); setLinkOpen(false); }}>{t.removeLink}</button>}<button type="button" className="button" onClick={() => setLinkOpen(false)}>{t.cancel}</button><button className="button primary" type="submit">{t.apply}</button></div>
    </form></Modal>}
  </div>;
}
