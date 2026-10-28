import React, { useState, useEffect } from 'react';
import { Zap, Shield, User, Cloud } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface HeaderProps {
  onOpenAdmin: () => void;
  onOpenUserModal: () => void;
  cloudSyncActive: boolean;
  user: {
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  } | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAdmin,
  onOpenUserModal,
  cloudSyncActive,
  user,
}) => {
  const [onlineCount, setOnlineCount] = useState(2);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setOnlineCount(Math.floor(Math.random() * 4) + 2);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleBrandClick = () => {
    triggerHaptic('light');
    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= 5) {
      setClickCount(0);
      onOpenAdmin();
    } else {
      setTimeout(() => setClickCount(0), 2000);
    }
  };

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'User'
    : 'Guest User';

  return (
    <header className="sticky top-0 z-40 bg-[#09090f]/95 backdrop-blur-xl border-b border-pink-500/20 px-3.5 py-2.5 sm:px-5">
      <div className="max-w-md mx-auto sm:max-w-2xl flex items-center justify-between">
        {/* Brand & Online Status (Tap logo 5 times for Secret Admin) */}
        <div
          onClick={handleBrandClick}
          className="flex flex-col select-none cursor-pointer group"
          title="Viral ZONE (Tap 5 times for Admin)"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-pink-500 fill-pink-500 animate-pulse" />
              Viral <span className="neon-text-gradient">ZONE</span>
            </span>
          </div>
          {/* Live Online & Cloud Sync Badges */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
              ● {onlineCount} ONLINE
            </span>
            <span className="text-gray-600 text-[10px]">•</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 border ${
                cloudSyncActive
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
              }`}
              title={cloudSyncActive ? 'Firebase Cloud Firestore Live Sync Active' : 'Offline / Local Cache'}
            >
              <Cloud className="w-2.5 h-2.5" />
              <span>{cloudSyncActive ? 'CLOUD LIVE' : 'LOCAL CACHE'}</span>
            </span>
          </div>
        </div>

        {/* Right Header Actions: Admin Shortcut & Telegram Dynamic User Profile */}
        <div className="flex items-center gap-2">
          {/* Secret Admin Panel Trigger Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenAdmin();
            }}
            className="w-8 h-8 rounded-full bg-[#181828] border border-gray-700/80 hover:border-pink-500/60 flex items-center justify-center text-gray-300 hover:text-pink-400 transition"
            title="Admin Panel"
          >
            <Shield className="w-4 h-4" />
          </button>

          {/* Telegram User Profile Pill */}
          <div
            onClick={() => {
              triggerHaptic('light');
              onOpenUserModal();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#151524] border border-pink-500/30 hover:border-pink-500/60 cursor-pointer transition select-none"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white overflow-hidden shadow-sm">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="text-xs font-semibold text-gray-200 max-w-[85px] sm:max-w-[120px] truncate">
              {fullName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
