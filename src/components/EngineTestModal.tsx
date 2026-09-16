import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { runAllEngineTests, TestCaseResult } from '../engine/engine.test.ts';

interface EngineTestModalProps {
  onClose: () => void;
}

export const EngineTestModal: React.FC<EngineTestModalProps> = ({ onClose }) => {
  const [suite, setSuite] = useState(() => runAllEngineTests());
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const categories = ['ALL', ...Array.from(new Set(suite.results.map((r) => r.category)))];

  const handleRerun = () => {
    setSuite(runAllEngineTests());
  };

  const filteredResults =
    filterCategory === 'ALL'
      ? suite.results
      : suite.results.filter((r) => r.category === filterCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md select-none">
      <div className="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
                Trump Engine Test Suite
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono font-bold">
                  {suite.passed} / {suite.total} PASS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Automated tests validating 6-player rules, Joker restrictions & the final-card Joker edge case.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRerun}
              title="Re-run Test Suite"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                filterCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Test Cases List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
          {filteredResults.map((t: TestCaseResult, idx: number) => (
            <div key={idx} className="pt-2.5 first:pt-0 flex items-start gap-3">
              {t.passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{t.name}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {t.category}
                  </span>
                </div>

                <div className="mt-1 text-[11px] font-mono text-slate-400 bg-slate-950/50 p-2 rounded border border-slate-800/80">
                  <div>Expected: <span className="text-slate-300">{t.expected}</span></div>
                  <div>Result: <span className={t.passed ? 'text-emerald-400' : 'text-rose-400'}>{t.actual}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Engine tests are fully automated and run server-side and client-side.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
