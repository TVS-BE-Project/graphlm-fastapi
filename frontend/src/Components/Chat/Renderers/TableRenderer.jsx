import React from 'react';

export function TableRenderer({ node, children, ...props }) {
  return (
    <div className="overflow-x-auto my-4 border border-(--border-subtle) rounded">
      <table className="w-full text-xs text-left text-(--text-secondary) border-collapse" style={{ fontFamily: 'var(--font-mono)' }} {...props}>
        {children}
      </table>
    </div>
  );
}

// These are exported so they can be easily mapped if we want granular control
export function TableHead({ node, children, ...props }) {
  return (
    <thead className="bg-(--bg-surface) text-(--text-secondary) font-medium" {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ node, children, ...props }) {
  return <tbody className="divide-y divide-(--border-subtle) bg-(--bg-elevated)" {...props}>{children}</tbody>;
}

export function TableRow({ node, children, ...props }) {
  return <tr className="hover:bg-(--bg-hover) transition-colors" {...props}>{children}</tr>;
}

export function TableHeader({ node, children, ...props }) {
  return <th className="px-4 py-2.5 border-b border-(--border-subtle) font-semibold text-(--text-muted) uppercase tracking-wider text-[10px]" {...props}>{children}</th>;
}

export function TableCell({ node, children, ...props }) {
  return <td className="px-4 py-2.5 text-(--text-secondary)" {...props}>{children}</td>;
}
