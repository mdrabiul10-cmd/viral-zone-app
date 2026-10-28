import React from 'react';
import { Play, Lock, Check, Crown, Heart, Link as LinkIcon, Eye } from 'lucide-react';
import type { Video } from '../types';
import { triggerHaptic } from '../utils/audio';

interface VideoCardProps {
  video: Video;
  isUnlocked: boolean;
  isFavorite: boolean;
  isSessionActive: boolean;
  sessionRemainingText?: string;
  onSelect: (video: Video) => void;
  onToggleFavorite: (e: React.MouseEvent, videoId: string) => void;
  onCopyLink: (e: React.MouseEvent, videoId: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isUnlocked,
  isFavorite,
  isSessionActive,
  sessionRemainingText,
  onSelect,
  onToggleFavorite,
  onCopyLink,
}) => {
  const isPremium = video.accessType === 'premium';

  return (
    <div
      onClick={() => {
        triggerHaptic('light');
        onSelect(video);
      }}
      className={`glass-card rounded-2xl overflow-hidden border ${
        isPremium
          ? 'border-amber-500/40 hover:border-amber-400'
          : isUnlocked
          ? 'border-emerald-500/40 hover:border-emerald-400'
          : 'border-gray-800/80 hover:border-pink-500/50'
      } transition-all duration-300 flex flex-col cursor-pointer group relative`}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-[4/3] w-full bg-[#181828] overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Top-Left Badge: Price Tag if Premium or Episode Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
          {isPremium ? (
            <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-black text-[10px] tracking-tight shadow-md flex items-center gap-1">
              <Crown className="w-3 h-3 fill-black" /> {video.price || '৳50'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-white font-extrabold text-[10px] tracking-tight">
              {video.episode}
            </span>
          )}
        </div>

        {/* Top-Right: Lock / Check / Favorite / Copy Link */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {isUnlocked ? (
            <span
              className="w-6 h-6 rounded-full bg-emerald-500/90 text-white flex items-center justify-center text-[10px] shadow-md"
              title="Unlocked"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
          ) : isPremium ? (
            <span
              className="w-6 h-6 rounded-full bg-black/80 backdrop-blur-md border border-amber-500 text-amber-400 flex items-center justify-center text-[10px] shadow-md"
              title="Premium VIP"
            >
              <Crown className="w-3.5 h-3.5 fill-amber-400" />
            </span>
          ) : (
            <span
              className="w-6 h-6 rounded-full bg-black/75 backdrop-blur-md border border-pink-500/40 text-pink-400 flex items-center justify-center text-[10px] shadow-md"
              title="Locked"
            >
              <Lock className="w-3 h-3" />
            </span>
          )}

          {/* Favorite Button */}
          <button
            type="button"
            onClick={(e) => onToggleFavorite(e, video.id)}
            className="w-6 h-6 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white hover:text-rose-500 flex items-center justify-center text-[11px] transition shadow-md cursor-pointer"
            title="Bookmark Favorite"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                isFavorite ? 'text-rose-500 fill-rose-500' : 'text-gray-300'
              }`}
            />
          </button>

          {/* Quick Copy Link Button */}
          <button
            type="button"
            onClick={(e) => onCopyLink(e, video.id)}
            className="w-6 h-6 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white hover:text-cyan-400 flex items-center justify-center text-[10px] transition shadow-md cursor-pointer"
            title="Copy Direct Link"
          >
            <LinkIcon className="w-3 h-3" />
          </button>
        </div>

        {/* Center Play Indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-10 h-10 rounded-full bg-black/55 backdrop-blur-sm border border-white/20 flex items-center justify-center ${
              isPremium
                ? 'text-amber-400 group-hover:bg-amber-500 group-hover:text-black'
                : 'text-pink-400 group-hover:bg-pink-500 group-hover:text-white'
            } text-sm group-hover:scale-110 transition-all shadow-lg`}
          >
            <Play className="w-4 h-4 ml-0.5 fill-current" />
          </div>
        </div>

        {/* Active 10-Minute Session Live Indicator */}
        {isSessionActive && (
          <div className="absolute bottom-1.5 left-2 right-2 px-2 py-0.5 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-[9px] text-emerald-300 font-bold flex items-center justify-between shadow-md">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              SESSION ACTIVE
            </span>
            <span className="font-mono text-emerald-200">
              {sessionRemainingText || '10m'}
            </span>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
        <h3
          className={`text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight ${
            isPremium ? 'group-hover:text-amber-300' : 'group-hover:text-pink-300'
          } transition-colors`}
          title={video.title}
        >
          {video.title}
        </h3>

        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-800/80 text-[10px]">
          <span
            className={`${
              isPremium ? 'text-amber-400 font-bold' : 'text-pink-400 font-semibold'
            } truncate max-w-[50%]`}
          >
            {isPremium ? '👑 Premium' : `🔥 ${video.category}`}
          </span>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-gray-400 flex items-center gap-1 text-[10px]">
              <Eye className="w-2.5 h-2.5" /> {video.views}
            </span>
            <button
              type="button"
              onClick={(e) => onCopyLink(e, video.id)}
              className="px-2 py-0.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/30 text-pink-300 hover:text-white border border-pink-500/30 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
              title="Copy Direct Link"
            >
              <LinkIcon className="w-2.5 h-2.5" />
              <span>Copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
