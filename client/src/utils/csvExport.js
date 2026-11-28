/**
 * CricAuction Client-Side CSV Exporter
 * Generates and downloads RFC 4180 compliant CSV files directly in browser with UTF-8 BOM.
 * Completely immune to Vercel SPA 404 rewrites and CORS download blocks.
 */

import { apiFetch, API_BASE_URL } from '../lib/api';

/**
 * Trigger immediate browser download of CSV string
 */
export const downloadCSV = (csvContent, filename) => {
    // \uFEFF Byte Order Mark ensures Excel & Google Sheets parse UTF-8 text (names, Hindi/Gujarati characters) correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Generate Teams Summary CSV from tournament, teams, players, and users data
 */
export const generateTournamentSummaryCSV = (tournament, teams = [], players = [], users = []) => {
    const isKtoL = tournament?.budgetScale === 'K_TO_L';
    const largeUnit = isKtoL ? 'L' : 'Cr';
    const smallUnit = isKtoL ? 'K' : 'L';

    let csv = `Tournament Auction Summary - ${tournament?.name || 'Tournament'} [Scale: ${isKtoL ? 'K to L (Club)' : 'L to Cr (Standard)'}]\n`;
    csv += `Export Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;

    // SECTION 1: TEAM PURSE & ROSTER OVERVIEW
    csv += `TEAM ROSTER & PURSE OVERVIEW\n`;
    csv += `Team Name,Short Code,Captain Name,Budget (${largeUnit}),Spent (${largeUnit}),Remaining Purse (${largeUnit}),Owner Captain Status,Squad Size\n`;

    (teams || []).forEach(t => {
        const remaining = Math.max(0, (Number(t.budget) || 100) - (Number(t.spent) || 0)).toFixed(2);
        const ownerUser = (users || []).find(u => (u.teamId === t._id || u.teamId === t.id) && u.role === 'team_owner');
        const capName = t.captainName || ownerUser?.captainName || ownerUser?.name || ownerUser?.username || (t.isOwnerCaptain ? 'Captain' : '-');
        const tPlayers = (players || []).filter(p => (p.soldToTeamId === t._id || p.soldToTeamId === t.id) && !p.isCaptain && !String(p._id || '').startsWith('pl_cap_'));
        const totalSquad = tPlayers.length + (t.isOwnerCaptain ? 1 : 0);
        const ownerCapDesc = t.isOwnerCaptain ? `Yes - Retained (₹${t.captainPrice || 0}${smallUnit})` : 'No';

        csv += `"${(t.name || '').replace(/"/g, '""')}","${(t.shortName || '').replace(/"/g, '""')}","${capName.replace(/"/g, '""')}",${t.budget || 100},${t.spent || 0},${remaining},"${ownerCapDesc}",${totalSquad}\n`;
    });
    csv += `\n`;

    // SECTION 2: ACQUIRED SQUAD BY TEAM
    csv += `ACQUIRED SQUAD PLAYERS & SOLD PRICES\n`;
    csv += `Team,Player Name,Category,Batting Style,Bowling Style,Base Price (${smallUnit}),Sold Price (${smallUnit}),Status\n`;

    (teams || []).forEach(t => {
        const ownerUser = (users || []).find(u => (u.teamId === t._id || u.teamId === t.id) && u.role === 'team_owner');
        const capName = t.captainName || ownerUser?.captainName || ownerUser?.name || ownerUser?.username || (t.isOwnerCaptain ? 'Captain' : '-');

        // Retained Owner-Captain row
        if (t.isOwnerCaptain) {
            csv += `"${(t.name || '').replace(/"/g, '""')}","${capName.replace(/"/g, '""')} (👑 OWNER & CAPTAIN)","${ownerUser?.category || 'Captain (All-Rounder)'}","${ownerUser?.battingStyle || 'Right-Hand Bat'}","${ownerUser?.bowlingStyle || 'Right-Arm Medium'}",${t.captainPrice || 0},${t.captainPrice || 0},"DIRECT RETAINED SQUAD"\n`;
        }

        const tPlayers = (players || []).filter(p => (p.soldToTeamId === t._id || p.soldToTeamId === t.id) && !p.isCaptain);
        tPlayers.forEach(p => {
            const soldVal = p.soldPrice || p.sold_price || (p.status === 'sold' ? (p.currentBid || p.basePrice || 0) : 0);
            csv += `"${(t.name || '').replace(/"/g, '""')}","${(p.name || '').replace(/"/g, '""')}","${(p.category || '').replace(/"/g, '""')}","${(p.battingStyle || '').replace(/"/g, '""')}","${(p.bowlingStyle || '').replace(/"/g, '""')}",${p.basePrice || 0},${soldVal},"${p.status || 'sold'}"\n`;
        });
    });
    csv += `\n`;

    // SECTION 3: UNSOLD PLAYERS
    const unsold = (players || []).filter(p => p.status === 'unsold');
    csv += `UNSOLD PLAYERS LIST (${unsold.length})\n`;
    csv += `Player Name,Category,Batting Style,Bowling Style,Base Price (${smallUnit}),Age,Status\n`;
    unsold.forEach(p => {
        csv += `"${(p.name || '').replace(/"/g, '""')}","${(p.category || '').replace(/"/g, '""')}","${(p.battingStyle || '').replace(/"/g, '""')}","${(p.bowlingStyle || '').replace(/"/g, '""')}",${p.basePrice || 0},"${p.age || ''}","UNSOLD"\n`;
    });

    return csv;
};

/**
 * Generate Players Master Feed CSV
 */
export const generateTournamentPlayersCSV = (tournament, players = [], teams = []) => {
    const isKtoL = tournament?.budgetScale === 'K_TO_L';
    const smallUnit = isKtoL ? 'K' : 'L';

    const headers = [
        'Name',
        'Category',
        'BattingStyle',
        'BowlingStyle',
        `BasePrice (${smallUnit})`,
        'SoldToTeam',
        `SoldPrice (${smallUnit})`,
        'Status',
        'IsCaptain',
        'Age',
        'CricHeroesURL',
        'Matches',
        'Runs',
        'Matches',
        'Runs',
        'Wickets',
        'Economy'
    ];

    const rows = (players || []).map(p => {
        const team = (teams || []).find(t => t._id === p.soldToTeamId || t.id === p.soldToTeamId);
        const soldVal = p.soldPrice || p.sold_price || (p.status === 'sold' ? (p.currentBid || p.basePrice || 0) : 0);

        return [
            `"${(p.name || '').replace(/"/g, '""')}"`,
            `"${(p.category || '').replace(/"/g, '""')}"`,
            `"${(p.battingStyle || '').replace(/"/g, '""')}"`,
            `"${(p.bowlingStyle || '').replace(/"/g, '""')}"`,
            p.basePrice || 0,
            `"${team ? team.name.replace(/"/g, '""') : ''}"`,
            soldVal,
            p.status || 'pending',
            p.isCaptain ? 'Yes' : 'No',
            p.age || '',
            `"${p.cricHeroesProfileUrl || ''}"`,
            p.stats?.matches || 0,
            p.stats?.runs || 0,
            p.stats?.wickets || 0,
            `"${p.stats?.economy || ''}"`
        ];
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

/**
 * Trigger download of Tournament Summary CSV with automatic API fallback
 */
export const exportTournamentSummaryCSVClient = async (tournamentId, existingData = {}) => {
    try {
        let { tournament, teams, players, users } = existingData;

        // If data is missing or incomplete, fetch cleanly via API
        if (!tournament || !teams || !players) {
            const [tRes, teamRes, pRes, uRes] = await Promise.all([
                tournament ? Promise.resolve({ data: tournament }) : apiFetch(`/api/tournaments/${tournamentId}`).then(r => r.json()),
                teams && teams.length ? Promise.resolve({ data: teams }) : apiFetch(`/api/teams/${tournamentId}`).then(r => r.json()),
                players && players.length ? Promise.resolve({ data: players }) : apiFetch(`/api/players/${tournamentId}`).then(r => r.json()),
                users ? Promise.resolve({ data: users }) : apiFetch(`/api/users/${tournamentId}`).then(r => r.json()).catch(() => [])
            ]);

            tournament = tournament || (tRes?.data || tRes);
            teams = (teams && teams.length) ? teams : (Array.isArray(teamRes) ? teamRes : (teamRes?.data || []));
            players = (players && players.length) ? players : (Array.isArray(pRes) ? pRes : (pRes?.data || []));
            users = users || (Array.isArray(uRes) ? uRes : (uRes?.data || []));
        }

        const csv = generateTournamentSummaryCSV(tournament, teams, players, users);
        const safeName = (tournament?.name || 'auction_summary').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        downloadCSV(csv, `${safeName}_teams_summary.csv`);
        return true;
    } catch (err) {
        console.error('Client CSV export error, attempting direct backend URL...', err);
        // Fallback: Use full backend URL if API_BASE_URL is configured
        const backendEndpoint = API_BASE_URL
            ? `${API_BASE_URL}/api/tournaments/${tournamentId}/export-teams-summary-csv`
            : `/api/tournaments/${tournamentId}/export-teams-summary-csv`;
        window.open(backendEndpoint, '_blank');
        return false;
    }
};

/**
 * Trigger download of Players Feed CSV with automatic API fallback
 */
export const exportTournamentPlayersCSVClient = async (tournamentId, existingData = {}) => {
    try {
        let { tournament, players, teams } = existingData;

        if (!players || !teams) {
            const [tRes, pRes, teamRes] = await Promise.all([
                tournament ? Promise.resolve({ data: tournament }) : apiFetch(`/api/tournaments/${tournamentId}`).then(r => r.json()),
                players && players.length ? Promise.resolve({ data: players }) : apiFetch(`/api/players/${tournamentId}`).then(r => r.json()),
                teams && teams.length ? Promise.resolve({ data: teams }) : apiFetch(`/api/teams/${tournamentId}`).then(r => r.json())
            ]);

            tournament = tournament || (tRes?.data || tRes);
            players = (players && players.length) ? players : (Array.isArray(pRes) ? pRes : (pRes?.data || []));
            teams = (teams && teams.length) ? teams : (Array.isArray(teamRes) ? teamRes : (teamRes?.data || []));
        }

        const csv = generateTournamentPlayersCSV(tournament, players, teams);
        const safeName = (tournament?.name || 'players_feed').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        downloadCSV(csv, `${safeName}_players_feed.csv`);
        return true;
    } catch (err) {
        console.error('Client Players CSV export error, attempting direct backend URL...', err);
        const backendEndpoint = API_BASE_URL
            ? `${API_BASE_URL}/api/tournaments/${tournamentId}/export-players-csv`
            : `/api/tournaments/${tournamentId}/export-players-csv`;
        window.open(backendEndpoint, '_blank');
        return false;
    }
};
