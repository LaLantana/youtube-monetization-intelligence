// Top-level shell: switches between Dashboard 1 (Monetization Intelligence)
// and Dashboard 2 (Short vs Long Form).
import React, { useState } from 'react';
import Dashboard from './Dashboard';
import Dashboard2 from './Dashboard2';

const TABS = [
  { id: 'dash1', label: 'Monetization Intelligence' },
  { id: 'dash2', label: 'Short vs Long Form' },
];

export default function AppShell() {
  const [active, setActive] = useState('dash1');

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-3">
          <span className="mr-3 text-sm font-semibold tracking-tight text-slate-400">
            YouTube Trending Intelligence
          </span>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active === tab.id
                  ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/40'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      {active === 'dash1' ? <Dashboard /> : <Dashboard2 />}
    </div>
  );
}
