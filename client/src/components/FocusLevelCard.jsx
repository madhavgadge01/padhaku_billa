import React, { useState, useRef, useEffect, avgDailyHours14d } from 'react';
import { Compass, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import {
  FOCUS_TIERS,
  getTierForPercent,
  calculateFocusLevel,
  calculateHoursForFocusLevel,
} from '../utils/focusLevelUtils.js';

/**
 * Resolves Focus Level Data using the 14-day rolling actual focus hours/day.
 * Works seamlessly with precalculated backend data, direct profile data, or client analytics.
 */
export function resolveFocusLevelData(analyticsData, user, directFocusLevel) {
  // 1. Direct focusLevel provided (e.g. from user profile modal or leaderboard)
  if (directFocusLevel && typeof directFocusLevel.score === 'number') {
    const score = Math.max(0, Math.min(100, Math.round(directFocusLevel.score)));
    const tier = getTierForPercent(score);
    return {
      score,
      tier,
      avgDailyHours14d: directFocusLevel.avgDailyHours14d !== undefined ? directFocusLevel.avgDailyHours14d : 0,
      fourteenDaysMinutes: directFocusLevel.fourteenDaysMinutes || 0,
      windowDays: directFocusLevel.windowDays || 14,
      isDeveloping: Boolean(directFocusLevel.isDeveloping),
      totalSessions: directFocusLevel.totalSessions || 0,
    };
  }

  // 2. Precalculated focusLevel from dashboard endpoint
  if (analyticsData?.focusLevel && typeof analyticsData.focusLevel.score === 'number') {
    const raw = analyticsData.focusLevel;
    const score = Math.max(0, Math.min(100, Math.round(raw.score)));
    const tier = getTierForPercent(score);
    const avgDailyHours14d = raw.avgDailyHours14d !== undefined
      ? raw.avgDailyHours14d
      : Math.round(((raw.fourteenDaysMinutes || 0) / 60 / (raw.windowDays || 14)) * 10) / 10;

    return {
      score,
      tier,
      avgDailyHours14d,
      fourteenDaysMinutes: raw.fourteenDaysMinutes || 0,
      windowDays: raw.windowDays || 14,
      isDeveloping: Boolean(raw.isDeveloping),
      totalSessions: analyticsData?.summary?.totalSessionsCount || 0,
    };
  }

  // 3. Fallback client calculation from 14-day daily series
  const summary = analyticsData?.summary || {};
  const dailySeries = analyticsData?.timeSeries?.daily || [];
  const fourteenDaysMinutes = dailySeries.reduce((acc, d) => acc + (d.minutes || 0), 0);
  const totalSessions = summary?.totalSessionsCount || 0;

  const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
  const accountAgeDays = Math.max(1, Math.ceil((Date.now() - userCreatedAt.getTime()) / (24 * 60 * 60 * 1000)));
  const windowDays = Math.max(1, Math.min(14, accountAgeDays));

  const avgDailyHours14d = Math.round(((fourteenDaysMinutes / 60) / windowDays) * 10) / 10;
  const score = calculateFocusLevel(avgDailyHours14d);
  const tier = getTierForPercent(score);
  const isDeveloping = accountAgeDays < 7 || totalSessions < 3;

  return {
    score,
    tier,
    avgDailyHours14d,
    fourteenDaysMinutes,
    windowDays,
    totalSessions,
    isDeveloping,
  };
}

/**
 * Reusable "Your Focus Level" Card
 * - compact: styled concisely for Home Page or mini-profiles
 * - isProfileView: customized headers when inspecting a user profile
 * - onNavigate: optional navigation callback
 */
export const FocusLevelCard = ({
  data,
  user,
  focusLevel: directFocusLevel,
  compact = false,
  onNavigate,
  title = 'Your Focus Level',
  isProfileView = false,
}) => {
  const resolved = resolveFocusLevelData(data, user, directFocusLevel);
  const { score, tier, avgDailyHours14d, windowDays, isDeveloping } = resolved;

  const [hoveredPercent, setHoveredPercent] = useState(null);
  const barRef = useRef(null);

  // Close interactive tooltip on tap/click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setHoveredPercent(null);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const calculatePercentFromEvent = (clientX) => {
    if (!barRef.current) return null;
    const rect = barRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.round((x / rect.width) * 100);
    return Math.max(1, Math.min(100, pct));
  };

  const handlePointerMove = (e) => {
    const pct = calculatePercentFromEvent(e.clientX);
    if (pct !== null) setHoveredPercent(pct);
  };

  const handlePointerLeave = () => {
    setHoveredPercent(null);
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length > 0) {
      const pct = calculatePercentFromEvent(e.touches[0].clientX);
      if (pct !== null) setHoveredPercent(pct);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches.length > 0) {
      const pct = calculatePercentFromEvent(e.touches[0].clientX);
      if (pct !== null) setHoveredPercent(pct);
    }
  };

  // Clamped position for user's actual marker
  const markerPosition = Math.max(2.5, Math.min(97.5, score));

  // Target tier for hovered position
  const targetTier = hoveredPercent !== null ? getTierForPercent(hoveredPercent) : null;
  const targetHours = hoveredPercent !== null ? calculateHoursForFocusLevel(hoveredPercent) : 0;
  const targetHoursStr = targetHours < 1 ? `${Math.round(targetHours * 60)}m/day` : `${targetHours.toFixed(1)} hrs/day`;

  // Render Target Tooltip on Hover/Tap
  const renderTargetEstimate = () => {
    if (hoveredPercent === null || !targetTier) return null;

    if (hoveredPercent <= score) {
      return (
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs">
            <span>✓ Current Level Unlocked</span>
          </div>
          <p className="text-zinc-300 text-[11px] leading-relaxed">
            Position represents <strong className="text-white">~{targetHoursStr}</strong>. Your recorded 14-day average is <strong className="text-white">{avgDailyHours14d} hrs/day</strong> ({score}%).
          </p>
        </div>
      );
    }

    const diffHours = Math.max(0.1, targetHours - (avgDailyHours14d || 0));
    const diffHoursStr = diffHours < 1 ? `${Math.round(diffHours * 60)}m/day` : `${diffHours.toFixed(1)} hrs/day`;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-amber-300">Target: ~{targetHoursStr}</span>
          <span className="text-zinc-400 font-mono text-[10px]">{hoveredPercent}%</span>
        </div>
        <p className="text-zinc-200 text-[11px] leading-relaxed">
          Reach <strong className="text-white">{targetTier.label} ({hoveredPercent}%)</strong> by averaging approx. <strong className="text-amber-300">~{targetHoursStr}</strong> of actual focus per day over 14 days (+{diffHoursStr} more daily focus).
        </p>
        {isDeveloping && (
          <p className="text-[10px] text-zinc-400 border-t border-white/10 pt-1">
            Baseline still calibrating ({windowDays}/14 days recorded).
          </p>
        )}
      </div>
    );
  };

  // --- COMPACT VIEW (FOR HOME PAGE & USER PROFILES) ---
  if (compact) {
    return (
      <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-5 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F5EE] dark:bg-[#1C2E29] flex items-center justify-center text-[#1B3B2F] dark:text-[#A3D9C9] flex-shrink-0 shadow-2xs">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
                {title}
              </h3>
              <p className="text-[10px] text-[#576560] dark:text-[#8BA398] font-medium">
                {avgDailyHours14d > 0
                  ? `14-Day Average: ${avgDailyHours14d} hrs/day`
                  : 'Based on 14-day recorded focus time'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Level Tier Badge */}
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center space-x-1.5 ${tier.bgLight} ${tier.borderLight} ${tier.textLight} ${tier.bgDark} ${tier.borderDark} ${tier.textDark}`}
            >
              <span className={`w-2 h-2 rounded-full ${tier.dotColor} animate-pulse`} />
              <span>{tier.label}</span>
            </span>

            {/* Prominent Score */}
            <span className="text-xs font-mono font-black text-[#1B3B2F] dark:text-[#A3D9C9] bg-[#E8F5EE] dark:bg-[#1C2E29] px-2.5 py-1 rounded-xl border border-[#C8E6D5] dark:border-[#2B5246]">
              {score}%
            </span>

            {onNavigate && !isProfileView && (
              <button
                onClick={() => onNavigate('progress')}
                className="text-[11px] font-bold text-[#1B3B2F] dark:text-[#A3D9C9] hover:underline flex items-center space-x-0.5 cursor-pointer ml-1"
                title="View full progress analytics"
              >
                <span>Analytics</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Polished Colorful Game-like Bar */}
        <div className="space-y-1.5 pt-1 pb-1">
          <div
            ref={barRef}
            onMouseMove={handlePointerMove}
            onMouseLeave={handlePointerLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            className="relative w-full h-5 rounded-full p-0.5 bg-gradient-to-r from-[#F0ECE6] to-[#EAE5DD] dark:from-[#1C2E29] dark:to-[#162420] border border-[#D5CFC5] dark:border-[#2B5246] flex items-center cursor-crosshair select-none touch-none shadow-inner"
          >
            {/* 4 Colored Segments with Arcade Sheen */}
            <div className="w-full h-full rounded-full overflow-hidden flex relative shadow-xs">
              <div className="w-1/4 h-full bg-[#EF4444]" title="Getting Started (< 1 hr/day)" />
              <div className="w-1/4 h-full bg-[#F59E0B]" title="Building Momentum (1–4 hrs/day)" />
              <div className="w-1/4 h-full bg-[#10B981]" title="Focus Champion (4–7 hrs/day)" />
              <div className="w-1/4 h-full bg-[#18231F] dark:bg-[#0B120F]" title="Exceptional Focus (8+ hrs/day)" />

              {/* Glossy Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/10 pointer-events-none" />
            </div>

            {/* Target Marker & Tooltip Popover (on hover / touch) */}
            {hoveredPercent !== null && (
              <>
                <div
                  className="absolute bottom-full mb-3 -translate-x-1/2 z-40 w-64 max-w-[85vw] p-3 rounded-2xl bg-[#1C2A24] dark:bg-[#0B120F] text-white shadow-2xl border border-white/10 text-left pointer-events-none transition-all duration-75"
                  style={{
                    left: `${Math.max(18, Math.min(82, hoveredPercent))}%`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: targetTier.color }}
                      />
                      <span className="text-xs font-black tracking-tight text-white">
                        {targetTier.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300">
                      Target: {hoveredPercent}%
                    </span>
                  </div>

                  <div className="pt-2">
                    {renderTargetEstimate()}
                  </div>

                  {/* Downward triangle indicator */}
                  <div
                    className="absolute -bottom-1.5 w-3 h-3 bg-[#1C2A24] dark:bg-[#0B120F] border-r border-b border-white/10"
                    style={{
                      left: `${Math.max(12, Math.min(88, ((hoveredPercent - Math.max(18, Math.min(82, hoveredPercent))) * 1.5) + 50))}%`,
                      transform: 'translateX(-50%) rotate(45deg)',
                    }}
                  />
                </div>

                {/* Dashed Target Ring Pin */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 transition-all duration-75"
                  style={{ left: `${Math.max(2, Math.min(98, hoveredPercent))}%` }}
                >
                  <div className="w-5 h-5 rounded-full bg-white dark:bg-[#162420] border-2 border-dashed border-[#1B3B2F] dark:border-[#A3D9C9] shadow-lg flex items-center justify-center animate-pulse">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: targetTier.color }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* User's Actual Position Marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-500 ease-out z-20"
              style={{ left: `${markerPosition}%` }}
            >
              <div className="w-4 h-4 rounded-full bg-white dark:bg-[#0F1A16] border-2 border-[#1C2A24] dark:border-white shadow-md flex items-center justify-center">
                <div className={`w-1.5 h-1.5 rounded-full ${tier.dotColor}`} />
              </div>
            </div>
          </div>

          {/* Scale Markings */}
          <div className="flex justify-between text-[9px] font-bold text-[#8A9791] px-0.5">
            <span className="text-red-500">Starter (&lt;1h)</span>
            <span className="text-amber-500">Momentum (1–4h)</span>
            <span className="text-emerald-500">Champion (4–7h)</span>
            <span className="text-zinc-700 dark:text-zinc-300">Exceptional (8h+)</span>
          </div>
        </div>

        {/* Developing Baseline Notice if applicable */}
        {isDeveloping && (
          <div className="mt-2 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-[10px] text-amber-800 dark:text-amber-300 font-medium">
            <span className="flex items-center space-x-1">
              
              <span>Calibrating baseline ({windowDays} of 14 days tracked)</span>
            </span>
            <span className="text-[9px] opacity-80">Developing History</span>
          </div>
        )}
      </div>
    );
  }

  // --- FULL VIEW (FOR PROGRESS & ANALYTICS PAGE) ---
  return (
    <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 sm:p-7 shadow-sm transition hover:shadow-md space-y-5">
      {/* Header with Prominent Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE5DD] dark:border-[#253D35]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F5EE] dark:bg-[#1C2E29] flex items-center justify-center text-[#1B3B2F] dark:text-[#A3D9C9] shadow-sm flex-shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium">

            </p>
          </div>
        </div>

        {/* Level Tag Badge & Prominent Score Display */}
        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <span
            className={`text-xs font-black px-3.5 py-1.5 rounded-2xl border flex items-center space-x-2 shadow-xs ${tier.bgLight} ${tier.borderLight} ${tier.textLight} ${tier.bgDark} ${tier.borderDark} ${tier.textDark}`}
          >
            <span className={`w-2 h-2 rounded-full ${tier.dotColor} animate-pulse`} />
            <span>{tier.label}</span>
          </span>

          <div className="flex items-baseline space-x-1 bg-[#FAF8F5] dark:bg-[#1C2E29] px-3 py-1 rounded-2xl border border-[#EAE5DD] dark:border-[#253D35]">
            <span className="text-lg sm:text-xl font-black font-mono text-[#1B3B2F] dark:text-[#A3D9C9]">
              {score}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246] text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-[#576560] dark:text-[#8BA398]">14-Day Focus Average:</span>
          <span className="font-black font-mono text-[#1C2A24] dark:text-[#F2F7F4]">
            {avgDailyHours14d} hrs/day
          </span>
        </div>

        {isDeveloping ? (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-200 dark:border-amber-800">
           
          </span>
        ) : (
          <span className="text-[#576560] dark:text-[#8BA398] text-[11px] font-medium">
            Full 14-day history active
          </span>
        )}
      </div>

      {/* Horizontal Colored Progress Bar with Marker */}
      <div className="space-y-3 pt-1">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-[#576560] dark:text-[#8BA398]">Daily Focus Hours Progression Scale</span>
          <span className="text-[#1C2A24] dark:text-[#F2F7F4] font-mono">
            Position: <span className="text-[#1B3B2F] dark:text-[#A3D9C9] font-black">{score}%</span>
          </span>
        </div>

        {/* Interactive Bar Track */}
        <div
          ref={barRef}
          onMouseMove={handlePointerMove}
          onMouseLeave={handlePointerLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          className="relative w-full h-6 sm:h-7 rounded-full p-0.5 bg-gradient-to-r from-[#F0ECE6] to-[#EAE5DD] dark:from-[#1C2E29] dark:to-[#162420] border border-[#D5CFC5] dark:border-[#2B5246] flex items-center shadow-inner cursor-crosshair select-none touch-none"
        >
          {/* 4 Colored Segments with Arcade Sheen */}
          <div className="w-full h-full rounded-full overflow-hidden flex relative shadow-sm">
            <div className="w-1/4 h-full bg-[#EF4444]" title="Getting Started (< 1 hr/day)" />
            <div className="w-1/4 h-full bg-[#F59E0B]" title="Building Momentum (1–4 hrs/day)" />
            <div className="w-1/4 h-full bg-[#10B981]" title="Focus Champion (4–7 hrs/day)" />
            <div className="w-1/4 h-full bg-[#18231F] dark:bg-[#0B120F]" title="Exceptional Focus (8+ hrs/day)" />

            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/10 pointer-events-none" />
          </div>

          {/* Target Marker & Tooltip Popover (on hover / touch) */}
          {hoveredPercent !== null && (
            <>
              <div
                className="absolute bottom-full mb-3 -translate-x-1/2 z-40 w-72 max-w-[85vw] p-3.5 rounded-2xl bg-[#1C2A24] dark:bg-[#0B120F] text-white shadow-2xl border border-white/10 text-left pointer-events-none transition-all duration-75"
                style={{
                  left: `${Math.max(18, Math.min(82, hoveredPercent))}%`,
                }}
              >
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: targetTier.color }}
                    />
                    <span className="text-xs font-black tracking-tight text-white">
                      {targetTier.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300">
                    Target: {hoveredPercent}%
                  </span>
                </div>

                <div className="pt-2">
                  {renderTargetEstimate()}
                </div>

                {/* Downward triangle pointer */}
                <div
                  className="absolute -bottom-1.5 w-3 h-3 bg-[#1C2A24] dark:bg-[#0B120F] border-r border-b border-white/10"
                  style={{
                    left: `${Math.max(12, Math.min(88, ((hoveredPercent - Math.max(18, Math.min(82, hoveredPercent))) * 1.5) + 50))}%`,
                    transform: 'translateX(-50%) rotate(45deg)',
                  }}
                />
              </div>

              {/* Dashed Target Ring Pin */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 transition-all duration-75"
                style={{ left: `${Math.max(2, Math.min(98, hoveredPercent))}%` }}
              >
                <div className="w-6 h-6 rounded-full bg-white dark:bg-[#162420] border-2 border-dashed border-[#1B3B2F] dark:border-[#A3D9C9] shadow-lg flex items-center justify-center animate-pulse">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: targetTier.color }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Current Position Marker (Pin with Pointer) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-500 ease-out z-20"
            style={{ left: `${markerPosition}%` }}
          >
            {/* Tooltip bubble above marker */}
            <div className="absolute -top-7 whitespace-nowrap px-2 py-0.5 rounded-lg bg-[#1C2A24] dark:bg-white text-white dark:text-[#1C2A24] text-[10px] font-black shadow-md border border-black/10 dark:border-white/20">
              You are here ({score}%)
            </div>

            {/* Center Circle Pin */}
            <div className="w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-white dark:bg-[#0F1A16] border-2 border-[#1C2A24] dark:border-white shadow-lg flex items-center justify-center">
              <div className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full ${tier.dotColor}`} />
            </div>
          </div>
        </div>

        {/* 4 Stage Labels under the Bar */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-center">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-red-600 dark:text-red-400 block truncate">
              Getting Started
            </span>
            <span className="text-[10px] text-[#8A9791] block hidden sm:block">&lt; 1 hr/day</span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block truncate">
              Building Momentum
            </span>
            <span className="text-[10px] text-[#8A9791] block hidden sm:block">1 – 4 hrs/day</span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block truncate">
              Focus Champion
            </span>
            <span className="text-[10px] text-[#8A9791] block hidden sm:block">4 – 7 hrs/day</span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 block truncate">
              Exceptional Focus
            </span>
            <span className="text-[10px] text-[#8A9791] block hidden sm:block">8+ hrs/day</span>
          </div>
        </div>

       
      </div>
    </div>
  );
};
export default FocusLevelCard;
