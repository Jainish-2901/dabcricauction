import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Server, RefreshCw, Mail, CheckCircle2 } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';

export default function PrivacyPolicyPage() {
    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
            <PublicHeader />

            <main className="flex-1 py-10 sm:py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="mb-10 text-center sm:text-left">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-wider mb-3">
                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            Privacy & Data Protection
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
                            Privacy Policy
                        </h1>
                        <p className="text-xs text-slate-800 font-bold">
                            Last Updated: November 2026 • Effective Date: January 1, 2026
                        </p>
                    </div>

                    {/* Content Box */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-300 p-4 sm:p-8 lg:p-10 shadow-xs space-y-6 sm:space-y-8 text-xs sm:text-sm text-slate-900 leading-relaxed font-medium">
                        {/* Section 1 */}
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-950 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">1</span>
                                Introduction & Scope
                            </h2>
                            <p>
                                Welcome to <strong>Dab Cric Auction</strong> ("we", "our", or "platform"). We respect the privacy of our organizers, tournament administrators, franchise team owners, and registered players. This Privacy Policy describes how personal and tournament data is collected, stored, encrypted, and utilized across our Web platform and our native Android mobile application.
                            </p>
                        </div>

                        {/* Section 2 */}
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-950 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">2</span>
                                Information We Collect
                            </h2>
                            <p className="mb-3">
                                When using Dab Cric Auction, we collect only the necessary information essential to operate your cricket auction:
                            </p>
                            <ul className="list-disc pl-5 space-y-1.5 text-slate-900 font-medium">
                                <li><strong>Tournament Configuration Data:</strong> Tournament title, start dates, auction times, squad limits, bidding slab increments, and tournament logos.</li>
                                <li><strong>Franchise Team Data:</strong> Team names, short acronyms, assigned purse budgets, owner captain names, captain allocation prices, and team logos.</li>
                                <li><strong>Player Registration Data:</strong> Player full names, category (Batsman, Bowler, All-Rounder, Wicket Keeper), batting/bowling styles, base prices, age, CricHeroes profile links, career stats (matches, runs, wickets), and player profile photos.</li>
                                <li><strong>Bidding & Transaction Ledger:</strong> Real-time bid logs, timestamped amounts, winning bids, trade differentials, and injury replacement records.</li>
                                <li><strong>Account Credentials:</strong> Username and salted hashed passwords for SuperAdmins, Auctioneers, and Franchise Owners. We never store plain-text passwords.</li>
                            </ul>
                        </div>

                        {/* Section 3 */}
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-950 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">3</span>
                                How We Use Collected Information
                            </h2>
                            <p className="mb-2">We use your information strictly for the purpose of operating the live auction experience:</p>
                            <ul className="list-disc pl-5 space-y-1.5 text-slate-900 font-medium">
                                <li>To execute sub-second real-time bidding rooms and calculate remaining team budgets automatically.</li>
                                <li>To display live spectator broadcast screens for community spectators and audience members.</li>
                                <li>To allow organizers to generate player CSV rosters, sold summaries, and balance sheets.</li>
                                <li>To provide secure access control for Auctioneers and franchise owners.</li>
                            </ul>
                        </div>

                        {/* Section 4 */}
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-950 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">4</span>
                                Cloud Storage, Security & Multi-Tenant Segregation
                            </h2>
                            <p className="mb-2">
                                All auction records and database tables are securely hosted on <strong>Supabase (PostgreSQL)</strong> with strict Row-Level Security (RLS) policies and HTTPS/TLS encryption in transit. Player photos and tournament logos are processed through an interactive 1:1 aspect cropper and hosted via <strong>Cloudinary CDN</strong> over secure HTTPS.
                            </p>
                            <p>
                                <strong>Multi-Tenant Data Isolation:</strong> Every tournament organizer account operates inside a dedicated, isolated workspace. Tournaments, player pools, franchise purse configurations, and live bidding logs are strictly partitioned by account creator IDs, guaranteeing that no organizer can view, access, or modify another organizer's proprietary event data. We do not sell, rent, or trade your data to any third-party advertisers or marketing agencies.
                            </p>
                        </div>

                        {/* Section 5 */}
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-950 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">5</span>
                                Android Mobile Application Permissions
                            </h2>
                            <p>
                                The <strong>Dab Cric Auction Android App</strong> requires only the following minimal permissions:
                            </p>
                            <ul className="list-disc pl-5 space-y-1.5 text-slate-900 font-medium mt-2">
                                <li><strong>Internet Access:</strong> To synchronize real-time bids, room state, and team balances with our cloud servers.</li>
                                <li><strong>Photo Library / Media Storage:</strong> Requested optionally only when an administrator or player chooses to upload a photo or logo from their gallery for 1:1 cropping.</li>
                            </ul>
                        </div>

                        {/* Section 6 */}
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-950 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">6</span>
                                Data Ownership & Deletion Rights
                            </h2>
                            <p>
                                Tournament organizers retain full ownership over their tournaments, teams, and registered players. SuperAdmins can edit, update, or permanently delete any tournament, team, player, or photo directly from the web or mobile dashboard at any time. When a tournament or player is deleted, corresponding database records and Cloudinary assets are purged.
                            </p>
                        </div>

                        {/* Section 7 */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-300">
                            <h2 className="text-sm font-black text-slate-950 mb-1 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-blue-600" />
                                Contact For Privacy Concerns
                            </h2>
                            <p className="text-xs text-slate-900 font-medium">
                                If you have questions or requests regarding your data, please contact developer <strong>Jainish Dabgar</strong> at{' '}
                                <a href="mailto:jainishdabgar2901@gmail.com" className="text-blue-600 font-bold hover:underline">
                                    jainishdabgar2901@gmail.com
                                </a>{' '}
                                or by phone at <span className="font-bold text-slate-950">+91 97732 72749</span>.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}
