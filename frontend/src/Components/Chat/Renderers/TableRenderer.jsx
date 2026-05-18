import React from 'react';

export function TableRenderer({ node, children, ...props }) {
  return (
    <div className="overflow-x-auto my-4 border border-[var(--border-subtle)] rounded">
      <table className="w-full text-xs text-left text-[var(--text-secondary)] border-collapse" style={{ fontFamily: 'var(--font-mono)' }} {...props}>
        {children}
      </table>
    </div>
  );
}

// These are exported so they can be easily mapped if we want granular control
export function TableHead({ node, children, ...props }) {
  return (
    <thead className="bg-[var(--bg-surface)] text-[var(--text-secondary)] font-medium" {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ node, children, ...props }) {
  return <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-elevated)]" {...props}>{children}</tbody>;
}

export function TableRow({ node, children, ...props }) {
  return <tr className="hover:bg-[var(--bg-hover)] transition-colors" {...props}>{children}</tr>;
}

export function TableHeader({ node, children, ...props }) {
  return <th className="px-4 py-2.5 border-b border-[var(--border-subtle)] font-semibold text-[var(--text-muted)] uppercase tracking-wider text-[10px]" {...props}>{children}</th>;
}

export function TableCell({ node, children, ...props }) {
  return <td className="px-4 py-2.5 text-[var(--text-secondary)]" {...props}>{children}</td>;
}
