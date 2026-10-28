export interface Video {
  id: string;
  title: string;
  episode: string;
  category: string;
  accessType: 'free' | 'premium';
  price?: string;
  thumbnail: string;
  streamLink: string;
  downloadLink?: string;
  views: number | string;
  requiredRounds?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface TelegramChannel {
  id: string;
  title: string;
  link: string;
  desc?: string;
  icon?: string;
  gradient?: string;
  verified?: boolean;
  isRequiredForForceSub?: boolean;
}

export interface AppSettings {
  adsterraDirectLink: string;
  adSlots: string[]; // 4 distinct slots
  defaultRounds: number;
  tutorialVideoUrl: string;
  whatsappNumber: string;
  bkashNumber: string;
  bkashType: 'Personal' | 'Payment';
  nagadNumber: string;
  nagadType: 'Personal' | 'Payment';
  sessionDurationMinutes: number; // 10 minutes
  forceSubscribeEnabled: boolean;
  requiredChannelsCount: number; // 3 to 5 channels
  telegramChannels: TelegramChannel[];
  categories: string[];
}

export interface ActiveSession {
  videoId: string;
  expiresAt: number; // timestamp in ms
  unlockedAt: number;
}
