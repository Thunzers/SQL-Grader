import { useRef } from "react";
import Editor from "@monaco-editor/react";

export default function MonacoSQLEditor({ value, onChange, readOnly = false }) {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure SQL language features
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: () => {
        const suggestions = [
          {
            label: "SELECT",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "SELECT ",
          },
          {
            label: "FROM",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "FROM ",
          },
          {
            label: "WHERE",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "WHERE ",
          },
          {
            label: "JOIN",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "JOIN ",
          },
          {
            label: "LEFT JOIN",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "LEFT JOIN ",
          },
          {
            label: "GROUP BY",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "GROUP BY ",
          },
          {
            label: "ORDER BY",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "ORDER BY ",
          },
          {
            label: "HAVING",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "HAVING ",
          },
          {
            label: "LIMIT",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "LIMIT ",
          },
        ];
        return { suggestions };
      },
    });
  };

  const handleEditorChange = (newValue) => {
    if (onChange) {
      onChange(newValue || "");
    }
  };

  return (
    <Editor
      height="100%"
      defaultLanguage="sql"
      value={value}
      onChange={handleEditorChange}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        readOnly: readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        suggest: {
          showKeywords: false,
        },
        quickSuggestions: {
          other: false,
          comments: false,
          strings: false,
        },
        parameterHints: {
          enabled: true,
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: "on",
        tabCompletion: "on",
      }}
    />
  );
}
