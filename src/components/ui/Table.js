import React from 'react';

const Table = ({ children, className = '' }) => {
  return (
    <div className={`overflow-x-auto bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
        {children}
      </table>
    </div>
  );
};

export default Table;
