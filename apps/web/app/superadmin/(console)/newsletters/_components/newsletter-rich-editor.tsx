"use client";

import { createContext, useContext, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  UnderlineIcon,
  Undo2
} from "lucide-react";
import type { RichTextDocument } from "@/components/newsletter/newsletter-types";
import { isSafeNewsletterHref } from "@/components/newsletter/newsletter-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import styles from "./newsletter-builder.module.css";

export const EditorControlsContext = createContext<{
  active: string | null;
  activate: (id: string | null) => void;
  target: HTMLElement | null;
}>({ active: null, activate: () => {}, target: null });

export function RichEditor({
  document,
  onChange,
  autoFocus = false,
  label = "Contenido de la newsletter"
}: {
  document: RichTextDocument;
  onChange: (document: RichTextDocument, plainText: string) => void;
  autoFocus?: boolean;
  label?: string;
}) {
  const controls = useContext(EditorControlsContext);
  const editorId = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSelection, setLinkSelection] = useState<{ from: number; to: number } | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    autofocus: autoFocus ? "end" : false,
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      LinkExtension.extend({
        addAttributes() {
          return { href: { default: null } };
        }
      }).configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyleKit.configure({ lineHeight: false }),
      Highlight.configure({ multicolor: true })
    ],
    content: document,
    onFocus: () => controls.activate(editorId),
    onUpdate: ({ editor: current }) =>
      onChange(current.getJSON() as RichTextDocument, current.getText({ blockSeparator: "\n" })),
    editorProps: {
      attributes: {
        "aria-label": label,
        class:
          "min-h-28 px-4 py-4 text-sm leading-7 outline-none [&_p]:my-2 [&_h1]:my-3 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:my-3 [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-primary [&_a]:underline"
      }
    }
  });
  if (!editor) return <div className="h-32 animate-pulse rounded-xl bg-muted" />;
  function submitLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = href.trim();
    if (value && !isSafeNewsletterHref(value)) {
      setLinkError("Ingresá una ruta interna o una URL HTTPS válida.");
      return;
    }
    const chain = editor!.chain().focus();
    if (linkSelection) chain.setTextSelection(linkSelection);
    if (value) chain.extendMarkRange("link").setLink({ href: value }).run();
    else chain.extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }
  return (
    <div
      data-editor-surface
      className="bg-transparent"
      onPointerDownCapture={() => controls.activate(editorId)}
      onFocusCapture={() => controls.activate(editorId)}
    >
      <EditorContent
        editor={editor}
        className={styles.editorContent}
        data-placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Escribí aquí el contenido de tu newsletter."
      />
      {controls.active === editorId && controls.target
        ? createPortal(
            <div
              role="toolbar"
              aria-label="Formato de texto"
              className={`${styles.toolbar} flex flex-wrap items-center gap-1`}
            >
              <select
                aria-label="Tipo de texto"
                className="h-8 rounded-md border border-transparent bg-transparent px-2 text-xs text-muted-foreground transition-colors hover:border-border/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                value={
                  editor.isActive("heading", { level: 1 })
                    ? "h1"
                    : editor.isActive("heading", { level: 2 })
                      ? "h2"
                      : editor.isActive("heading", { level: 3 })
                        ? "h3"
                        : editor.isActive("blockquote")
                          ? "quote"
                          : "p"
                }
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "p") editor.chain().focus().setParagraph().run();
                  else if (value === "quote") editor.chain().focus().toggleBlockquote().run();
                  else
                    editor
                      .chain()
                      .focus()
                      .toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 })
                      .run();
                }}
              >
                <option value="p">Párrafo</option>
                <option value="h1">Título 1</option>
                <option value="h2">Título 2</option>
                <option value="h3">Título 3</option>
                <option value="quote">Cita</option>
              </select>
              <ToolbarButton
                active={editor.isActive("bold")}
                label="Negrita"
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("italic")}
                label="Cursiva"
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("underline")}
                label="Subrayado"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("strike")}
                label="Tachado"
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <Strikethrough />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("bulletList")}
                label="Lista"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("orderedList")}
                label="Lista numerada"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("link")}
                label="Enlace"
                onClick={() => {
                  const current = editor.getAttributes("link").href as string | undefined;
                  setHref(current ?? "https://");
                  setLinkSelection({
                    from: editor.state.selection.from,
                    to: editor.state.selection.to
                  });
                  setLinkError(null);
                  setLinkOpen(true);
                }}
              >
                <LinkIcon />
              </ToolbarButton>
              <select
                aria-label="Fuente"
                className="h-8 rounded-md border border-transparent bg-transparent px-2 text-xs text-muted-foreground transition-colors hover:border-border/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                defaultValue="sans"
                onChange={(event) => editor.chain().focus().setFontFamily(event.target.value).run()}
              >
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
                <option value="mono">Mono</option>
              </select>
              <select
                aria-label="Tamaño"
                className="h-8 rounded-md border border-transparent bg-transparent px-2 text-xs text-muted-foreground transition-colors hover:border-border/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                defaultValue="16px"
                onChange={(event) => editor.chain().focus().setFontSize(event.target.value).run()}
              >
                {[12, 14, 16, 18, 20, 24, 32, 40, 48].map((size) => (
                  <option value={`${size}px`} key={size}>
                    {size}
                  </option>
                ))}
              </select>
              <input
                aria-label="Color de texto"
                type="color"
                className={styles.colorControl}
                onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
              />
              <input
                aria-label="Resaltado"
                type="color"
                className={styles.colorControl}
                defaultValue="#fff59d"
                onChange={(event) =>
                  editor.chain().focus().toggleHighlight({ color: event.target.value }).run()
                }
              />
              <select
                aria-label="Alineación"
                className="h-8 rounded-md border border-transparent bg-transparent px-2 text-xs text-muted-foreground transition-colors hover:border-border/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                defaultValue="left"
                onChange={(event) => editor.chain().focus().setTextAlign(event.target.value).run()}
              >
                <option value="left">Izquierda</option>
                <option value="center">Centro</option>
                <option value="right">Derecha</option>
                <option value="justify">Justificar</option>
              </select>
              <ToolbarButton label="Deshacer" onClick={() => editor.chain().focus().undo().run()}>
                <Undo2 />
              </ToolbarButton>
              <ToolbarButton label="Rehacer" onClick={() => editor.chain().focus().redo().run()}>
                <Redo2 />
              </ToolbarButton>
            </div>,
            controls.target
          )
        : null}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent
          className="max-w-md"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            editor.commands.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Insertar enlace</DialogTitle>
            <DialogDescription>
              Ingresá una ruta interna o una URL HTTPS. Dejá el campo vacío para quitar el enlace.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitLink}>
            <div className="grid gap-2">
              <label htmlFor={`${editorId}-link`} className="text-sm font-medium">
                Enlace
              </label>
              <Input
                id={`${editorId}-link`}
                value={href}
                onChange={(event) => {
                  setHref(event.target.value);
                  setLinkError(null);
                }}
                aria-invalid={Boolean(linkError)}
                aria-describedby={linkError ? `${editorId}-link-error` : undefined}
                autoFocus
              />
              {linkError && (
                <p id={`${editorId}-link-error`} role="alert" className="text-sm text-destructive">
                  {linkError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar enlace</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ToolbarButton({
  active,
  label,
  onClick,
  children
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid size-8 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&_svg]:size-3.5 [&_svg]:stroke-[1.5] ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
