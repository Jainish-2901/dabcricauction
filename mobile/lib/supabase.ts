import { createClient } from '@supabase/supabase-js';
import { safeStorage } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bbsyztzngsjrdlehlaeg.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_iQNU0r84GkJZF_tEqFqhLw_Z9MgBsJa';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: safeStorage,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
    realtime: {
        params: {
            eventsPerSecond: 20
        }
    }
});

export default supabase;

