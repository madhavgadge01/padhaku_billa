import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Flame,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  X,
  Award,
  ChevronDown,
  Calendar,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';
import { BADGES_MAP, getBadgeAssetUrl } from '../constants/badges.js';
import {
  formatStudyDuration,
  getAvatarEmoji,
  isValidInstagram,
  isValidLinkedIn,
} from '../utils/socialUtils.js';
import { InstagramIcon, LinkedInIcon } from '../components/SocialIcons.jsx';
import { FocusLevelCard } from '../components/FocusLevelCard.jsx';

export const LeaderboardPage = ({ user, onNavigate: _onNavigate }) => {
  const [mode, setMode] = useState('today'); // 'today' | 'week'
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  // Selected user for Mini-Profile Modal
  const [selectedUser, setSelectedUser] = useState(null);

  // Reference for user's row to enable smooth scroll
  const userRowRef = useRef(null);

  const currentUserId = user?._id || user?.id || '';

  // Fetch rankings from backend
  const fetchRankings = async (targetMode = mode, isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const res = await api.getLeaderboard(targetMode);
      if (res && res.success) {
        setRankings(res.rankings || []);
      } else {
        throw new Error(res?.message || 'Failed to load rankings.');
      }
    } catch (err) {
      console.error('[Leaderboard Error]:', err);
      setError(err.message || 'Unable to connect to leaderboard service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRankings(mode);
  }, [mode]);

  // Mode switcher
  const handleModeChange = (newMode) => {
    if (newMode === mode) return;
    sounds.playClick();
    setMode(newMode);
    setVisibleCount(30);
  };

  // Manual refresh
  const handleRefresh = () => {
    sounds.playClick();
    fetchRankings(mode, true);
  };

  // Find signed-in user's entry in current mode
  const currentUserEntry = rankings.find(
    (item) => item.id === currentUserId || (currentUserId && item.id?.toString() === currentUserId.toString())
  );

  // Open user profile modal & enrich with live profile details
  const handleOpenUserProfile = async (item) => {
    sounds.playClick();
    setSelectedUser(item);
    try {
      const res = await api.getLeaderboardUserProfile(item.id);
      if (res && res.success && res.profile) {
        setSelectedUser((prev) => (prev && prev.id === item.id ? { ...prev, ...res.profile } : prev));
      }
    } catch {
      // Keep optimistic item data
    }
  };

  // Jump to signed-in user's row
  const handleJumpToMyRow = () => {
    sounds.playClick();
    if (currentUserEntry) {
      const userIndex = rankings.findIndex((item) => item.id === currentUserEntry.id);
      if (userIndex >= visibleCount) {
        setVisibleCount(userIndex + 10);
      }
      setTimeout(() => {
        if (userRowRef.current) {
          userRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Filter rankings by search query
  const filteredRankings = rankings.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(query) ||
      (item.fieldOfStudy && item.fieldOfStudy.toLowerCase().includes(query))
    );
  });

  const displayedList = filteredRankings.slice(0, visibleCount);
  const hasMore = visibleCount < filteredRankings.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 select-none">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
              Community Leaderboard
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E8F5EE] dark:bg-[#162420] text-[#1B3B2F] dark:text-[#A3D9C9] text-xs font-black border border-[#C8E6D5] dark:border-[#2B5246]">
              {rankings.length} Adventurers
            </span>
          </div>
          <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium mt-0.5">
            Real recorded focus sessions and unbroken study streaks across the Padhaku Billa community.
          </p>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer self-start sm:self-auto shadow-2xs"
          title="Refresh rankings with latest sessions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#1B3B2F] dark:text-[#A3D9C9]' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* 2. Mode Selector Toggle & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#162420] p-2 sm:p-2.5 rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] shadow-xs">
        {/* Toggle [ Today ] [ This Week ] */}
        <div className="flex items-center space-x-1 bg-[#FAF8F5] dark:bg-[#0F1A16] p-1 rounded-2xl border border-[#EAE5DD]/80 dark:border-[#253D35]/80">
          <button
            type="button"
            onClick={() => handleModeChange('today')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              mode === 'today'
                ? 'bg-[#1B3B2F] text-white shadow-xs'
                : 'text-[#576560] dark:text-[#8BA398] hover:text-[#1C2A24] dark:hover:text-[#F2F7F4]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Today</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('week')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              mode === 'week'
                ? 'bg-[#1B3B2F] text-white shadow-xs'
                : 'text-[#576560] dark:text-[#8BA398] hover:text-[#1C2A24] dark:hover:text-[#F2F7F4]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>This Week</span>
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search adventurers..."
            className="w-full bg-[#FAF8F5] dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] rounded-2xl pl-9 pr-4 py-2 text-xs text-[#1C2A24] dark:text-[#F2F7F4] placeholder-[#576560] dark:placeholder-[#6E8079] focus:outline-none focus:border-[#2B5A52]"
          />
          <Search className="w-3.5 h-3.5 text-[#576560] dark:text-[#8BA398] absolute left-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* 3. Signed-In User Standing Banner */}
      {currentUserEntry && (
        <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-[#E8F5EE] via-[#E8F5EE]/80 to-[#FAF8F5] dark:from-[#162420] dark:via-[#162420]/80 dark:to-[#0F1A16] border border-[#C8E6D5] dark:border-[#2B5246] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1B3B2F] text-white flex items-center justify-center text-lg font-black shadow-xs">
              {getAvatarEmoji(currentUserEntry.avatar)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                  Your Ranking
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#1B3B2F] text-white text-[10px] font-black tracking-wide uppercase">
                  Rank #{currentUserEntry.rank}
                </span>
              </div>
              <span className="text-[11px] text-[#576560] dark:text-[#8BA398] font-medium">
                {mode === 'week' ? 'Weekly Focus' : "Today's Focus"}:{' '}
                <strong className="text-[#1B3B2F] dark:text-[#A3D9C9] font-mono">
                  {formatStudyDuration(mode === 'week' ? currentUserEntry.weekMinutes : currentUserEntry.todayMinutes)}
                </strong>{' '}
                · {currentUserEntry.streak}d Streak
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleJumpToMyRow}
            className="flex items-center justify-center space-x-1 px-4 py-2 rounded-xl bg-white dark:bg-[#1C2E29] border border-[#C8E6D5] dark:border-[#2B5246] text-xs font-bold text-[#1B3B2F] dark:text-[#A3D9C9] hover:bg-[#D8EDE0] dark:hover:bg-[#253D35] transition cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Jump to My Row</span>
          </button>
        </div>
      )}

      {/* 4. Error State */}
      {error && (
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center space-x-3 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{error}</p>
          </div>
          <button
            onClick={() => fetchRankings(mode)}
            className="underline font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 5. Rankings Table */}
      <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] overflow-hidden shadow-sm">
        {loading ? (
          /* Loading Skeleton */
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center space-x-3.5">
                  <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800" />
                  <div className="space-y-1.5">
                    <div className="w-32 h-3.5 rounded bg-stone-200 dark:bg-stone-800" />
                    <div className="w-20 h-2.5 rounded bg-stone-200 dark:bg-stone-800" />
                  </div>
                </div>
                <div className="w-20 h-4 rounded bg-stone-200 dark:bg-stone-800" />
              </div>
            ))}
          </div>
        ) : displayedList.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF8F5] dark:bg-[#0F1A16] flex items-center justify-center text-xl shadow-xs">
              📜
            </div>
            <h4 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
              {searchQuery ? 'No Adventurers Found' : 'No Recorded Study Sessions Yet'}
            </h4>
            <p className="text-xs text-[#576560] dark:text-[#8BA398] max-w-sm mx-auto">
              {searchQuery
                ? `No adventurers matched "${searchQuery}". Try a different name.`
                : mode === 'today'
                ? 'Complete your first focus session today to claim the #1 spot on the leaderboard!'
                : 'Complete focus sessions this week to climb the community rankings!'}
            </p>
          </div>
        ) : (
          /* Real Ranking List */
          <div className="divide-y divide-[#EAE5DD] dark:divide-[#253D35]">
            {displayedList.map((item, index) => {
              const isCurrentUser = item.id === currentUserId || (currentUserId && item.id?.toString() === currentUserId.toString());
              const durationMinutes = mode === 'week' ? item.weekMinutes : item.todayMinutes;
              const formattedTime = formatStudyDuration(durationMinutes);

              // Top 3 Podium Badges
              const isRank1 = item.rank === 1;
              const isRank2 = item.rank === 2;
              const isRank3 = item.rank === 3;

              // Shared rank check
              const isTiedWithPrev = index > 0 && displayedList[index - 1].rank === item.rank;

              const hasInstagram = isValidInstagram(item.socialLinks?.instagram);
              const hasLinkedIn = isValidLinkedIn(item.socialLinks?.linkedin);

              // Showcase badges preview (max 3 on row)
              const showcaseList = (item.showcaseBadges || [])
                .map((bId) => BADGES_MAP[bId])
                .filter(Boolean)
                .slice(0, 3);

              return (
                <div
                  key={item.id || index}
                  ref={isCurrentUser ? userRowRef : null}
                  onClick={() => handleOpenUserProfile(item)}
                  className={`p-3.5 sm:p-4 flex items-center justify-between transition cursor-pointer group ${
                    isCurrentUser
                      ? 'bg-[#E8F5EE]/70 dark:bg-[#1C2E29]/90 border-l-4 border-l-[#1B3B2F] dark:border-l-[#A3D9C9]'
                      : 'hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29]/40'
                  }`}
                  title="Click to view adventurer mini-profile"
                >
                  {/* Left: Rank, Name, Badges & Social Links (No DP in row) */}
                  <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                    {/* Rank Number / Medal */}
                    <div className="w-9 flex-shrink-0 text-center">
                      {isRank1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 font-black text-sm shadow-2xs border border-amber-300 dark:border-amber-700">
                          🥇
                        </span>
                      ) : isRank2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm shadow-2xs border border-slate-300 dark:border-slate-700">
                          🥈
                        </span>
                      ) : isRank3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-black text-sm shadow-2xs border border-amber-300 dark:border-amber-800">
                          🥉
                        </span>
                      ) : (
                        <span className="text-xs font-black text-[#576560] dark:text-[#8BA398] font-mono">
                          #{item.rank}
                        </span>
                      )}
                      {isTiedWithPrev && (
                        <span className="block text-[8px] font-bold text-[#8A9791] dark:text-[#6E8079] -mt-0.5">
                          tied
                        </span>
                      )}
                    </div>

                    {/* Name, Field of Study, Badges & Social Links */}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4] truncate">
                          {item.name}
                        </span>

                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded-md bg-[#1B3B2F] text-white text-[9px] font-black uppercase tracking-wider flex-shrink-0">
                            YOU
                          </span>
                        )}

                        {/* Showcase Badges Preview */}
                        {showcaseList.length > 0 && (
                          <div className="hidden md:flex items-center space-x-1 flex-shrink-0 pl-1">
                            {showcaseList.map((badge) => (
                              <img
                                key={badge.id}
                                src={getBadgeAssetUrl(badge.fileName)}
                                alt={badge.name}
                                title={`${badge.name} (${badge.tier})`}
                                className="w-4 h-4 object-contain"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[11px] text-[#576560] dark:text-[#8BA398] font-medium truncate block">
                          {item.fieldOfStudy}
                        </span>

                        {/* Social Links Icons (Clickable without opening row modal) */}
                        {(hasInstagram || hasLinkedIn) && (
                          <div className="flex items-center space-x-1.5 flex-shrink-0 border-l border-[#EAE5DD] dark:border-[#253D35] pl-2">
                            {hasInstagram && (
                              <a
                                href={item.socialLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Open Instagram Profile"
                                className="text-[#576560] dark:text-[#8BA398] hover:text-rose-500 dark:hover:text-rose-400 transition"
                              >
                                <InstagramIcon className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {hasLinkedIn && (
                              <a
                                href={item.socialLinks.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Open LinkedIn Profile"
                                className="text-[#576560] dark:text-[#8BA398] hover:text-sky-600 dark:hover:text-sky-400 transition"
                              >
                                <LinkedInIcon className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Study Duration & Streak */}
                  <div className="flex items-center space-x-4 sm:space-x-6 text-right flex-shrink-0 pl-2">
                    {/* Focus Time */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#576560] dark:text-[#8BA398] block">
                        {mode === 'week' ? 'Week' : 'Today'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4] font-mono">
                        {formattedTime}
                      </span>
                    </div>

                    {/* Streak */}
                    <div className="hidden xs:block min-w-[50px]">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#576560] dark:text-[#8BA398] block">
                        Streak
                      </span>
                      <span className="text-xs sm:text-sm font-black text-[#D97724] dark:text-[#F59E0B] font-mono inline-flex items-center space-x-1 justify-end">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>{item.streak}d</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. Pagination / Load More Button */}
        {hasMore && !loading && (
          <div className="p-4 text-center border-t border-[#EAE5DD] dark:border-[#253D35] bg-[#FAF8F5]/50 dark:bg-[#0F1A16]/50">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setVisibleCount((prev) => prev + 30);
              }}
              className="inline-flex items-center space-x-1.5 px-6 py-2.5 rounded-2xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer shadow-xs"
            >
              <span>Show More Adventurers ({visibleCount} of {filteredRankings.length})</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          MINI-PROFILE MODAL (Clean, Game-Like, Clickable from Any Row)
          ========================================================================= */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] max-w-md w-full p-6 sm:p-7 shadow-xl space-y-5 animate-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-[#576560] dark:text-[#8BA398] hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Avatar & Header */}
            <div className="flex items-center space-x-3.5 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] flex items-center justify-center text-2xl shadow-xs">
                {getAvatarEmoji(selectedUser.avatar)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4] truncate">
                    {selectedUser.name}
                  </h3>
                  {selectedUser.id === currentUserId && (
                    <span className="px-2 py-0.5 rounded-full bg-[#1B3B2F] text-white text-[9px] font-black uppercase">
                      YOU
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#576560] dark:text-[#8BA398] font-medium block">
                  {selectedUser.fieldOfStudy}
                </span>

                {/* Social Links Row */}
                {(isValidInstagram(selectedUser.socialLinks?.instagram) ||
                  isValidLinkedIn(selectedUser.socialLinks?.linkedin)) && (
                  <div className="flex items-center space-x-2 mt-1.5">
                    {isValidInstagram(selectedUser.socialLinks?.instagram) && (
                      <a
                        href={selectedUser.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900 text-[11px] font-bold hover:bg-pink-100 transition"
                      >
                        <InstagramIcon className="w-3 h-3 text-pink-600" />
                        <span>Instagram</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    )}
                    {isValidLinkedIn(selectedUser.socialLinks?.linkedin) && (
                      <a
                        href={selectedUser.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900 text-[11px] font-bold hover:bg-sky-100 transition"
                      >
                        <LinkedInIcon className="w-3 h-3 text-sky-600" />
                        <span>LinkedIn</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Active Leaderboard Standing Pill */}
            <div className="p-3 rounded-2xl bg-[#E8F5EE] dark:bg-[#1C2E29] border border-[#C8E6D5] dark:border-[#2B5246] flex items-center justify-between text-xs font-bold text-[#1B3B2F] dark:text-[#A3D9C9]">
              <div className="flex items-center space-x-1.5">
                <Trophy className="w-4 h-4 text-amber-500 fill-current" />
                <span>
                  {mode === 'week' ? 'This Week Rank' : "Today's Rank"}:{' '}
                  <strong className="text-sm font-black">#{selectedUser.rank}</strong>
                </span>
              </div>
              <span className="text-[11px] text-[#576560] dark:text-[#8BA398] capitalize">
                {mode === 'week' ? 'Weekly Competition' : 'Daily Competition'}
              </span>
            </div>

            {/* Compact Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35]">
                <span className="text-[10px] font-extrabold uppercase text-[#576560] dark:text-[#8BA398] block">
                  Today's Focus
                </span>
                <span className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4] font-mono mt-0.5 block">
                  {formatStudyDuration(selectedUser.todayMinutes)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35]">
                <span className="text-[10px] font-extrabold uppercase text-[#576560] dark:text-[#8BA398] block">
                  This Week
                </span>
                <span className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4] font-mono mt-0.5 block">
                  {formatStudyDuration(selectedUser.weekMinutes)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35]">
                <span className="text-[10px] font-extrabold uppercase text-[#576560] dark:text-[#8BA398] block">
                  Current Streak
                </span>
                <span className="text-sm font-black text-[#D97724] dark:text-[#F59E0B] font-mono mt-0.5 inline-flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{selectedUser.streak} Days</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35]">
                <span className="text-[10px] font-extrabold uppercase text-[#576560] dark:text-[#8BA398] block">
                  Daily Average
                </span>
                <span className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4] font-mono mt-0.5 block">
                  {selectedUser.avgDailyMinutes > 0
                    ? `${formatStudyDuration(selectedUser.avgDailyMinutes)}`
                    : '—'}
                </span>
                <span className="text-[9px] text-[#8A9791] dark:text-[#6E8079]">
                  {selectedUser.activeDays > 0 ? `across ${selectedUser.activeDays} active days` : 'no session history'}
                </span>
              </div>
            </div>

            {/* User's Own Focus Level Bar (14-Day Rolling Focus Level) */}
            <div className="pt-1">
              <FocusLevelCard
                focusLevel={selectedUser.focusLevel}
                compact={true}
                isProfileView={true}
                title={`${selectedUser.name}'s Focus Level`}
              />
            </div>

            {/* Owned Badges Section */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                  <Award className="w-4 h-4 text-[#D97724]" />
                  <span>Adventurer Badges ({selectedUser.badges?.length || 0})</span>
                </div>
                {selectedUser.showcaseBadges?.length > 0 && (
                  <span className="text-[10px] text-[#576560] dark:text-[#8BA398]">
                    ⭐ {selectedUser.showcaseBadges.length} Showcase
                  </span>
                )}
              </div>

              {selectedUser.badges && selectedUser.badges.length > 0 ? (
                <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35]">
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                    {/* Prioritize showcase badges first */}
                    {[
                      ...new Set([
                        ...(selectedUser.showcaseBadges || []),
                        ...(selectedUser.badges || []),
                      ]),
                    ].map((badgeId) => {
                      const badge = BADGES_MAP[badgeId];
                      if (!badge) return null;
                      const isShowcased = selectedUser.showcaseBadges?.includes(badgeId);

                      return (
                        <div
                          key={badge.id}
                          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
                            isShowcased
                              ? 'bg-[#E8F5EE] dark:bg-[#1C2E29] border-[#1B3B2F] dark:border-[#2B5246] text-[#1B3B2F] dark:text-[#A3D9C9]'
                              : 'bg-white dark:bg-[#162420] border-[#EAE5DD] dark:border-[#253D35] text-[#1C2A24] dark:text-[#F2F7F4]'
                          }`}
                          title={`${badge.name} (${badge.tier}): ${badge.description}`}
                        >
                          <img
                            src={getBadgeAssetUrl(badge.fileName)}
                            alt={badge.name}
                            className="w-5 h-5 object-contain"
                          />
                          <span>{badge.name}</span>
                          {isShowcased && <span className="text-amber-500">⭐</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center rounded-2xl bg-[#FAF8F5] dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] text-xs text-[#576560] dark:text-[#8BA398]">
                  <span>No badges unlocked yet.</span>
                </div>
              )}
            </div>

            {/* Modal Bottom Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-full py-2.5 rounded-2xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
