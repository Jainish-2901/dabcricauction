const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const DB_FILE = path.join(__dirname, '../data/local_db.json');

// Ensure data folder exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initial default seed is completely empty for a fresh start
const defaultData = {
    users: [],
    tournaments: [],
    teams: [],
    players: [],
    slots: [],
    transfers: []
};

const readData = () => {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
            return defaultData;
        }
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed.slots) parsed.slots = [];
        if (!parsed.transfers) parsed.transfers = [];
        return parsed;
    } catch (err) {
        console.error('Error reading local JSON db:', err);
        return defaultData;
    }
};

let syncTimeout = null;
const syncToSupabaseAsync = () => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        try {
            const syncFn = require('../scripts/sync_to_supabase');
            await syncFn();
        } catch (e) {
            console.warn('⚠️ Supabase background sync notice:', e.message);
        }
    }, 1500);
};

// Direct Supabase Cloud DB Realtime Sync Handlers
const supaSync = {
    async insertTournament(t) {
        if (!supabase) return;
        try {
            const scale = t.budgetScale === 'K_TO_L' ? 'K_TO_L' : 'L_TO_CR';
            const scaleTag = `[SCALE:${scale}]`;
            const creatorTag = t.createdBy ? `[CREATOR:${t.createdBy}]` : '';
            const cleanDesc = (t.description || '').replace(/\[(SCALE|CREATOR):[^\]]+\]\s*/g, '').trim();
            const descWithTag = [scaleTag, creatorTag, cleanDesc].filter(Boolean).join(' ');
            const row = {
                _id: t._id,
                name: t.name || 'Tournament',
                status: t.status || 'upcoming',
                auction_type: t.auctionType || 'owner_driven',
                bidding_state: t.biddingState || 'idle',
                squad_size_limit: Number(t.squadSizeLimit) || 25,
                start_date: t.startDate || null,
                time: t.time || null,
                description: descWithTag,
                logo: t.logo || null,
                active_slot_id: t.activeSlotId || null,
                current_bidding_player_id: t.currentBiddingPlayerId || null,
                bid_increment_rules: t.bidIncrementRules || [],
                updated_at: new Date().toISOString()
            };
            if (t.budgetScale) row.budget_scale = scale;
            if (t.slotDrawMode) row.slot_draw_mode = t.slotDrawMode;
            if (t.createdBy) row.created_by = t.createdBy;

            let { error } = await supabase.from('tournaments').upsert(row, { onConflict: '_id' });
            if (error && (error.message?.includes('schema cache') || error.message?.includes('column "created_by"') || error.message?.includes('created_by'))) {
                delete row.created_by;
                delete row.budget_scale;
                delete row.slot_draw_mode;
                const retry = await supabase.from('tournaments').upsert(row, { onConflict: '_id' });
                error = retry.error;
            }
            if (error) console.error('❌ Supabase insertTournament error:', error.message);
            else console.log('⚡ Supabase cloud: Tournament inserted ->', t._id);
        } catch (e) {
            console.error('❌ Supabase insertTournament exception:', e.message);
        }
    },

    async updateTournament(id, update) {
        if (!supabase) return;
        try {
            const row = { updated_at: new Date().toISOString() };
            if (update.name !== undefined) row.name = update.name;
            if (update.status !== undefined) row.status = update.status;
            if (update.auctionType !== undefined) row.auction_type = update.auctionType;
            if (update.biddingState !== undefined) row.bidding_state = update.biddingState;
            if (update.squadSizeLimit !== undefined) row.squad_size_limit = Number(update.squadSizeLimit) || 25;
            if (update.startDate !== undefined) row.start_date = update.startDate;
            if (update.time !== undefined) row.time = update.time;
            if (update.logo !== undefined) row.logo = update.logo;
            if (update.activeSlotId !== undefined) row.active_slot_id = update.activeSlotId;
            if (update.currentBiddingPlayerId !== undefined) row.current_bidding_player_id = update.currentBiddingPlayerId;
            if (update.bidIncrementRules !== undefined) row.bid_increment_rules = update.bidIncrementRules;

            if (update.budgetScale !== undefined || update.description !== undefined) {
                const scale = update.budgetScale || 'L_TO_CR';
                const scaleTag = `[SCALE:${scale}]`;
                const rawDesc = update.description !== undefined ? update.description : '';
                const cleanDesc = (rawDesc || '').replace(/\[SCALE:[^\]]+\]\s*/g, '').trim();
                row.description = cleanDesc ? `${scaleTag} ${cleanDesc}` : scaleTag;
                row.budget_scale = scale;
            }
            if (update.slotDrawMode !== undefined) {
                row.slot_draw_mode = update.slotDrawMode;
            }

            let { error } = await supabase.from('tournaments').update(row).eq('_id', id);
            if (error && error.message?.includes('schema cache')) {
                delete row.budget_scale;
                delete row.slot_draw_mode;
                const retry = await supabase.from('tournaments').update(row).eq('_id', id);
                error = retry.error;
            }
            if (error) console.error('❌ Supabase updateTournament error:', error.message);
            else console.log('⚡ Supabase cloud: Tournament updated ->', id);
        } catch (e) {
            console.error('❌ Supabase updateTournament exception:', e.message);
        }
    },

    async deleteTournament(id) {
        if (!supabase) return;
        try {
            await Promise.allSettled([
                supabase.from('tournaments').delete().eq('_id', id),
                supabase.from('teams').delete().eq('tournament_id', id),
                supabase.from('players').delete().eq('tournament_id', id),
                supabase.from('slots').delete().eq('tournament_id', id),
                supabase.from('users').delete().eq('tournament_id', id),
                supabase.from('bids').delete().eq('tournament_id', id)
            ]);
            console.log('⚡ Supabase cloud: Tournament and cascaded records deleted ->', id);
        } catch (e) {
            console.error('❌ Supabase deleteTournament error:', e.message);
        }
    },

    async insertTeam(tm) {
        if (!supabase) return;
        try {
            const row = {
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
                captain_photo: tm.captainPhoto || null,
                players: tm.players || [],
                updated_at: new Date().toISOString()
            };
            const { error } = await supabase.from('teams').upsert(row, { onConflict: '_id' });
            if (error) console.error('❌ Supabase insertTeam error:', error.message);
            else console.log('⚡ Supabase cloud: Team inserted ->', tm._id);
        } catch (e) {
            console.error('❌ Supabase insertTeam exception:', e.message);
        }
    },

    async updateTeam(id, update) {
        if (!supabase) return;
        try {
            const row = { updated_at: new Date().toISOString() };
            if (update.name !== undefined) row.name = update.name;
            if (update.shortName !== undefined) row.short_name = update.shortName;
            if (update.logo !== undefined) row.logo = update.logo;
            if (update.budget !== undefined) row.budget = Number(update.budget);
            if (update.spent !== undefined) row.spent = Number(update.spent);
            if (update.isOwnerCaptain !== undefined) row.is_owner_captain = Boolean(update.isOwnerCaptain);
            if (update.captainName !== undefined) row.captain_name = update.captainName;
            if (update.captainPrice !== undefined) row.captain_price = Number(update.captainPrice);
            if (update.captainPhoto !== undefined) row.captain_photo = update.captainPhoto;
            if (update.players !== undefined) row.players = update.players;

            const { error } = await supabase.from('teams').update(row).eq('_id', id);
            if (error) console.error('❌ Supabase updateTeam error:', error.message);
        } catch (e) {
            console.error('❌ Supabase updateTeam exception:', e.message);
        }
    },

    async deleteTeam(id) {
        if (!supabase) return;
        try {
            await Promise.allSettled([
                supabase.from('teams').delete().eq('_id', id),
                supabase.from('players').update({ sold_to_team_id: null, current_lead_team_id: null, status: 'pending' }).eq('sold_to_team_id', id),
                supabase.from('users').delete().eq('team_id', id)
            ]);
            console.log('⚡ Supabase cloud: Team deleted ->', id);
        } catch (e) {
            console.error('❌ Supabase deleteTeam error:', e.message);
        }
    },

    async insertPlayer(p) {
        if (!supabase) return;
        try {
            const row = {
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
                current_lead_team_id: p.currentLeadTeamId || null,
                sold_to_team_id: p.soldToTeamId || null,
                image: p.image || null,
                cric_heroes_profile_url: p.cricHeroesProfileUrl || null,
                mobile: p.mobile || null,
                age: Number(p.age) || null,
                stats: p.stats || {},
                is_re_auction: Boolean(p.isReAuction),
                updated_at: new Date().toISOString()
            };
            const { error } = await supabase.from('players').upsert(row, { onConflict: '_id' });
            if (error) console.error('❌ Supabase insertPlayer error:', error.message);
            else console.log('⚡ Supabase cloud: Player inserted ->', p._id);
        } catch (e) {
            console.error('❌ Supabase insertPlayer exception:', e.message);
        }
    },

    async updatePlayer(id, update) {
        if (!supabase) return;
        try {
            const row = { updated_at: new Date().toISOString() };
            if (update.name !== undefined) row.name = update.name;
            if (update.category !== undefined) row.category = update.category;
            if (update.battingStyle !== undefined) row.batting_style = update.battingStyle;
            if (update.bowlingStyle !== undefined) row.bowling_style = update.bowlingStyle;
            if (update.basePrice !== undefined) row.base_price = Number(update.basePrice);
            if (update.currentBid !== undefined) row.current_bid = Number(update.currentBid);
            if (update.soldPrice !== undefined) row.sold_price = Number(update.soldPrice);
            if (update.status !== undefined) row.status = update.status;
            if (update.slotId !== undefined) row.slot_id = update.slotId;
            if (update.currentLeadTeamId !== undefined) row.current_lead_team_id = update.currentLeadTeamId;
            if (update.soldToTeamId !== undefined) row.sold_to_team_id = update.soldToTeamId;
            if (update.image !== undefined) row.image = update.image;
            if (update.cricHeroesProfileUrl !== undefined) row.cric_heroes_profile_url = update.cricHeroesProfileUrl;
            if (update.age !== undefined) row.age = Number(update.age);
            if (update.stats !== undefined) row.stats = update.stats;
            if (update.isReAuction !== undefined) row.is_re_auction = Boolean(update.isReAuction);

            const { error } = await supabase.from('players').update(row).eq('_id', id);
            if (error) console.error('❌ Supabase updatePlayer error:', error.message);
        } catch (e) {
            console.error('❌ Supabase updatePlayer exception:', e.message);
        }
    },

    async deletePlayer(id) {
        if (!supabase) return;
        try {
            await supabase.from('players').delete().eq('_id', id);
            console.log('⚡ Supabase cloud: Player deleted ->', id);
        } catch (e) {
            console.error('❌ Supabase deletePlayer error:', e.message);
        }
    },

    async insertSlot(s) {
        if (!supabase) return;
        try {
            const row = {
                _id: s._id,
                tournament_id: s.tournamentId || null,
                name: s.name,
                role: s.role || 'Batsman',
                base_price: (s.isDefaultUnsold || s.slotType === 'unsold' || s.basePrice == null) ? null : Number(s.basePrice),
                order: Number(s.order) || 1,
                is_default_unsold: Boolean(s.isDefaultUnsold),
                slot_type: s.slotType || 'custom',
                updated_at: new Date().toISOString()
            };
            const { error } = await supabase.from('slots').upsert(row, { onConflict: '_id' });
            if (error) console.error('❌ Supabase insertSlot error:', error.message);
            else console.log('⚡ Supabase cloud: Slot inserted ->', s._id);
        } catch (e) {
            console.error('❌ Supabase insertSlot exception:', e.message);
        }
    },

    async updateSlot(id, update) {
        if (!supabase) return;
        try {
            const row = { updated_at: new Date().toISOString() };
            if (update.name !== undefined) row.name = update.name;
            if (update.role !== undefined) row.role = update.role;
            if (update.basePrice !== undefined) row.base_price = Number(update.basePrice);
            if (update.order !== undefined) row.order = Number(update.order);
            if (update.isDefaultUnsold !== undefined) row.is_default_unsold = Boolean(update.isDefaultUnsold);
            if (update.slotType !== undefined) row.slot_type = update.slotType;

            const { error } = await supabase.from('slots').update(row).eq('_id', id);
            if (error) console.error('❌ Supabase updateSlot error:', error.message);
        } catch (e) {
            console.error('❌ Supabase updateSlot exception:', e.message);
        }
    },

    async deleteSlot(id) {
        if (!supabase) return;
        try {
            await Promise.allSettled([
                supabase.from('slots').delete().eq('_id', id),
                supabase.from('players').update({ slot_id: null }).eq('slot_id', id)
            ]);
            console.log('⚡ Supabase cloud: Slot deleted ->', id);
        } catch (e) {
            console.error('❌ Supabase deleteSlot error:', e.message);
        }
    },

    async insertUser(u) {
        if (!supabase) return;
        try {
            const row = {
                _id: u._id,
                username: u.username,
                name: u.name || null,
                organization_name: u.organizationName || null,
                phone: u.phone || null,
                password_hash: u.passwordHash,
                plain_password: u.plainPassword || null,
                role: u.role || 'superadmin',
                tournament_id: u.tournamentId || null,
                team_id: u.teamId || null,
                team_name: u.teamName || null,
                updated_at: new Date().toISOString()
            };
            const { error } = await supabase.from('users').upsert(row, { onConflict: '_id' });
            if (error) console.error('❌ Supabase insertUser error:', error.message);
            else console.log('⚡ Supabase cloud: User inserted ->', u.username);
        } catch (e) {
            console.error('❌ Supabase insertUser exception:', e.message);
        }
    },

    async updateUser(id, update) {
        if (!supabase) return;
        try {
            const row = { updated_at: new Date().toISOString() };
            if (update.username !== undefined) row.username = update.username;
            if (update.name !== undefined) row.name = update.name;
            if (update.organizationName !== undefined) row.organization_name = update.organizationName;
            if (update.phone !== undefined) row.phone = update.phone;
            if (update.passwordHash !== undefined) row.password_hash = update.passwordHash;
            if (update.plainPassword !== undefined) row.plain_password = update.plainPassword;
            if (update.role !== undefined) row.role = update.role;
            if (update.teamId !== undefined) row.team_id = update.teamId;
            if (update.teamName !== undefined) row.team_name = update.teamName;

            const { error } = await supabase.from('users').update(row).eq('_id', id);
            if (error) console.error('❌ Supabase updateUser error:', error.message);
        } catch (e) {
            console.error('❌ Supabase updateUser exception:', e.message);
        }
    },

    async deleteUser(id) {
        if (!supabase) return;
        try {
            await supabase.from('users').delete().eq('_id', id);
            console.log('⚡ Supabase cloud: User deleted ->', id);
        } catch (e) {
            console.error('❌ Supabase deleteUser error:', e.message);
        }
    },

    async insertTransfer(tx) {
        if (!supabase) return;
        try {
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
                created_at: tx.createdAt || tx.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const { error } = await supabase.from('transfers').upsert(row, { onConflict: '_id' });
            if (error) console.error('❌ Supabase insertTransfer error:', error.message);
            else console.log('⚡ Supabase cloud: Transfer inserted ->', tx._id);
        } catch (e) {
            console.error('❌ Supabase insertTransfer exception:', e.message);
        }
    }
};

// Hydrate local cache from Supabase on startup
const hydrateFromSupabase = async () => {
    if (!supabase) return;
    try {
        const [tournRes, slotsRes, teamsRes, playersRes, usersRes] = await Promise.all([
            supabase.from('tournaments').select('*'),
            supabase.from('slots').select('*'),
            supabase.from('teams').select('*'),
            supabase.from('players').select('*'),
            supabase.from('users').select('*')
        ]);

        if (tournRes.error || teamsRes.error || playersRes.error) {
            return;
        }

        const hasSupabaseData = (tournRes.data?.length > 0 || teamsRes.data?.length > 0 || usersRes.data?.length > 0);
        if (!hasSupabaseData) return;

        const currentLocal = readData();

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

        const teams = (teamsRes.data || []).map(r => {
            const local = (currentLocal.teams || []).find(lt => lt._id === r._id);
            return {
                _id: r._id,
                tournamentId: r.tournament_id,
                name: r.name,
                shortName: r.short_name,
                logo: r.logo || local?.logo || '',
                budget: r.budget,
                spent: r.spent,
                isOwnerCaptain: r.is_owner_captain ?? local?.isOwnerCaptain,
                captainName: r.captain_name || local?.captainName || '',
                captainPrice: r.captain_price ?? local?.captainPrice ?? 0,
                captainPhoto: r.captain_photo || local?.captainPhoto || '',
                captainPlayerId: r.captain_player_id || local?.captainPlayerId || null,
                players: r.players || local?.players || []
            };
        });

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

        // Preserve any local captain players not yet in Supabase
        const localCaptains = (currentLocal.players || []).filter(lp => (lp.isCaptain || String(lp._id || '').startsWith('pl_cap_')) && !players.some(p => p._id === lp._id));
        const allPlayers = [...players, ...localCaptains];

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
            tournaments: tournaments.length > 0 ? tournaments : currentLocal.tournaments,
            slots: slots.length > 0 ? slots : currentLocal.slots,
            teams: teams.length > 0 ? teams : currentLocal.teams,
            players: allPlayers.length > 0 ? allPlayers : currentLocal.players,
            users: users.length > 0 ? users : currentLocal.users
        };

        fs.writeFileSync(DB_FILE, JSON.stringify(mergedData, null, 2), 'utf8');
        console.log('⚡ Local database successfully synchronized with Supabase Cloud DB.');
    } catch (e) {
        console.warn('⚠️ Notice: Could not hydrate from Supabase at startup:', e.message);
    }
};

// Run hydration in background on startup
setTimeout(hydrateFromSupabase, 500);

const writeData = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
        syncToSupabaseAsync();
    } catch (err) {
        console.error('Error writing local JSON db:', err);
    }
};

const DEFAULT_BID_RULES = [
    { from: 0, fromUnit: 'L', upTo: 1, toUnit: 'Cr', increment: 10, incrementUnit: 'L', label: 'Up to ₹1 Cr (100 L)' },
    { from: 1, fromUnit: 'Cr', upTo: 5, toUnit: 'Cr', increment: 25, incrementUnit: 'L', label: '₹1 Cr - ₹5 Cr (500 L)' },
    { from: 5, fromUnit: 'Cr', upTo: 10, toUnit: 'Cr', increment: 50, incrementUnit: 'L', label: '₹5 Cr - ₹10 Cr (1000 L)' },
    { from: 10, fromUnit: 'Cr', upTo: 999999, toUnit: 'Cr', increment: 100, incrementUnit: 'L', label: 'Above ₹10 Cr (> 1000 L)' }
];

const toBaseBidUnit = (value, unit, budgetScale = 'L_TO_CR') => {
    const val = Number(value) || 0;
    const isKtoL = budgetScale === 'K_TO_L';

    if (isKtoL) {
        if (unit === 'Cr') return val * 10000;
        if (unit === 'L') return val * 100;
        return val;
    } else {
        if (unit === 'Cr') return val * 100;
        if (unit === 'K') return Math.max(1, Math.round(val / 100));
        return val;
    }
};

function getBidIncrement(currentBid, rules = DEFAULT_BID_RULES, budgetScale = 'L_TO_CR') {
    const isKtoL = budgetScale === 'K_TO_L';
    const defaultSmallUnit = isKtoL ? 'K' : 'L';
    const list = Array.isArray(rules) && rules.length > 0 ? rules : DEFAULT_BID_RULES;

    const normalized = list.map((r, i, arr) => {
        const fUnit = r.fromUnit || r.rangeUnit || defaultSmallUnit;
        const tUnit = r.toUnit || r.rangeUnit || defaultSmallUnit;
        const iUnit = r.incrementUnit || defaultSmallUnit;
        const upToRaw = Number(r.upTo);
        const isUnlimited = isNaN(upToRaw) || upToRaw <= 0 || upToRaw >= 999999;

        const normUpTo = isUnlimited ? 999999999 : toBaseBidUnit(upToRaw, tUnit, budgetScale);
        const prevUpTo = i > 0 ? Number(arr[i - 1].upTo) : 0;
        const fromRaw = r.from !== undefined ? Number(r.from) : prevUpTo;
        const normFrom = toBaseBidUnit(fromRaw, fUnit, budgetScale);
        const normInc = toBaseBidUnit(Number(r.increment) || (isKtoL ? 5 : 10), iUnit, budgetScale);

        return {
            ...r,
            fromUnit: fUnit,
            toUnit: tUnit,
            incrementUnit: iUnit,
            normFrom,
            normUpTo,
            normInc: Math.max(1, normInc)
        };
    });

    normalized.sort((a, b) => a.normUpTo - b.normUpTo);

    const bid = Number(currentBid) || 0;
    for (const rule of normalized) {
        if (bid < rule.normUpTo) {
            return rule.normInc;
        }
    }
    return normalized[normalized.length - 1]?.normInc || (isKtoL ? 50 : 100);
}

const db = {
    init: hydrateFromSupabase,
    DEFAULT_BID_RULES,
    getBidIncrement,
    readData,
    writeData,

    // --- USERS ---
    async findUser(query) {
        const state = readData();
        return state.users.find(u => Object.entries(query).every(([k, v]) => u[k] === v)) || null;
    },

    async findUsers(query = {}) {
        const state = readData();
        if (!query || Object.keys(query).length === 0) return state.users;
        return state.users.filter(u => Object.entries(query).every(([k, v]) => u[k] === v));
    },

    async findUserById(id) {
        const state = readData();
        return state.users.find(u => u._id === id) || null;
    },

    async findUserByUsername(username) {
        const state = readData();
        let user = state.users.find(u => u.username?.toLowerCase() === username.toLowerCase());
        if (!user && supabase) {
            try {
                const { data } = await supabase.from('users').select('*').ilike('username', username.trim()).maybeSingle();
                if (data) {
                    user = {
                        _id: data._id,
                        id: data._id,
                        username: data.username,
                        name: data.name,
                        organizationName: data.organization_name,
                        phone: data.phone,
                        role: data.role,
                        passwordHash: data.password_hash,
                        plainPassword: data.plain_password,
                        tournamentId: data.tournament_id,
                        teamId: data.team_id,
                        teamName: data.team_name
                    };
                    state.users.push(user);
                    writeData(state);
                }
            } catch (err) {
                console.warn('Fallback findUserByUsername error:', err.message);
            }
        }
        if (!user) return null;

        // Populate team if available
        if (user.teamId && typeof user.teamId === 'string') {
            const team = state.teams.find(t => t._id === user.teamId);
            return { ...user, teamId: team || user.teamId };
        }
        return user;
    },

    async createUser({ username, password, role = 'superadmin', tournamentId, teamId, teamName, name, organizationName, phone }) {
        const state = readData();
        const existing = state.users.find(u => u.username?.toLowerCase() === username.toLowerCase());
        if (existing) {
            throw new Error('Username already exists. Please choose another.');
        }

        let assignedTeamId = teamId || null;
        if (role === 'team_owner' && teamName && !teamId) {
            const newTeam = {
                _id: 'team_' + Date.now(),
                tournamentId: tournamentId || null,
                name: teamName,
                shortName: teamName.substring(0, 3).toUpperCase(),
                budget: 100,
                spent: 0,
                players: []
            };
            state.teams.push(newTeam);
            assignedTeamId = newTeam._id;
        }

        const newUser = {
            _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            username: username.trim(),
            name: (name || '').trim(),
            organizationName: (organizationName || '').trim(),
            phone: (phone || '').trim(),
            passwordHash: bcrypt.hashSync(password.trim(), 10),
            plainPassword: password.trim(),
            role: role || 'superadmin',
            tournamentId: tournamentId || null,
            teamId: assignedTeamId
        };

        state.users.push(newUser);
        writeData(state);
        if (role === 'team_owner' && assignedTeamId) {
            const createdTeam = state.teams.find(t => t._id === assignedTeamId);
            if (createdTeam) await supaSync.insertTeam(createdTeam);
        }
        await supaSync.insertUser(newUser);
        return newUser;
    },

    async resetUserPassword(username, newPassword) {
        const state = readData();
        const user = state.users.find(u => u.username?.toLowerCase() === username.toLowerCase());
        if (!user) throw new Error('Account not found with this username.');
        user.passwordHash = bcrypt.hashSync(newPassword.trim(), 10);
        user.plainPassword = newPassword.trim();
        writeData(state);
        return user;
    },

    async getUsersByTournament(tournamentId) {
        const state = readData();
        return state.users.filter(u => u.tournamentId === tournamentId);
    },

    // --- CREDENTIALS MANAGEMENT (Tournament Scoped Full CRUD) ---
    async getTournamentCredentials(tournamentId) {
        const state = readData();
        const teams = state.teams.filter(t => t.tournamentId === tournamentId);
        const users = state.users.filter(u => u.tournamentId === tournamentId);

        const auctioneer = users.find(u => u.role === 'auctioneer') || null;

        const teamOwners = teams.map(team => {
            const user = users.find(u => (u.teamId?._id || u.teamId) === team._id && u.role === 'team_owner');
            return {
                teamId: team._id,
                teamName: team.name,
                shortName: team.shortName,
                userId: user?._id || null,
                username: user?.username || '',
                plainPassword: user?.plainPassword || '',
                hasAccount: !!user,
                captainPhoto: user?.captainPhoto || team.captainPhoto || ''
            };
        });

        const allCredentials = users.map(u => {
            const tm = teams.find(t => t._id === (u.teamId?._id || u.teamId));
            return {
                _id: u._id,
                username: u.username,
                plainPassword: u.plainPassword || '',
                role: u.role,
                teamId: u.teamId || null,
                teamName: tm ? tm.name : (u.role === 'auctioneer' ? 'Official Auctioneer' : 'Unassigned Team'),
                shortName: tm ? tm.shortName : (u.role === 'auctioneer' ? 'AUCTION' : '-'),
                isCaptain: !!u.isCaptain,
                captainName: u.captainName || u.name || '',
                captainPhoto: u.captainPhoto || tm?.captainPhoto || '',
                captainPlayerId: u.captainPlayerId || null,
                captainPrice: u.captainPrice || 0,
                category: u.category || 'All-Rounder',
                battingStyle: u.battingStyle || '',
                bowlingStyle: u.bowlingStyle || '',
                mobile: u.mobile || '',
                age: u.age || '',
                cricHeroesProfileUrl: u.cricHeroesProfileUrl || '',
                stats: u.stats || null
            };
        });

        return {
            tournamentId,
            auctioneer: auctioneer ? {
                userId: auctioneer._id,
                username: auctioneer.username,
                plainPassword: auctioneer.plainPassword || '',
                role: 'auctioneer'
            } : null,
            teamOwners,
            credentials: allCredentials
        };
    },

    async setTournamentCredentials(tournamentId, { auctioneer, teamOwners }) {
        const state = readData();

        if (auctioneer && auctioneer.username && auctioneer.password) {
            const existingIdx = state.users.findIndex(u => u.tournamentId === tournamentId && u.role === 'auctioneer');
            if (existingIdx !== -1) {
                state.users[existingIdx].username = auctioneer.username.trim();
                state.users[existingIdx].passwordHash = bcrypt.hashSync(auctioneer.password.trim(), 10);
                state.users[existingIdx].plainPassword = auctioneer.password.trim();
            } else {
                state.users.push({
                    _id: 'user_' + Date.now() + '_auc',
                    username: auctioneer.username.trim(),
                    passwordHash: bcrypt.hashSync(auctioneer.password.trim(), 10),
                    plainPassword: auctioneer.password.trim(),
                    role: 'auctioneer',
                    tournamentId
                });
            }
        }

        if (Array.isArray(teamOwners)) {
            for (const item of teamOwners) {
                if (item.teamId && item.username && item.password) {
                    const existingIdx = state.users.findIndex(u => (u.teamId?._id || u.teamId) === item.teamId && u.role === 'team_owner');
                    if (existingIdx !== -1) {
                        state.users[existingIdx].username = item.username.trim();
                        state.users[existingIdx].passwordHash = bcrypt.hashSync(item.password.trim(), 10);
                        state.users[existingIdx].plainPassword = item.password.trim();
                        state.users[existingIdx].tournamentId = tournamentId;
                    } else {
                        state.users.push({
                            _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                            username: item.username.trim(),
                            passwordHash: bcrypt.hashSync(item.password.trim(), 10),
                            plainPassword: item.password.trim(),
                            role: 'team_owner',
                            tournamentId,
                            teamId: item.teamId
                        });
                    }
                }
            }
        }

        writeData(state);
        return this.getTournamentCredentials(tournamentId);
    },

    async addTournamentCredential(tournamentId, data) {
        const {
            role = 'team_owner',
            username,
            password,
            teamId,
            captainName,
            category = 'All-Rounder',
            battingStyle = 'Right Handed',
            bowlingStyle = 'Right-arm Medium',
            mobile = '',
            age,
            cricHeroesProfileUrl = '',
            captainPrice = 0,
            image = '',
            captainPhoto = '',
            stats
        } = data;

        if (!username || !password) throw new Error('Username and password are required');
        const state = readData();

        const cleanUsername = username.trim();
        const existing = state.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
        if (existing) {
            throw new Error(`Username "${cleanUsername}" is already taken.`);
        }

        let captainPlayerId = null;
        const hasCaptainPrice = captainPrice !== undefined && captainPrice !== null && captainPrice !== '';
        const parsedPrice = hasCaptainPrice ? (Number(captainPrice) || 0) : 0;
        const finalCaptainName = (captainName || cleanUsername).trim();
        const finalCaptainPhoto = (captainPhoto || image || '').trim();

        // Sync or attach Team Owner & Captain without duplicating captain players or double-deducting purse
        if (role === 'team_owner' && teamId) {
            const team = state.teams.find(t => t._id === teamId);
            const existingCapPlayer = (state.players || []).find(
                p => (p.soldToTeamId === teamId || p.teamId === teamId || p._id === team?.captainPlayerId) &&
                    (p.isCaptain || String(p._id || '').startsWith('pl_cap_'))
            );

            if (existingCapPlayer) {
                existingCapPlayer.isCaptain = true;
                captainPlayerId = existingCapPlayer._id;
                if (captainName && captainName.trim()) existingCapPlayer.name = captainName.trim();
                if (finalCaptainPhoto) existingCapPlayer.image = finalCaptainPhoto;
                if (category) existingCapPlayer.category = category;
                if (battingStyle) existingCapPlayer.battingStyle = battingStyle;
                if (bowlingStyle) existingCapPlayer.bowlingStyle = bowlingStyle;
                if (mobile !== undefined) existingCapPlayer.mobile = (mobile || '').trim();
                if (age) existingCapPlayer.age = Number(age);
                if (cricHeroesProfileUrl) existingCapPlayer.cricHeroesProfileUrl = cricHeroesProfileUrl.trim();

                if (hasCaptainPrice) {
                    const oldP = Number(existingCapPlayer.soldPrice ?? existingCapPlayer.basePrice) || 0;
                    const diff = parsedPrice - oldP;
                    existingCapPlayer.basePrice = parsedPrice;
                    existingCapPlayer.soldPrice = parsedPrice;
                    existingCapPlayer.currentBid = parsedPrice;
                    if (team) {
                        team.captainPrice = parsedPrice;
                        team.spent = Math.max(0, Number(((team.spent || 0) + (diff / 100)).toFixed(2)));
                    }
                }
                if (team) {
                    team.isOwnerCaptain = true;
                    team.captainName = existingCapPlayer.name;
                    team.captainPlayerId = existingCapPlayer._id;
                    if (finalCaptainPhoto) team.captainPhoto = finalCaptainPhoto;
                }
                await supaSync.updatePlayer(existingCapPlayer._id, existingCapPlayer);
            } else if (team && team.isOwnerCaptain) {
                // Captain already configured during team creation -> reuse team's captain cleanly (no duplicate row, no double purse deduction)
                const existingCapPrice = Number(team.captainPrice) || 0;
                const resolvedPrice = hasCaptainPrice ? parsedPrice : existingCapPrice;
                const diff = resolvedPrice - existingCapPrice;
                if (captainName && captainName.trim()) team.captainName = captainName.trim();
                if (finalCaptainPhoto) team.captainPhoto = finalCaptainPhoto;
                if (hasCaptainPrice && diff !== 0) {
                    team.captainPrice = resolvedPrice;
                    team.spent = Math.max(0, Number(((team.spent || 0) + (diff / 100)).toFixed(2)));
                }
            } else if (team) {
                // Team did not have a captain yet -> configure on team object cleanly
                team.isOwnerCaptain = true;
                team.captainName = finalCaptainName;
                team.captainPrice = parsedPrice;
                team.captainPhoto = finalCaptainPhoto;
                team.spent = Math.max(0, Number(((team.spent || 0) + (parsedPrice / 100)).toFixed(2)));
            }
        }

        const matchedTeam = role === 'team_owner' && teamId ? state.teams.find(t => t._id === teamId) : null;
        const resolvedCaptainName = matchedTeam?.captainName || finalCaptainName;
        const resolvedCaptainPhoto = matchedTeam?.captainPhoto || finalCaptainPhoto;
        const resolvedCaptainPrice = matchedTeam?.captainPrice ?? parsedPrice;

        const newUser = {
            _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            username: cleanUsername,
            passwordHash: bcrypt.hashSync(password.trim(), 10),
            plainPassword: password.trim(),
            role: role === 'auctioneer' ? 'auctioneer' : 'team_owner',
            tournamentId,
            teamId: teamId || null,
            isCaptain: role === 'team_owner',
            captainName: resolvedCaptainName,
            captainPlayerId,
            captainPrice: resolvedCaptainPrice,
            captainPhoto: resolvedCaptainPhoto,
            category,
            battingStyle,
            bowlingStyle,
            mobile,
            age,
            cricHeroesProfileUrl
        };

        state.users.push(newUser);
        writeData(state);
        if (role === 'team_owner' && teamId) {
            const updatedTeam = state.teams.find(t => t._id === teamId);
            if (updatedTeam) await supaSync.updateTeam(teamId, updatedTeam);
        }
        await supaSync.insertUser(newUser);
        return newUser;
    },

    async updateTournamentCredential(tournamentId, userId, data) {
        const {
            username,
            password,
            teamId,
            role,
            captainName,
            category,
            battingStyle,
            bowlingStyle,
            mobile,
            age,
            cricHeroesProfileUrl,
            captainPrice
        } = data;

        const state = readData();
        const idx = state.users.findIndex(u => u._id === userId && u.tournamentId === tournamentId);
        if (idx === -1) throw new Error('Credential not found for this tournament');

        const user = state.users[idx];

        if (username && username.trim() !== user.username) {
            const clean = username.trim();
            const exists = state.users.find(u => u._id !== userId && u.username.toLowerCase() === clean.toLowerCase());
            if (exists) throw new Error(`Username "${clean}" is already taken.`);
            user.username = clean;
        }

        if (password && password.trim()) {
            user.passwordHash = bcrypt.hashSync(password.trim(), 10);
            user.plainPassword = password.trim();
        }

        const previousTeamId = typeof user.teamId === 'object' ? user.teamId?._id : user.teamId;
        if (teamId !== undefined) {
            user.teamId = teamId;
        }

        if (role) {
            user.role = role;
        }

        // Update captain fields if owner
        if (captainName) user.captainName = captainName.trim();
        if (data.captainPhoto !== undefined) user.captainPhoto = (data.captainPhoto || '').trim();
        if (category) user.category = category;
        if (battingStyle) user.battingStyle = battingStyle;
        if (bowlingStyle) user.bowlingStyle = bowlingStyle;
        if (mobile !== undefined) user.mobile = mobile;
        if (age !== undefined) user.age = age;
        if (cricHeroesProfileUrl !== undefined) user.cricHeroesProfileUrl = cricHeroesProfileUrl;

        // Also update team captainPhoto and details if user has a team
        const targetTeamId = typeof user.teamId === 'object' ? user.teamId?._id : (user.teamId || data.teamId);
        if (previousTeamId && targetTeamId && previousTeamId !== targetTeamId) {
            const prevTeam = state.teams.find(t => t._id === previousTeamId);
            if (prevTeam) {
                prevTeam.isOwnerCaptain = false;
                prevTeam.captainName = null;
                prevTeam.captainPhoto = '';
                prevTeam.captainPlayerId = null;
                await supaSync.updateTeam(previousTeamId, prevTeam);
            }
        }
        if (targetTeamId) {
            const team = state.teams.find(t => t._id === targetTeamId);
            if (team) {
                if (data.captainPhoto !== undefined) team.captainPhoto = user.captainPhoto;
                if (captainName) team.captainName = captainName.trim();
                if (captainPrice !== undefined) team.captainPrice = Number(captainPrice) || 0;
            }
        }

        // Synchronize with captain player profile (or find by team)
        let capPlayer = user.captainPlayerId ? (state.players || []).find(p => p._id === user.captainPlayerId) : null;
        if (!capPlayer && targetTeamId) {
            capPlayer = (state.players || []).find(
                p => (p.soldToTeamId === targetTeamId || p.teamId === targetTeamId) && (p.isCaptain || String(p._id || '').startsWith('pl_cap_'))
            );
        }

        if (capPlayer) {
            capPlayer.isCaptain = true;
            if (targetTeamId) {
                capPlayer.teamId = targetTeamId;
                capPlayer.soldToTeamId = targetTeamId;
                capPlayer.currentLeadTeamId = targetTeamId;
            }
            user.captainPlayerId = capPlayer._id;
            if (captainName) capPlayer.name = captainName.trim();
            if (data.captainPhoto !== undefined) capPlayer.image = user.captainPhoto;
            if (category) capPlayer.category = category;
            if (battingStyle) capPlayer.battingStyle = battingStyle;
            if (bowlingStyle) capPlayer.bowlingStyle = bowlingStyle;
            if (mobile !== undefined) capPlayer.mobile = mobile;
            if (age !== undefined) capPlayer.age = Number(age);
            if (cricHeroesProfileUrl !== undefined) capPlayer.cricHeroesProfileUrl = cricHeroesProfileUrl;

            if (captainPrice !== undefined) {
                const newPrice = Number(captainPrice) || 0;
                const diff = newPrice - (capPlayer.soldPrice || 0);
                capPlayer.basePrice = newPrice;
                capPlayer.soldPrice = newPrice;
                capPlayer.currentBid = newPrice;
                user.captainPrice = newPrice;

                const team = state.teams.find(t => t._id === targetTeamId);
                if (team) {
                    team.captainPrice = newPrice;
                    team.spent = Math.max(0, Number(((team.spent || 0) + (diff / 100)).toFixed(2)));
                }
            }
        } else if (targetTeamId && user.role === 'team_owner') {
            // Keep captain info synced directly on the team & user without inserting a duplicate player row
            const team = state.teams.find(t => t._id === targetTeamId);
            if (team) {
                team.isOwnerCaptain = true;
                if (captainName) team.captainName = captainName.trim();
                if (captainPrice !== undefined) team.captainPrice = Number(captainPrice) || 0;
                if (data.captainPhoto !== undefined) team.captainPhoto = user.captainPhoto;
            }
        }

        writeData(state);
        await supaSync.updateUser(userId, state.users[idx]);
        if (targetTeamId) {
            const team = state.teams.find(t => t._id === targetTeamId);
            if (team) await supaSync.updateTeam(targetTeamId, team);
        }
        if (capPlayer) {
            await supaSync.updatePlayer(capPlayer._id, capPlayer);
        }
        return state.users[idx];
    },

    async deleteTournamentCredential(tournamentId, userId) {
        const state = readData();
        const user = state.users.find(u => u._id === userId && u.tournamentId === tournamentId);
        if (!user) throw new Error('Credential not found');

        // If this user was assigned as a team captain, remove their player and restore team purse
        if (user.captainPlayerId) {
            state.players = (state.players || []).filter(p => p._id !== user.captainPlayerId);
            const team = (state.teams || []).find(t => t._id === user.teamId);
            if (team) {
                team.players = (team.players || []).filter(p => (p._id || p) !== user.captainPlayerId);
                if (user.captainPrice) {
                    team.spent = Math.max(0, Number(((team.spent || 0) - (user.captainPrice / 100)).toFixed(2)));
                }
                team.isOwnerCaptain = false;
                team.captainName = null;
                team.captainPlayerId = null;
                team.captainPrice = 0;
            }
            await supaSync.deletePlayer(user.captainPlayerId);
            if (team) await supaSync.updateTeam(team._id, team);
        }

        state.users = state.users.filter(u => u._id !== userId);
        writeData(state);
        await supaSync.deleteUser(userId);
        return { success: true };
    },

    async updateUser(id, update) {
        const state = readData();
        const idx = state.users.findIndex(u => u._id === id);
        if (idx === -1) throw new Error('User not found');
        if (update.password) {
            update.passwordHash = bcrypt.hashSync(update.password, 10);
            update.plainPassword = update.password;
            delete update.password;
        }
        state.users[idx] = { ...state.users[idx], ...update };
        writeData(state);
        await supaSync.updateUser(id, state.users[idx]);
        return state.users[idx];
    },

    async deleteUser(id) {
        const state = readData();
        state.users = state.users.filter(u => u._id !== id);
        writeData(state);
        await supaSync.deleteUser(id);
        return true;
    },

    // --- USERS ---
    async getUserById(id) {
        const state = readData();
        let user = state.users.find(u => u._id === id || u.id === id);
        if (!user && supabase) {
            try {
                const { data } = await supabase.from('users').select('*').eq('_id', id).maybeSingle();
                if (data) {
                    user = {
                        _id: data._id,
                        id: data._id,
                        username: data.username,
                        name: data.name,
                        organizationName: data.organization_name,
                        phone: data.phone,
                        role: data.role,
                        passwordHash: data.password_hash,
                        plainPassword: data.plain_password,
                        tournamentId: data.tournament_id,
                        teamId: data.team_id,
                        teamName: data.team_name
                    };
                    state.users.push(user);
                    writeData(state);
                }
            } catch (err) {
                console.warn('Fallback getUserById error:', err.message);
            }
        }
        return user;
    },

    // --- TOURNAMENTS ---
    async getTournaments(filter = {}) {
        const state = readData();
        let list = state.tournaments || [];
        if (filter.userId || filter.username) {
            const uId = String(filter.userId || '').trim();
            const uName = String(filter.username || '').trim().toLowerCase();
            list = list.filter(t => {
                const creator = String(t.createdBy || t.created_by || '').trim();
                if (!creator) {
                    // Legacy tournaments without creator belong to jainish_dabgar
                    return uId === 'user_1794153277298_yd2lx' || uName === 'jainish_dabgar';
                }
                return creator === uId || creator.toLowerCase() === uName;
            });
        }
        return list;
    },

    async getTournamentById(id) {
        const state = readData();
        let tourney = state.tournaments.find(t => t._id === id || t.id === id);
        if (!tourney && supabase) {
            try {
                const { data } = await supabase.from('tournaments').select('*').eq('_id', id).maybeSingle();
                if (data) {
                    const scale = data.budget_scale || (data.description && data.description.includes('SCALE:K_TO_L') ? 'K_TO_L' : (data.description && data.description.includes('SCALE:L_TO_CR') ? 'L_TO_CR' : 'L_TO_CR'));
                    const creatorMatch = data.description ? data.description.match(/\[CREATOR:([^\]]+)\]/) : null;
                    const createdBy = data.created_by || (creatorMatch ? creatorMatch[1] : null);
                    const cleanDesc = data.description ? data.description.replace(/\[(SCALE|CREATOR):[^\]]+\]\s*/g, '').trim() : '';
                    tourney = {
                        _id: data._id,
                        name: data.name,
                        status: data.status,
                        auctionType: data.auction_type,
                        biddingState: data.bidding_state,
                        squadSizeLimit: data.squad_size_limit,
                        startDate: data.start_date,
                        time: data.time,
                        description: cleanDesc,
                        logo: data.logo,
                        budgetScale: scale,
                        createdBy: createdBy,
                        activeSlotId: data.active_slot_id,
                        slotDrawMode: data.slot_draw_mode || 'order',
                        currentBiddingPlayerId: data.current_bidding_player_id,
                        bidIncrementRules: data.bid_increment_rules || [],
                        registrationOpen: data.registration_open !== false
                    };
                    state.tournaments.push(tourney);
                    writeData(state);
                }
            } catch (err) {
                console.warn('Fallback getTournamentById error:', err.message);
            }
        }
        return tourney;
    },

    async createTournament(data) {
        const state = readData();
        const creatorId = data.createdBy || data.userId || 'system';
        const newT = {
            _id: 'tourney_' + Date.now(),
            status: data.status || 'upcoming', // upcoming, live, paused, break, completed
            biddingState: data.biddingState || 'stopped', // stopped, active, paused, break
            auctionType: data.auctionType || 'owner_driven',
            budgetScale: data.budgetScale === 'K_TO_L' ? 'K_TO_L' : 'L_TO_CR',
            bidIncrementRules: data.bidIncrementRules || DEFAULT_BID_RULES,
            registrationOpen: data.registrationOpen !== false,
            ...data,
            createdBy: creatorId,
            budgetScale: data.budgetScale === 'K_TO_L' ? 'K_TO_L' : 'L_TO_CR',
            squadSizeLimit: Number(data.squadSizeLimit) || 25
        };
        state.tournaments.push(newT);
        writeData(state);
        await supaSync.insertTournament(newT);
        return newT;
    },

    async updateTournament(id, update) {
        const state = readData();
        const idx = state.tournaments.findIndex(t => t._id === id);
        if (idx !== -1) {
            const cleanUpdate = { ...update };
            if (cleanUpdate.squadSizeLimit !== undefined) {
                cleanUpdate.squadSizeLimit = Number(cleanUpdate.squadSizeLimit) || 25;
            }
            if (cleanUpdate.budgetScale !== undefined) {
                cleanUpdate.budgetScale = cleanUpdate.budgetScale === 'K_TO_L' ? 'K_TO_L' : 'L_TO_CR';
            }
            if (cleanUpdate.bidIncrementRules && Array.isArray(cleanUpdate.bidIncrementRules)) {
                const scale = cleanUpdate.budgetScale || state.tournaments[idx]?.budgetScale || 'L_TO_CR';
                const defUnit = scale === 'K_TO_L' ? 'K' : 'L';
                const allowedUnits = scale === 'K_TO_L' ? ['K', 'L'] : ['L', 'Cr'];
                cleanUpdate.bidIncrementRules = cleanUpdate.bidIncrementRules.map((r, i, arr) => {
                    const prevUpTo = i > 0 ? (Number(arr[i - 1].upTo) || 0) : 0;
                    let fUnit = r.fromUnit || r.rangeUnit || defUnit;
                    let tUnit = r.toUnit || r.rangeUnit || defUnit;
                    let iUnit = r.incrementUnit || defUnit;
                    if (!allowedUnits.includes(fUnit)) fUnit = defUnit;
                    if (!allowedUnits.includes(tUnit)) tUnit = defUnit;
                    if (!allowedUnits.includes(iUnit)) iUnit = defUnit;
                    return {
                        from: r.from !== undefined ? Number(r.from) : prevUpTo,
                        fromUnit: fUnit,
                        upTo: Number(r.upTo) || 100,
                        toUnit: tUnit,
                        rangeUnit: tUnit, // keep for backward compatibility
                        increment: Number(r.increment) || (scale === 'K_TO_L' ? 5 : 10),
                        incrementUnit: iUnit,
                        label: r.label || ''
                    };
                });
            }
            state.tournaments[idx] = { ...state.tournaments[idx], ...cleanUpdate };
            writeData(state);
            await supaSync.updateTournament(id, cleanUpdate);
            return state.tournaments[idx];
        }
        return null;
    },

    async deleteTournament(id) {
        const state = readData();
        state.tournaments = state.tournaments.filter(t => t._id !== id);
        // Also cascade delete tournament's teams, players, credentials, and slots
        state.teams = state.teams.filter(t => t.tournamentId !== id);
        state.players = state.players.filter(p => p.tournamentId !== id);
        state.users = state.users.filter(u => u.tournamentId !== id);
        state.slots = state.slots.filter(s => s.tournamentId !== id);
        writeData(state);
        await supaSync.deleteTournament(id);
        return true;
    },

    // --- TEAMS (Custom Budget & Captain Fee Auto Deduction) ---
    async getTeamsByTournament(tournamentId) {
        const state = readData();
        return state.teams.filter(t => !tournamentId || t.tournamentId === tournamentId);
    },

    async getTeamById(id) {
        const state = readData();
        let team = state.teams.find(t => t._id === id || t.id === id);
        if (!team && supabase) {
            try {
                const { data } = await supabase.from('teams').select('*').eq('_id', id).maybeSingle();
                if (data) {
                    team = {
                        _id: data._id,
                        tournamentId: data.tournament_id,
                        name: data.name,
                        shortName: data.short_name,
                        logo: data.logo || '',
                        budget: Number(data.budget) || 100,
                        spent: Number(data.spent) || 0,
                        isOwnerCaptain: Boolean(data.is_owner_captain),
                        captainName: data.captain_name || '',
                        captainPrice: Number(data.captain_price) || 0,
                        captainPhoto: data.captain_photo || '',
                        captainPlayerId: data.captain_player_id || null,
                        players: data.players || []
                    };
                    state.teams.push(team);
                    writeData(state);
                }
            } catch (err) {
                console.warn('Fallback getTeamById error:', err.message);
            }
        }
        return team;
    },

    async recalculateTeamSpent(teamId) {
        const state = readData();
        let team = state.teams.find(t => t._id === teamId || t.id === teamId);
        if (!team && supabase) {
            team = await this.getTeamById(teamId);
        }
        if (!team) return 0;

        // Captain price in large units (1 Large Unit = 100 Small Units)
        const captainPrice = team.isOwnerCaptain ? (Number(team.captainPrice) || 0) : 0;
        const captainFeeInLarge = Number((captainPrice / 100).toFixed(2));

        // Get all sold players belonging to this team
        const teamPlayerIds = new Set((team.players || []).map(p => typeof p === 'object' ? (p._id || p.id) : p));
        const soldPlayers = (state.players || []).filter(p => {
            const pId = p._id || p.id;
            const belongs = p.soldToTeamId === teamId || teamPlayerIds.has(pId);
            const isNotCaptain = !p.isCaptain && !String(pId || '').startsWith('pl_cap_');
            return belongs && isNotCaptain && p.status === 'sold';
        });

        const playersTotalInLarge = soldPlayers.reduce((acc, p) => {
            const price = Number(p.soldPrice || p.sold_price || p.currentBid || 0);
            return acc + (price / 100);
        }, 0);

        const totalSpent = Number((captainFeeInLarge + playersTotalInLarge).toFixed(2));
        team.spent = totalSpent;

        // Merge player IDs
        const allPlayerIds = Array.from(new Set([...soldPlayers.map(p => p._id), ...Array.from(teamPlayerIds)]));
        team.players = allPlayerIds;

        const idx = state.teams.findIndex(t => t._id === team._id);
        if (idx !== -1) {
            state.teams[idx] = team;
        }
        writeData(state);

        if (supabase) {
            try {
                await supabase.from('teams').update({
                    spent: totalSpent,
                    players: team.players,
                    updated_at: new Date().toISOString()
                }).eq('_id', team._id);
            } catch (e) {
                console.error('Supabase recalculateTeamSpent error:', e.message);
            }
        }
        return totalSpent;
    },

    async createTeam(data) {
        const state = readData();
        const budget = Number(data.budget) || 100;
        const isOwnerCaptain = !!data.isOwnerCaptain;
        const captainPrice = isOwnerCaptain ? (Number(data.captainPrice) || 0) : 0;
        const captainName = isOwnerCaptain ? (data.captainName ? data.captainName.trim() : null) : null;
        const captainPhoto = (data.captainPhoto || data.captainImage || '').trim();
        const spent = Number((captainPrice / 100).toFixed(2)); // Auto-deducted from purse in large units
        const logo = data.logo || data.image || '';

        const newTeam = {
            _id: 'team_' + Date.now(),
            name: data.name,
            shortName: data.shortName || data.name.substring(0, 3).toUpperCase(),
            tournamentId: data.tournamentId,
            budget,
            spent,
            isOwnerCaptain,
            captainName,
            captainPrice,
            captainPhoto,
            logo,
            players: [],
            ...data,
            budget,
            spent,
            isOwnerCaptain,
            captainName,
            captainPrice,
            captainPhoto,
            logo
        };
        state.teams.push(newTeam);
        writeData(state);
        await supaSync.insertTeam(newTeam);
        return newTeam;
    },

    async updateTeam(id, update) {
        const state = readData();
        const idx = state.teams.findIndex(t => t._id === id);
        if (idx !== -1) {
            const current = state.teams[idx];
            const updated = { ...current, ...update };

            let syncedCapPlayer = null;
            if (update.captainPhoto !== undefined || update.captainName !== undefined) {
                if (update.captainPhoto !== undefined) {
                    updated.captainPhoto = (update.captainPhoto || '').trim();
                }
                if (update.captainName !== undefined) {
                    updated.captainName = update.captainName ? update.captainName.trim() : null;
                }

                // Sync with existing captain player ONLY if one genuinely exists in state.players (never insert a duplicate player)
                const capPlayer = (state.players || []).find(
                    p => (p.soldToTeamId === id || p.teamId === id || p._id === updated.captainPlayerId) && (p.isCaptain || String(p._id || '').startsWith('pl_cap_'))
                );
                if (capPlayer) {
                    capPlayer.isCaptain = true;
                    if (updated.captainPhoto !== undefined) capPlayer.image = updated.captainPhoto;
                    if (updated.captainName) capPlayer.name = updated.captainName;
                    updated.captainPlayerId = capPlayer._id;
                    syncedCapPlayer = capPlayer;
                }

                const ownerUser = state.users.find(u => (u.teamId?._id || u.teamId) === id && u.role === 'team_owner');
                if (ownerUser) {
                    if (updated.captainPhoto !== undefined) ownerUser.captainPhoto = updated.captainPhoto;
                    if (updated.captainName) ownerUser.captainName = updated.captainName;
                    if (capPlayer) ownerUser.captainPlayerId = capPlayer._id;
                }
            }

            // Recalculate spent if captain fee changed AND caller did not explicitly provide spent
            if ((update.isOwnerCaptain !== undefined || update.captainPrice !== undefined) && update.spent === undefined) {
                const isOwnerCaptain = update.isOwnerCaptain !== undefined ? update.isOwnerCaptain : current.isOwnerCaptain;
                const captainPrice = isOwnerCaptain ? (Number(update.captainPrice ?? current.captainPrice) || 0) : 0;

                // Keep players spent sum (in Large Units) + captain fee (in Large Units)
                const playersSpentInCr = (current.players || []).reduce((acc, p) => {
                    const playerObj = typeof p === 'object' ? p : (state.players || []).find(x => x._id === p);
                    const pPrice = Number(playerObj?.soldPrice || playerObj?.currentBid) || 0;
                    return acc + (pPrice / 100);
                }, 0);
                updated.spent = Number((playersSpentInCr + (captainPrice / 100)).toFixed(2));
                updated.isOwnerCaptain = isOwnerCaptain;
                updated.captainPrice = captainPrice;
            }

            state.teams[idx] = updated;
            writeData(state);
            await supaSync.updateTeam(id, updated);
            if (syncedCapPlayer) {
                await supaSync.updatePlayer(syncedCapPlayer._id, {
                    name: syncedCapPlayer.name,
                    image: syncedCapPlayer.image
                });
            }
            return state.teams[idx];
        }
        return null;
    },

    async deleteTeam(id) {
        const state = readData();
        state.teams = state.teams.filter(t => t._id !== id);
        writeData(state);
        await supaSync.deleteTeam(id);
        return true;
    },

    // --- PLAYERS (Admin Sets Base Price / Slot Sets Base Price) ---
    async getPlayersByTournament(tournamentId) {
        const state = readData();
        const filtered = (state.players || [])
            .filter(p => !tournamentId || p.tournamentId === tournamentId)
            .map(p => {
                let updated = p;
                if (String(p._id || '').startsWith('pl_cap_') && !p.isCaptain) {
                    updated = { ...p, isCaptain: true };
                }
                if (updated.status === 'sold' && (!updated.soldPrice || Number(updated.soldPrice) === 0)) {
                    const fallback = Number(updated.currentBid) > 0 ? Number(updated.currentBid) : (Number(updated.basePrice) || 0);
                    updated = { ...updated, soldPrice: fallback };
                }
                return updated;
            });
        // Team Owner Captains appear FIRST in the player list!
        return filtered.sort((a, b) => {
            if (a.isCaptain && !b.isCaptain) return -1;
            if (!a.isCaptain && b.isCaptain) return 1;
            return 0;
        });
    },

    async getPlayerById(id) {
        const state = readData();
        let player = state.players.find(p => p._id === id || p.id === id);
        if (!player && supabase) {
            try {
                const { data } = await supabase.from('players').select('*').eq('_id', id).maybeSingle();
                if (data) {
                    const sPrice = Number(data.sold_price) > 0 ? Number(data.sold_price) : (data.status === 'sold' && Number(data.current_bid) > 0 ? Number(data.current_bid) : (Number(data.sold_price) || 0));
                    player = {
                        _id: data._id,
                        tournamentId: data.tournament_id,
                        slotId: data.slot_id,
                        name: data.name,
                        category: data.category,
                        battingStyle: data.batting_style,
                        bowlingStyle: data.bowling_style,
                        basePrice: Number(data.base_price) || 0,
                        currentBid: Number(data.current_bid) || 0,
                        soldPrice: sPrice,
                        sold_price: sPrice,
                        status: data.status,
                        currentLeadTeamId: data.current_lead_team_id,
                        soldToTeamId: data.sold_to_team_id,
                        image: data.image,
                        cricHeroesProfileUrl: data.cric_heroes_profile_url,
                        mobile: data.mobile,
                        age: data.age,
                        stats: data.stats || {},
                        isReAuction: data.is_re_auction,
                        isCaptain: Boolean(data.is_captain) || String(data._id || '').startsWith('pl_cap_')
                    };
                    state.players.push(player);
                    writeData(state);
                }
            } catch (err) {
                console.warn('Fallback getPlayerById error:', err.message);
            }
        }
        if (player && player.status === 'sold' && (!player.soldPrice || Number(player.soldPrice) === 0)) {
            player.soldPrice = Number(player.currentBid) > 0 ? Number(player.currentBid) : (Number(player.basePrice) || 0);
        }
        return player;
    },

    async createPlayer(data) {
        const state = readData();
        const basePrice = Number(data.basePrice) || 0;
        const newPlayer = {
            _id: 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: data.name,
            category: data.category || 'All-Rounder',
            battingStyle: data.battingStyle || 'Right-Hand Bat',
            bowlingStyle: data.bowlingStyle || 'Right-Arm Medium',
            basePrice,
            currentBid: basePrice,
            soldPrice: 0,
            status: data.status || 'pending',
            currentLeadTeamId: null,
            soldToTeamId: null,
            slotId: data.slotId || null,
            image: data.image || '',
            cricHeroesProfileUrl: data.cricHeroesProfileUrl || '',
            mobile: data.mobile || '',
            age: data.age || null,
            stats: data.stats || { matches: 0, runs: 0, wickets: 0, highestScore: '', bestBowling: '' },
            tournamentId: data.tournamentId
        };
        state.players.push(newPlayer);
        writeData(state);
        await supaSync.insertPlayer(newPlayer);
        return newPlayer;
    },

    async registerPlayerSelf(tournamentId, data) {
        // Player self-registration does NOT decide their base price. Base price is set by Admin or Slot.
        return this.createPlayer({
            ...data,
            basePrice: 0,
            currentBid: 0,
            tournamentId,
            status: 'pending'
        });
    },

    async updatePlayer(id, update) {
        const state = readData();
        let idx = state.players.findIndex(p => p._id === id);

        // If it's a virtual retained captain record (`owner_cap_<teamId>`), update the existing captain/team/user directly WITHOUT adding a duplicate player row
        if (idx === -1 && id && id.startsWith('owner_cap_')) {
            const teamId = id.replace('owner_cap_', '');
            const team = (state.teams || []).find(t => t._id === teamId);
            const user = (state.users || []).find(u => (u.teamId?._id || u.teamId) === teamId && u.role === 'team_owner');
            if (!team && !user) return null;

            const existingCapIdx = (state.players || []).findIndex(
                p => (p.soldToTeamId === teamId || p.teamId === teamId || p._id === team?.captainPlayerId) && (p.isCaptain || String(p._id || '').startsWith('pl_cap_'))
            );
            if (existingCapIdx !== -1) {
                idx = existingCapIdx;
                id = state.players[existingCapIdx]._id;
            } else {
                const oldPrice = Number(team?.captainPrice ?? user?.captainPrice) || 0;
                const hasNewPrice = update.basePrice !== undefined || update.soldPrice !== undefined;
                const newPrice = hasNewPrice ? (Number(update.basePrice ?? update.soldPrice) || 0) : oldPrice;

                if (team) {
                    if (update.name) team.captainName = update.name.trim();
                    if (update.image !== undefined) team.captainPhoto = (update.image || '').trim();
                    if (hasNewPrice) {
                        const diff = newPrice - oldPrice;
                        team.captainPrice = newPrice;
                        team.spent = Math.max(0, Number(((team.spent || 0) + (diff / 100)).toFixed(2)));
                    }
                }
                if (user) {
                    if (update.name) {
                        user.name = update.name.trim();
                        user.captainName = update.name.trim();
                    }
                    if (update.image !== undefined) user.captainPhoto = (update.image || '').trim();
                    if (update.category !== undefined) user.category = update.category;
                    if (update.battingStyle !== undefined) user.battingStyle = update.battingStyle;
                    if (update.bowlingStyle !== undefined) user.bowlingStyle = update.bowlingStyle;
                    if (update.age !== undefined) user.age = Number(update.age);
                    if (update.cricHeroesProfileUrl !== undefined) user.cricHeroesProfileUrl = update.cricHeroesProfileUrl;
                    if (hasNewPrice) user.captainPrice = newPrice;
                }

                writeData(state);
                if (team) await supaSync.updateTeam(teamId, team);
                if (user) await supaSync.updateUser(user._id, user);

                return {
                    _id: id,
                    tournamentId: team?.tournamentId || user?.tournamentId,
                    name: team?.captainName || user?.captainName || user?.name || `${team?.name || 'Team'} Captain`,
                    category: user?.category || 'Captain (All-Rounder)',
                    battingStyle: user?.battingStyle || 'Right-Hand Bat',
                    bowlingStyle: user?.bowlingStyle || 'Right-Arm Medium',
                    basePrice: newPrice,
                    soldPrice: newPrice,
                    currentBid: newPrice,
                    status: 'sold',
                    isCaptain: true,
                    isDirectOwnerCaptain: true,
                    soldToTeamId: teamId,
                    soldToTeamName: team?.name,
                    teamCode: team?.shortName,
                    image: team?.captainPhoto || user?.captainPhoto || '',
                    age: Number(user?.age) || 28,
                    cricHeroesProfileUrl: user?.cricHeroesProfileUrl || ''
                };
            }
        }

        if (idx !== -1) {
            const current = state.players[idx];
            let extra = {};

            // If basePrice is provided
            if (update.basePrice !== undefined) {
                const newPrice = Number(update.basePrice) || 0;
                extra.basePrice = newPrice;
                // Only initialize currentBid to basePrice if currentBid is NOT explicitly passed in update,
                // and player is not sold, and there is no active bid on the player yet
                if (update.currentBid === undefined && update.status !== 'sold' && current.status !== 'sold' && (!current.currentBid || current.currentBid === 0)) {
                    extra.currentBid = newPrice;
                }
            }

            // Ensure explicit currentBid and soldPrice in update are preserved and not overwritten
            if (update.currentBid !== undefined) {
                extra.currentBid = Number(update.currentBid);
            }
            if (update.soldPrice !== undefined) {
                extra.soldPrice = Number(update.soldPrice);
            }

            // If this player is a team captain
            if (current.isCaptain) {
                extra.isCaptain = true;
                const oldCaptainPrice = Number(current.soldPrice || current.basePrice) || 0;
                const newCaptainPrice = update.soldPrice !== undefined
                    ? Number(update.soldPrice) || 0
                    : (update.basePrice !== undefined ? Number(update.basePrice) || 0 : oldCaptainPrice);
                extra.soldPrice = newCaptainPrice;
                extra.basePrice = newCaptainPrice;

                // Synchronize with team
                const team = (state.teams || []).find(t => t._id === current.soldToTeamId || t.captainPlayerId === current._id);
                if (team) {
                    if (update.name) team.captainName = update.name;
                    if (update.image !== undefined) team.captainPhoto = update.image;
                    team.captainPrice = newCaptainPrice;
                    const priceDiff = newCaptainPrice - oldCaptainPrice;
                    team.spent = Math.max(0, Number(((team.spent || 0) + (priceDiff / 100)).toFixed(2)));
                }

                // Synchronize with user credential
                const user = (state.users || []).find(u => (u.teamId?._id || u.teamId) === current.soldToTeamId && u.role === 'team_owner');
                if (user) {
                    if (update.name) {
                        user.name = update.name;
                        user.captainName = update.name;
                    }
                    if (update.image !== undefined) {
                        user.captainPhoto = update.image;
                    }
                    user.captainPrice = newCaptainPrice;
                }
            }

            const finalSoldPrice = update.soldPrice !== undefined
                ? Number(update.soldPrice)
                : (extra.soldPrice !== undefined
                    ? Number(extra.soldPrice)
                    : (update.status === 'sold' && Number(update.currentBid || current.currentBid) > 0
                        ? Number(update.currentBid || current.currentBid)
                        : current.soldPrice));

            const finalCurrentBid = update.currentBid !== undefined
                ? Number(update.currentBid)
                : (extra.currentBid !== undefined ? Number(extra.currentBid) : current.currentBid);

            state.players[idx] = {
                ...current,
                ...update,
                ...extra,
                soldPrice: finalSoldPrice,
                sold_price: finalSoldPrice,
                currentBid: finalCurrentBid,
                current_bid: finalCurrentBid
            };
            writeData(state);
            await supaSync.updatePlayer(id, { ...update, ...extra, soldPrice: finalSoldPrice, currentBid: finalCurrentBid });
            return state.players[idx];
        }
        return null;
    },

    async deletePlayer(id) {
        const state = readData();

        // Handle virtual retained captain delete
        if (id && id.startsWith('owner_cap_')) {
            const teamId = id.replace('owner_cap_', '');
            const team = (state.teams || []).find(t => t._id === teamId);
            if (team) {
                const capPrice = Number(team.captainPrice) || 0;
                team.spent = Math.max(0, Number(((team.spent || 0) - (capPrice / 100)).toFixed(2)));
                team.captainPhoto = '';
                team.captainName = null;
                team.captainPrice = 0;
                team.isOwnerCaptain = false;
                team.captainPlayerId = null;
            }
            const user = (state.users || []).find(u => (u.teamId?._id || u.teamId) === teamId && u.role === 'team_owner');
            if (user) {
                user.captainPhoto = '';
                user.captainPlayerId = null;
                user.isCaptain = false;
            }
            writeData(state);
            if (team) await supaSync.updateTeam(teamId, team);
            return true;
        }

        const p = (state.players || []).find(x => x._id === id);
        if (p && p.isCaptain) {
            // Restore team captain fee
            const team = (state.teams || []).find(t => t._id === p.soldToTeamId || t.captainPlayerId === id);
            if (team) {
                const capPrice = Number(p.soldPrice || p.basePrice) || 0;
                team.spent = Math.max(0, Number(((team.spent || 0) - (capPrice / 100)).toFixed(2)));
                team.captainPhoto = '';
                team.captainName = null;
                team.captainPrice = 0;
                team.isOwnerCaptain = false;
                team.captainPlayerId = null;
            }
            const user = (state.users || []).find(u => (u.teamId?._id || u.teamId) === p.soldToTeamId && u.role === 'team_owner');
            if (user) {
                user.captainPhoto = '';
                user.captainPlayerId = null;
                user.isCaptain = false;
            }
        }

        state.players = state.players.filter(p => p._id !== id);
        writeData(state);
        await supaSync.deletePlayer(id);
        return true;
    },

    // --- SLOTS / SETS (Shift Players & Auto-Update Base Price) ---
    async getSlotsByTournament(tournamentId) {
        const state = readData();
        if (!state.slots) state.slots = [];
        let tournamentSlots = state.slots.filter(s => s.tournamentId === tournamentId);

        // Ensure default Unsold Re-Auction Slot exists for every tournament
        if (tournamentId) {
            let unsoldSlot = tournamentSlots.find(s => s.isDefaultUnsold || s.slotType === 'unsold');
            if (!unsoldSlot) {
                unsoldSlot = {
                    _id: 'slot_unsold_' + tournamentId,
                    tournamentId,
                    name: 'Unsold Players (Re-Auction)',
                    role: 'Re-Auction',
                    basePrice: null, // As per player
                    order: 999,
                    isDefaultUnsold: true,
                    slotType: 'unsold'
                };
                state.slots.push(unsoldSlot);
                writeData(state);
                tournamentSlots.push(unsoldSlot);
            }
        }

        return tournamentSlots;
    },

    async bringUnsoldPlayersToAuction(tournamentId) {
        const state = readData();
        if (!state.slots) state.slots = [];
        if (!state.players) state.players = [];

        // Find or create default unsold slot
        let unsoldSlot = state.slots.find(s => s.tournamentId === tournamentId && (s.isDefaultUnsold || s.slotType === 'unsold'));
        if (unsoldSlot) {
            unsoldSlot.basePrice = null; // Always per-player dependent
        } else {
            unsoldSlot = {
                _id: 'slot_unsold_' + tournamentId,
                tournamentId,
                name: 'Unsold Players (Re-Auction)',
                role: 'Re-Auction',
                basePrice: null, // As per player
                order: 999,
                isDefaultUnsold: true,
                slotType: 'unsold'
            };
            state.slots.push(unsoldSlot);
        }

        // Shift all unsold players of this tournament into this slot and set status to pending
        const updatedPlayers = [];
        state.players.forEach(p => {
            if (p.tournamentId === tournamentId && (p.status === 'unsold' || p.slotId === unsoldSlot._id)) {
                p.status = 'pending';
                if (!p.originalSlotId && p.slotId && p.slotId !== unsoldSlot._id) {
                    p.originalSlotId = p.slotId;
                }
                p.slotId = unsoldSlot._id;
                p.isReAuction = true;
                // Preserve each player's original basePrice!
                p.currentBid = p.basePrice || 20;
                p.currentLeadTeamId = null;
                p.soldToTeamId = null;
                p.soldPrice = null;
                updatedPlayers.push(p);
            }
        });

        // Set tournament activeSlotId
        const tIdx = (state.tournaments || []).findIndex(t => t._id === tournamentId);
        if (tIdx !== -1) {
            state.tournaments[tIdx].activeSlotId = unsoldSlot._id;
            state.tournaments[tIdx].biddingState = 'active';
        }

        writeData(state);
        if (supabase) {
            await supaSync.insertSlot(unsoldSlot);
            for (const p of updatedPlayers) {
                await supaSync.updatePlayer(p._id, p);
            }
            if (tIdx !== -1) {
                await supaSync.updateTournament(tournamentId, {
                    activeSlotId: unsoldSlot._id,
                    biddingState: 'active'
                });
            }
        }
        return {
            unsoldSlot,
            reopenedCount: updatedPlayers.length,
            players: updatedPlayers
        };
    },

    async reopenPassedPlayers(tournamentId) {
        const state = readData();
        const tournament = (state.tournaments || []).find(t => t._id === tournamentId);
        const activePlayerId = tournament?.currentBiddingPlayerId;
        const reopened = [];

        for (const p of (state.players || [])) {
            if (
                p.tournamentId === tournamentId &&
                (p.status === 'passed' || (p.status === 'bidding' && p._id !== activePlayerId))
            ) {
                p.status = 'pending';
                p.currentBid = p.basePrice || 20;
                p.currentLeadTeamId = null;
                reopened.push(p);
                if (supabase) {
                    await supaSync.updatePlayer(p._id, {
                        status: 'pending',
                        currentBid: p.currentBid,
                        currentLeadTeamId: null
                    });
                }
            }
        }

        writeData(state);
        return {
            reopenedCount: reopened.length,
            players: reopened
        };
    },

    async createSlot(tournamentId, { name, role = 'All-Rounder', basePrice = 20, order = 1 }) {
        const state = readData();
        if (!state.slots) state.slots = [];
        const newSlot = {
            _id: 'slot_' + Date.now(),
            tournamentId,
            name: name.trim(),
            role,
            basePrice: Number(basePrice) || 20,
            order: Number(order) || (state.slots.length + 1)
        };
        state.slots.push(newSlot);
        writeData(state);
        await supaSync.insertSlot(newSlot);
        return newSlot;
    },

    async updateSlot(slotId, update) {
        const state = readData();
        if (!state.slots) state.slots = [];
        const idx = state.slots.findIndex(s => s._id === slotId);
        if (idx !== -1) {
            const cleanUpdate = { ...update };
            if (cleanUpdate.name !== undefined) cleanUpdate.name = String(cleanUpdate.name).trim();
            if (cleanUpdate.basePrice !== undefined) cleanUpdate.basePrice = Number(cleanUpdate.basePrice) || 20;
            if (cleanUpdate.order !== undefined) cleanUpdate.order = Number(cleanUpdate.order) || state.slots[idx].order;

            state.slots[idx] = { ...state.slots[idx], ...cleanUpdate };
            const updatedSlotPlayers = [];
            // If basePrice of slot changed, update pending players in this slot
            if (cleanUpdate.basePrice !== undefined) {
                const newPrice = Number(cleanUpdate.basePrice) || 20;
                state.players.forEach(p => {
                    if (p.slotId === slotId && p.status === 'pending') {
                        p.basePrice = newPrice;
                        p.currentBid = newPrice;
                        updatedSlotPlayers.push(p);
                    }
                });
            }
            writeData(state);
            await supaSync.updateSlot(slotId, cleanUpdate);
            if (updatedSlotPlayers.length > 0) {
                for (const p of updatedSlotPlayers) {
                    await supaSync.updatePlayer(p._id, { basePrice: p.basePrice, currentBid: p.currentBid });
                }
            }
            return state.slots[idx];
        }
        return null;
    },

    async deleteSlot(slotId) {
        const state = readData();
        if (!state.slots) state.slots = [];
        const target = state.slots.find(s => s._id === slotId);
        if (target && (target.isDefaultUnsold || target.slotType === 'unsold')) {
            throw new Error('Default Unsold Re-Auction slot cannot be deleted.');
        }
        state.slots = state.slots.filter(s => s._id !== slotId);
        // Unassign players
        state.players.forEach(p => {
            if (p.slotId === slotId) p.slotId = null;
        });
        writeData(state);
        await supaSync.deleteSlot(slotId);
        return true;
    },

    async assignPlayersToSlot(tournamentId, slotId, playerIds = []) {
        const state = readData();
        const slot = (state.slots || []).find(s => s._id === slotId);
        if (!slot) throw new Error('Slot not found');

        const updatedPlayers = [];
        state.players.forEach(p => {
            if (playerIds.includes(p._id) && p.tournamentId === tournamentId) {
                p.slotId = slotId;
                // Auto-set base price from slot only if slot has a fixed basePrice (not default unsold slot)
                if (slot.basePrice && !slot.isDefaultUnsold) {
                    p.basePrice = slot.basePrice;
                    p.currentBid = slot.basePrice;
                }
                updatedPlayers.push(p);
            }
        });

        writeData(state);
        if (supabase && updatedPlayers.length > 0) {
            for (const p of updatedPlayers) {
                await supaSync.updatePlayer(p._id, { slotId: p.slotId, basePrice: p.basePrice, currentBid: p.currentBid });
            }
        }
        return { slot, updatedCount: updatedPlayers.length, players: updatedPlayers };
    },

    // --- CSV EXPORT FEED ---
    async exportPlayersCSV(tournamentId) {
        const state = readData();
        const players = await this.getPlayersByTournament(tournamentId);
        const teams = (state.teams || []).filter(t => t.tournamentId === tournamentId);

        const headers = [
            'Name',
            'Category',
            'BattingStyle',
            'BowlingStyle',
            'BasePrice',
            'SoldToTeam',
            'SoldPrice',
            'Status',
            'IsCaptain',
            'Age',
            'CricHeroesURL',
            'Matches',
            'Runs',
            'HighestScore',
            'Wickets',
            'BestBowling'
        ];

        const rows = players.map(p => {
            const team = teams.find(t => t._id === p.soldToTeamId || t.id === p.soldToTeamId);
            return [
                `"${(p.name || '').replace(/"/g, '""')}"`,
                `"${(p.category || '').replace(/"/g, '""')}"`,
                `"${(p.battingStyle || '').replace(/"/g, '""')}"`,
                `"${(p.bowlingStyle || '').replace(/"/g, '""')}"`,
                p.basePrice || 0,
                `"${team ? team.name : ''}"`,
                p.soldPrice || (p.status === 'sold' ? (p.currentBid || p.basePrice || 0) : 0),
                p.status || 'pending',
                p.isCaptain ? 'Yes' : 'No',
                p.age || '',
                `"${p.cricHeroesProfileUrl || ''}"`,
                p.stats?.matches || 0,
                p.stats?.runs || 0,
                `"${p.stats?.highestScore || ''}"`,
                p.stats?.wickets || 0,
                `"${p.stats?.bestBowling || ''}"`
            ];
        });

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    },

    async exportTournamentSummaryCSV(tournamentId) {
        const state = readData();
        const tournament = (state.tournaments || []).find(t => t._id === tournamentId);
        const teams = (state.teams || []).filter(t => t.tournamentId === tournamentId);
        const players = (state.players || []).filter(p => p.tournamentId === tournamentId);

        const isKtoL = tournament?.budgetScale === 'K_TO_L';
        const largeUnit = isKtoL ? 'L' : 'Cr';
        const smallUnit = isKtoL ? 'K' : 'L';

        let csv = `Tournament Auction Summary - ${tournament?.name || 'Tournament'} [Scale: ${isKtoL ? 'K to L (Club)' : 'L to Cr (Standard)'}]\n`;
        csv += `Export Date: ${new Date().toLocaleDateString()}\n\n`;

        // SECTION 1: TEAMS & REMAINING PURSES
        csv += `TEAM ROSTER & PURSE OVERVIEW\n`;
        csv += `Team Name,Short Code,Captain Name,Budget (${largeUnit}),Spent (${largeUnit}),Remaining Purse (${largeUnit}),Owner Captain Status,Squad Size\n`;
        teams.forEach(t => {
            const remaining = Math.max(0, (t.budget || 0) - (t.spent || 0)).toFixed(2);
            const ownerUser = (state.users || []).find(u => u.teamId === t._id && u.role === 'team_owner');
            const capName = t.captainName || ownerUser?.captainName || ownerUser?.name || ownerUser?.username || (t.isOwnerCaptain ? 'Captain' : '-');
            const tPlayers = players.filter(p => (p.soldToTeamId === t._id || p.soldToTeamId === t.id) && !p.isCaptain && !String(p._id || '').startsWith('pl_cap_'));
            const totalSquad = tPlayers.length + (t.isOwnerCaptain ? 1 : 0);
            csv += `"${t.name}","${t.shortName || ''}","${capName}",${t.budget || 100},${t.spent || 0},${remaining},"${t.isOwnerCaptain ? `Yes - Retained (₹${t.captainPrice || 0}${smallUnit})` : 'No'}",${totalSquad}\n`;
        });
        csv += `\n`;

        // SECTION 2: ACQUIRED SQUAD BY TEAM
        csv += `ACQUIRED SQUAD PLAYERS & SOLD PRICES\n`;
        csv += `Team,Player Name,Category,Batting Style,Bowling Style,Base Price (${smallUnit}),Sold Price (${smallUnit}),Status\n`;
        teams.forEach(t => {
            const ownerUser = (state.users || []).find(u => u.teamId === t._id && u.role === 'team_owner');
            const capName = t.captainName || ownerUser?.captainName || ownerUser?.name || ownerUser?.username || (t.isOwnerCaptain ? 'Captain' : '-');

            // Retained Owner-Captain entry
            if (t.isOwnerCaptain) {
                csv += `"${t.name}","${capName} (👑 OWNER & CAPTAIN)","${ownerUser?.category || 'Captain (All-Rounder)'}","${ownerUser?.battingStyle || 'Right-Hand Bat'}","${ownerUser?.bowlingStyle || 'Right-Arm Medium'}",${t.captainPrice || 0},${t.captainPrice || 0},"DIRECT RETAINED SQUAD"\n`;
            }

            const tPlayers = players.filter(p => (p.soldToTeamId === t._id || p.soldToTeamId === t.id) && !p.isCaptain);
            tPlayers.forEach(p => {
                csv += `"${t.name}","${p.name}","${p.category || ''}","${p.battingStyle || ''}","${p.bowlingStyle || ''}",${p.basePrice || 0},${p.soldPrice || p.currentBid || 0},"${p.status || 'sold'}"\n`;
            });
        });
        csv += `\n`;

        // SECTION 3: UNSOLD PLAYERS LIST
        const unsold = players.filter(p => p.status === 'unsold');
        csv += `UNSOLD PLAYERS LIST (${unsold.length})\n`;
        csv += `Player Name,Category,Batting Style,Bowling Style,Base Price (${smallUnit}),Age,Status\n`;
        unsold.forEach(p => {
            csv += `"${p.name}","${p.category || ''}","${p.battingStyle || ''}","${p.bowlingStyle || ''}",${p.basePrice || 0},"${p.age || ''}","UNSOLD"\n`;
        });

        return csv;
    },

    async recordBid(bid) {
        const state = readData();
        if (!state.bids) state.bids = [];
        state.bids.unshift(bid);
        if (state.bids.length > 500) state.bids = state.bids.slice(0, 500);
        writeData(state);

        if (supabase) {
            try {
                await supabase.from('bids').insert({
                    _id: bid._id,
                    tournament_id: bid.tournamentId,
                    player_id: bid.playerId,
                    team_id: bid.teamId,
                    team_name: bid.teamName,
                    bid_amount: bid.bidAmount,
                    created_at: bid.createdAt || new Date().toISOString()
                });
            } catch (err) {
                console.warn('Supabase bid record notice:', err.message);
            }
        }
        return bid;
    },

    async getBids(tournamentId, playerId) {
        if (supabase) {
            try {
                let query = supabase.from('bids')
                    .select('*')
                    .eq('tournament_id', tournamentId)
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (playerId) {
                    query = query.eq('player_id', playerId);
                }
                const { data, error } = await query;
                if (!error && data) {
                    return data.map(b => ({
                        _id: b._id,
                        tournamentId: b.tournament_id,
                        playerId: b.player_id,
                        teamId: b.team_id,
                        teamName: b.team_name,
                        bidAmount: Number(b.bid_amount),
                        createdAt: b.created_at
                    }));
                }
            } catch (err) {
                console.warn('Supabase getBids fallback to local cache:', err.message);
            }
        }
        const state = readData();
        let list = (state.bids || []).filter(b => b.tournamentId === tournamentId);
        if (playerId) {
            list = list.filter(b => b.playerId === playerId);
        }
        return list.slice(0, 50);
    },

    async deleteBid(bidId, tournamentId, playerId) {
        const state = readData();
        if (state.bids && state.bids.length > 0) {
            let idx = -1;
            if (bidId) {
                idx = state.bids.findIndex(b => b._id === bidId);
            }
            if (idx === -1 && tournamentId && playerId) {
                idx = state.bids.findIndex(b => b.tournamentId === tournamentId && b.playerId === playerId);
            }
            if (idx !== -1) {
                const removed = state.bids.splice(idx, 1)[0];
                writeData(state);
                if (supabase && (removed?._id || bidId)) {
                    try {
                        await supabase.from('bids').delete().eq('_id', removed?._id || bidId);
                    } catch (err) {
                        console.warn('Supabase deleteBid notice:', err.message);
                    }
                }
                return removed;
            }
        }
        if (supabase && bidId) {
            try {
                await supabase.from('bids').delete().eq('_id', bidId);
            } catch (err) {
                console.warn('Supabase deleteBid notice:', err.message);
            }
        }
        return null;
    },

    // --- RELEASE PLAYER TO UNSOLD / PENDING (WITHOUT EXCHANGE) ---
    async releasePlayerToPending(tournamentId, playerId, teamId, targetStatus = 'unsold') {
        const state = readData();
        const player = (state.players || []).find(p => p._id === playerId || p.id === playerId);
        if (!player) throw new Error('Player not found');

        const targetTeamId = teamId || player.soldToTeamId;
        const team = (state.teams || []).find(t => t._id === targetTeamId || t.id === targetTeamId);

        const soldPrice = Number(player.soldPrice || player.sold_price || player.currentBid || player.basePrice) || 0;
        const refundInLarge = Number((soldPrice / 100).toFixed(2));

        const newStatus = targetStatus || 'unsold';
        player.status = newStatus;
        player.soldToTeamId = null;
        player.soldToTeamName = null;
        player.soldPrice = 0;
        player.currentBid = player.basePrice || 0;
        player.currentLeadTeamId = null;

        // Clean bids for this player
        if (state.bids) {
            state.bids = state.bids.filter(b => b.playerId !== playerId);
        }

        if (team) {
            team.players = (team.players || []).filter(id => id !== playerId && id !== String(player._id));
        }

        writeData(state);

        if (team) {
            await this.recalculateTeamSpent(team._id);
        }

        // Supabase cloud sync
        if (supabase) {
            try {
                if (team) {
                    await supabase.from('teams').update({
                        spent: team.spent,
                        players: team.players,
                        updated_at: new Date().toISOString()
                    }).eq('_id', team._id);
                }
                await supabase.from('players').update({
                    status: newStatus,
                    sold_to_team_id: null,
                    sold_price: 0,
                    current_bid: player.basePrice || 0,
                    current_lead_team_id: null,
                    updated_at: new Date().toISOString()
                }).eq('_id', playerId);

                await supabase.from('bids').delete().eq('player_id', playerId);
            } catch (err) {
                console.warn('Supabase releasePlayerToPending notice:', err.message);
            }
        }

        return { player, team, refundedAmount: soldPrice, refundInLarge, status: newStatus };
    },

    // --- MANUAL ASSIGN / DIRECT SELL PLAYER TO TEAM ---
    async manualAssignPlayer(tournamentId, playerId, teamId, soldPrice) {
        const state = readData();
        const player = (state.players || []).find(p => p._id === playerId || p.id === playerId);
        if (!player) throw new Error('Player not found');
        if (player.isCaptain) throw new Error('Retained Team Captain cannot be re-assigned');

        const team = (state.teams || []).find(t => t._id === teamId || t.id === teamId);
        if (!team) throw new Error('Team not found');

        const parsedSoldPrice = Number(soldPrice);
        if (isNaN(parsedSoldPrice) || parsedSoldPrice < 0) {
            throw new Error('Invalid sold price provided');
        }

        // Check tournament squad limit
        const tournament = (state.tournaments || []).find(t => t._id === tournamentId || t.id === tournamentId);
        const maxSquadLimit = tournament?.squadSizeLimit ? Number(tournament.squadSizeLimit) : 25;
        const currentSquadCount = (team.players || []).length;
        if (currentSquadCount >= maxSquadLimit) {
            throw new Error(`Cannot assign: ${team.name} has already reached the maximum squad limit of ${maxSquadLimit} players!`);
        }

        // Check budget purse
        const priceInLarge = Number((parsedSoldPrice / 100).toFixed(2));
        const remainingPurse = Number(((Number(team.budget) || 100) - (Number(team.spent) || 0)).toFixed(2));
        if (priceInLarge > remainingPurse) {
            throw new Error(`Insufficient budget! ${team.name} only has ₹${remainingPurse} remaining in purse, but player price requires ₹${priceInLarge}.`);
        }

        // Update player
        player.status = 'sold';
        player.soldToTeamId = team._id;
        player.soldToTeamName = team.name;
        player.soldPrice = parsedSoldPrice;
        player.sold_price = parsedSoldPrice;
        player.currentBid = parsedSoldPrice;
        player.current_bid = parsedSoldPrice;
        player.currentLeadTeamId = team._id;

        // If player was already sold to another team, remove from that team first
        let oldTeam = null;
        if (player.soldToTeamId && player.soldToTeamId !== team._id) {
            oldTeam = (state.teams || []).find(t => t._id === player.soldToTeamId);
            if (oldTeam) {
                oldTeam.players = (oldTeam.players || []).filter(id => id !== playerId && id !== String(player._id));
            }
        }

        // Update target team
        if (!team.players) team.players = [];
        if (!team.players.includes(player._id)) team.players.push(player._id);

        // If player was in re-auction unsold slot, restore slotId to original category slot
        if (player.slotId && (String(player.slotId).includes('slot_unsold_') || player.isReAuction)) {
            if (player.originalSlotId) {
                player.slotId = player.originalSlotId;
            } else if (tournamentId) {
                const allSlots = (state.slots || []).filter(s => s.tournamentId === tournamentId);
                const matchingSlot = (allSlots || []).find(s => s.role === player.category || s.name?.toLowerCase().includes(player.category?.toLowerCase()));
                if (matchingSlot) {
                    player.slotId = matchingSlot._id;
                }
            }
        }

        writeData(state);

        await this.recalculateTeamSpent(team._id);
        if (oldTeam) await this.recalculateTeamSpent(oldTeam._id);

        // Supabase cloud sync
        if (supabase) {
            try {
                await supabase.from('teams').update({
                    spent: team.spent,
                    players: team.players,
                    updated_at: new Date().toISOString()
                }).eq('_id', team._id);

                await supabase.from('players').update({
                    status: 'sold',
                    sold_to_team_id: team._id,
                    sold_price: parsedSoldPrice,
                    current_bid: parsedSoldPrice,
                    current_lead_team_id: team._id,
                    slot_id: player.slotId,
                    updated_at: new Date().toISOString()
                }).eq('_id', playerId);
            } catch (err) {
                console.warn('Supabase manualAssignPlayer notice:', err.message);
            }
        }

        return { player, team, soldPrice: parsedSoldPrice, priceInLarge };
    },

    // --- INJURY REPLACEMENTS & PLAYER EXCHANGES ---
    async replaceInjuredPlayer(tournamentId, { teamId, injuredPlayerId, replacementPlayerId, replacementPrice }) {
        const state = readData();
        const team = (state.teams || []).find(t => t._id === teamId || t.id === teamId);
        if (!team) throw new Error('Team not found');

        const injuredPlayer = (state.players || []).find(p => p._id === injuredPlayerId);
        if (!injuredPlayer) throw new Error('Injured player not found');
        if (injuredPlayer.isCaptain) throw new Error('Retained Team Captain cannot be replaced via injury substitution');

        const replacementPlayer = (state.players || []).find(p => p._id === replacementPlayerId);
        if (!replacementPlayer) throw new Error('Replacement player not found');
        if (replacementPlayer.status === 'sold') throw new Error('Selected replacement player is already sold to a team');

        const oldSoldPrice = Number(injuredPlayer.soldPrice || injuredPlayer.currentBid || injuredPlayer.basePrice) || 0;
        const newPrice = replacementPrice !== undefined ? (Number(replacementPrice) || 0) : (Number(replacementPlayer.basePrice) || 0);

        // Check budget if new player costs more than old player
        const priceDiff = newPrice - oldSoldPrice;
        const diffInLarge = Number((priceDiff / 100).toFixed(2));
        const remainingPurse = (Number(team.budget) || 100) - (Number(team.spent) || 0);
        if (diffInLarge > 0 && diffInLarge > remainingPurse) {
            throw new Error(`Insufficient budget! Needs ₹${priceDiff} more, but team only has ₹${remainingPurse.toFixed(2)} remaining purse`);
        }

        // 1. Update injured player
        injuredPlayer.status = 'injured';
        injuredPlayer.isInjured = true;
        injuredPlayer.replacedByPlayerId = replacementPlayer._id;
        injuredPlayer.replacedByPlayerName = replacementPlayer.name;
        injuredPlayer.soldToTeamId = null;
        injuredPlayer.soldToTeamName = null;

        // 2. Update replacement player
        replacementPlayer.status = 'sold';
        replacementPlayer.soldToTeamId = team._id;
        replacementPlayer.soldToTeamName = team.name;
        replacementPlayer.soldPrice = newPrice;
        replacementPlayer.currentBid = newPrice;
        replacementPlayer.isReplacement = true;
        replacementPlayer.replacedPlayerId = injuredPlayer._id;
        replacementPlayer.replacedPlayerName = injuredPlayer.name;

        // 3. Update team roster & purse
        if (!team.players) team.players = [];
        team.players = team.players.filter(p => (typeof p === 'object' ? p._id : p) !== injuredPlayer._id);
        if (!team.players.includes(replacementPlayer._id)) {
            team.players.push(replacementPlayer._id);
        }
        team.spent = Number(Math.max(0, (team.spent || 0) + diffInLarge).toFixed(2));

        // 4. Record transfer audit log
        if (!state.transfers) state.transfers = [];
        const transferRecord = {
            _id: 'trf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            tournamentId,
            type: 'injury_replacement',
            teamId: team._id,
            teamName: team.name,
            teamLogo: team.logo,
            injuredPlayerId: injuredPlayer._id,
            injuredPlayerName: injuredPlayer.name,
            injuredPlayerPrice: oldSoldPrice,
            replacementPlayerId: replacementPlayer._id,
            replacementPlayerName: replacementPlayer.name,
            replacementPlayerPrice: newPrice,
            priceDiff,
            createdAt: new Date().toISOString()
        };
        state.transfers.unshift(transferRecord);

        writeData(state);

        await supaSync.updatePlayer(injuredPlayer._id, injuredPlayer);
        await supaSync.updatePlayer(replacementPlayer._id, replacementPlayer);
        await supaSync.updateTeam(team._id, team);
        await supaSync.insertTransfer(transferRecord);

        return {
            team,
            injuredPlayer,
            replacementPlayer,
            transferRecord
        };
    },

    async tradePlayers(tournamentId, { teamAId, playerAId, teamBId, playerBId }) {
        const state = readData();
        const teamA = (state.teams || []).find(t => t._id === teamAId || t.id === teamAId);
        const teamB = (state.teams || []).find(t => t._id === teamBId || t.id === teamBId);
        if (!teamA || !teamB) throw new Error('Both teams must be specified');
        if (teamA._id === teamB._id) throw new Error('Cannot trade players within the same team');

        const playerA = (state.players || []).find(p => p._id === playerAId);
        const playerB = (state.players || []).find(p => p._id === playerBId);
        if (!playerA || !playerB) throw new Error('Both players must be specified');
        if (playerA.isCaptain || playerB.isCaptain) throw new Error('Retained Team Captains cannot be traded');

        const pAPrice = Number(playerA.soldPrice || playerA.currentBid || playerA.basePrice) || 0;
        const pBPrice = Number(playerB.soldPrice || playerB.currentBid || playerB.basePrice) || 0;

        // Team A gives playerA, gets playerB. Net spent change for Team A: (pBPrice - pAPrice) / 100
        const diffInCroresA = Number(((pBPrice - pAPrice) / 100).toFixed(2));
        // Team B gives playerB, gets playerA. Net spent change for Team B: (pAPrice - pBPrice) / 100
        const diffInCroresB = Number(((pAPrice - pBPrice) / 100).toFixed(2));

        const remA = (Number(teamA.budget) || 100) - (Number(teamA.spent) || 0);
        const remB = (Number(teamB.budget) || 100) - (Number(teamB.spent) || 0);

        if (diffInCroresA > 0 && diffInCroresA > remA) {
            throw new Error(`${teamA.name} has insufficient purse! Needs ₹${(pBPrice - pAPrice)} more, but only has ₹${remA.toFixed(2)} remaining`);
        }
        if (diffInCroresB > 0 && diffInCroresB > remB) {
            throw new Error(`${teamB.name} has insufficient purse! Needs ₹${(pAPrice - pBPrice)} more, but only has ₹${remB.toFixed(2)} remaining`);
        }

        // Swap players
        playerA.soldToTeamId = teamB._id;
        playerA.soldToTeamName = teamB.name;
        playerB.soldToTeamId = teamA._id;
        playerB.soldToTeamName = teamA.name;

        // Update Team A roster
        teamA.players = (teamA.players || []).filter(p => (typeof p === 'object' ? p._id : p) !== playerA._id);
        if (!teamA.players.includes(playerB._id)) teamA.players.push(playerB._id);
        teamA.spent = Number(Math.max(0, (teamA.spent || 0) + diffInCroresA).toFixed(2));

        // Update Team B roster
        teamB.players = (teamB.players || []).filter(p => (typeof p === 'object' ? p._id : p) !== playerB._id);
        if (!teamB.players.includes(playerA._id)) teamB.players.push(playerA._id);
        teamB.spent = Number(Math.max(0, (teamB.spent || 0) + diffInCroresB).toFixed(2));

        // Record transfer log
        if (!state.transfers) state.transfers = [];
        const pDiff = Math.abs(pAPrice - pBPrice);
        const transferRecord = {
            _id: 'trf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            tournamentId,
            type: 'trade',
            teamAId: teamA._id,
            teamAName: teamA.name,
            teamALogo: teamA.logo,
            playerAId: playerA._id,
            playerAName: playerA.name,
            playerAPrice: pAPrice,
            teamBId: teamB._id,
            teamBName: teamB.name,
            teamBLogo: teamB.logo,
            playerBId: playerB._id,
            playerBName: playerB.name,
            playerBPrice: pBPrice,
            priceDifference: pDiff,
            priceDiff: pDiff,
            createdAt: new Date().toISOString()
        };
        state.transfers.unshift(transferRecord);

        writeData(state);

        await supaSync.updatePlayer(playerA._id, playerA);
        await supaSync.updatePlayer(playerB._id, playerB);
        await supaSync.updateTeam(teamA._id, teamA);
        await supaSync.updateTeam(teamB._id, teamB);
        await supaSync.insertTransfer(transferRecord);

        return {
            teamA,
            teamB,
            playerA,
            playerB,
            transferRecord
        };
    },

    async getTournamentTransfers(tournamentId) {
        const state = readData();
        const local = (state.transfers || []).filter(t => !tournamentId || t.tournamentId === tournamentId);
        if (local.length > 0) return local;

        if (supabase) {
            try {
                let q = supabase.from('transfers').select('*').order('created_at', { ascending: false });
                if (tournamentId) q = q.eq('tournament_id', tournamentId);
                const { data, error } = await q;
                if (!error && Array.isArray(data)) {
                    return data.map(r => ({
                        _id: r._id,
                        tournamentId: r.tournament_id,
                        type: r.type,
                        teamAId: r.team_a_id,
                        teamAName: r.team_a_name,
                        teamALogo: r.team_a_logo,
                        playerAId: r.player_a_id,
                        playerAName: r.player_a_name,
                        playerAPrice: r.player_a_price,
                        teamBId: r.team_b_id,
                        teamBName: r.team_b_name,
                        teamBLogo: r.team_b_logo,
                        playerBId: r.player_b_id,
                        playerBName: r.player_b_name,
                        playerBPrice: r.player_b_price,
                        teamId: r.team_id,
                        teamName: r.team_name,
                        teamLogo: r.team_logo,
                        injuredPlayerId: r.injured_player_id,
                        injuredPlayerName: r.injured_player_name,
                        injuredPlayerPrice: r.injured_player_price,
                        replacementPlayerId: r.replacement_player_id,
                        replacementPlayerName: r.replacement_player_name,
                        replacementPlayerPrice: r.replacement_player_price,
                        refundAmount: r.refund_amount,
                        replacementFee: r.replacement_fee,
                        playerId: r.player_id,
                        playerName: r.player_name,
                        playerCategory: r.player_category,
                        playerBasePrice: r.player_base_price,
                        playerImage: r.player_image,
                        note: r.note || r.notes,
                        priceDifference: r.price_difference,
                        createdAt: r.created_at,
                        timestamp: r.created_at
                    }));
                }
            } catch (e) {
                console.error('getTournamentTransfers supabase fallback error:', e.message);
            }
        }
        return [];
    },

    async moveInjuredToUnsold(tournamentId, playerId) {
        const state = readData();
        const player = (state.players || []).find(p => p._id === playerId || p.id === playerId);
        if (!player) throw new Error('Player not found');

        player.status = 'unsold';
        player.isInjured = false;
        player.soldToTeamId = null;
        player.soldToTeamName = null;
        player.soldPrice = 0;
        player.currentBid = player.basePrice || 0;
        player.currentLeadTeamId = null;
        player.currentLeadTeamName = null;

        // Record audit in transfers
        if (!state.transfers) state.transfers = [];
        const transferRecord = {
            _id: 'trf_rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            tournamentId,
            type: 'injury_recovered',
            playerId: player._id,
            playerName: player.name,
            playerImage: player.image || '',
            playerCategory: player.category || '',
            playerBasePrice: player.basePrice || 0,
            note: 'Player recovered from injury and moved to Unsold pool for re-auction',
            timestamp: new Date().toISOString()
        };
        state.transfers.unshift(transferRecord);

        writeData(state);
        await supaSync.updatePlayer(player._id, player);
        await supaSync.insertTransfer(transferRecord);

        return { player, transferRecord };
    }
};

module.exports = db;
