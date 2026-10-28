import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  Cloud,
  RefreshCw,
  Film,
  Send,
  Wallet,
  PlayCircle,
  Check,
  ArrowUp,
  ArrowDown,
  Upload,
  Image as ImageIcon,
  KeyRound,
  ExternalLink,
  Tag,
} from 'lucide-react';
import type { Video, AppSettings, TelegramChannel } from '../types';
import { DEFAULT_CATEGORIES } from '../defaultData';
import { triggerHaptic, playAudioSound, openInTelegramInAppBrowser, openTelegramChatOrChannel } from '../utils/audio';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: Video[];
  settings: AppSettings;
  cloudSyncActive: boolean;
  onSaveVideo: (video: Video) => void;
  onDeleteVideo: (id: string) => void;
  onSaveSettings: (settings: AppSettings) => void;
  onForceCloudSync: () => void;
  onApproveSession: (videoId: string) => void;
  onResetDefaultVideos: () => void;
}

const STRICT_ADMIN_PASS = '526628';

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  videos,
  settings,
  cloudSyncActive,
  onSaveVideo,
  onDeleteVideo,
  onSaveSettings,
  onForceCloudSync,
  onApproveSession,
  onResetDefaultVideos,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);

  // Form State for Video Adding/Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accessType, setAccessType] = useState<'free' | 'premium'>('free');
  const [price, setPrice] = useState('৳50');
  const [title, setTitle] = useState('');
  const [episode, setEpisode] = useState('');
  const [category, setCategory] = useState('Bachelor Point');
  const [streamLink, setStreamLink] = useState('');
  const [downloadLink, setDownloadLink] = useState('');
  const [views, setViews] = useState('149');

  // Thumbnail upload mode: 'upload' or 'url'
  const [thumbMode, setThumbMode] = useState<'upload' | 'url'>('upload');
  const [thumbnailValue, setThumbnailValue] = useState('');
  const [thumbFileName, setThumbFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local copy of App Settings for editing
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  // New Category Input state
  const [newCategoryName, setNewCategoryName] = useState('');

  // New Channel Input state
  const [newChannelTitle, setNewChannelTitle] = useState('');
  const [newChannelLink, setNewChannelLink] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelRequired, setNewChannelRequired] = useState(true);

  // Clean reset on modal close/open
  useEffect(() => {
    if (!isOpen) {
      setIsAuthenticated(false);
      setPasswordInput('');
      setLoginError(false);
    } else {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  const availableCategories =
    localSettings.categories && localSettings.categories.length > 0
      ? localSettings.categories
      : DEFAULT_CATEGORIES;

  // Add Category Handler (Saves to state and Firebase)
  const handleAddCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (availableCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('এই ক্যাটাগরিটি ইতিমধ্যে তালিকায় বিদ্যমান রয়েছে!');
      return;
    }
    const updatedCategories = [...availableCategories, trimmed];
    const updatedSettings: AppSettings = {
      ...localSettings,
      categories: updatedCategories,
    };
    setLocalSettings(updatedSettings);
    setNewCategoryName('');
    onSaveSettings(updatedSettings);
    triggerHaptic('success');
    playAudioSound('click');
  };

  // Delete Category Handler (Saves to state and Firebase)
  const handleDeleteCategory = (catToDelete: string) => {
    if (availableCategories.length <= 1) {
      alert('কমপক্ষে একটি ক্যাটাগরি থাকা আবশ্যক!');
      return;
    }
    if (confirm(`আপনি কি "${catToDelete}" ক্যাটাগরিটি মুছে ফেলতে চান?`)) {
      const updatedCategories = availableCategories.filter((c) => c !== catToDelete);
      const updatedSettings: AppSettings = {
        ...localSettings,
        categories: updatedCategories,
      };
      setLocalSettings(updatedSettings);
      onSaveSettings(updatedSettings);
      triggerHaptic('medium');
      if (category === catToDelete) {
        setCategory(updatedCategories[0]);
      }
    }
  };

  if (!isOpen) return null;

  // Handle Password Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === STRICT_ADMIN_PASS) {
      triggerHaptic('success');
      playAudioSound('round');
      setIsAuthenticated(true);
      setLoginError(false);
      setLocalSettings(settings);
    } else {
      triggerHaptic('error');
      setLoginError(true);
    }
  };

  // Convert File to compressed Base64
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbFileName(file.name);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxWidth = 800;
          const maxHeight = 600;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const base64 = canvas.toDataURL('image/jpeg', 0.82);
            setThumbnailValue(base64);
            triggerHaptic('light');
          }
        };
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Video Form Submit
  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !thumbnailValue.trim() || !streamLink.trim()) {
      alert('ভিডিওর শিরোনাম, থাম্বনেইল এবং স্ট্রিম লিংক পূরণ করা আবশ্যক!');
      return;
    }

    const videoObj: Video = {
      id: editingId || `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      episode: episode.trim() || 'EP 01',
      category,
      accessType,
      price: accessType === 'premium' ? price.trim() || '৳50' : '',
      thumbnail: thumbnailValue.trim(),
      streamLink: streamLink.trim(),
      downloadLink: downloadLink.trim(),
      views: parseInt(views, 10) || 150,
      requiredRounds: localSettings.defaultRounds || 4,
      createdAt: editingId
        ? videos.find((v) => v.id === editingId)?.createdAt || Date.now()
        : Date.now(),
      updatedAt: Date.now(),
    };

    onSaveVideo(videoObj);
    triggerHaptic('success');
    playAudioSound('unlocked');

    // Reset Form
    resetVideoForm();
  };

  const resetVideoForm = () => {
    setEditingId(null);
    setTitle('');
    setEpisode('');
    setCategory('Bachelor Point');
    setAccessType('free');
    setPrice('৳50');
    setStreamLink('');
    setDownloadLink('');
    setViews('149');
    setThumbnailValue('');
    setThumbFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditVideo = (video: Video) => {
    setEditingId(video.id);
    setTitle(video.title);
    setEpisode(video.episode);
    setCategory(video.category);
    setAccessType(video.accessType);
    setPrice(video.price || '৳50');
    setStreamLink(video.streamLink);
    setDownloadLink(video.downloadLink || '');
    setViews(String(video.views));
    setThumbnailValue(video.thumbnail);
    if (video.thumbnail.startsWith('data:image/')) {
      setThumbMode('upload');
      setThumbFileName('সংরক্ষিত গ্যালারি ফাইল');
    } else {
      setThumbMode('url');
    }
    triggerHaptic('light');
  };

  // Channel Operations
  const handleAddChannel = () => {
    if (!newChannelTitle.trim() || !newChannelLink.trim()) {
      alert('চ্যানেলের নাম এবং টেলিগ্রাম লিংক উভয়ই দিন!');
      return;
    }

    let link = newChannelLink.trim();
    if (!link.startsWith('http')) {
      if (link.startsWith('t.me/')) link = 'https://' + link;
      else if (link.startsWith('@')) link = 'https://t.me/' + link.slice(1);
      else link = 'https://t.me/' + link;
    }

    const newCh: TelegramChannel = {
      id: `ch_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      title: newChannelTitle.trim(),
      link,
      desc: newChannelDesc.trim() || '👥 Official Telegram Channel',
      icon: 'telegram',
      gradient: 'from-pink-500 to-rose-600',
      verified: true,
      isRequiredForForceSub: newChannelRequired,
    };

    const updatedChannels = [...localSettings.telegramChannels, newCh];
    const updated = { ...localSettings, telegramChannels: updatedChannels };
    setLocalSettings(updated);
    onSaveSettings(updated);

    setNewChannelTitle('');
    setNewChannelLink('');
    setNewChannelDesc('');
    triggerHaptic('success');
  };

  const handleDeleteChannel = (id: string) => {
    if (confirm('এই চ্যানেলটি তালিকা থেকে মুছে ফেলতে চান?')) {
      const updatedChannels = localSettings.telegramChannels.filter((c) => c.id !== id);
      const updated = { ...localSettings, telegramChannels: updatedChannels };
      setLocalSettings(updated);
      onSaveSettings(updated);
      triggerHaptic('medium');
    }
  };

  const handleMoveChannel = (index: number, direction: 'up' | 'down') => {
    const channels = [...localSettings.telegramChannels];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= channels.length) return;

    const temp = channels[index];
    channels[index] = channels[targetIdx];
    channels[targetIdx] = temp;

    const updated = { ...localSettings, telegramChannels: channels };
    setLocalSettings(updated);
    onSaveSettings(updated);
    triggerHaptic('light');
  };

  const handleToggleChannelRequired = (id: string) => {
    const updatedChannels = localSettings.telegramChannels.map((c) =>
      c.id === id ? { ...c, isRequiredForForceSub: !c.isRequiredForForceSub } : c
    );
    const updated = { ...localSettings, telegramChannels: updatedChannels };
    setLocalSettings(updated);
    onSaveSettings(updated);
    triggerHaptic('light');
  };

  // Ad Slot Updates
  const handleAdSlotChange = (index: number, val: string) => {
    const slots = [...localSettings.adSlots];
    slots[index] = val;
    setLocalSettings({ ...localSettings, adSlots: slots, adsterraDirectLink: slots[0] || '' });
  };

  const handleSaveAllSettings = () => {
    onSaveSettings(localSettings);
    triggerHaptic('success');
    playAudioSound('unlocked');
    alert('সবগুলো সেটিংস সফলভাবে সংরক্ষিত হয়েছে! 🚀');
  };

  // --- PASSWORD LOCK SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="glass-card max-w-sm w-full p-6 rounded-3xl border border-pink-500/40 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Secret Admin Access</h3>
                <p className="text-[10px] text-gray-400">পাসওয়ার্ড ভেরিফিকেশন প্রয়োজন</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Admin Password (পাসওয়ার্ড দিন)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="পাসওয়ার্ড দিন..."
                  className="w-full pl-3 pr-10 py-2.5 bg-[#171728] border border-gray-700 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-pink-500 font-mono"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-xl p-2.5">
                ❌ ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-500/30 transition transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>লগইন করুন (Grant Access)</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- FULL ADMIN DASHBOARD MODAL ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto animate-fade-in">
      <div className="glass-card max-w-2xl w-full my-auto rounded-3xl border border-pink-500/40 shadow-2xl p-4 sm:p-6 space-y-5 max-h-[94vh] overflow-y-auto no-scrollbar">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-base shadow-md">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Secret Admin Panel</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  Authorized
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Manage Videos, Force Subscribe, 4 Adsterra Slots & Settings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#171728] border border-gray-700 hover:border-pink-500 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CLOUD FIRESTORE STATUS & MANUAL SYNC */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-purple-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm shadow-sm flex-shrink-0">
              <Cloud className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-emerald-300">
                  Firebase Firestore ক্লাউড সিঙ্ক: {cloudSyncActive ? 'সক্রিয়' : 'অফলাইন'}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono">
                  {videos.length} Posts
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                নতুন পোস্ট বা সেটিংস সব ইউজারের ডিভাইসে রিয়েল-টাইমে আপডেট হবে
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onForceCloudSync}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ml-auto"
            title="লোকাল স্টোরেজের সব ডাটা ক্লাউডে পুশ করুন"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>লোকাল ➔ ক্লাউড সিঙ্ক (Sync Now)</span>
          </button>
        </div>

        {/* 1. ADD / EDIT VIDEO POST */}
        <div className="p-4 rounded-2xl bg-[#141422] border border-pink-500/20 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-gray-800/80">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-4 h-4 text-pink-400" />
              {editingId ? 'ভিডিও এডিট করুন (Edit Video)' : 'নতুন ভিডিও যোগ করুন (Add Video)'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetVideoForm}
                className="text-[11px] text-gray-400 hover:text-white px-2 py-0.5 rounded bg-[#1c1c2e] cursor-pointer"
              >
                বাতিল করুন
              </button>
            )}
          </div>

          <form onSubmit={handleVideoSubmit} className="space-y-3 text-xs">
            {/* Access Type (Free vs Premium) */}
            <div className="p-3 rounded-xl bg-[#19192b] border border-gray-700/80 space-y-2">
              <label className="block font-bold text-gray-200">
                ভিডিও অ্যাক্সেস টাইপ (Video Access Type) <span className="text-pink-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-[#141424] border border-gray-700 cursor-pointer hover:border-pink-500">
                  <input
                    type="radio"
                    name="accessType"
                    value="free"
                    checked={accessType === 'free'}
                    onChange={() => setAccessType('free')}
                    className="accent-pink-500"
                  />
                  <span className="font-semibold text-gray-200">Free (4-Slot Ad Rotation)</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-[#141424] border border-gray-700 cursor-pointer hover:border-amber-500">
                  <input
                    type="radio"
                    name="accessType"
                    value="premium"
                    checked={accessType === 'premium'}
                    onChange={() => setAccessType('premium')}
                    className="accent-amber-500"
                  />
                  <span className="font-bold text-amber-300">👑 Premium (Paid VIP)</span>
                </label>
              </div>
            </div>

            {/* Premium Price */}
            {accessType === 'premium' && (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-1.5">
                <label className="block font-bold text-amber-300">
                  Premium Price (মূল্য)
                </label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. ৳50"
                  className="w-full px-3 py-2 bg-[#19192b] border border-amber-500/60 rounded-xl text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block font-semibold text-gray-300 mb-1">
                Video Title (ভিডিও শিরোনাম) <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bachelor Point Episode = 129"
                className="w-full px-3 py-2 bg-[#19192b] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500"
                required
              />
            </div>

            {/* Episode Badge & Category */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Episode Badge</label>
                <input
                  type="text"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  placeholder="e.g. EP 129 or VIP"
                  className="w-full px-3 py-2 bg-[#19192b] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-300 mb-1 flex items-center justify-between">
                  <span>Category (ক্যাটাগরি)</span>
                  <span className="text-[10px] text-pink-400 font-mono">
                    {availableCategories.length} Categories
                  </span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#19192b] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500 font-medium"
                >
                  {!availableCategories.includes(category) && category && (
                    <option value={category}>{category}</option>
                  )}
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* THUMBNAIL UPLOAD (Gallery / File & URL) */}
            <div className="space-y-2 p-3 rounded-2xl bg-[#18182b] border border-gray-700/80">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-200 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-pink-400" /> থাম্বনেইল ছবি (Thumbnail){' '}
                  <span className="text-pink-400">*</span>
                </label>
              </div>

              {/* Upload Mode Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#121220] border border-gray-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setThumbMode('upload')}
                  className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    thumbMode === 'upload'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>📁 গ্যালারি থেকে আপলোড</span>
                </button>
                <button
                  type="button"
                  onClick={() => setThumbMode('url')}
                  className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    thumbMode === 'url'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>🔗 ইমেজ লিংক (URL)</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              {thumbMode === 'upload' ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3.5 rounded-xl bg-[#141424] border-2 border-dashed border-pink-500/40 hover:border-pink-500 cursor-pointer text-center space-y-1 transition hover:bg-pink-500/5"
                  >
                    <Upload className="w-6 h-6 mx-auto text-pink-400" />
                    <p className="text-xs font-bold text-white">
                      গ্যালারি বা ডিভাইস থেকে ছবি বেছে নিন
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {thumbFileName ? `নির্বাচিত: ${thumbFileName}` : 'স্বয়ংক্রিয়ভাবে অপ্টিমাইজড Base64 তৈরি হবে'}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={thumbnailValue}
                    onChange={(e) => setThumbnailValue(e.target.value)}
                    placeholder="https://images.unsplash.com/... অথবা যেকোনো অনলাইন ইমেজ লিংক"
                    className="w-full px-3 py-2 bg-[#141424] border border-gray-700 rounded-xl text-white text-xs focus:outline-none focus:border-pink-500"
                  />
                </div>
              )}

              {/* Live Preview */}
              {thumbnailValue && (
                <div className="relative h-24 rounded-xl overflow-hidden border border-pink-500/40 bg-black/50">
                  <img src={thumbnailValue} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailValue('');
                      setThumbFileName('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/80 text-rose-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Stream & Download Links */}
            <div>
              <label className="block font-semibold text-gray-300 mb-1">
                Video / Telegram Stream Link <span className="text-pink-400">*</span>
              </label>
              <input
                type="url"
                value={streamLink}
                onChange={(e) => setStreamLink(e.target.value)}
                placeholder="https://t.me/bachelorpoint_bd/129"
                className="w-full px-3 py-2 bg-[#19192b] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500 font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Direct Download Link</label>
                <input
                  type="url"
                  value={downloadLink}
                  onChange={(e) => setDownloadLink(e.target.value)}
                  placeholder="https://...fast download"
                  className="w-full px-3 py-2 bg-[#19192b] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Views Count</label>
                <input
                  type="number"
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                  className="w-full px-3 py-2 bg-[#19192b] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-pink-500/20 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>{editingId ? 'আপডেট করুন (Save Changes)' : 'পোস্ট করুন (Publish Video)'}</span>
            </button>
          </form>
        </div>

        {/* 2. DYNAMIC CATEGORY MANAGEMENT SYSTEM */}
        <div className="p-4 rounded-2xl bg-[#141422] border border-pink-500/30 space-y-3.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <span>ডাইনামিক ক্যাটাগরি কন্ট্রোল (Category Management)</span>
                </h3>
                <p className="text-[10px] text-gray-400">
                  নতুন ক্যাটাগরি তৈরি ও ডিলিট করুন (Firebase ডেটাবেজে অটো সেভ হবে)
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30 text-[10px] font-bold font-mono">
              {availableCategories.length} Categories
            </span>
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="নতুন ক্যাটাগরির নাম লিখুন (e.g. Tamil Dubbed, K-Drama, Action)..."
              className="flex-1 px-3 py-2 bg-[#18182b] border border-gray-700 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>যোগ করুন (Add)</span>
            </button>
          </form>

          {/* Category Badges / Tags */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-gray-300 block">
              বিদ্যমান ক্যাটাগরি সমূহ (ডিলিট করতে 'x' চাপুন):
            </span>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {availableCategories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#19192c] border border-pink-500/30 text-gray-200 text-xs font-semibold hover:border-pink-400 transition"
                >
                  <Tag className="w-3 h-3 text-pink-400" />
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="w-4 h-4 ml-1 rounded-full bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                    title={`"${cat}" ক্যাটাগরি ডিলিট করুন`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 pt-1">
              💡 এই ক্যাটাগরিগুলো হোমপেজের ক্যাটাগরি ফিল্টার এবং পোস্ট আপলোডের ড্রপডাউনে স্বয়ংক্রিয়ভাবে দৃশ্যমান হবে।
            </p>
          </div>
        </div>

        {/* 3. ADSTERRA 4-SLOT ROTATION MANAGEMENT */}
        <div className="p-4 rounded-2xl bg-[#141422] border border-amber-500/30 space-y-3.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-400" />
              <div>
                <span className="font-black text-amber-300 text-xs sm:text-sm">
                  Adsterra Multi-Ad Management (4 Slots)
                </span>
                <p className="text-[10px] text-gray-400">
                  Telegram In-App ব্রাউজারে ৪টি ভিন্ন এড লিংক ধারাবাহিকভাবে রোটেট হবে
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((slotIdx) => (
              <div key={slotIdx} className="p-2.5 rounded-xl bg-[#18182b] border border-gray-800">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-pink-500/20 text-pink-400 flex items-center justify-center text-[10px] font-mono font-bold">
                      {slotIdx + 1}
                    </span>
                    Ad Slot {slotIdx + 1} (Step {slotIdx + 1})
                  </label>
                  <button
                    type="button"
                    onClick={() => openInTelegramInAppBrowser(localSettings.adSlots[slotIdx])}
                    className="text-[10px] text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-2.5 h-2.5" /> টেস্ট ওপেন
                  </button>
                </div>
                <input
                  type="url"
                  value={localSettings.adSlots[slotIdx] || ''}
                  onChange={(e) => handleAdSlotChange(slotIdx, e.target.value)}
                  placeholder={`https://www.profitablecpmrate.com/slot${slotIdx + 1}_link...`}
                  className="w-full px-3 py-2 bg-[#121220] border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSaveAllSettings}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-extrabold rounded-xl text-xs transition shadow-md shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save All 4 Ad Slots</span>
          </button>
        </div>

        {/* 3. DYNAMIC FORCE SUBSCRIBE & TELEGRAM CHANNELS CRUD */}
        <div className="p-4 rounded-2xl bg-[#141422] border border-pink-500/30 space-y-3.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="font-bold text-pink-300 text-xs sm:text-sm">
                  টেলিগ্রাম চ্যানেল ও ফোর্স সাবস্ক্রাইব কন্ট্রোল
                </span>
                <p className="text-[10px] text-gray-400">
                  ৩-৫টি চ্যানেল ডাইনামিকভাবে কন্ট্রোল করুন
                </p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              {localSettings.telegramChannels.length} Channels
            </span>
          </div>

          {/* Force Subscribe Settings */}
          <div className="p-3 rounded-xl bg-[#18182b] border border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-gray-200">ফোর্স সাবস্ক্রাইব সক্রিয় (Force Subscribe Enabled)</label>
              <input
                type="checkbox"
                checked={localSettings.forceSubscribeEnabled}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, forceSubscribeEnabled: e.target.checked })
                }
                className="w-4 h-4 accent-pink-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="text-gray-300">বাধ্যতামূলক চ্যানেলের সংখ্যা (Required Count):</label>
              <select
                value={localSettings.requiredChannelsCount}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    requiredChannelsCount: parseInt(e.target.value, 10),
                  })
                }
                className="px-2.5 py-1 bg-[#121220] border border-gray-700 rounded-lg text-white font-bold"
              >
                <option value={3}>3 Channels</option>
                <option value={4}>4 Channels</option>
                <option value={5}>5 Channels</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="text-gray-300">অ্যাড স্টেপ সংখ্যা (Ad Steps Required):</label>
              <select
                value={localSettings.defaultRounds || 4}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    defaultRounds: parseInt(e.target.value, 10),
                  })
                }
                className="px-2.5 py-1 bg-[#121220] border border-gray-700 rounded-lg text-white font-bold"
              >
                <option value={2}>2 Steps</option>
                <option value={3}>3 Steps</option>
                <option value={4}>4 Steps (Default)</option>
                <option value={5}>5 Steps</option>
              </select>
            </div>
          </div>

          {/* Add New Channel */}
          <div className="p-3 rounded-xl bg-[#18182b] border border-pink-500/25 space-y-2.5">
            <span className="font-bold text-gray-200 block text-[11px]">
              ➕ নতুন টেলিগ্রাম চ্যানেল যোগ করুন:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newChannelTitle}
                onChange={(e) => setNewChannelTitle(e.target.value)}
                placeholder="চ্যানেল নাম (e.g. Viral ZONE Hub)"
                className="px-2.5 py-1.5 bg-[#121220] border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-pink-500"
              />
              <input
                type="url"
                value={newChannelLink}
                onChange={(e) => setNewChannelLink(e.target.value)}
                placeholder="https://t.me/channel_invite"
                className="px-2.5 py-1.5 bg-[#121220] border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={newChannelDesc}
                onChange={(e) => setNewChannelDesc(e.target.value)}
                placeholder="বিবরণ (e.g. 👥 50K Members)"
                className="flex-1 px-2.5 py-1.5 bg-[#121220] border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-pink-500"
              />
              <label className="flex items-center gap-1.5 text-[11px] text-gray-300">
                <input
                  type="checkbox"
                  checked={newChannelRequired}
                  onChange={(e) => setNewChannelRequired(e.target.checked)}
                  className="accent-pink-500 cursor-pointer"
                />
                <span>Mandatory</span>
              </label>
              <button
                type="button"
                onClick={handleAddChannel}
                className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-lg cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* Channels List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-300 block">
              বিদ্যমান চ্যানেল তালিকা:
            </span>
            {localSettings.telegramChannels.map((ch, idx) => (
              <div
                key={ch.id}
                className="p-2.5 rounded-xl bg-[#18182b] border border-gray-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-pink-400">#{idx + 1}</span>
                    <h5 className="font-bold text-white truncate text-xs">{ch.title}</h5>
                    {ch.isRequiredForForceSub && (
                      <span className="text-[9px] bg-pink-500/20 text-pink-300 px-1.5 rounded">
                        Mandatory
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono truncate">{ch.link}</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleChannelRequired(ch.id)}
                    className={`px-2 py-0.5 text-[10px] rounded cursor-pointer ${
                      ch.isRequiredForForceSub
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-gray-700/50 text-gray-400'
                    }`}
                  >
                    {ch.isRequiredForForceSub ? 'Required' : 'Optional'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveChannel(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveChannel(idx, 'down')}
                    disabled={idx === localSettings.telegramChannels.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteChannel(ch.id)}
                    className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. PAYMENT & WHATSAPP SETTINGS */}
        <div className="p-4 rounded-2xl bg-[#141422] border border-pink-500/30 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-800">
            <span className="font-bold text-pink-300 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-pink-400" /> পেমেন্ট ও হোয়াটসঅ্যাপ সেটিংস
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#18182b] border border-pink-500/20 space-y-1">
              <label className="text-[11px] font-bold text-pink-300">bKash Account Number</label>
              <input
                type="text"
                value={localSettings.bkashNumber}
                onChange={(e) => setLocalSettings({ ...localSettings, bkashNumber: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#121220] border border-gray-700 rounded-lg text-white font-mono"
              />
            </div>
            <div className="p-2.5 rounded-xl bg-[#18182b] border border-orange-500/20 space-y-1">
              <label className="text-[11px] font-bold text-orange-300">Nagad Account Number</label>
              <input
                type="text"
                value={localSettings.nagadNumber}
                onChange={(e) => setLocalSettings({ ...localSettings, nagadNumber: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#121220] border border-gray-700 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#18182b] border border-emerald-500/20 space-y-1">
              <label className="text-[11px] font-bold text-emerald-300">
                WhatsApp Admin (Country code সহ)
              </label>
              <input
                type="text"
                value={localSettings.whatsappNumber}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, whatsappNumber: e.target.value })
                }
                className="w-full px-3 py-1.5 bg-[#121220] border border-gray-700 rounded-lg text-white font-mono"
              />
            </div>
            <div className="p-2.5 rounded-xl bg-[#18182b] border border-purple-500/20 space-y-1">
              <label className="text-[11px] font-bold text-purple-300">
                Time-Lock Session Duration (Minutes)
              </label>
              <input
                type="number"
                value={localSettings.sessionDurationMinutes}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    sessionDurationMinutes: parseInt(e.target.value, 10) || 10,
                  })
                }
                className="w-full px-3 py-1.5 bg-[#121220] border border-gray-700 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          {/* Tutorial URL */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-purple-300">
              YouTube Tutorial Embed Video URL
            </label>
            <input
              type="url"
              value={localSettings.tutorialVideoUrl}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, tutorialVideoUrl: e.target.value })
              }
              className="w-full px-3 py-1.5 bg-[#121220] border border-gray-700 rounded-lg text-white font-mono"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveAllSettings}
            className="w-full py-2.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Save All Settings
          </button>
        </div>

        {/* 5. EXISTING VIDEOS LIST */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white uppercase tracking-wider">
              বিদ্যমান ভিডিও তালিকা ({videos.length})
            </h4>
            <button
              type="button"
              onClick={onResetDefaultVideos}
              className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 text-[10px] cursor-pointer"
            >
              Reset Default Videos
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
            {videos.map((v) => (
              <div
                key={v.id}
                className="p-2.5 rounded-xl bg-[#18182b] border border-gray-800 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-12 h-9 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                    <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-white truncate text-[11px]">{v.title}</h5>
                    <p className="text-[10px] text-gray-400">
                      {v.episode} • {v.category} • {v.accessType === 'premium' ? '👑 VIP' : 'Free'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {v.accessType === 'premium' && (
                    <button
                      type="button"
                      onClick={() => onApproveSession(v.id)}
                      className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black font-bold text-[10px] cursor-pointer"
                    >
                      + 10m Session
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEditVideo(v)}
                    className="p-1.5 text-pink-400 hover:bg-pink-500/20 rounded cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteVideo(v.id)}
                    className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
