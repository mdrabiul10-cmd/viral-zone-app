import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import type { TelegramChannel } from '../types';
import { triggerHaptic, playAudioSound, openTelegramChatOrChannel } from '../utils/audio';

interface ForceSubscribeModalProps {
  isOpen: boolean;
  videoId?: string;
  videoTitle?: string;
  channels: TelegramChannel[];
  requiredCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const ForceSubscribeModal: React.FC<ForceSubscribeModalProps> = ({
  isOpen,
  videoId,
  videoTitle,
  channels,
  requiredCount,
  onClose,
  onSuccess,
}) => {
  // CRITICAL REQUIREMENT: Independent & Mandatory per post!
  // NO LocalStorage caching! Resets completely fresh for every post visit!
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [attemptedContinue, setAttemptedContinue] = useState(false);

  // Reset fresh state every time a new video or modal is opened
  useEffect(() => {
    if (isOpen) {
      setJoinedIds([]);
      setShowErrorPopup(false);
      setAttemptedContinue(false);
    }
  }, [isOpen, videoId]);

  if (!isOpen) return null;

  // Determine required channels count (dynamically controlled from Admin: 3 to 5 channels)
  const countToRequire = Math.max(3, Math.min(5, requiredCount || 3));

  // Prioritize channels marked as isRequiredForForceSub, then fallback to list order
  let mandatoryChannels = channels.filter((c) => c.isRequiredForForceSub);
  if (mandatoryChannels.length < countToRequire) {
    const additional = channels.filter((c) => !c.isRequiredForForceSub);
    mandatoryChannels = [...mandatoryChannels, ...additional].slice(0, countToRequire);
  } else {
    mandatoryChannels = mandatoryChannels.slice(0, countToRequire);
  }

  // Handle User clicking "JOIN"
  const handleJoinClick = (channel: TelegramChannel) => {
    triggerHaptic('medium');
    playAudioSound('click');

    // Open channel in Telegram app or browser
    openTelegramChatOrChannel(channel.link);

    // Record as joined in memory for this post session only
    if (!joinedIds.includes(channel.id)) {
      setJoinedIds((prev) => [...prev, channel.id]);
    }

    setShowErrorPopup(false);
  };

  // Handle User clicking "Continue"
  const handleContinueClick = () => {
    setAttemptedContinue(true);

    // Strict validation: every single mandatory channel must be visited/joined
    const allJoined = mandatoryChannels.every((c) => joinedIds.includes(c.id));

    if (!allJoined) {
      triggerHaptic('error');
      playAudioSound('tick');
      // Exact user-requested Bengali popup alert:
      setShowErrorPopup(true);
      return;
    }

    // Success! Advance to Ad & Step flow
    triggerHaptic('success');
    playAudioSound('round');
    setShowErrorPopup(false);
    onSuccess();
  };

  const completedCount = mandatoryChannels.filter((c) => joinedIds.includes(c.id)).length;
  const progressPercent = Math.round((completedCount / mandatoryChannels.length) * 100);

  return (
    <>
      {/* ================= MAIN FORCE SUBSCRIBE MODAL ================= */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="glass-card max-w-md w-full p-4 sm:p-5 rounded-3xl border border-pink-500/40 shadow-2xl relative overflow-hidden space-y-3.5 max-h-[92vh] flex flex-col">
          {/* Ambient Glows */}
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>

          {/* Modal Header */}
          <div className="flex items-start justify-between pb-3 border-b border-gray-800 relative flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-black text-white">
                    চ্যানেল ফোর্স সাবস্ক্রাইব
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-extrabold text-[9px] border border-pink-500/30 uppercase">
                    POST LOCK
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  প্রতিটি ভিডিও দেখতে বাধ্যতামূলক চ্যানেলগুলোতে জয়েন করতে হবে
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Video Title Header Pill */}
          {videoTitle && (
            <div className="px-3 py-2 rounded-xl bg-[#141424] border border-gray-800 text-[11px] flex items-center justify-between text-gray-300 flex-shrink-0">
              <span className="text-gray-400 truncate max-w-[70%]">
                টার্গেট ভিডিও: <b className="text-white">{videoTitle}</b>
              </span>
              <span className="text-pink-400 font-bold text-[10px] flex items-center gap-1">
                <Flame className="w-3 h-3 text-pink-400" /> সিকিউর লক
              </span>
            </div>
          )}

          {/* Real-time Join Progress Tracker */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-[#141426] border border-pink-500/20 flex-shrink-0">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-300 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-pink-400" /> জয়েনিং অগ্রগতি:
              </span>
              <span
                className={`font-mono font-extrabold ${
                  completedCount === mandatoryChannels.length
                    ? 'text-emerald-400'
                    : 'text-pink-400'
                }`}
              >
                {completedCount} / {mandatoryChannels.length} চ্যানেল
              </span>
            </div>
            <div className="w-full h-2 bg-[#1a1a2e] rounded-full overflow-hidden p-0.5 border border-gray-800">
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Mandatory Channels List */}
          <div className="space-y-2.5 overflow-y-auto pr-1 no-scrollbar flex-1">
            {mandatoryChannels.map((ch, idx) => {
              const isJoined = joinedIds.includes(ch.id);
              const isMissingAfterAttempt = attemptedContinue && !isJoined;

              return (
                <div
                  key={ch.id}
                  className={`p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                    isJoined
                      ? 'bg-emerald-950/25 border-emerald-500/50 shadow-sm'
                      : isMissingAfterAttempt
                      ? 'bg-rose-950/20 border-rose-500/60 shadow-md shadow-rose-950/40 animate-pulse'
                      : 'bg-[#161628] border-gray-800 hover:border-pink-500/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center flex-shrink-0 font-mono ${
                        isJoined
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isMissingAfterAttempt
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {ch.title}
                        </h4>
                        {ch.verified && (
                          <CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate">
                        {ch.desc || '👥 Official Telegram Channel'}
                      </p>
                    </div>
                  </div>

                  {/* Join / Joined Button */}
                  <button
                    type="button"
                    onClick={() => handleJoinClick(ch)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                      isJoined
                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500 hover:text-white'
                        : isMissingAfterAttempt
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-bounce'
                        : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-md shadow-pink-500/30 active:scale-95'
                    }`}
                  >
                    {isJoined ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Joined ✓</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3 h-3" />
                        <span>JOIN</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Modal Bottom: Continue Button */}
          <div className="pt-2 border-t border-gray-800 space-y-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleContinueClick}
              className={`w-full py-3.5 px-4 rounded-2xl text-white font-extrabold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer active:scale-98 ${
                completedCount === mandatoryChannels.length
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/30'
                  : 'btn-glow-pink'
              }`}
            >
              <span>কন্টিনিউ করুন (Continue)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-center text-gray-400">
              সবগুলো চ্যানেলে জয়েন করে কন্টিনিউ করলেই পরবর্তী অ্যাড এবং ডাউনলোড স্টেপে প্রবেশ করবেন।
            </p>
          </div>
        </div>
      </div>

      {/* ================= POPUP ALERT MODAL (Requirement #2) ================= */}
      {showErrorPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-scale-up">
          <div className="glass-card max-w-sm w-full p-5 sm:p-6 rounded-3xl border-2 border-rose-500/70 shadow-2xl text-center space-y-4 bg-gradient-to-b from-[#20101b] to-[#12121e]">
            {/* Warning Icon with Pulsing Glow */}
            <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-950/60">
              <AlertTriangle className="w-8 h-8 animate-bounce text-rose-400" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white flex items-center justify-center gap-1.5">
                <span>সাবস্ক্রাইব সতর্কবার্তা!</span>
              </h3>
              {/* Exact user-requested popup text */}
              <p className="text-xs sm:text-sm font-bold text-rose-200 leading-relaxed px-1">
                "বাধ্যতামূলক চ্যানেলগুলোতে জয়েন করেই তারপর কন্টিনিউ করুন!"
              </p>
            </div>

            <p className="text-[11px] text-gray-400">
              বাকি থাকা চ্যানেলগুলোর পাশের <b>JOIN</b> বাটনে ক্লিক করে জয়েন নিশ্চিত করুন।
            </p>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowErrorPopup(false);
              }}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-500/30 transition transform active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>বুঝেছি (আমি জয়েন করছি)</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
