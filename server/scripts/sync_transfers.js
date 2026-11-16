const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in server/.env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const DB_FILE = path.join(__dirname, '../data/local_db.json');

async function sync() {
    console.log('Reading local data.json...');
    if (!fs.existsSync(DB_FILE)) {
        console.error('data.json not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const transfers = data.transfers || [];
    console.log(`Found ${transfers.length} transfers in local data.json`);

    if (transfers.length === 0) {
        console.log('No transfers to sync.');
        return;
    }

    for (const tx of transfers) {
        const row = {
            _id: tx._id,
            tournament_id: tx.tournamentId || tx.tournament_id,
            type: tx.type,
            team_a_id: tx.teamAId || tx.team_a_id || null,
            team_a_name: tx.teamAName || tx.team_a_name || null,
            team_a_logo: tx.teamALogo || tx.team_a_logo || null,
            player_a_id: tx.playerAId || tx.player_a_id || null,
            player_a_name: tx.playerAName || tx.player_a_name || null,
            player_a_price: Number(tx.playerAPrice ?? tx.player_a_price ?? 0),
            team_b_id: tx.teamBId || tx.team_b_id || null,
            team_b_name: tx.teamBName || tx.team_b_name || null,
            team_b_logo: tx.teamBLogo || tx.team_b_logo || null,
            player_b_id: tx.playerBId || tx.player_b_id || null,
            player_b_name: tx.playerBName || tx.player_b_name || null,
            player_b_price: Number(tx.playerBPrice ?? tx.player_b_price ?? 0),
            team_id: tx.teamId || tx.team_id || null,
            team_name: tx.teamName || tx.team_name || null,
            team_logo: tx.teamLogo || tx.team_logo || null,
            injured_player_id: tx.injuredPlayerId || tx.injured_player_id || null,
            injured_player_name: tx.injuredPlayerName || tx.injured_player_name || null,
            injured_player_price: Number(tx.injuredPlayerPrice ?? tx.injured_player_price ?? 0),
            replacement_player_id: tx.replacementPlayerId || tx.replacement_player_id || null,
            replacement_player_name: tx.replacementPlayerName || tx.replacement_player_name || null,
            replacement_player_price: Number(tx.replacementPlayerPrice ?? tx.replacement_player_price ?? 0),
            refund_amount: Number(tx.refundAmount ?? tx.refund_amount ?? tx.injuredPlayerPrice ?? 0),
            replacement_fee: Number(tx.replacementFee ?? tx.replacement_fee ?? tx.replacementPlayerPrice ?? 0),
            player_id: tx.playerId || tx.player_id || null,
            player_name: tx.playerName || tx.player_name || null,
            player_category: tx.playerCategory || tx.player_category || null,
            player_base_price: Number(tx.playerBasePrice ?? tx.player_base_price ?? 0),
            player_image: tx.playerImage || tx.player_image || null,
            note: tx.note || tx.notes || null,
            notes: tx.note || tx.notes || null,
            price_difference: Number(tx.priceDifference ?? tx.price_difference ?? tx.priceDiff ?? 0),
            created_at: tx.createdAt || tx.created_at || tx.timestamp || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('transfers').upsert(row, { onConflict: '_id' });
        if (error) {
            console.error(`❌ Failed to sync transfer ${tx._id}:`, error.message);
        } else {
            console.log(`✅ Synced transfer: ${tx._id} (${tx.type})`);
        }
    }

    console.log('Sync process completed.');
}

sync();
