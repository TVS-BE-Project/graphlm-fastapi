import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CodeBlock({ node, className, children, ...props }) {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  // In react-markdown v10+, the 'inline' prop is removed.
  // We can infer inline code if it has no language tag AND contains no newlines.
  const isInline = !match && !String(children).includes('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isInline) {
    return (
      <code className="bg-(--bg-elevated) text-(--accent-cyan) px-1.5 py-0.5 rounded text-[0.85em]" style={{ fontFamily: 'var(--font-mono)' }} {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative my-4 rounded overflow-hidden border border-(--border-subtle) bg-(--bg-elevated)">
      <div className="flex items-center justify-between px-4 py-2 bg-(--bg-surface) border-b border-(--border-subtle) text-xs text-(--text-muted)" style={{ fontFamily: 'var(--font-mono)' }}>
        <span className="uppercase tracking-widest">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-(--text-primary) transition-colors"
          aria-label="Copy code"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-(--accent-cyan)" /> : <Copy className="w-3.5 h-3.5" />}
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-sm text-(--text-secondary)" style={{ fontFamily: 'var(--font-mono)' }}>
        <code className={className} {...props}>
          {children}
        </code>
      </div>
    </div>
  );
}
