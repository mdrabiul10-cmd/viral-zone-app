import React from 'react';
import { Home, LockOpen, Heart, Send, PlayCircle } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  unlockedCount: number;
  favoriteCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  unlockedCount,
  favoriteCount,
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'unlocked', label: 'Unlocked', icon: LockOpen, badge: unlockedCount },
    { id: 'favorite', label: 'Favorite', icon: Heart, badge: favoriteCount },
    { id: 'links', label: 'Links', icon: Send },
    { id: 'tutorial', label: 'Tutorial', icon: PlayCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c16]/95 backdrop-blur-xl border-t border-purple-900/30 pb-safe shadow-2xl">
      <div className="max-w-md mx-auto sm:max-w-2xl flex items-center justify-around px-1 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic('light');
                onTabChange(tab.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative group cursor-pointer ${
                isActive ? 'text-pink-500' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all relative ${
                  isActive
                    ? 'bg-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.4)] -translate-y-0.5'
                    : 'group-hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white shadow-sm ${
                      tab.id === 'unlocked' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold mt-0.5 tracking-tight">{tab.label}</span>
              <span
                className={`h-0.5 rounded-full bg-pink-500 absolute bottom-0.5 transition-all duration-300 ${
                  isActive ? 'w-4 opacity-100' : 'w-0 opacity-0'
                }`}
              ></span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
