const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
const supabase = require('../config/supabase');

const DB_FILE = path.join(__dirname, '../data/local_db.json');

async function syncToSupabase() {
    console.log('🚀 Starting Local DB -> Supabase Data Migration...');

    if (!supabase) {
        console.warn('⚠️ Supabase client not initialized. Check server/.env for SUPABASE_URL and SUPABASE_ANON_KEY.');
        if (require.main === module) process.exit(1);
        return;
    }

    if (!fs.existsSync(DB_FILE)) {
        console.warn('⚠️ Local database file not found at:', DB_FILE);
        if (require.main === module) process.exit(1);
        return;
    }

    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const localDb = JSON.parse(raw);

    const results = {};

    // 1. Sync Tournaments
    if (Array.isArray(localDb.tournaments) && localDb.tournaments.length > 0) {
        console.log(`\n📋 Syncing ${localDb.tournaments.length} Tournaments...`);
        const rows = localDb.tournaments.map(t => ({
            _id: t._id,
            name: t.name || 'Tournament',
            status: t.status || 'upcoming',
            auction_type: t.auctionType || 'owner_driven',
            bidding_state: t.biddingState || 'idle',
            squad_size_limit: Number(t.squadSizeLimit) || 25,
            start_date: t.startDate || null,
            time: t.time || null,
            description: t.description || null,
            logo: t.logo || null,
            active_slot_id: t.activeSlotId || null,
            current_bidding_player_id: t.currentBiddingPlayerId || null,
            bid_increment_rules: t.bidIncrementRules || []
        }));

        const { data, error } = await supabase.from('tournaments').upsert(rows, { onConflict: '_id' });
        if (error) {
            console.error('❌ Tournaments Sync Error:', error.message);
            results.tournaments = `Failed: ${error.message}`;
        } else {
            console.log(`✅ Tournaments Synced: ${rows.length}`);
            results.tournaments = `Success (${rows.length})`;
        }
    }

    // 2. Sync Slots
    if (Array.isArray(localDb.slots) && localDb.slots.length > 0) {
        console.log(`\n🗂️ Syncing ${localDb.slots.length} Slots...`);
        const rows = localDb.slots.map(s => ({
            _id: s._id,
            tournament_id: s.tournamentId || null,
            name: s.name,
            role: s.role || 'Batsman',
            base_price: Number(s.basePrice) || 20,
            order: Number(s.order) || 1,
            is_default_unsold: Boolean(s.isDefaultUnsold),
            slot_type: s.slotType || 'custom'
        }));

        const { data, error } = await supabase.from('slots').upsert(rows, { onConflict: '_id' });
        if (error) {
            console.error('❌ Slots Sync Error:', error.message);
            results.slots = `Failed: ${error.message}`;
        } else {
            console.log(`✅ Slots Synced: ${rows.length}`);
            results.slots = `Success (${rows.length})`;
        }
    }

    // 3. Sync Teams
    if (Array.isArray(localDb.teams) && localDb.teams.length > 0) {
        console.log(`\n🛡️ Syncing ${localDb.teams.length} Teams...`);
        const rows = localDb.teams.map(tm => ({
            _id: tm._id,
            tournament_id: tm.tournamentId || null,
            name: tm.name,
            short_name: tm.shortName || null,
            logo: tm.logo || null,
            budget: Number(tm.budget) || 100,
            spent: Number(tm.spent) || 0,
            is_owner_captain: Boolean(tm.isOwnerCaptain),
            captain_name: tm.captainName || null,
            captain_price: Number(tm.captainPrice) || 0,
            captain_photo: tm.captainPhoto || tm.captainImage || null,
            players: tm.players || []
        }));

        let { data, error } = await supabase.from('teams').upsert(rows, { onConflict: '_id' });
        if (error && error.message && error.message.includes('captain_photo')) {
            // In case user has not run ALTER TABLE yet, omit captain_photo so sync succeeds
            const fallbackRows = rows.map(({ captain_photo, ...rest }) => rest);
            const retry = await supabase.from('teams').upsert(fallbackRows, { onConflict: '_id' });
            error = retry.error;
        }

        if (error) {
            console.error('❌ Teams Sync Error:', error.message);
            results.teams = `Failed: ${error.message}`;
        } else {
            console.log(`✅ Teams Synced: ${rows.length}`);
            results.teams = `Success (${rows.length})`;
        }
    }

    // 4. Sync Players
    if (Array.isArray(localDb.players) && localDb.players.length > 0) {
        console.log(`\n👥 Syncing ${localDb.players.length} Players...`);
        const rows = localDb.players.map(p => ({
            _id: p._id,
            tournament_id: p.tournamentId || null,
            slot_id: p.slotId || null,
            name: p.name,
            category: p.category || 'Batsman',
            batting_style: p.battingStyle || null,
            bowling_style: p.bowlingStyle || null,
            base_price: Number(p.basePrice) || 20,
            current_bid: Number(p.currentBid) || 0,
            sold_price: Number(p.soldPrice) || 0,
            status: p.status || 'pending',
            current_lead_team_id: p.currentLeadTeamId ? (typeof p.currentLeadTeamId === 'object' ? p.currentLeadTeamId : { _id: p.currentLeadTeamId }) : null,
            sold_to_team_id: p.soldToTeamId || null,
            image: p.image || null,
            cric_heroes_profile_url: p.cricHeroesProfileUrl || null,
            mobile: p.mobile || null,
            age: Number(p.age) || null,
            stats: p.stats || {},
            is_re_auction: Boolean(p.isReAuction)
        }));

        const { data, error } = await supabase.from('players').upsert(rows, { onConflict: '_id' });
        if (error) {
            console.error('❌ Players Sync Error:', error.message);
            results.players = `Failed: ${error.message}`;
        } else {
            console.log(`✅ Players Synced: ${rows.length}`);
            results.players = `Success (${rows.length})`;
        }
    }

    // 5. Sync Users / Logins
    if (Array.isArray(localDb.users) && localDb.users.length > 0) {
        console.log(`\n🔑 Syncing ${localDb.users.length} Users...`);
        const rows = localDb.users.map(u => ({
            _id: u._id,
            username: u.username,
            name: u.name || null,
            organization_name: u.organizationName || null,
            phone: u.phone || null,
            password_hash: u.passwordHash,
            plain_password: u.plainPassword || null,
            role: u.role || 'team_owner',
            tournament_id: u.tournamentId || null,
            team_id: u.teamId || null,
            team_name: u.teamName || null
        }));

        const { data, error } = await supabase.from('users').upsert(rows, { onConflict: '_id' });
        if (error) {
            console.error('❌ Users Sync Error:', error.message);
            results.users = `Failed: ${error.message}`;
        } else {
            console.log(`✅ Users Synced: ${rows.length}`);
            results.users = `Success (${rows.length})`;
        }
    }

    console.log('\n=======================================');
    console.log('🎉 Migration Summary:');
    console.log(JSON.stringify(results, null, 2));
    console.log('=======================================');
}

if (require.main === module) {
    syncToSupabase().then(() => process.exit(0)).catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}

module.exports = syncToSupabase;

