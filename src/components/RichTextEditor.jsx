import React, { useEffect, useRef } from "react";

const commands = [
  { label: "B", command: "bold" },
  { label: "I", command: "italic" },
  { label: "UL", command: "insertUnorderedList" },
];

export default function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  function runCommand(command) {
    document.execCommand(command, false);
    onChange(editorRef.current.innerHTML);
  }

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        {commands.map((item) => (
          <button key={item.command} type="button" onClick={() => runCommand(item.command)}>
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="rich-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current.innerHTML)}
      />
    </div>
  );
}
