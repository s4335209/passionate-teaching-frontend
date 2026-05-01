import * as React from "react";

/**
 * Tiny markdown renderer — supports headings (#, ##, ###), bold (**text**),
 * bullet lists, numbered lists, blockquotes, and code spans (`x`). Good
 * enough for lesson-body rendering without pulling in a 100KB markdown lib.
 */
export function MarkdownLite({ source }: { source: string }) {
  const blocks = source.split(/\n{2,}/);
  return (
    <article className="prose prose-sm max-w-none">
      {blocks.map((b, i) => <Block key={i} text={b} />)}
    </article>
  );
}

function Block({ text }: { text: string }) {
  const lines = text.split("\n");

  // Headings (only first line)
  if (/^### /.test(lines[0])) {
    return <h4 className="mt-4 font-serif text-base font-semibold text-foreground">{inline(lines[0].slice(4))}</h4>;
  }
  if (/^## /.test(lines[0])) {
    return <h3 className="mt-5 font-serif text-lg font-semibold text-foreground">{inline(lines[0].slice(3))}</h3>;
  }
  if (/^# /.test(lines[0])) {
    return <h2 className="mt-6 font-serif text-2xl font-bold text-foreground">{inline(lines[0].slice(2))}</h2>;
  }

  // Bullet list
  if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
    return (
      <ul className="my-3 list-disc space-y-1 pl-6 text-foreground">
        {lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*[-*]\s+/, ""))}</li>)}
      </ul>
    );
  }

  // Numbered list
  if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
    return (
      <ol className="my-3 list-decimal space-y-1 pl-6 text-foreground">
        {lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*\d+\.\s+/, ""))}</li>)}
      </ol>
    );
  }

  // Blockquote
  if (lines.every((l) => /^>\s?/.test(l))) {
    return (
      <blockquote className="my-3 border-l-4 border-accent pl-4 italic text-muted-foreground">
        {lines.map((l, i) => <span key={i}>{inline(l.replace(/^>\s?/, ""))}<br /></span>)}
      </blockquote>
    );
  }

  // Plain paragraph (with hard line breaks)
  return (
    <p className="my-3 leading-relaxed text-foreground">
      {lines.map((l, i) => (
        <React.Fragment key={i}>
          {inline(l)}
          {i < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </p>
  );
}

function inline(text: string): React.ReactNode {
  // Code spans first
  const parts: (string | React.ReactElement)[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(<strong key={m.index} className="font-semibold text-foreground">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("`")) {
      parts.push(<code key={m.index} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">{tok.slice(1, -1)}</code>);
    }
    last = m.index! + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
