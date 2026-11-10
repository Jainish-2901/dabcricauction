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
    slots: []
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
            const row = {
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
                bid_increment_rules: t.bidIncrementRules || [],
                updated_at: new Date().toISOString()
            };
            const { error } = await supabase.from('tournaments').upsert(row, { onConflict: '_id' });
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
            if (update.description !== undefined) row.description = update.description;
            if (update.logo !== undefined) row.logo = update.logo;
            if (update.activeSlotId !== undefined) row.active_slot_id = update.activeSlotId;
            if (update.currentBiddingPlayerId !== undefined) row.current_bidding_player_id = update.currentBiddingPlayerId;
            if (update.bidIncrementRules !== undefined) row.bid_increment_rules = update.bidIncrementRules;

            const { error } = await supabase.from('tournaments').update(row).eq('_id', id);
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
                base_price: Number(s.basePrice) || 20,
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

        const tournaments = (tournRes.data || []).map(r => ({
            _id: r._id,
            name: r.name,
            status: r.status,
            auctionType: r.auction_type,
            biddingState: r.bidding_state,
            squadSizeLimit: r.squad_size_limit,
            startDate: r.start_date,
            time: r.time,
            description: r.description,
            logo: r.logo,
            activeSlotId: r.active_slot_id,
            currentBiddingPlayerId: r.current_bidding_player_id,
            bidIncrementRules: r.bid_increment_rules || [],
            registrationOpen: r.registration_open !== false
        }));

        const slots = (slotsRes.data || []).map(r => ({
            _id: r._id,
            tournamentId: r.tournament_id,
            name: r.name,
            role: r.role,
            basePrice: r.base_price,
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

        const players = (playersRes.data || []).map(r => ({
            _id: r._id,
            tournamentId: r.tournament_id,
            slotId: r.slot_id,
            name: r.name,
            category: r.category,
            battingStyle: r.batting_style,
            bowlingStyle: r.bowling_style,
            basePrice: r.base_price,
            currentBid: r.current_bid,
            soldPrice: r.sold_price,
            status: r.status,
            currentLeadTeamId: r.current_lead_team_id,
            soldToTeamId: r.sold_to_team_id,
            image: r.image,
            cricHeroesProfileUrl: r.cric_heroes_profile_url,
            mobile: r.mobile,
            age: r.age,
            stats: r.stats || {},
            isReAuction: r.is_re_auction,
            isCaptain: Boolean(r.is_captain)
        }));

        // Preserve any local captain players not yet in Supabase
        const localCaptains = (currentLocal.players || []).filter(lp => lp.isCaptain && !players.some(p => p._id === lp._id));
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
    { upTo: 100, increment: 10 },    // Up to 1 Cr: +10 Lakhs
    { upTo: 500, increment: 25 },    // 1 Cr to 5 Cr: +25 Lakhs
    { upTo: 1000, increment: 50 },   // 5 Cr to 10 Cr: +50 Lakhs
    { upTo: 999999, increment: 100 } // Above 10 Cr: +100 Lakhs (1 Cr)
];

function getBidIncrement(currentBid, rules = DEFAULT_BID_RULES) {
    const list = Array.isArray(rules) && rules.length > 0 ? rules : DEFAULT_BID_RULES;
    const sorted = [...list].sort((a, b) => Number(a.upTo) - Number(b.upTo));
    for (const rule of sorted) {
        if (Number(currentBid) < Number(rule.upTo)) {
            return Number(rule.increment) || 10;
        }
    }
    return Number(sorted[sorted.length - 1]?.increment) || 100;
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
        const user = state.users.find(u => u.username?.toLowerCase() === username.toLowerCase());
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
        const parsedPrice = Number(captainPrice) || 0;
        const finalCaptainName = (captainName || cleanUsername).trim();
        const finalCaptainPhoto = (captainPhoto || image || '').trim();

        // When a Team Owner credential is created, automatically register them as Captain in the player list first!
        if (role === 'team_owner' && teamId) {
            const team = state.teams.find(t => t._id === teamId);

            const captainPlayer = {
                _id: 'pl_cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                tournamentId,
                teamId: teamId,
                name: finalCaptainName,
                category: category || 'All-Rounder',
                battingStyle: battingStyle || 'Right Handed',
                bowlingStyle: bowlingStyle || 'Right-arm Medium',
                basePrice: parsedPrice,
                soldPrice: parsedPrice,
                currentBid: parsedPrice,
                status: 'sold', // Retained as team captain
                isCaptain: true,
                isOwner: true,
                soldToTeamId: teamId,
                currentLeadTeamId: teamId,
                mobile: (mobile || '').trim(),
                age: Number(age) || undefined,
                cricHeroesProfileUrl: (cricHeroesProfileUrl || '').trim(),
                image: finalCaptainPhoto,
                stats: stats || { matches: 0, runs: 0, wickets: 0, highestScore: '', bestBowling: '' }
            };

            captainPlayerId = captainPlayer._id;

            // Put Captain FIRST in the players list
            if (!state.players) state.players = [];
            state.players.unshift(captainPlayer);

            // Update Team budget spent & roster
            if (team) {
                team.isOwnerCaptain = true;
                team.captainName = finalCaptainName;
                team.captainPrice = parsedPrice;
                team.captainPhoto = finalCaptainPhoto;
                team.captainPlayerId = captainPlayer._id;
                team.spent = (team.spent || 0) + parsedPrice;
                if (!team.players) team.players = [];
                if (!team.players.some(p => (p._id || p) === captainPlayer._id)) {
                    team.players.unshift(captainPlayer);
                }
            }
        }

        const newUser = {
            _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            username: cleanUsername,
            passwordHash: bcrypt.hashSync(password.trim(), 10),
            plainPassword: password.trim(),
            role: role === 'auctioneer' ? 'auctioneer' : 'team_owner',
            tournamentId,
            teamId: teamId || null,
            isCaptain: role === 'team_owner',
            captainName: finalCaptainName,
            captainPlayerId,
            captainPrice: parsedPrice,
            captainPhoto: finalCaptainPhoto,
            category,
            battingStyle,
            bowlingStyle,
            mobile,
            age,
            cricHeroesProfileUrl
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
            capPlayer = (state.players || []).find(p => (p.soldToTeamId === targetTeamId || p.teamId === targetTeamId) && p.isCaptain);
        }

        if (capPlayer) {
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
                    team.spent = Math.max(0, (team.spent || 0) + diff);
                }
            }
        } else if (targetTeamId && user.role === 'team_owner') {
            // Auto-create captain player if not present yet
            const parsedPrice = Number(captainPrice || user.captainPrice) || 15;
            capPlayer = {
                _id: 'pl_cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                tournamentId: user.tournamentId || tournamentId,
                teamId: targetTeamId,
                name: (captainName || user.captainName || user.name || user.username).trim(),
                category: category || user.category || 'All-Rounder',
                battingStyle: battingStyle || user.battingStyle || 'Right Handed',
                bowlingStyle: bowlingStyle || user.bowlingStyle || 'Right-arm Medium',
                basePrice: parsedPrice,
                soldPrice: parsedPrice,
                currentBid: parsedPrice,
                status: 'sold',
                isCaptain: true,
                isOwner: true,
                soldToTeamId: targetTeamId,
                currentLeadTeamId: targetTeamId,
                mobile: (mobile || user.mobile || '').trim(),
                age: Number(age || user.age) || 28,
                cricHeroesProfileUrl: (cricHeroesProfileUrl || user.cricHeroesProfileUrl || '').trim(),
                image: (data.captainPhoto !== undefined ? user.captainPhoto : user.image) || '',
                stats: { matches: 0, runs: 0, wickets: 0, highestScore: '', bestBowling: '' }
            };

            if (!state.players) state.players = [];
            state.players.unshift(capPlayer);
            user.captainPlayerId = capPlayer._id;

            const team = state.teams.find(t => t._id === targetTeamId);
            if (team) {
                team.isOwnerCaptain = true;
                team.captainPlayerId = capPlayer._id;
                team.captainName = capPlayer.name;
                team.captainPrice = parsedPrice;
                if (data.captainPhoto !== undefined) team.captainPhoto = user.captainPhoto;
                if (!team.players) team.players = [];
                if (!team.players.some(p => (p._id || p) === capPlayer._id)) {
                    team.players.unshift(capPlayer);
                }
            }
        }

        writeData(state);
        await supaSync.updateUser(userId, state.users[idx]);
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
                    team.spent = Math.max(0, (team.spent || 0) - user.captainPrice);
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

    // --- TOURNAMENTS ---
    async getTournaments() {
        const state = readData();
        return state.tournaments || [];
    },

    async getTournamentById(id) {
        const state = readData();
        return state.tournaments.find(t => t._id === id);
    },

    async createTournament(data) {
        const state = readData();
        const newT = {
            _id: 'tourney_' + Date.now(),
            status: data.status || 'upcoming', // upcoming, live, paused, break, completed
            biddingState: data.biddingState || 'stopped', // stopped, active, paused, break
            auctionType: data.auctionType || 'owner_driven',
            budgetScale: data.budgetScale === 'K_TO_L' ? 'K_TO_L' : 'L_TO_CR',
            bidIncrementRules: data.bidIncrementRules || DEFAULT_BID_RULES,
            registrationOpen: data.registrationOpen !== false,
            ...data,
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
                cleanUpdate.bidIncrementRules = cleanUpdate.bidIncrementRules.map(r => ({
                    upTo: Number(r.upTo) || 100,
                    increment: Number(r.increment) || 10
                }));
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
        return state.teams.find(t => t._id === id);
    },

    async createTeam(data) {
        const state = readData();
        const budget = Number(data.budget) || 100;
        const isOwnerCaptain = !!data.isOwnerCaptain;
        const captainPrice = isOwnerCaptain ? (Number(data.captainPrice) || 0) : 0;
        const captainName = isOwnerCaptain ? (data.captainName ? data.captainName.trim() : null) : null;
        const captainPhoto = (data.captainPhoto || data.captainImage || '').trim();
        const spent = captainPrice; // Auto-deducted from purse
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

            if (update.captainPhoto !== undefined || update.captainName !== undefined) {
                if (update.captainPhoto !== undefined) {
                    updated.captainPhoto = (update.captainPhoto || '').trim();
                }
                if (update.captainName !== undefined) {
                    updated.captainName = update.captainName ? update.captainName.trim() : null;
                }

                // Also sync with the captain player and user
                let capPlayer = (state.players || []).find(p => (p.soldToTeamId === id || p.teamId === id || p._id === updated.captainPlayerId) && p.isCaptain);
                if (capPlayer) {
                    if (updated.captainPhoto !== undefined) capPlayer.image = updated.captainPhoto;
                    if (updated.captainName) capPlayer.name = updated.captainName;
                } else if (updated.isOwnerCaptain) {
                    capPlayer = {
                        _id: 'pl_cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                        tournamentId: updated.tournamentId,
                        teamId: id,
                        name: updated.captainName || `${updated.name} Captain`,
                        category: 'All-Rounder',
                        battingStyle: 'Right-Hand Bat',
                        bowlingStyle: 'Right-Arm Medium',
                        basePrice: Number(updated.captainPrice) || 15,
                        soldPrice: Number(updated.captainPrice) || 15,
                        currentBid: Number(updated.captainPrice) || 15,
                        status: 'sold',
                        isCaptain: true,
                        isOwner: true,
                        soldToTeamId: id,
                        currentLeadTeamId: id,
                        image: updated.captainPhoto || '',
                        stats: { matches: 0, runs: 0, wickets: 0, highestScore: '', bestBowling: '' }
                    };
                    if (!state.players) state.players = [];
                    state.players.unshift(capPlayer);
                    updated.captainPlayerId = capPlayer._id;
                }

                const ownerUser = state.users.find(u => (u.teamId?._id || u.teamId) === id && u.role === 'team_owner');
                if (ownerUser) {
                    if (updated.captainPhoto !== undefined) ownerUser.captainPhoto = updated.captainPhoto;
                    if (updated.captainName) ownerUser.captainName = updated.captainName;
                    if (capPlayer) ownerUser.captainPlayerId = capPlayer._id;
                }
            }

            // Recalculate spent if captain fee changed
            if (update.isOwnerCaptain !== undefined || update.captainPrice !== undefined) {
                const isOwnerCaptain = update.isOwnerCaptain !== undefined ? update.isOwnerCaptain : current.isOwnerCaptain;
                const captainPrice = isOwnerCaptain ? (Number(update.captainPrice ?? current.captainPrice) || 0) : 0;

                // Keep players spent sum (in Crores) + captain fee (in Crores)
                const playersSpentInCr = (current.players || []).reduce((acc, p) => {
                    const playerObj = typeof p === 'object' ? p : (state.players || []).find(x => x._id === p);
                    const pPrice = Number(playerObj?.soldPrice || playerObj?.currentBid) || 0;
                    return acc + (pPrice / 100);
                }, 0);
                updated.spent = Number((playersSpentInCr + captainPrice).toFixed(2));
                updated.isOwnerCaptain = isOwnerCaptain;
                updated.captainPrice = captainPrice;
            }

            state.teams[idx] = updated;
            writeData(state);
            await supaSync.updateTeam(id, updated);
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
        const filtered = (state.players || []).filter(p => !tournamentId || p.tournamentId === tournamentId);
        // Team Owner Captains appear FIRST in the player list!
        return filtered.sort((a, b) => {
            if (a.isCaptain && !b.isCaptain) return -1;
            if (!a.isCaptain && b.isCaptain) return 1;
            return 0;
        });
    },

    async getPlayerById(id) {
        const state = readData();
        return state.players.find(p => p._id === id);
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

        // If it's a virtual retained captain record not yet saved in players
        if (idx === -1 && id && id.startsWith('owner_cap_')) {
            const teamId = id.replace('owner_cap_', '');
            const team = (state.teams || []).find(t => t._id === teamId);
            const user = (state.users || []).find(u => (u.teamId?._id || u.teamId) === teamId && u.role === 'team_owner');
            const newPrice = Number(update.basePrice ?? update.soldPrice ?? team?.captainPrice) || 15;
            const newCap = {
                _id: 'pl_cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                tournamentId: team?.tournamentId || user?.tournamentId,
                teamId,
                name: (update.name || team?.captainName || user?.captainName || 'Captain').trim(),
                category: update.category || user?.category || 'All-Rounder',
                battingStyle: update.battingStyle || user?.battingStyle || 'Right-Hand Bat',
                bowlingStyle: update.bowlingStyle || user?.bowlingStyle || 'Right-Arm Medium',
                basePrice: newPrice,
                soldPrice: newPrice,
                currentBid: newPrice,
                status: 'sold',
                isCaptain: true,
                isOwner: true,
                soldToTeamId: teamId,
                currentLeadTeamId: teamId,
                image: (update.image !== undefined ? update.image : (team?.captainPhoto || user?.captainPhoto)) || '',
                age: Number(update.age || user?.age) || 28,
                cricHeroesProfileUrl: update.cricHeroesProfileUrl || user?.cricHeroesProfileUrl || '',
                stats: update.stats || { matches: 0, runs: 0, wickets: 0, highestScore: '', bestBowling: '' }
            };

            if (!state.players) state.players = [];
            state.players.unshift(newCap);

            if (team) {
                team.captainPlayerId = newCap._id;
                team.captainName = newCap.name;
                team.captainPrice = newPrice;
                if (update.image !== undefined) team.captainPhoto = update.image;
            }
            if (user) {
                user.captainPlayerId = newCap._id;
                user.captainName = newCap.name;
                user.captainPrice = newPrice;
                if (update.image !== undefined) user.captainPhoto = update.image;
            }

            writeData(state);
            return newCap;
        }

        if (idx !== -1) {
            const current = state.players[idx];
            let extra = {};

            // If basePrice is provided
            if (update.basePrice !== undefined) {
                const newPrice = Number(update.basePrice) || 0;
                extra.basePrice = newPrice;
                if (current.status !== 'sold') {
                    extra.currentBid = newPrice;
                }
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
                    team.spent = Math.max(0, (team.spent || 0) + priceDiff);
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

            state.players[idx] = { ...current, ...update, ...extra };
            writeData(state);
            await supaSync.updatePlayer(id, { ...update, ...extra });
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
                team.spent = Math.max(0, (team.spent || 0) - capPrice);
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
                team.spent = Math.max(0, (team.spent || 0) - capPrice);
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
        }

        // Shift all unsold players of this tournament into this slot and set status to pending
        const updatedPlayers = [];
        state.players.forEach(p => {
            if (p.tournamentId === tournamentId && (p.status === 'unsold' || p.slotId === unsoldSlot._id)) {
                p.status = 'pending';
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
            state.slots[idx] = { ...state.slots[idx], ...update };
            // If basePrice of slot changed, optionally update all players in this slot
            if (update.basePrice !== undefined) {
                const newPrice = Number(update.basePrice) || 20;
                state.players.forEach(p => {
                    if (p.slotId === slotId && p.status === 'pending') {
                        p.basePrice = newPrice;
                        p.currentBid = newPrice;
                    }
                });
            }
            writeData(state);
            await supaSync.updateSlot(slotId, update);
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
                p.soldPrice || (p.status === 'sold' ? p.currentBid : 0),
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
            const tPlayers = players.filter(p => p.soldToTeamId === t._id || p.soldToTeamId === t.id);
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
    }
};

module.exports = db;
