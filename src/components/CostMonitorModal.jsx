import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Zap, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchUsageStats, toggleMockMode } from '../utils/api';

export default function CostMonitorModal({ isOpen, onClose, onMockModeChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchUsageStats();
      if (res.success) {
        setData(res.usage);
        setIsMock(res.mockMode);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleToggleMock = async () => {
    try {
      const next = !isMock;
      const res = await toggleMockMode(next);
      if (res.success) {
        setIsMock(res.mockMode);
        if (onMockModeChange) onMockModeChange(res.mockMode);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const totalCost = data?.totalCostUSD || 0.0;
  const budgetLimit = data?.budgetLimitUSD || 50.0;
  const pctSpent = Math.min(100, (totalCost / budgetLimit) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0E1315] border border-[#1C2529] rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1C2529]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">AI Proxy Budget & Token Monitor</h3>
              <p className="text-xs text-[#92979B]">Sherpas x UPV Sigma Data Club 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#101719] text-[#92979B] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1">
          {/* Mock Mode Switch / Token Guardian */}
          <div className="p-4 rounded-xl bg-[#101719] border border-[#1C2529] flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">Token Protection Mode</span>
                {isMock ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    ACTIVE (0 TOKENS)
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    LIVE CALLS ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-[#92979B]">
                {isMock
                  ? "Uses verified instant case intelligence. ZERO API tokens or credits are spent."
                  : "Sends live requests to the proxy using team credit."}
              </p>
            </div>

            <button
              onClick={handleToggleMock}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                isMock
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              {isMock ? 'Switch to Live API' : 'Activate 0-Token Protection'}
            </button>
          </div>

          {/* Budget Gauge */}
          <div className="p-4 rounded-xl bg-[#0A0D0E] border border-[#1C2529] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#92979B] font-medium">Team AI Credit Allowance</span>
              <span className="font-mono font-bold text-white">
                ${totalCost.toFixed(4)} / ${budgetLimit.toFixed(2)} USD
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#101719] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#04724D] transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(1, pctSpent)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#92979B]">
              <span>Spend: {pctSpent.toFixed(2)}% of total allowance</span>
              <span className="text-emerald-400 font-medium">Remaining: ${(budgetLimit - totalCost).toFixed(2)} USD</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#101719] border border-[#1C2529]">
              <div className="text-[11px] text-[#92979B] uppercase font-mono">Total Calls</div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                {data?.totalRequests ?? 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#101719] border border-[#1C2529]">
              <div className="text-[11px] text-[#92979B] uppercase font-mono">Prompt Tokens</div>
              <div className="text-lg font-bold font-mono text-sky-400 mt-1">
                {data?.totalPromptTokens ?? 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#101719] border border-[#1C2529]">
              <div className="text-[11px] text-[#92979B] uppercase font-mono">Completion</div>
              <div className="text-lg font-bold font-mono text-[#B8DBD9] mt-1">
                {data?.totalCompletionTokens ?? 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#101719] border border-[#1C2529]">
              <div className="text-[11px] text-[#92979B] uppercase font-mono">Failed Calls</div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                {data?.failedRequests ?? 0}
              </div>
            </div>
          </div>

          {/* Recent Calls Log */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#92979B]">Recent Request Log</span>
              <button
                onClick={loadData}
                disabled={loading}
                className="text-[11px] text-[#92979B] hover:text-white flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-[#1C2529] bg-[#0A0D0E]">
              {data?.recentCalls?.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0E1315] text-[#92979B] font-mono border-b border-[#1C2529]">
                    <tr>
                      <th className="p-2">Stage</th>
                      <th className="p-2">Model</th>
                      <th className="p-2">Latency</th>
                      <th className="p-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2529] font-mono">
                    {data.recentCalls.map((c, i) => (
                      <tr key={i} className="hover:bg-[#0E1315]/50">
                        <td className="p-2 font-sans font-medium text-white">{c.purpose}</td>
                        <td className="p-2 text-sky-400">{c.model}</td>
                        <td className="p-2 text-[#92979B]">{c.latencyMs}ms</td>
                        <td className="p-2 text-right text-emerald-400">${(c.cost || 0).toFixed(5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-xs text-[#92979B]">
                  No model calls logged yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#1C2529] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#101719] hover:bg-[#1C2529] text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
