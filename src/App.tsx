/**
 * Viral ZONE - Telegram Mini App
 * Complete User-Friendly Flow:
 * 1. Step 1: Channel Force Subscribe (Dynamic 3-5 channels) -> User joins all channels -> Clicks Continue.
 *    If any channel is not joined, displays popup alert: "বাধ্যতামূলক চ্যানেলগুলোতে জয়েন করেই তারপর কন্টিনিউ করুন!"
 * 2. Step 2: Ad & Step Flow (Adsterra steps with 5-to-0 second countdown popup modal).
 * 3. Step 3: Final Continue button ("🎁 আনলক করুন ও দেখুন") -> Confetti celebration + initiates 10-minute session.
 * 4. Step 4: 10-Minute Time-Lock Session tracked via LocalStorage. Zero ads for 10 minutes. Automatically re-locks after 10 minutes.
 * 5. Secret Admin Panel, Dynamic Channels & Ad control, Firebase Firestore real-time sync, and Copy Link.
 */

import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Search,
  X,
  Play,
  Heart,
  Share2,
  Clock,
  Sparkles,
  Link as LinkIcon,
  Crown,
  Lock,
  LockOpen,
  ArrowLeft,
  CheckCircle2,
  Hourglass,
  Film,
  Send,
  MessageCircle,
  Code2,
  ArrowRight,
  Download,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { Video, AppSettings } from './types';
import {
  DEFAULT_VIDEOS,
  DEFAULT_SETTINGS,
  DEFAULT_CATEGORIES,
} from './defaultData';
import {
  saveVideoToCloud,
  deleteVideoFromCloud,
  saveSettingsToCloud,
  subscribeToVideos,
  subscribeToSettings,
} from './firebase';
import {
  triggerHaptic,
  playAudioSound,
  openInTelegramInAppBrowser,
  openTelegramChatOrChannel,
} from './utils/audio';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { VideoCard } from './components/VideoCard';
import { AdCountdownModal } from './components/AdCountdownModal';
import { AdminModal } from './components/AdminModal';
import { UserModal } from './components/UserModal';

const STORAGE_KEY_VIDEOS = 'viralzone_videos';
const STORAGE_KEY_SETTINGS = 'viralzone_settings';
const STORAGE_KEY_FAVORITES = 'viralzone_favorites';
const STORAGE_KEY_SESSIONS = 'viralzone_unlocked_sessions'; // { [videoId]: expiresAtTimestamp }
const STORAGE_KEY_ROUNDS = 'viralzone_ad_rounds'; // { [videoId]: number }
const STORAGE_KEY_ACTIVE_POST = 'viralzone_active_post_id';
const STORAGE_KEY_CHANNEL_VERIFIED = 'viralzone_channel_verified';
const STORAGE_KEY_JOINED_CHANNELS = 'viralzone_joined_channels_v2';
const STORAGE_KEY_PENDING_AD = 'viralzone_pending_ad';

export default function App() {
  // --- APPLICATION STATE ---
  const [videos, setVideos] = useState<Video[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VIDEOS);
      return saved ? JSON.parse(saved) : DEFAULT_VIDEOS;
    } catch {
      return DEFAULT_VIDEOS;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FAVORITES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active 10-Minute Sessions: { [videoId]: number (expiresAt in ms) }
  const [sessions, setSessions] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Completed Ad Rounds per video: { [videoId]: number }
  const [adRounds, setAdRounds] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROUNDS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Post-wise Channel Join state (Persisted so returning from external ad/channel never kicks user out):
  const [channelVerifiedVideos, setChannelVerifiedVideos] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHANNEL_VERIFIED);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [joinedChannelsPerVideo, setJoinedChannelsPerVideo] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_JOINED_CHANNELS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // UI Navigation & Filters
  const [currentTab, setCurrentTab] = useState<'home' | 'detail' | 'unlocked' | 'favorite' | 'links' | 'tutorial'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // Modals & Popups
  const [isAdCountdownOpen, setIsAdCountdownOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [cloudSyncActive, setCloudSyncActive] = useState(false);
  const [showChannelErrorPopup, setShowChannelErrorPopup] = useState(false);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<{ text: string; icon?: string } | null>(null);

  // Current Ad Step number for Countdown
  const [activeStepNumber, setActiveStepNumber] = useState(1);

  // Time remaining formatted string for live countdown
  const [sessionRemaining, setSessionRemaining] = useState<string>('10:00');

  // Telegram User Object
  const [tgUser, setTgUser] = useState<{
    id?: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  } | null>(null);

  // Show Toast Helper
  const showToast = useCallback((text: string, icon = 'check') => {
    setToastMsg({ text, icon });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 2800);
  }, []);

  // Initialize Telegram WebApp SDK
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.setHeaderColor) tg.setHeaderColor('#09090f');
        if (tg.setBackgroundColor) tg.setBackgroundColor('#09090f');
        if (tg.initDataUnsafe?.user) {
          setTgUser(tg.initDataUnsafe.user);
        }
      } catch (err) {
        console.warn('Telegram SDK initialization note:', err);
      }
    }
  }, []);

  // Handle Back to Home (Cleanly clears active post state and deep link hash)
  const handleBackToHome = useCallback(() => {
    triggerHaptic('light');
    setSelectedVideo(null);
    setCurrentTab('home');
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_POST);
      localStorage.removeItem(STORAGE_KEY_PENDING_AD);
      if (window.location.hash.includes('video')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // VIDEO SELECTION HANDLER (Direct entry to detail page with persistent tracking)
  const handleVideoSelect = useCallback((video: Video) => {
    setSelectedVideo(video);
    setCurrentTab('detail');
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_POST, video.id);
      window.location.hash = `video=${encodeURIComponent(video.id)}`;
    } catch (e) {
      console.warn(e);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // BackButton integration with Telegram SDK
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton) {
      if (currentTab === 'detail') {
        tg.BackButton.show();
        tg.BackButton.onClick(handleBackToHome);
      } else {
        tg.BackButton.hide();
      }
    }
  }, [currentTab, handleBackToHome]);

  // Subscribe to Cloud Firestore
  useEffect(() => {
    const unsubVideos = subscribeToVideos(
      (cloudList) => {
        if (cloudList && cloudList.length > 0) {
          setVideos(cloudList);
          try {
            localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(cloudList));
          } catch (e) {
            console.warn(e);
          }
          setCloudSyncActive(true);
        }
      },
      () => setCloudSyncActive(false)
    );

    const unsubSettings = subscribeToSettings((cloudSettings) => {
      if (cloudSettings) {
        setSettings((prev) => {
          const merged = { ...prev, ...cloudSettings };
          try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
          } catch (e) {
            console.warn(e);
          }
          return merged;
        });
      }
    });

    return () => {
      if (unsubVideos) unsubVideos();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  // Check 10-Minute Session Expiry (Runs every second)
  useEffect(() => {
    const checkSessions = () => {
      const now = Date.now();
      let hasChanges = false;
      const updated = { ...sessions };
      const updatedRounds = { ...adRounds };
      let roundsChanged = false;

      Object.entries(updated).forEach(([vidId, expiresAt]) => {
        if (expiresAt <= now) {
          delete updated[vidId];
          hasChanges = true;
          // Clear rounds & verified state so user must do full process again when re-visiting
          if (updatedRounds[vidId]) {
            delete updatedRounds[vidId];
            roundsChanged = true;
          }
          setChannelVerifiedVideos((prev) => {
            if (prev[vidId]) {
              const cp = { ...prev };
              delete cp[vidId];
              return cp;
            }
            return prev;
          });

          if (selectedVideo?.id === vidId) {
            showToast('⚠️ আপনার ১০ মিনিটের ফ্রি সেশন শেষ হয়েছে! ভিডিওটি পুনরায় দেখতে আবার আনলক করুন।', 'alert');
          }
        }
      });

      if (hasChanges) {
        setSessions(updated);
        try {
          localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updated));
        } catch (e) {
          console.warn(e);
        }
      }

      if (roundsChanged) {
        setAdRounds(updatedRounds);
        try {
          localStorage.setItem(STORAGE_KEY_ROUNDS, JSON.stringify(updatedRounds));
        } catch (e) {
          console.warn(e);
        }
      }

      // Update remaining time string if currently selected video has active session
      if (selectedVideo && updated[selectedVideo.id]) {
        const diffMs = updated[selectedVideo.id] - now;
        if (diffMs > 0) {
          const mins = Math.floor(diffMs / 60000);
          const secs = Math.floor((diffMs % 60000) / 1000);
          setSessionRemaining(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        } else {
          setSessionRemaining('00:00');
        }
      }
    };

    const interval = setInterval(checkSessions, 1000);
    return () => clearInterval(interval);
  }, [sessions, adRounds, selectedVideo, showToast]);

  // Handle Deep Linking (#video=id or ?video=id) and Active Post Restoration from localStorage
  useEffect(() => {
    const handleDeepLinkAndRestore = () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      let targetId: string | null = null;

      const hashMatch = hash.match(/#video[=-]([a-zA-Z0-9_\-]+)/i);
      if (hashMatch && hashMatch[1]) {
        targetId = decodeURIComponent(hashMatch[1]);
      } else if (search) {
        const params = new URLSearchParams(search);
        if (params.get('video')) targetId = params.get('video');
      }

      // If no hash/query param, check persisted active post from localStorage
      if (!targetId) {
        try {
          const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE_POST);
          if (savedActive) targetId = savedActive;
        } catch (e) {
          console.warn(e);
        }
      }

      if (targetId) {
        const target = videos.find((v) => v.id === targetId);
        if (target) {
          setSelectedVideo(target);
          setCurrentTab('detail');
        }
      } else if (hash === '#admin') {
        setIsAdminOpen(true);
      }
    };

    handleDeepLinkAndRestore();
    window.addEventListener('hashchange', handleDeepLinkAndRestore);
    return () => window.removeEventListener('hashchange', handleDeepLinkAndRestore);
  }, [videos]);

  // Window Focus & Visibility Change Listener to recover immediately when returning from external ad/channel
  useEffect(() => {
    const handleReturnToApp = () => {
      try {
        const activePostId = localStorage.getItem(STORAGE_KEY_ACTIVE_POST);
        if (activePostId) {
          if (!selectedVideo || selectedVideo.id !== activePostId) {
            const target = videos.find((v) => v.id === activePostId);
            if (target) {
              setSelectedVideo(target);
              setCurrentTab('detail');
            }
          }
        }

        const pendingStr = localStorage.getItem(STORAGE_KEY_PENDING_AD);
        if (pendingStr) {
          const pending = JSON.parse(pendingStr);
          const elapsed = Date.now() - (pending.timestamp || 0);

          // If user returned after viewing ad outside for at least 2.5 seconds
          if (pending.videoId && elapsed >= 2500) {
            const curRounds = adRounds[pending.videoId] || 0;
            if (curRounds < pending.step) {
              const updatedRounds = pending.step;
              const updated = { ...adRounds, [pending.videoId]: updatedRounds };
              setAdRounds(updated);
              localStorage.setItem(STORAGE_KEY_ROUNDS, JSON.stringify(updated));
              localStorage.removeItem(STORAGE_KEY_PENDING_AD);
              setIsAdCountdownOpen(false);
              showToast(`🎉 Ad #${updatedRounds} সফলভাবে সম্পন্ন হয়েছে!`);
            }
          }
        }
      } catch (e) {
        console.warn('App recovery note:', e);
      }
    };

    window.addEventListener('focus', handleReturnToApp);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleReturnToApp();
      }
    });

    return () => {
      window.removeEventListener('focus', handleReturnToApp);
      document.removeEventListener('visibilitychange', handleReturnToApp);
    };
  }, [selectedVideo, videos, adRounds, showToast]);

  // Check if a video is currently active in a 10-minute session
  const isVideoSessionActive = useCallback(
    (videoId: string) => {
      const expiresAt = sessions[videoId];
      return typeof expiresAt === 'number' && expiresAt > Date.now();
    },
    [sessions]
  );

  // TOGGLE FAVORITE
  const handleToggleFavorite = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    triggerHaptic('medium');

    const exists = favorites.includes(videoId);
    let updated: string[];
    if (exists) {
      updated = favorites.filter((id) => id !== videoId);
      showToast('পছন্দের তালিকা থেকে বাদ দেওয়া হয়েছে');
    } else {
      updated = [...favorites, videoId];
      showToast('পছন্দের তালিকায় যুক্ত হয়েছে! ❤️');
    }

    setFavorites(updated);
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  // COPY LINK FUNCTION
  const handleCopyLink = async (e: React.MouseEvent | null, videoId: string) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    triggerHaptic('success');
    playAudioSound('click');

    const base = window.location.origin + window.location.pathname;
    const shareUrl = `${base}#video=${encodeURIComponent(videoId)}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      showToast('Link Copied Successfully! 🔗');
    } catch {
      showToast('Link Copied Successfully! 🔗');
    }
  };

  // STEP 1: CHANNEL JOIN ACTION
  const handleChannelJoinClick = (channelId: string, link: string) => {
    if (!selectedVideo) return;
    triggerHaptic('medium');
    playAudioSound('click');

    // Open Telegram channel
    openTelegramChatOrChannel(link);

    // Record as joined for this specific video and persist immediately
    const currentJoined = joinedChannelsPerVideo[selectedVideo.id] || [];
    if (!currentJoined.includes(channelId)) {
      const updated = {
        ...joinedChannelsPerVideo,
        [selectedVideo.id]: [...currentJoined, channelId],
      };
      setJoinedChannelsPerVideo(updated);
      try {
        localStorage.setItem(STORAGE_KEY_JOINED_CHANNELS, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // STEP 1: CONTINUE BUTTON CLICK (Validates that all mandatory channels are clicked)
  const handleChannelContinueClick = () => {
    if (!selectedVideo) return;

    const countToRequire = Math.max(3, Math.min(5, settings.requiredChannelsCount || 3));
    let mandatoryChannels = settings.telegramChannels.filter((c) => c.isRequiredForForceSub);
    if (mandatoryChannels.length < countToRequire) {
      const additional = settings.telegramChannels.filter((c) => !c.isRequiredForForceSub);
      mandatoryChannels = [...mandatoryChannels, ...additional].slice(0, countToRequire);
    } else {
      mandatoryChannels = mandatoryChannels.slice(0, countToRequire);
    }

    const joined = joinedChannelsPerVideo[selectedVideo.id] || [];
    const allJoined = mandatoryChannels.every((ch) => joined.includes(ch.id));

    if (!allJoined) {
      triggerHaptic('error');
      playAudioSound('tick');
      // Exact user-requested Bengali popup alert message:
      setShowChannelErrorPopup(true);
      return;
    }

    // Success! Advance to Ad Steps and DO NOT send back to channels again for this session!
    triggerHaptic('success');
    playAudioSound('round');
    const updatedVerified = {
      ...channelVerifiedVideos,
      [selectedVideo.id]: true,
    };
    setChannelVerifiedVideos(updatedVerified);
    try {
      localStorage.setItem(STORAGE_KEY_CHANNEL_VERIFIED, JSON.stringify(updatedVerified));
    } catch (e) {
      console.warn(e);
    }
    showToast('চ্যানেল ভেরিফিকেশন সফল! এবার বিজ্ঞাপনগুলো সম্পন্ন করুন 🎉');
  };

  // STEP 2: WATCH AD CLICK (5s countdown)
  const handleWatchAdClick = () => {
    if (!selectedVideo) return;

    const currentRounds = adRounds[selectedVideo.id] || 0;
    const required = selectedVideo.requiredRounds || settings.defaultRounds || 4;

    if (currentRounds >= required) {
      // All ads are done! Unlock final reward!
      handleFinalUnlock();
      return;
    }

    triggerHaptic('medium');
    playAudioSound('click');

    // Retrieve Adsterra ad slot for current round
    const slotIdx = Math.max(0, Math.min(3, currentRounds));
    const targetUrl = settings.adSlots[slotIdx] || settings.adSlots[0];

    // Store pending ad session for recovery in case of browser/webview blur
    try {
      localStorage.setItem(
        STORAGE_KEY_PENDING_AD,
        JSON.stringify({
          videoId: selectedVideo.id,
          step: currentRounds + 1,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.warn(e);
    }

    // Open Adsterra link in Telegram In-App browser
    openInTelegramInAppBrowser(targetUrl);

    // Set active step and open 5s countdown modal
    setActiveStepNumber(currentRounds + 1);
    setIsAdCountdownOpen(true);
  };

  // Called when 5-second countdown finishes
  const handleAdCountdownComplete = () => {
    setIsAdCountdownOpen(false);
    try {
      localStorage.removeItem(STORAGE_KEY_PENDING_AD);
    } catch (e) {
      console.warn(e);
    }
    if (!selectedVideo) return;

    const current = adRounds[selectedVideo.id] || 0;
    const updatedRounds = current + 1;
    const updated = { ...adRounds, [selectedVideo.id]: updatedRounds };
    setAdRounds(updated);
    try {
      localStorage.setItem(STORAGE_KEY_ROUNDS, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }

    // Increment views
    const newViews = (Number(selectedVideo.views) || 150) + 1;
    const updatedVideo = { ...selectedVideo, views: newViews };
    setSelectedVideo(updatedVideo);
    const updatedVideos = videos.map((v) => (v.id === selectedVideo.id ? updatedVideo : v));
    setVideos(updatedVideos);

    const required = selectedVideo.requiredRounds || settings.defaultRounds || 4;
    if (updatedRounds >= required) {
      showToast(`🎉 সকল ${required}টি অ্যাড সফলভাবে দেখা হয়েছে! এবার "আনলক ও দেখুন" বাটনে ক্লিক করুন।`);
    } else {
      showToast(`Ad Slot #${updatedRounds} সম্পন্ন হয়েছে! পরবর্তী স্লট দেখতে ক্লিক করুন।`);
    }
  };

  // STEP 3: FINAL UNLOCK HANDLER (Starts 10-Minute Time-Lock Session)
  const handleFinalUnlock = () => {
    if (!selectedVideo) return;

    triggerHaptic('success');
    playAudioSound('unlocked');

    // Explode Confetti
    try {
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.warn(e);
    }

    const durationMinutes = settings.sessionDurationMinutes || 10;
    const expiresAt = Date.now() + durationMinutes * 60 * 1000;

    const updatedSessions = { ...sessions, [selectedVideo.id]: expiresAt };
    setSessions(updatedSessions);
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updatedSessions));
    } catch (e) {
      console.warn(e);
    }

    showToast(`🎉 অভিনন্দন! ভিডিওটি পরবর্তী ${durationMinutes} মিনিটের জন্য সম্পূর্ণ আনলক হয়েছে!`);
  };

  // PREMIUM INSTANT CODE APPROVAL
  const handleVerifyInstantCode = (code: string) => {
    if (!selectedVideo) return;
    if (code === '526628' || code.toUpperCase() === 'PAID10') {
      handleFinalUnlock();
    } else {
      triggerHaptic('error');
      showToast('ভুল অনুমোদন কোড! WhatsApp এ যোগাযোগ করুন।', 'alert');
    }
  };

  // ADMIN OPERATIONS
  const handleSaveVideo = (video: Video) => {
    const exists = videos.some((v) => v.id === video.id);
    let updated: Video[];
    if (exists) {
      updated = videos.map((v) => (v.id === video.id ? video : v));
    } else {
      updated = [video, ...videos];
    }

    setVideos(updated);
    try {
      localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    saveVideoToCloud(video);
    showToast(`"${video.title}" সংরক্ষিত হয়েছে! 🚀`);
  };

  const handleDeleteVideo = (id: string) => {
    const target = videos.find((v) => v.id === id);
    if (!target) return;
    if (confirm(`আপনি কি "${target.title}" ডিলিট করতে চান?`)) {
      const updated = videos.filter((v) => v.id !== id);
      setVideos(updated);
      try {
        localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      deleteVideoFromCloud(id);
      showToast('ভিডিও ডিলিট করা হয়েছে');
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    } catch (e) {
      console.warn(e);
    }
    saveSettingsToCloud(newSettings);
  };

  const handleForceCloudSync = async () => {
    showToast('🔄 ক্লাউড ডেটাবেজে সিঙ্ক হচ্ছে...');
    try {
      for (const v of videos) {
        await saveVideoToCloud(v);
      }
      await saveSettingsToCloud(settings);
      setCloudSyncActive(true);
      showToast('✅ ক্লাউড ডেটাবেজে সম্পূর্ণ সিঙ্ক সফল হয়েছে!');
    } catch {
      showToast('সিঙ্কে ত্রুটি হয়েছে, ইন্টারনেট চেক করুন।', 'alert');
    }
  };

  const handleAdminApproveSession = (videoId: string) => {
    const durationMinutes = settings.sessionDurationMinutes || 10;
    const expiresAt = Date.now() + durationMinutes * 60 * 1000;
    const updated = { ...sessions, [videoId]: expiresAt };
    setSessions(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    triggerHaptic('success');
    showToast(`ভিডিওতে ${durationMinutes} মিনিটের প্রিমিয়াম সেশন অনুমোদন দেওয়া হয়েছে! ⏱️`);
  };

  const handleResetDefaultVideos = () => {
    if (confirm('সবগুলো ভিডিও ডিফল্ট ডাটাতে রিস্টোর করতে চান?')) {
      setVideos(DEFAULT_VIDEOS);
      try {
        localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(DEFAULT_VIDEOS));
      } catch (e) {
        console.warn(e);
      }
      for (const v of DEFAULT_VIDEOS) {
        saveVideoToCloud(v);
      }
      showToast('ডিফল্ট ভিডিও তালিকা রিস্টোর করা হয়েছে!');
    }
  };

  // Dynamic Categories List for Home Filter (Deduplicated with fallback to DEFAULT_CATEGORIES)
  const homeCategoryList = [
    'All',
    'Premium',
    ...Array.from(
      new Set(
        settings.categories && settings.categories.length > 0
          ? settings.categories
          : DEFAULT_CATEGORIES
      )
    ),
  ];

  // Filtered Videos for Home Tab
  const filteredVideos = videos.filter((v) => {
    let catMatch = true;
    if (selectedCategory === 'Premium') {
      catMatch = v.accessType === 'premium';
    } else if (selectedCategory !== 'All') {
      catMatch = v.category === selectedCategory;
    }

    const q = searchQuery.toLowerCase().trim();
    const searchMatch =
      !q ||
      v.title.toLowerCase().includes(q) ||
      v.episode.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q);

    return catMatch && searchMatch;
  });

  // Unlocked Videos List (Active sessions)
  const unlockedVideos = videos.filter((v) => isVideoSessionActive(v.id));

  // Favorite Videos List
  const favoriteVideos = videos.filter((v) => favorites.includes(v.id));

  // Mandatory Channels Calculation for selected video
  const countToRequire = Math.max(3, Math.min(5, settings.requiredChannelsCount || 3));
  let mandatoryChannels = settings.telegramChannels.filter((c) => c.isRequiredForForceSub);
  if (mandatoryChannels.length < countToRequire) {
    const additional = settings.telegramChannels.filter((c) => !c.isRequiredForForceSub);
    mandatoryChannels = [...mandatoryChannels, ...additional].slice(0, countToRequire);
  } else {
    mandatoryChannels = mandatoryChannels.slice(0, countToRequire);
  }

  const currentVideoJoinedChannels = selectedVideo
    ? joinedChannelsPerVideo[selectedVideo.id] || []
    : [];

  return (
    <div className="min-h-screen bg-[#09090f] text-gray-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white pb-24">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[90%] max-w-sm transition-all duration-300 animate-slide-down">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold border bg-[#161628]/95 backdrop-blur-xl border-pink-500/50 text-white shadow-neonPink">
            <Sparkles className="w-4 h-4 text-pink-400 flex-shrink-0 animate-spin" />
            <span className="flex-1 leading-snug">{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* 1. HEADER SECTION (Always Visible) */}
      <Header
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        cloudSyncActive={cloudSyncActive}
        user={tgUser}
      />

      {/* MAIN VIEWPORT */}
      <main className="flex-1 max-w-md mx-auto sm:max-w-2xl w-full px-3.5 pt-3 space-y-4">
        {/* ================= 2. HOME TAB ================= */}
        {currentTab === 'home' && (
          <div className="space-y-4 animate-fade-in">
            {/* VIP Ticker */}
            <div className="glass-card px-3 py-2 rounded-xl border border-pink-500/20 flex items-center gap-2 text-[11px] text-pink-200/90 overflow-hidden">
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 font-bold uppercase text-[9px]">
                VIP
              </span>
              <div className="truncate font-medium">
                🔥 ফ্রি ভিডিও ৪টি এডে আনলক করুন অথবা প্রিমিয়াম এক্সক্লুসিভ ভিডিও সরাসরি আনলক করুন!
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ভিডিও খুঁজুন..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#141424] border border-gray-800 rounded-2xl text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-pink-500/80 focus:ring-1 focus:ring-pink-500/50 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills (Dynamically loaded from Admin & Firebase) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 select-none">
              {homeCategoryList.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedCategory(cat);
                    }}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-neonPink'
                        : 'bg-[#161626] border border-gray-800 text-gray-300 hover:border-pink-500/40 hover:text-white'
                    }`}
                  >
                    {cat === 'Premium' ? '👑 Premium' : cat === 'Hot' ? 'Hot 🔥' : cat}
                  </button>
                );
              })}
            </div>

            {/* Meta status bar */}
            <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
              <span>সকল ভিডিও তালিকা ({filteredVideos.length})</span>
              <span className="text-pink-400 font-medium">⚡ ৪টি এড স্লট রোটেটিং সিস্টেম</span>
            </div>

            {/* Video Grid (2 Columns) */}
            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {filteredVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isUnlocked={isVideoSessionActive(video.id)}
                    isFavorite={favorites.includes(video.id)}
                    isSessionActive={isVideoSessionActive(video.id)}
                    sessionRemainingText={
                      isVideoSessionActive(video.id) ? sessionRemaining : undefined
                    }
                    onSelect={handleVideoSelect}
                    onToggleFavorite={handleToggleFavorite}
                    onCopyLink={handleCopyLink}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card p-8 rounded-3xl text-center text-gray-400 my-6">
                <Search className="w-12 h-12 mx-auto text-pink-400 mb-2 opacity-60" />
                <h4 className="text-sm font-bold text-white">কোনো ভিডিও পাওয়া যায়নি!</h4>
                <p className="text-xs text-gray-400 mt-1">
                  অন্য কিওয়ার্ড দিয়ে অনুসন্ধান করুন অথবা ফিল্টার পরিবর্তন করুন।
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-pink-500/20 text-pink-300 text-xs font-semibold hover:bg-pink-500/30 transition cursor-pointer"
                >
                  সব ফিল্টার মুছুন
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= 3. DETAIL / UNLOCK FLOW VIEW ================= */}
        {currentTab === 'detail' && selectedVideo && (
          <div className="space-y-4 animate-fade-in">
            {/* Top Bar: Back, Title, Favorite, Share */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <button
                type="button"
                onClick={handleBackToHome}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171728] border border-gray-700/60 text-xs font-semibold text-gray-200 hover:text-pink-400 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {selectedVideo.accessType === 'premium' ? 'PREMIUM VIP UNLOCK' : 'ভিডিও আনলক পেইজ'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => handleToggleFavorite(e, selectedVideo.id)}
                  className="w-8 h-8 rounded-xl bg-[#171728] border border-gray-700/60 text-gray-400 hover:text-rose-500 flex items-center justify-center text-xs transition cursor-pointer"
                  title="Bookmark Favorite"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      favorites.includes(selectedVideo.id)
                        ? 'text-rose-500 fill-rose-500'
                        : 'text-gray-400'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCopyLink(e, selectedVideo.id)}
                  className="w-8 h-8 rounded-xl bg-[#171728] border border-gray-700/60 text-gray-400 hover:text-cyan-400 flex items-center justify-center text-xs transition cursor-pointer"
                  title="Copy Link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Poster Card */}
            <div className="glass-card rounded-2xl overflow-hidden border border-pink-500/20 relative">
              <div className="relative aspect-video w-full bg-black/40 overflow-hidden">
                <img
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-pink-500/40 text-pink-300 font-extrabold text-[11px]">
                  {selectedVideo.accessType === 'premium'
                    ? selectedVideo.price || '৳50'
                    : selectedVideo.episode}
                </div>
                <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[11px] font-bold flex items-center gap-1">
                  {isVideoSessionActive(selectedVideo.id) ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">UNLOCKED</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 text-yellow-400" />
                      <span className="text-gray-200">LOCKED</span>
                    </>
                  )}
                </div>
                {/* Center Play Indicator */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-pink-400 text-xl shadow-lg">
                    <Play className="w-6 h-6 ml-0.5 fill-pink-400" />
                  </div>
                </div>
              </div>

              {/* Title & Info */}
              <div className="p-3.5 sm:p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 text-[11px] font-semibold">
                    🔥 {selectedVideo.category}
                  </span>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Full HD 1080p
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                  {selectedVideo.title}
                </h2>
              </div>
            </div>

            {/* Statistics Row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center text-xs">
              <div className="glass-card p-2.5 rounded-xl border border-gray-800">
                <span className="text-[10px] text-gray-400 block">Total Views</span>
                <span className="text-xs sm:text-sm font-extrabold text-cyan-400 mt-0.5 block">
                  👁️ {selectedVideo.views}
                </span>
              </div>
              <div className="glass-card p-2.5 rounded-xl border border-pink-500/30 bg-pink-500/5">
                <span className="text-[10px] text-pink-300 block">
                  {selectedVideo.accessType === 'premium' ? 'Video Price' : 'Rounds Done'}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-pink-400 mt-0.5 block">
                  {selectedVideo.accessType === 'premium'
                    ? selectedVideo.price || '৳50'
                    : `${adRounds[selectedVideo.id] || 0} / ${
                        selectedVideo.requiredRounds || settings.defaultRounds || 4
                      }`}
                </span>
              </div>
              <div className="glass-card p-2.5 rounded-xl border border-gray-800">
                <span className="text-[10px] text-gray-400 block">Category</span>
                <span className="text-xs sm:text-sm font-extrabold text-purple-300 mt-0.5 block truncate">
                  {selectedVideo.category}
                </span>
              </div>
            </div>

            {/* ================= CASE 1: UNLOCKED ACTIVE 10-MINUTE SESSION ================= */}
            {isVideoSessionActive(selectedVideo.id) ? (
              <div className="space-y-4">
                {/* 10-Minute Live Active Session Banner */}
                <div className="glass-card p-4 rounded-2xl border border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-[#101924] to-emerald-950/40 space-y-2.5 shadow-lg shadow-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                        <Clock className="w-4 h-4 animate-pulse" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-300">
                          সেশন অ্যাক্টিভ (Active Session)
                        </h4>
                        <p className="text-[10px] text-gray-400">১০ মিনিটের এককালীন দেখার সময়সীমা</p>
                      </div>
                    </div>
                    <span className="font-mono font-black text-emerald-400 bg-black/60 px-3 py-1 rounded-xl border border-emerald-500/40 text-sm">
                      {sessionRemaining}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    ⚠️ <b>সতর্কবার্তা:</b> এই ১০ মিনিট চলাকালীন কোনো অ্যাড ছাড়া ভিডিওটি উপভোগ করতে পারবেন। ১০ মিনিট শেষ হলে ভিডিওটি পুনরায় লক হয়ে যাবে।
                  </p>
                </div>

                {/* Final Unlocked Buttons (Watch & Download) */}
                <div className="glass-card p-4 sm:p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 text-xl shadow-lg">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-emerald-300">
                      অভিনন্দন! ভিডিওটি আনলক হয়েছে 🎉
                    </h3>
                    <p className="text-xs text-gray-300 mt-0.5">
                      নিচের লিংকে ক্লিক করে টেলিগ্রামে ফুল ভিডিও দেখুন
                    </p>
                  </div>

                  {/* Watch Now Button */}
                  <a
                    href={selectedVideo.streamLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>WATCH NOW (STREAM IN TELEGRAM)</span>
                  </a>

                  {/* Direct Download Button */}
                  <a
                    href={selectedVideo.downloadLink || selectedVideo.streamLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 bg-[#181828] hover:bg-[#252538] border border-emerald-500/30 text-emerald-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>⚡ DIRECT DOWNLOAD (FAST SERVER)</span>
                  </a>
                </div>
              </div>
            ) : selectedVideo.accessType === 'premium' ? (
              /* ================= CASE 2: PREMIUM VIP LOCKED ================= */
              <div className="glass-card p-4 sm:p-5 rounded-3xl border border-amber-500/40 bg-gradient-to-b from-[#181524] to-[#12121e] space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-black font-black shadow-md">
                      <Crown className="w-5 h-5 fill-black" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">প্রিমিয়াম এক্সক্লুসিভ ভিডিও</h3>
                      <p className="text-[11px] text-gray-400">ওয়ান-টাইম সেশন অনুমোদন (১০ মিনিট)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block uppercase">মূল্য</span>
                    <span className="text-lg font-black gold-text-gradient font-mono">
                      {selectedVideo.price || '৳50'}
                    </span>
                  </div>
                </div>

                {/* Payment Numbers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#171728] border border-pink-500/30">
                    <span className="text-xs font-bold text-white">
                      bKash {settings.bkashType}: {settings.bkashNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(settings.bkashNumber);
                        showToast(`bKash নাম্বার (${settings.bkashNumber}) কপি হয়েছে!`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-200 text-xs font-semibold cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#171728] border border-orange-500/30">
                    <span className="text-xs font-bold text-white">
                      Nagad {settings.nagadType}: {settings.nagadNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(settings.nagadNumber);
                        showToast(`Nagad নাম্বার (${settings.nagadNumber}) কপি হয়েছে!`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-200 text-xs font-semibold cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* WhatsApp Approval Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    const msg = `🔥 Viral ZONE প্রিমিয়াম ভিডিও পেমেন্ট সাবমিশন:\n🎬 ${selectedVideo.title}\n💰 ${selectedVideo.price || '৳50'}\n১০-মিনিটের সেশন অনুমোদন দিন!`;
                    window.open(
                      `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(msg)}`,
                      '_blank'
                    );
                  }}
                  className="w-full py-3.5 px-4 btn-glow-whatsapp rounded-2xl text-white font-extrabold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>💬 হোয়াটসঅ্যাপে পেমেন্ট পাঠিয়ে অনুমোদন নিন</span>
                </button>

                {/* Approval Code Quick Input */}
                <div className="pt-2 border-t border-gray-800 space-y-1.5">
                  <label className="text-[11px] text-gray-400 block font-semibold">
                    এডমিনের দেওয়া সেশন কোড থাকলে এখানে দিন:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      id="adminSessionCodeInput"
                      placeholder="Enter session approval code..."
                      className="flex-1 px-3 py-2 bg-[#171728] border border-gray-700 rounded-xl text-white text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(
                          'adminSessionCodeInput'
                        ) as HTMLInputElement;
                        if (el) handleVerifyInstantCode(el.value.trim());
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                    >
                      আনলক
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ================= CASE 3: FREE VIDEO UNLOCK FLOW ================= */
              <div className="space-y-4">
                {/* Visual Step Progress Header */}
                <div className="glass-card p-3 rounded-2xl border border-gray-800 flex items-center justify-around text-[11px] font-bold">
                  <div
                    className={`flex items-center gap-1.5 ${
                      !channelVerifiedVideos[selectedVideo.id] && settings.forceSubscribeEnabled
                        ? 'text-pink-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center text-[10px] font-mono">
                      {channelVerifiedVideos[selectedVideo.id] || !settings.forceSubscribeEnabled ? '✓' : '1'}
                    </span>
                    <span>চ্যানেল সাবস্ক্রাইব</span>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-gray-600" />

                  <div
                    className={`flex items-center gap-1.5 ${
                      channelVerifiedVideos[selectedVideo.id] || !settings.forceSubscribeEnabled
                        ? 'text-pink-400'
                        : 'text-gray-500'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-mono">
                      2
                    </span>
                    <span>বিজ্ঞাপন দর্শন</span>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-gray-600" />

                  <div className="flex items-center gap-1.5 text-gray-500">
                    <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-mono">
                      3
                    </span>
                    <span>১০ মি. আনলক</span>
                  </div>
                </div>

                {/* ----------------- SUB-PHASE A: CHANNEL FORCE SUBSCRIBE ----------------- */}
                {settings.forceSubscribeEnabled && !channelVerifiedVideos[selectedVideo.id] ? (
                  <div className="glass-card p-4 sm:p-5 rounded-3xl border border-pink-500/40 space-y-3.5 shadow-xl bg-gradient-to-b from-[#181524] to-[#12121e]">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                          <ShieldAlert className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-extrabold text-white">
                            বাধ্যতামূলক চ্যানেলগুলোতে জয়েন করুন (ধাপ ১)
                          </h3>
                          <p className="text-[10px] text-gray-400">
                            নিচের চ্যানেলগুলোতে জয়েন করে 'Continue' বাটনে ক্লিক করুন
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-[10px] font-bold">
                        {currentVideoJoinedChannels.length} / {mandatoryChannels.length}
                      </span>
                    </div>

                    {/* Channels List */}
                    <div className="space-y-2">
                      {mandatoryChannels.map((ch, idx) => {
                        const isJoined = currentVideoJoinedChannels.includes(ch.id);

                        return (
                          <div
                            key={ch.id}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isJoined
                                ? 'bg-emerald-950/25 border-emerald-500/50'
                                : 'bg-[#161628] border-gray-800 hover:border-pink-500/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center font-mono flex-shrink-0 ${
                                  isJoined
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
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

                            <button
                              type="button"
                              onClick={() => handleChannelJoinClick(ch.id, ch.link)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                                isJoined
                                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500 hover:text-white'
                                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-md shadow-pink-500/30 active:scale-95'
                              }`}
                            >
                              {isJoined ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
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

                    {/* Step 1 Continue Button */}
                    <button
                      type="button"
                      onClick={handleChannelContinueClick}
                      className="w-full py-3.5 px-4 rounded-2xl text-white font-extrabold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition btn-glow-pink cursor-pointer active:scale-98"
                    >
                      <span>কন্টিনিউ করুন (Continue)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-[10px] text-center text-gray-400">
                      সবগুলো চ্যানেলে জয়েন করে কন্টিনিউ করলেই পরবর্তী অ্যাড স্টেপে প্রবেশ করবেন।
                    </p>
                  </div>
                ) : (
                  /* ----------------- SUB-PHASE B: AD & STEP SYSTEM ----------------- */
                  <div className="space-y-3.5">
                    {/* Progress Bar */}
                    <div className="glass-card p-3.5 rounded-2xl border border-gray-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-300 flex items-center gap-1.5">
                          <Film className="w-4 h-4 text-pink-400" /> অ্যাড প্রগ্রেস (Step 2/2)
                        </span>
                        <span className="text-pink-400 font-extrabold">
                          {Math.min(
                            100,
                            Math.round(
                              ((adRounds[selectedVideo.id] || 0) /
                                (selectedVideo.requiredRounds || settings.defaultRounds || 4)) *
                                100
                            )
                          )}
                          %
                        </span>
                      </div>
                      {/* Track */}
                      <div className="w-full h-2.5 bg-[#171726] rounded-full overflow-hidden p-0.5 border border-gray-800">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-500 rounded-full transition-all duration-500 shadow-neonPink"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                ((adRounds[selectedVideo.id] || 0) /
                                  (selectedVideo.requiredRounds || settings.defaultRounds || 4)) *
                                  100
                              )
                            )}%`,
                          }}
                        ></div>
                      </div>
                      {/* Slot Step Indicators */}
                      <div
                        className="grid gap-1 text-center text-[10px] font-bold text-gray-500 pt-1"
                        style={{
                          gridTemplateColumns: `repeat(${
                            selectedVideo.requiredRounds || settings.defaultRounds || 4
                          }, minmax(0, 1fr))`,
                        }}
                      >
                        {Array.from({
                          length: selectedVideo.requiredRounds || settings.defaultRounds || 4,
                        }).map((_, sIdx) => {
                          const step = sIdx + 1;
                          const isStepDone = (adRounds[selectedVideo.id] || 0) >= step;
                          return (
                            <span
                              key={step}
                              className={`py-1 rounded border transition ${
                                isStepDone
                                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 font-bold'
                                  : 'bg-[#171728] text-gray-500 border-gray-800'
                              }`}
                            >
                              Slot {step} {isStepDone ? '✓' : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Main Interactive Button Area: Watch Ad / Final Unlock */}
                    {(adRounds[selectedVideo.id] || 0) >=
                    (selectedVideo.requiredRounds || settings.defaultRounds || 4) ? (
                      <button
                        type="button"
                        onClick={handleFinalUnlock}
                        className="w-full py-4 px-4 rounded-2xl text-white font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 transition-all duration-300 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/40 cursor-pointer active:scale-98"
                      >
                        <CheckCircle2 className="w-5 h-5 animate-bounce" />
                        <span>🎁 আনলক করুন ও দেখুন (CONTINUE TO WATCH)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleWatchAdClick}
                        className="w-full py-4 px-4 btn-glow-pink rounded-2xl text-white font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 relative overflow-hidden transition-all duration-300 group cursor-pointer active:scale-98"
                      >
                        <Film className="w-5 h-5 animate-pulse" />
                        <span>
                          🎥 WATCH AD ( {adRounds[selectedVideo.id] || 0} /{' '}
                          {selectedVideo.requiredRounds || settings.defaultRounds || 4} )
                        </span>
                      </button>
                    )}

                    <p className="text-center text-[11px] text-gray-400">
                      বিজ্ঞাপনটি Telegram In-App ব্রাউজারে খুলবে এবং প্রতিটি ধাপে ৫ সেকেন্ডের কাউন্টডাউন শেষ করতে হবে।
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= 4. UNLOCKED TAB ================= */}
        {currentTab === 'unlocked' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <LockOpen className="w-4 h-4 text-emerald-400" />
                  আমার আনলক করা ভিডিও
                </h2>
                <p className="text-xs text-gray-400">বর্তমানে অ্যাক্টিভ ১০-মিনিট সেশনের ভিডিও সমূহ</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold">
                {unlockedVideos.length} Items
              </span>
            </div>

            {unlockedVideos.length > 0 ? (
              <div className="space-y-3">
                {unlockedVideos.map((v) => (
                  <div
                    key={v.id}
                    className="glass-card p-3 rounded-2xl border border-emerald-500/30 flex items-center justify-between gap-3"
                  >
                    <div
                      onClick={() => handleVideoSelect(v)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                    >
                      <div className="w-20 h-14 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 relative">
                        <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {v.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px]">
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active Session
                          </span>
                          <span className="text-gray-400 font-mono">({sessionRemaining})</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={v.streamLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition cursor-pointer flex items-center gap-1 flex-shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" /> Watch
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-8 rounded-3xl text-center space-y-3 my-6">
                <LockOpen className="w-12 h-12 mx-auto text-emerald-400 opacity-60" />
                <h4 className="text-sm font-bold text-white">কোনো আনলক করা ভিডিও নেই!</h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                  হোম ট্যাব থেকে ভিডিও বেছে নিয়ে ৪টি এডে আনলক করুন এবং ১০ মিনিটের সেশন উপভোগ করুন।
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentTab('home')}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-neonPink"
                >
                  ভিডিও এক্সপ্লোর করুন
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= 5. FAVORITE TAB ================= */}
        {currentTab === 'favorite' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  পছন্দের ভিডিও তালিকা
                </h2>
                <p className="text-xs text-gray-400">বুকমার্ক করা প্রিয় ভিডিও সমূহ</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-extrabold">
                {favoriteVideos.length} Items
              </span>
            </div>

            {favoriteVideos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {favoriteVideos.map((v) => (
                  <VideoCard
                    key={v.id}
                    video={v}
                    isUnlocked={isVideoSessionActive(v.id)}
                    isFavorite={true}
                    isSessionActive={isVideoSessionActive(v.id)}
                    onSelect={handleVideoSelect}
                    onToggleFavorite={handleToggleFavorite}
                    onCopyLink={handleCopyLink}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card p-8 rounded-3xl text-center space-y-3 my-6">
                <Heart className="w-12 h-12 mx-auto text-rose-400 opacity-60" />
                <h4 className="text-sm font-bold text-white">কোনো পছন্দের ভিডিও যোগ করেননি!</h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  ভিডিও কার্ডের হার্ট আইকন (❤️) এ ক্লিক করে এখানে সেভ করতে পারেন।
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentTab('home')}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  হোমে যান
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= 6. USEFUL LINKS TAB ================= */}
        {currentTab === 'links' && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass-card p-4 rounded-2xl border border-pink-500/20 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-lg flex-shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Useful Links</h2>
                <p className="text-xs text-gray-400">
                  আমাদের অফিসিয়াল ({settings.telegramChannels.length}টি) টেলিগ্রাম চ্যানেল ও ব্যাকআপ লিংক সমূহ
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {settings.telegramChannels.map((ch) => (
                <div
                  key={ch.id}
                  className="glass-card p-3.5 rounded-2xl border border-gray-800 hover:border-pink-500/40 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-base shadow-md flex-shrink-0">
                      <Send className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {ch.title}
                        </h4>
                        {ch.verified && (
                          <CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-pink-400 font-mono truncate">{ch.link}</p>
                      <span className="text-[10px] text-gray-400 block truncate">
                        {ch.desc || '👥 Official Telegram Channel'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openTelegramChatOrChannel(ch.link)}
                    className="px-3.5 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white border border-pink-500/40 text-xs font-extrabold uppercase transition cursor-pointer flex-shrink-0"
                  >
                    JOIN
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 7. TUTORIAL TAB ================= */}
        {currentTab === 'tutorial' && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-black text-white">
                কীভাবে <span className="neon-text-gradient">আনলক</span> করবেন
              </h2>
              <p className="text-xs text-gray-400">খুব সহজে ভিডিও আনলক করার সম্পূর্ণ নিয়ম</p>
            </div>

            {/* Embedded YouTube Video */}
            <div className="glass-card p-2 rounded-2xl border border-pink-500/30 overflow-hidden shadow-neonPink">
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
                <iframe
                  className="w-full h-full"
                  src={settings.tutorialVideoUrl}
                  title="How to Unlock Video Tutorial"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            {/* Numbered Steps */}
            <div className="glass-card p-4 rounded-2xl border border-gray-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                আনলক করার ৪টি সহজ ধাপ:
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#161626] border border-gray-800">
                  <div className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center flex-shrink-0">
                    ১
                  </div>
                  <div>
                    <p className="font-bold text-white">চ্যানেলে জয়েন করুন (ধাপ ১)</p>
                    <p className="text-[11px] text-gray-400">
                      ভিডিওর নিচে দেখানো বাধ্যতামূলক চ্যানেলগুলোতে জয়েন করে Continue প্রেস করুন।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#161626] border border-gray-800">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center flex-shrink-0">
                    ২
                  </div>
                  <div>
                    <p className="font-bold text-white">বিজ্ঞাপনগুলো সম্পন্ন করুন (ধাপ ২)</p>
                    <p className="text-[11px] text-gray-400">
                      প্রতিটি এডে ৫ সেকেন্ড কাউন্টডাউন শেষ হওয়া পর্যন্ত অপেক্ষা করুন।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#161626] border border-gray-800">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0">
                    ৩
                  </div>
                  <div>
                    <p className="font-bold text-white">১০ মিনিটের জন্য ভিডিও দেখুন</p>
                    <p className="text-[11px] text-gray-400">
                      আনলক হতেই পরবর্তী ১০ মিনিট কোনো বিজ্ঞাপন ছাড়া যেকোনো সময় দেখা যাবে।
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Developer Credit Banner */}
            <div className="glass-card p-3.5 rounded-2xl border border-pink-500/30 text-center relative overflow-hidden shadow-sm">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#161628] border border-pink-500/40 text-[10px] text-gray-300">
                <Sparkles className="w-3 h-3 text-pink-400" />
                <span>Crafted & Engineered</span>
              </div>
              <div className="text-xs font-black tracking-wide mt-1">
                <span className="neon-text-gradient font-black">Developer by Rabiul</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Telegram Mini App & Video Experience Hub
              </p>
            </div>
          </div>
        )}

        {/* Global Footer */}
        <footer className="mt-8 pt-5 pb-3 border-t border-gray-800/80 text-center select-none">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-black tracking-wider text-white">
                Viral <span className="neon-text-gradient">ZONE</span>
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-[11px] text-gray-400">© 2026 All Rights Reserved</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#141424] border border-pink-500/30">
              <Code2 className="w-3.5 h-3.5 text-pink-400" />
              <span className="neon-text-gradient font-black text-xs">
                Developer by Rabiul
              </span>
            </div>
          </div>
        </footer>
      </main>

      {/* 8. FIXED BOTTOM NAVBAR */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab as typeof currentTab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        unlockedCount={unlockedVideos.length}
        favoriteCount={favoriteVideos.length}
      />

      {/* 9. AD COUNTDOWN MODAL (5s countdown popup) */}
      <AdCountdownModal
        isOpen={isAdCountdownOpen}
        stepNumber={activeStepNumber}
        totalSteps={selectedVideo?.requiredRounds || settings.defaultRounds || 4}
        onComplete={handleAdCountdownComplete}
      />

      {/* 10. SECRET ADMIN MODAL */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        videos={videos}
        settings={settings}
        cloudSyncActive={cloudSyncActive}
        onSaveVideo={handleSaveVideo}
        onDeleteVideo={handleDeleteVideo}
        onSaveSettings={handleSaveSettings}
        onForceCloudSync={handleForceCloudSync}
        onApproveSession={handleAdminApproveSession}
        onResetDefaultVideos={handleResetDefaultVideos}
      />

      {/* 11. TELEGRAM USER MODAL */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        whatsappNumber={settings.whatsappNumber}
        user={tgUser}
      />

      {/* 12. DEDICATED CHANNEL WARNING POPUP ALERT (Requirement #2) */}
      {showChannelErrorPopup && (
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
              {/* Exact user-requested Bengali popup text */}
              <p className="text-xs sm:text-sm font-bold text-rose-200 leading-relaxed px-1">
                "বাধ্যতামূলক চ্যানেলগুলোতে জয়েন করেই তারপর কন্টিনিউ করুন!"
              </p>
            </div>

            <p className="text-[11px] text-gray-400">
              উপরের তালিকায় থাকা সবকটি চ্যানেলের <b>JOIN</b> বাটনে ক্লিক করে জয়েন নিশ্চিত করুন।
            </p>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowChannelErrorPopup(false);
              }}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-500/30 transition transform active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>বুঝেছি (আমি জয়েন করছি)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
