import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

/**
 * Universal storage adapter supporting:
 * 1. Standalone builds with AsyncStorage v3 TurboModule (`RNAsyncStorage`)
 * 2. Expo Go / legacy builds with AsyncStorage v2 (`RNCAsyncStorage` / `RNC_AsyncSQLiteDBStorage`)
 * 3. Safe in-memory fallback (and `localStorage` on web) so native module mismatches never crash.
 */
const memoryStore = new Map<string, string>();

interface LegacyNativeStorage {
    multiGet?: (keys: string[], cb: (errors: any, result: [string, string | null][]) => void) => void;
    multiSet?: (entries: [string, string][], cb: (errors: any) => void) => void;
    multiRemove?: (keys: string[], cb: (errors: any) => void) => void;
}

const getLegacyNativeModule = (): LegacyNativeStorage | null => {
    try {
        const mod =
            NativeModules?.RNCAsyncStorage ||
            NativeModules?.RNC_AsyncSQLiteDBStorage ||
            NativeModules?.PlatformLocalStorage ||
            null;
        if (mod && typeof mod.multiGet === 'function') {
            return mod;
        }
    } catch {}
    return null;
};

let cachedV3Module: any | undefined;
const getV3AsyncStorage = (): any | null => {
    if (cachedV3Module !== undefined) return cachedV3Module;
    try {
        // Check TurboModule before calling v3 AsyncStorage so it won't throw "Native module is null"
        const nativeV3 = TurboModuleRegistry?.get?.('RNAsyncStorage');
        if (nativeV3) {
            cachedV3Module = require('@react-native-async-storage/async-storage').default;
            return cachedV3Module;
        }
    } catch {}
    cachedV3Module = null;
    return null;
};

export const safeStorage = {
    async getItem(key: string): Promise<string | null> {
        const webStorage = (globalThis as any)?.localStorage;
        if (Platform.OS === 'web' && webStorage) {
            try {
                return webStorage.getItem(key);
            } catch {}
        }

        const v3 = getV3AsyncStorage();
        if (v3) {
            try {
                return await v3.getItem(key);
            } catch {}
        }

        const legacy = getLegacyNativeModule();
        if (legacy?.multiGet) {
            try {
                const value = await new Promise<string | null>((resolve) => {
                    legacy.multiGet!([key], (errs, res) => {
                        if (errs || !res || !res[0]) return resolve(memoryStore.get(key) ?? null);
                        resolve(res[0][1] ?? null);
                    });
                });
                if (value !== null) memoryStore.set(key, value);
                return value;
            } catch {}
        }

        return memoryStore.get(key) ?? null;
    },

    async setItem(key: string, value: string): Promise<void> {
        memoryStore.set(key, value);

        const webStorage = (globalThis as any)?.localStorage;
        if (Platform.OS === 'web' && webStorage) {
            try {
                webStorage.setItem(key, value);
                return;
            } catch {}
        }

        const v3 = getV3AsyncStorage();
        if (v3) {
            try {
                await v3.setItem(key, value);
                return;
            } catch {}
        }

        const legacy = getLegacyNativeModule();
        if (legacy?.multiSet) {
            try {
                await new Promise<void>((resolve) => {
                    legacy.multiSet!([[key, value]], () => resolve());
                });
                return;
            } catch {}
        }
    },

    async removeItem(key: string): Promise<void> {
        memoryStore.delete(key);

        const webStorage = (globalThis as any)?.localStorage;
        if (Platform.OS === 'web' && webStorage) {
            try {
                webStorage.removeItem(key);
                return;
            } catch {}
        }

        const v3 = getV3AsyncStorage();
        if (v3) {
            try {
                await v3.removeItem(key);
                return;
            } catch {}
        }

        const legacy = getLegacyNativeModule();
        if (legacy?.multiRemove) {
            try {
                await new Promise<void>((resolve) => {
                    legacy.multiRemove!([key], () => resolve());
                });
                return;
            } catch {}
        }
    }
};

export default safeStorage;
