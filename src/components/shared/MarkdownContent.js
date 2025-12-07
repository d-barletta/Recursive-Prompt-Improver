import React, { useRef, useEffect, memo, useMemo, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Copy, Check, Eye } from "lucide-react";
import { openHtmlPreview } from "@utils/internalBrowser";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { githubDark } from "@fsegurai/codemirror-theme-github-dark";

/**
 * Get language extension for CodeMirror based on language name
 */
const getLanguageExtension = (language) => {
  const lang = language?.toLowerCase();
  switch (lang) {
    case "javascript":
    case "js":
      return javascript();
    case "json":
      return json();
    case "python":
    case "py":
      return python();
    case "htm":
    case "html":
    case "xhtml":
      return html();
    case "css":
      return css();
    case "markdown":
    case "md":
      return markdown();
    case "sql":
      return sql();
    case "xml":
      return xml();
    default:
      return javascript(); // Default to JavaScript
  }
};

/**
 * CodeBlock component using CodeMirror
 * Memoized to prevent re-renders when content/language unchanged
 */
const CodeBlock = memo(({ language, children }) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const isHtml = ["xhtml", "html", "htm"].includes(language?.toLowerCase());

  const handleCopy = useCallback(async () => {
    const text = children || "";
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: use execCommand with temporary textarea
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  const handleView = useCallback(() => {
    openHtmlPreview(children || "", { title: "HTML Preview" });
  }, [children]);

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      basicSetup,
      getLanguageExtension(language),
      githubDark,
      EditorView.lineWrapping,
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
    ];

    const startState = EditorState.create({
      doc: children || "",
      extensions,
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [children, language]);

  return (
    <div className="markdown-code-block-wrapper">
      <div ref={editorRef} className="markdown-code-block" />
      <div className="markdown-code-actions flex gap-2">
        {isHtml && (
          <Button variant="ghost" size="sm" onClick={handleView} title="Preview">
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy"}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
});

/**
 * Image component
 * Memoized to prevent re-renders when src/alt unchanged
 */
const MarkdownImage = memo(({ src, alt }) => {
  return <img src={src} alt={alt} className="markdown-image" />;
});

/**
 * MarkdownContent component
 * Renders markdown content with Carbon Design System styling
 * Optimized for streaming with memoized components
 */
const MarkdownContent = memo(({ content }) => {
  if (!content) return null;

  // Memoize components object to prevent re-creating on each render
  const components = useMemo(
    () => ({
      code({ node, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        const language = match ? match[1] : null;
        const codeContent = String(children).replace(/\n$/, "");
        const hasNewline = String(children).includes("\n");
        const isInline = !className && !hasNewline;

        if (!isInline) {
          // Multi-line code block with CodeMirror
          return <CodeBlock language={language}>{codeContent}</CodeBlock>;
        } else {
          // Inline code
          return (
            <code className="markdown-inline-code px-1 py-0.5 bg-muted rounded text-sm">
              {children}
            </code>
          );
        }
      },
      // Headings
      h1: ({ children }) => <h1 className="markdown-h1 text-3xl font-bold mt-6 mb-4">{children}</h1>,
      h2: ({ children }) => <h2 className="markdown-h2 text-2xl font-semibold mt-5 mb-3">{children}</h2>,
      h3: ({ children }) => <h3 className="markdown-h3 text-xl font-semibold mt-4 mb-2">{children}</h3>,
      h4: ({ children }) => <h4 className="markdown-h4 text-lg font-medium mt-3 mb-2">{children}</h4>,
      h5: ({ children }) => <h5 className="markdown-h5 text-base font-medium mt-2 mb-1">{children}</h5>,
      h6: ({ children }) => <h6 className="markdown-h6 text-sm font-medium mt-2 mb-1">{children}</h6>,
      // Paragraphs
      p: ({ children }) => <p className="markdown-paragraph mb-4">{children}</p>,
      // Lists
      ul: ({ children }) => (
        <ul className="markdown-list markdown-list--unordered list-disc list-inside mb-4 space-y-1">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="markdown-list markdown-list--ordered list-decimal list-inside mb-4 space-y-1">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="markdown-list-item ml-4">{children}</li>,
      // Links
      a: ({ href, children }) => (
        <a
          href={href}
          className="markdown-link text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
      // Blockquotes
      blockquote: ({ children }) => (
        <blockquote className="markdown-blockquote border-l-4 border-muted pl-4 italic my-4">
          {children}
        </blockquote>
      ),
      // Tables
      table: ({ children }) => (
        <div className="overflow-x-auto my-4">
          <table className="markdown-table min-w-full border-collapse border border-border">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
      tbody: ({ children }) => <tbody>{children}</tbody>,
      tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
      th: ({ children }) => (
        <th className="markdown-table-header border border-border px-4 py-2 text-left font-semibold">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="markdown-table-cell border border-border px-4 py-2">{children}</td>
      ),
      // Horizontal rule
      hr: () => <hr className="markdown-hr" />,
      // Strong/Bold
      strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
      // Emphasis/Italic
      em: ({ children }) => <em className="markdown-em">{children}</em>,
      // Images
      img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} />,
    }),
    []
  );

  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownContent;
