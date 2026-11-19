require('dotenv').config({ path: 'server/.env' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DB_FILE = path.join(__dirname, '../data/local_db.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('⚡ Starting Supabase hydration and repair...');
    
    // 1. Fetch all data from Supabase
    const [tournRes, slotsRes, teamsRes, playersRes, usersRes] = await Promise.all([
        supabase.from('tournaments').select('*'),
        supabase.from('slots').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('players').select('*'),
        supabase.from('users').select('*')
    ]);

    if (tournRes.error) console.error('Tournaments error:', tournRes.error);
    if (teamsRes.error) console.error('Teams error:', teamsRes.error);
    if (playersRes.error) console.error('Players error:', playersRes.error);

    let currentLocal = { tournaments: [], slots: [], teams: [], players: [], users: [] };
    if (fs.existsSync(DB_FILE)) {
        try {
            currentLocal = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        } catch(e) {}
    }

    const tournaments = (tournRes.data || []).map(r => {
        const local = (currentLocal.tournaments || []).find(lt => lt._id === r._id);
        const scale = r.budget_scale || (r.description && r.description.includes('SCALE:K_TO_L') ? 'K_TO_L' : (r.description && r.description.includes('SCALE:L_TO_CR') ? 'L_TO_CR' : (local?.budgetScale || 'L_TO_CR')));
        const cleanDesc = r.description ? r.description.replace(/\[SCALE:[^\]]+\]\s*/g, '').trim() : (local?.description || '');
        return {
            _id: r._id,
            name: r.name,
            status: r.status,
            auctionType: r.auction_type,
            biddingState: r.bidding_state,
            squadSizeLimit: r.squad_size_limit,
            startDate: r.start_date,
            time: r.time,
            description: cleanDesc,
            logo: r.logo,
            budgetScale: scale,
            activeSlotId: r.active_slot_id,
            slotDrawMode: r.slot_draw_mode || local?.slotDrawMode || 'order',
            currentBiddingPlayerId: r.current_bidding_player_id,
            bidIncrementRules: r.bid_increment_rules || [],
            registrationOpen: r.registration_open !== false
        };
    });

    const slots = (slotsRes.data || []).map(r => ({
        _id: r._id,
        tournamentId: r.tournament_id,
        name: r.name,
        role: r.role,
        basePrice: (r.is_default_unsold || r.slot_type === 'unsold' || r.base_price == null) ? null : r.base_price,
        order: r.order,
        isDefaultUnsold: r.is_default_unsold,
        slotType: r.slot_type
    }));

    const players = (playersRes.data || []).map(r => {
        const sPrice = Number(r.sold_price) > 0 ? Number(r.sold_price) : (r.status === 'sold' && Number(r.current_bid) > 0 ? Number(r.current_bid) : (Number(r.sold_price) || 0));
        return {
            _id: r._id,
            tournamentId: r.tournament_id,
            slotId: r.slot_id,
            name: r.name,
            category: r.category,
            battingStyle: r.batting_style,
            bowlingStyle: r.bowling_style,
            basePrice: Number(r.base_price) || 0,
            currentBid: Number(r.current_bid) || 0,
            soldPrice: sPrice,
            sold_price: sPrice,
            status: r.status,
            currentLeadTeamId: r.current_lead_team_id,
            soldToTeamId: r.sold_to_team_id,
            image: r.image,
            cricHeroesProfileUrl: r.cric_heroes_profile_url,
            mobile: r.mobile,
            age: r.age,
            stats: r.stats || {},
            isReAuction: r.is_re_auction,
            isCaptain: Boolean(r.is_captain) || String(r._id || '').startsWith('pl_cap_')
        };
    });

    // Compute spent for each team based on captain price + all sold players
    const teams = (teamsRes.data || []).map(r => {
        const local = (currentLocal.teams || []).find(lt => lt._id === r._id);
        const captainPrice = r.is_owner_captain ? (Number(r.captain_price) || 0) : 0;
        const captainFeeInLarge = Number((captainPrice / 100).toFixed(2));

        // Sold players for this team
        const soldPlayers = players.filter(p => p.soldToTeamId === r._id && p.status === 'sold' && !p.isCaptain);
        const playersSpentInLarge = soldPlayers.reduce((acc, p) => acc + (Number(p.soldPrice) / 100), 0);
        const accurateSpent = Number((captainFeeInLarge + playersSpentInLarge).toFixed(2));

        const playerIds = soldPlayers.map(p => p._id);
        // Also keep any existing players in array
        const mergedPlayers = Array.from(new Set([...(r.players || []), ...playerIds]));

        return {
            _id: r._id,
            tournamentId: r.tournament_id,
            name: r.name,
            shortName: r.short_name,
            logo: r.logo || local?.logo || '',
            budget: Number(r.budget) || 100,
            spent: accurateSpent,
            isOwnerCaptain: r.is_owner_captain ?? local?.isOwnerCaptain,
            captainName: r.captain_name || local?.captainName || '',
            captainPrice: r.captain_price ?? local?.captainPrice ?? 0,
            captainPhoto: r.captain_photo || local?.captainPhoto || '',
            captainPlayerId: r.captain_player_id || local?.captainPlayerId || null,
            players: mergedPlayers
        };
    });

    const users = (usersRes.data || []).map(r => {
        const local = (currentLocal.users || []).find(lu => lu._id === r._id);
        return {
            _id: r._id,
            username: r.username,
            name: r.name || local?.name || '',
            organizationName: r.organization_name,
            phone: r.phone,
            passwordHash: r.password_hash,
            plainPassword: r.plain_password || local?.plainPassword,
            role: r.role,
            tournamentId: r.tournament_id,
            teamId: r.team_id,
            teamName: r.team_name,
            captainName: r.captain_name || local?.captainName || '',
            captainPhoto: r.captain_photo || local?.captainPhoto || '',
            captainPlayerId: r.captain_player_id || local?.captainPlayerId || null,
            captainPrice: r.captain_price ?? local?.captainPrice ?? 0,
            category: r.category || local?.category || 'All-Rounder',
            battingStyle: r.batting_style || local?.battingStyle || 'Right Handed',
            bowlingStyle: r.bowling_style || local?.bowlingStyle || 'Right-arm Medium',
            age: r.age || local?.age || 28,
            cricHeroesProfileUrl: r.cric_heroes_profile_url || local?.cricHeroesProfileUrl || ''
        };
    });

    const mergedData = {
        tournaments,
        slots,
        teams,
        players,
        users
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(mergedData, null, 2), 'utf8');
    console.log('✅ local_db.json successfully populated with all Supabase data!');

    // 2. Also update Supabase teams table with accurate spent and players!
    console.log('⚡ Updating teams spent in Supabase...');
    for (const team of teams) {
        console.log(`Updating ${team.name} (ID: ${team._id}): spent = ${team.spent} (players: ${team.players.length})`);
        const { error } = await supabase.from('teams').update({
            spent: team.spent,
            players: team.players,
            updated_at: new Date().toISOString()
        }).eq('_id', team._id);
        if (error) console.error(`Error updating team ${team.name}:`, error.message);
        else console.log(`✅ Supabase updated: ${team.name} spent = ${team.spent}`);
    }

    console.log('🎉 Done! Hydration and repair complete.');
}

run().catch(console.error);
