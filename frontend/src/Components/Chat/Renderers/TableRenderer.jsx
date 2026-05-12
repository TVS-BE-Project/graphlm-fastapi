import React from 'react';

export function TableRenderer({ node, children, ...props }) {
  return (
    <div className="overflow-x-auto my-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300 border-collapse" {...props}>
        {children}
      </table>
    </div>
  );
}

// These are exported so they can be easily mapped if we want granular control
export function TableHead({ node, children, ...props }) {
  return (
    <thead className="bg-gray-50 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-200 font-medium" {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ node, children, ...props }) {
  return <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-[#1e1e1e]" {...props}>{children}</tbody>;
}

export function TableRow({ node, children, ...props }) {
  return <tr className="hover:bg-gray-50/50 dark:hover:bg-[#252525] transition-colors" {...props}>{children}</tr>;
}

export function TableHeader({ node, children, ...props }) {
  return <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold" {...props}>{children}</th>;
}

export function TableCell({ node, children, ...props }) {
  return <td className="px-4 py-3" {...props}>{children}</td>;
}
