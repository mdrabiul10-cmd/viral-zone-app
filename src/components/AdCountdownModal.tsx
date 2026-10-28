import React, { useState, useEffect } from 'react';
import { Hourglass, CheckCircle2, Film } from 'lucide-react';
import { triggerHaptic, playAudioSound } from '../utils/audio';

interface AdCountdownModalProps {
  isOpen: boolean;
  stepNumber: number;
  totalSteps: number;
  onComplete: () => void;
}

export const AdCountdownModal: React.FC<AdCountdownModalProps> = ({
  isOpen,
  stepNumber,
  totalSteps,
  onComplete,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(5);
      setIsDone(false);
      return;
    }

    setSecondsLeft(5);
    setIsDone(false);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsDone(true);
          triggerHaptic('success');
          playAudioSound('round');
          // Automatically complete step after a quick delay or call onComplete
          setTimeout(() => {
            onComplete();
          }, 800);
          return 0;
        }
        playAudioSound('tick');
        triggerHaptic('light');
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  const isFinalStep = stepNumber >= totalSteps;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="glass-card max-w-sm w-full p-5 rounded-3xl border border-amber-500/40 shadow-2xl relative overflow-hidden text-center space-y-4">
        {/* Animated Glow Background */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl pointer-events-none"></div>

        {/* Header Icon */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl shadow-lg relative">
          {isDone ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-scale-up" />
          ) : (
            <Hourglass className="w-8 h-8 animate-spin" />
          )}
        </div>

        {/* Title */}
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/30 uppercase">
            Step {stepNumber} of {totalSteps}
          </span>
          <h3 className="text-base font-extrabold text-white mt-1.5">
            {isDone
              ? `Ad ${stepNumber} সম্পন্ন হয়েছে! 🎉`
              : 'বিজ্ঞাপন ভেরিফিকেশন কাউন্টডাউন'}
          </h3>
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">
            {isDone
              ? isFinalStep
                ? 'সবগুলো অ্যাড সফল হয়েছে! এবার ভিডিও লিংক আনলক করুন।'
                : 'ধাপটি সফল হয়েছে! পরবর্তী ধাপে নিয়ে যাওয়া হচ্ছে...'
              : 'বিজ্ঞাপনটি Telegram In-App ব্রাউজারে চালু হয়েছে। কাউন্টডাউন শেষ হওয়া পর্যন্ত অপেক্ষা করুন।'}
          </p>
        </div>

        {/* Big Live Countdown Display */}
        <div className="py-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#181828] border-2 border-amber-500/50 shadow-inner">
            <span className="font-mono font-black text-3xl text-amber-400">
              {isDone ? '✓' : `${secondsLeft}s`}
            </span>
          </div>
        </div>

        {/* Progress Bar (5s -> 0s) */}
        <div className="space-y-1">
          <div className="w-full h-2 bg-[#1a1a2e] rounded-full overflow-hidden p-0.5 border border-gray-800">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(secondsLeft / 5) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>ইন-অ্যাপ ভেরিফিকেশন</span>
            <span>{isDone ? 'Finished' : `${secondsLeft} seconds`}</span>
          </div>
        </div>

        {/* Status text */}
        <div className="p-2.5 rounded-xl bg-[#141424] border border-gray-800 text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-pink-400" />
          <span>অ্যাডস্টারার ডিরেক্ট অ্যাড স্লট #{stepNumber}</span>
        </div>
      </div>
    </div>
  );
};
