import React from 'react';
import { FileText } from 'lucide-react';

export function CitationBadge({ source, page }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 my-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors">
      <FileText className="w-3 h-3" />
      {source}
      {page && <span className="text-blue-500 dark:text-blue-400"> pg.{page}</span>}
    </span>
  );
}
