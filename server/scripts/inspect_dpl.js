const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bbsyztzngsjrdlehlaeg.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iQNU0r84GkJZF_tEqFqhLw_Z9MgBsJa';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log('Fetching DPL 2026 from Supabase...');
    const { data: tournaments, error: tErr } = await supabase
        .from('tournaments')
        .select('*')
        .ilike('name', '%DPL 2026%');

    if (tErr) {
        console.error('Error fetching tournament:', tErr);
        return;
    }

    console.log('Tournaments found:', tournaments?.length);
    if (!tournaments || !tournaments.length) {
        const { data: allT } = await supabase.from('tournaments').select('_id, name, budget_scale, description');
        console.log('All tournaments in Supabase:', allT);
        return;
    }

    const t = tournaments[0];
    console.log('Tournament details:', {
        _id: t._id,
        name: t.name,
        budget_scale: t.budget_scale,
        description: t.description,
        status: t.status,
        bidding_state: t.bidding_state,
        current_bidding_player_id: t.current_bidding_player_id
    });

    const { data: teams } = await supabase.from('teams').select('*').eq('tournament_id', t._id);
    console.log('Teams count:', teams?.length);
    console.log('Teams:', teams?.map(tm => ({
        _id: tm._id,
        name: tm.name,
        budget: tm.budget,
        spent: tm.spent,
        is_owner_captain: tm.is_owner_captain,
        captain_price: tm.captain_price,
        players_count: tm.players?.length,
        players: tm.players
    })));

    const { data: players } = await supabase.from('players').select('*').eq('tournament_id', t._id);
    console.log('Players count:', players?.length);
    console.log('Players status breakdown:', players?.map(p => ({
        _id: p._id,
        name: p.name,
        base_price: p.base_price,
        sold_price: p.sold_price,
        status: p.status,
        sold_to_team_id: p.sold_to_team_id,
        current_bid: p.current_bid
    })));
}

run();
