import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'tokens';
export type Tokens = { accessToken: string; refreshToken: string };

// SecureStore web par kaam nahi karta, isliye web par (sirf dev) localStorage.
export async function getTokens(): Promise<Tokens | null> {
  try {
    const raw = Platform.OS === 'web' ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export async function setTokens(t: Tokens) {
  const raw = JSON.stringify(t);
  if (Platform.OS === 'web') localStorage.setItem(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw);
}

export async function clearTokens() {
  try {
    if (Platform.OS === 'web') localStorage.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {}
}