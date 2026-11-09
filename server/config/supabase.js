const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false
            }
        });
        console.log('⚡ Supabase Client Initialized Successfully');
    } catch (err) {
        console.error('❌ Supabase initialization error:', err.message);
    }
} else {
    console.log('ℹ️  Supabase URL/Key not configured in server/.env (Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable Supabase)');
}

module.exports = supabase;

