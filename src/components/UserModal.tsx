import React from 'react';
import { X, User, Shield, MessageCircle, Code2, ExternalLink } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdmin: () => void;
  whatsappNumber: string;
  user: {
    id?: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  } | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onOpenAdmin,
  whatsappNumber,
  user,
}) => {
  if (!isOpen) return null;

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'User'
    : 'Telegram User';

  const username = user?.username ? `@${user.username}` : `ID: ${user?.id || '12345'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card max-w-sm w-full p-5 rounded-3xl border border-pink-500/30 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400" /> Telegram Mini App Info
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#171728] border border-gray-800">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-lg text-white overflow-hidden shadow-md">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{fullName}</h4>
              <p className="text-pink-400 font-mono text-[11px] truncate">{username}</p>
              <span className="text-[10px] text-gray-400">Telegram WebApp v7.0</span>
            </div>
          </div>

          <div className="space-y-2 p-3 rounded-xl bg-[#141422] border border-gray-800/80 text-[11px] text-gray-400">
            <div className="flex justify-between items-center">
              <span>Status:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>WhatsApp Admin:</span>
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 underline font-mono flex items-center gap-1"
              >
                <MessageCircle className="w-3 h-3" />
                <span>+{whatsappNumber}</span>
              </a>
            </div>
            <div className="flex justify-between items-center">
              <span>Admin Panel:</span>
              <button
                onClick={() => {
                  onClose();
                  onOpenAdmin();
                }}
                className="text-pink-300 font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                <Shield className="w-3 h-3" />
                <span>Protected</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-pink-500/20 hover:bg-pink-500 text-pink-200 hover:text-white border border-pink-500/40 text-center font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4" /> Open Admin Panel
            </button>
            <div className="text-center pt-1.5 border-t border-gray-800/80 text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
              <Code2 className="w-3 h-3 text-pink-400" />
              <span className="neon-text-gradient font-black">Developer by Rabiul</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
