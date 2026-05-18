import React from 'react';
import { FileText } from 'lucide-react';

export function CitationBadge({ source, page }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 my-0.5 rounded bg-(--accent-cyan-dim) text-(--accent-cyan) text-xs font-medium border border-(--accent-cyan)/25 cursor-pointer hover:bg-(--accent-cyan)/20 transition-colors" style={{ fontFamily: 'var(--font-mono)' }}>
      <FileText className="w-3 h-3" />
      {source}
      {page && <span className="opacity-70"> pg.{page}</span>}
    </span>
  );
}
