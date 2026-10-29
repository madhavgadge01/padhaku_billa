import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  BrainCircuit,
  Award,
  Globe,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';

export const AnalyticsDashboard = ({ user, onDataReload }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalyticsDashboard();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mb-3"></div>
        <p className="text-sm font-semibold">Computing behavioral focus telemetry & peer percentiles...</p>
      </div>
    );
  }

  const { summary, tagDistribution = [], pauseAnalytics, timeSeries, heatmap = [], peerBenchmark } = data || {};
  const dailySeries = timeSeries?.daily || [];
  const maxDailyMins = Math.max(60, ...dailySeries.map((d) => d.minutes || 0));

  return (
    <div className="space-y-6">
      {/* Top Telemetry Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-700/70 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center space-x-2 text-sky-400 text-xs font-bold uppercase">
            <Clock className="w-4 h-4" />
            <span>Total Focus</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-100 font-mono">
            {summary?.totalHoursLogged || 0} <span className="text-sm font-semibold text-slate-400">Hours</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across {summary?.uniqueDaysLogged || 1} active days</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700/70 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase">
            <CheckCircle2 className="w-4 h-4" />
            <span>Completed tasks</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-100 font-mono">
            {summary?.totalSessionsCount || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Unbroken flow sessions</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700/70 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase">
            <TrendingUp className="w-4 h-4" />
            <span>Daily Average</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-100 font-mono">
            {summary?.averageDailyHours || 0} <span className="text-sm font-semibold text-slate-400">Hrs/Day</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">In {user?.fieldOfStudy || 'Field'}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700/70 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold uppercase">
            <Award className="w-4 h-4" />
            <span>Peer Percentile</span>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-300 font-mono">
            Top {peerBenchmark?.topRankPercent || 25}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{peerBenchmark?.percentile || 75}th Percentile Rank</div>
        </div>
      </div>

      {/* PEER & INDUSTRY BENCHMARK ENGINE CARD */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-indigo-900/40 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100">Global Peer & Industry Benchmark</h3>
              <p className="text-xs text-indigo-300">
                Calculated against worldwide study and productivity distributions in {user?.fieldOfStudy || 'Computer Science'}.
              </p>
            </div>
          </div>

          <div className="bg-indigo-950/80 border border-indigo-500/40 px-3.5 py-1 rounded-full text-indigo-300 text-xs font-bold self-start sm:self-auto">
            Target: Top 10% ({peerBenchmark?.top10TargetHours || 6.2} hrs/day)
          </div>
        </div>

        {/* Dynamic Comparison Banner */}
        <div className="my-5 p-4 bg-slate-900/90 rounded-xl border border-indigo-500/30">
          <p className="text-sm font-semibold text-slate-200 leading-relaxed">
            "{peerBenchmark?.comparisonText}"
          </p>
        </div>

        {/* Visual Percentile Gauge */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-300">
            <span>Bottom 20%</span>
            <span>Average Peer ({peerBenchmark?.peerMeanHours || 4.2} hrs)</span>
            <span className="text-indigo-400 font-extrabold">You: Top {peerBenchmark?.topRankPercent || 25}%</span>
            <span className="text-amber-400">Top 10% Elite</span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden border border-slate-700 relative">
            {/* Top 10% target line marker */}
            <div className="absolute top-0 bottom-0 left-[90%] w-1 bg-amber-400 z-10" title="Top 10% Threshold"></div>
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 transition-all duration-700 rounded-full"
              style={{ width: `${peerBenchmark?.percentile || 50}%` }}
            ></div>
          </div>
        </div>

        {/* Actionable tip */}
        {peerBenchmark?.tip && (
          <div className="mt-4 text-xs text-indigo-300/90 bg-indigo-950/40 border border-indigo-800/40 p-3 rounded-lg flex items-center space-x-2">
            <BrainCircuit className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>
              <strong>Field Habit Protocol:</strong> {peerBenchmark.tip}
            </span>
          </div>
        )}
      </div>

      {/* PAUSE PATTERN DETECTOR AI/LOGIC CARD */}
      <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-100">Pause Pattern Detector (Behavioral Friction)</h3>
            <p className="text-xs text-slate-400">Identifies day-of-week and time-of-day interruption friction.</p>
          </div>
        </div>

        {/* Insight Highlight Box */}
        <div className="p-4 bg-slate-800/80 rounded-xl border border-rose-500/30 mb-5">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">AI Behavioral Telemetry</h4>
              <p className="text-sm font-semibold text-slate-200 mt-1 leading-relaxed">
                {pauseAnalytics?.insight || 'Complete more sessions to analyze friction patterns.'}
              </p>
            </div>
          </div>
        </div>

        {/* Friction Comparison Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-xs font-bold text-slate-400">Mondays & Fridays (Bookend Days)</div>
            <div className="text-xl font-black text-rose-400 font-mono mt-1">
              {pauseAnalytics?.monFriAveragePauses || 0} <span className="text-xs font-medium text-slate-400">Pauses / Session</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Higher distraction propensity detected during week transitions.</p>
          </div>

          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-xs font-bold text-slate-400">Mid-Week (Tue, Wed, Thu)</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              {pauseAnalytics?.midWeekAveragePauses || 0} <span className="text-xs font-medium text-slate-400">Pauses / Session</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Deepest sustained focus blocks occur mid-week.</p>
          </div>
        </div>
      </div>

      {/* TWO COLUMN SECTION: TIME SERIES & COLOR TAG DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Focus Time Bar Chart */}
        <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-black text-slate-100">Daily Focus Minutes (Last 14 Days)</h3>
          </div>

          <div className="h-48 flex items-end justify-between space-x-1.5 pt-6 pb-2 px-1 border-b border-slate-800">
            {dailySeries.map((day) => {
              const heightPercent = maxDailyMins > 0 ? (day.minutes / maxDailyMins) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-slate-800 text-[10px] text-slate-200 px-2 py-1 rounded shadow-lg border border-slate-700 pointer-events-none whitespace-nowrap z-20">
                    {day.minutes} mins ({day.sessions} sessions)
                  </div>

                  <div
                    className="w-full bg-gradient-to-t from-sky-600 to-teal-400 rounded-t group-hover:brightness-125 transition-all duration-300"
                    style={{ height: `${Math.max(4, heightPercent)}%` }}
                  ></div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
            <span>14 Days Ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Color-Coded Time Distribution by Task Tags */}
        <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          <div className="flex items-center space-x-2 mb-4">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-slate-100">Focus Distribution by Subject Tag</h3>
          </div>

          {tagDistribution.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No task sessions logged yet. Complete tasks to populate distribution.
            </div>
          ) : (
            <div className="space-y-3">
              {tagDistribution.map((item) => {
                const totalMins = tagDistribution.reduce((acc, t) => acc + t.minutes, 0) || 1;
                const percent = Math.round((item.minutes / totalMins) * 100);
                return (
                  <div key={item.color}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="text-slate-300 font-mono">{item.hours} Hours</span>
                      </div>
                      <span className="text-slate-400 font-mono">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ backgroundColor: item.color, width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* COMPLETION CALENDAR HEATMAP */}
      <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-slate-100">Consistency Heatmap Grid</h3>
          </div>
          <span className="text-xs text-slate-400">Darker squares indicate higher daily focus volume</span>
        </div>

        {/* Heatmap Grid Cells */}
        <div className="flex flex-wrap gap-1.5 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
          {heatmap.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center w-full">Start completing sessions to fill your consistency grid!</p>
          ) : (
            heatmap.map((cell) => {
              const bgColors = [
                'bg-slate-800',
                'bg-emerald-900/80',
                'bg-emerald-700',
                'bg-emerald-500',
                'bg-emerald-400',
              ];
              const colorClass = bgColors[cell.intensity] || bgColors[1];
              return (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.count} quests (${cell.minutes} mins)`}
                  className={`w-6 h-6 rounded-md ${colorClass} cursor-pointer hover:ring-2 hover:ring-sky-400 transition-all`}
                ></div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
