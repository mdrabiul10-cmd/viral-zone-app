import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Video, AppSettings } from './types';

export const FIREBASE_CONFIG = {
  projectId: 'gen-lang-client-0573725514',
  appId: '1:638884726053:web:91ad0b986bb6b87e76c6cc',
  apiKey: 'AIzaSyBVQbESCJDRMqVVIhongx8nw1HLF7LUuic',
  authDomain: 'gen-lang-client-0573725514.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-viralzonetelegra-cd6bc44a-bcec-4b4d-97f5-59ded1594b0f',
  storageBucket: 'gen-lang-client-0573725514.firebasestorage.app',
  messagingSenderId: '638884726053',
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

try {
  if (!getApps().length) {
    appInstance = initializeApp(FIREBASE_CONFIG);
  } else {
    appInstance = getApps()[0];
  }
  dbInstance = getFirestore(appInstance, FIREBASE_CONFIG.firestoreDatabaseId);
} catch (e) {
  console.warn('Firebase init warning:', e);
}

export const db = dbInstance;

export function sanitizeVideoForFirestore(v: Video): Record<string, unknown> {
  return {
    id: String(v.id || `v_${Date.now()}`),
    title: String(v.title || 'Untitled Video'),
    episode: String(v.episode || 'EP 01'),
    category: String(v.category || 'Bachelor Point'),
    thumbnail: String(v.thumbnail || ''),
    streamLink: String(v.streamLink || ''),
    downloadLink: String(v.downloadLink || ''),
    views: String(v.views || '150'),
    accessType: String(v.accessType || 'free'),
    price: String(v.price || ''),
    requiredRounds: Number(v.requiredRounds || 4),
    createdAt: typeof v.createdAt === 'number' ? v.createdAt : Date.now(),
    updatedAt: Date.now(),
  };
}

export async function saveVideoToCloud(video: Video): Promise<void> {
  if (!db) return;
  try {
    const payload = sanitizeVideoForFirestore(video);
    await setDoc(doc(db, 'videos', video.id), payload, { merge: true });
  } catch (err) {
    console.warn('Error saving video to Firestore:', err);
  }
}

export async function deleteVideoFromCloud(videoId: string): Promise<void> {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'videos', videoId));
  } catch (err) {
    console.warn('Error deleting video from Firestore:', err);
  }
}

export async function saveSettingsToCloud(settings: AppSettings): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'settings', 'global_config'), settings, { merge: true });
  } catch (err) {
    console.warn('Error saving settings to Firestore:', err);
  }
}

export function subscribeToVideos(
  onUpdate: (videos: Video[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    return onSnapshot(
      collection(db, 'videos'),
      (snapshot) => {
        const list: Video[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Video;
          if (data && data.id) {
            list.push(data);
          }
        });
        // Sort newest first
        list.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore videos snapshot error:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Firestore subscription exception:', err);
    return null;
  }
}

export function subscribeToSettings(
  onUpdate: (settings: Partial<AppSettings>) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    return onSnapshot(
      doc(db, 'settings', 'global_config'),
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as Partial<AppSettings>);
        }
      },
      (err) => {
        console.warn('Firestore settings snapshot error:', err);
      }
    );
  } catch (err) {
    console.warn('Firestore settings exception:', err);
    return null;
  }
}
