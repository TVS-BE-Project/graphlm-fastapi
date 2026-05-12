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
      <code className="bg-gray-100 dark:bg-gray-800 text-pink-500 dark:text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-200 dark:bg-[#2d2d2d] border-b border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
        <span className="font-mono uppercase">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          aria-label="Copy code"
        >
          {isCopied ? <Check className="w-4 h-4 text-green-600 dark:text-green-500" /> : <Copy className="w-4 h-4" />}
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-sm text-gray-800 dark:text-gray-200 font-mono">
        <code className={className} {...props}>
          {children}
        </code>
      </div>
    </div>
  );
}
