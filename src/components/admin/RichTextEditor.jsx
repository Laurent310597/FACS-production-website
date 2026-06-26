import { useEffect, useRef } from "react";
import {
  Bold,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Underline,
  Undo2,
} from "lucide-react";

const tools = [
  [Bold, "In đậm", "bold"],
  [Italic, "In nghiêng", "italic"],
  [Underline, "Gạch chân", "underline"],
  [Heading2, "Tiêu đề phụ", "formatBlock", "H2"],
  [Quote, "Trích dẫn", "formatBlock", "BLOCKQUOTE"],
  [List, "Danh sách", "insertUnorderedList"],
  [ListOrdered, "Danh sách số", "insertOrderedList"],
  [Undo2, "Hoàn tác", "undo"],
  [Redo2, "Làm lại", "redo"],
  [RemoveFormatting, "Xóa định dạng", "removeFormat"],
];

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const runCommand = (command, commandValue) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || "");
  };

  const addLink = () => {
    const url = window.prompt("Dán đường dẫn cần chèn:", "https://");
    if (!url) return;
    runCommand("createLink", url);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#081321]/70 focus-within:border-cyan-300/35">
      <div className="flex flex-wrap gap-1 border-b border-white/10 bg-white/[0.035] p-2">
        {tools.map(([Icon, label, command, commandValue]) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(event) => {
              event.preventDefault();
              runCommand(command, commandValue);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-cyan-300/12 hover:text-cyan-100"
          >
            <Icon size={17} />
          </button>
        ))}
        <button
          type="button"
          title="Chèn liên kết"
          aria-label="Chèn liên kết"
          onMouseDown={(event) => {
            event.preventDefault();
            addLink();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-cyan-300/12 hover:text-cyan-100"
        >
          <LinkIcon size={17} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className="admin-rich-editor min-h-[360px] px-5 py-5 text-[16px] leading-8 text-slate-100 outline-none"
      />
    </div>
  );
}
