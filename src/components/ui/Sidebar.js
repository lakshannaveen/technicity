import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ title = 'TekniCity', navigation = [] }) => {
  const location = useLocation();

  return (
    <div className="hidden md:flex md:w-72 md:flex-col">
      <div className="flex flex-col flex-grow pt-6 overflow-y-auto bg-white/90 backdrop-blur border-r border-slate-200">
        <div className="flex items-center flex-shrink-0 px-6">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{title}</h1>
        </div>
        <div className="mt-6 flex-grow flex flex-col">
          <nav className="flex-1 px-4 pb-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center gap-4 px-4 py-3 text-base font-medium rounded-xl transition-colors duration-150 border ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 border-transparent'
                  }`}
                >
                  {Icon ? (
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600'}`} aria-hidden />
                  ) : null}
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
