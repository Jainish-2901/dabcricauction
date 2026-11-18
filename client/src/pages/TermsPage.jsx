import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, AlertCircle, Scale, ShieldCheck, Mail } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';

export default function TermsPage() {
    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
            <PublicHeader />

            <main className="flex-1 py-10 sm:py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="mb-10 text-center sm:text-left">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black uppercase tracking-wider mb-3">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            Platform Agreement
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
                            Terms & Conditions
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
                                Acceptance of Terms
                            </h2>
                            <p>
                                By accessing or utilizing the <strong>Dab Cric Auction</strong> web platform, mobile applications, spectator feeds, or administrative auction consoles, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, please refrain from using the platform.
                            </p>
                        </div>

                        {/* Section 2 */}
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-950 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">2</span>
                                Purpose of the Platform
                            </h2>
                            <p>
                                Dab Cric Auction is designed strictly as a technical synchronization and record-keeping software tool for live amateur, club, box cricket, and community cricket player auctions. The platform provides real-time bidding rooms, gavel controls, purse calculations, and spectator broadcasts.
                            </p>
                            <div className="mt-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-300 text-amber-950 flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                <span className="text-xs font-bold">
                                    <strong>Important Note:</strong> Dab Cric Auction is NOT a gambling, betting, or financial exchange platform. The platform handles digital points/currency scales (Lakhs, Crores, Thousands) strictly for virtual team purse management during player selection.
                                </span>
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-950 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">3</span>
                                Organizer & SuperAdmin Responsibilities
                            </h2>
                            <ul className="list-disc pl-5 space-y-1.5 text-slate-900 font-medium">
                                <li><strong>Tournament Rule Enforcement:</strong> Organizers are solely responsible for setting squad limits, base prices, bidding slab scales, and enforcing physical cricket league rules.</li>
                                <li><strong>Credential Confidentiality:</strong> Organizers must keep SuperAdmin and Auctioneer login passwords confidential. Dab Cric Auction is not responsible for unauthorized actions resulting from shared passwords.</li>
                                <li><strong>Player Consent:</strong> Organizers must ensure players submitted to the nomination portal have granted consent for their name, statistics, and photo to be displayed on public spectator screens.</li>
                            </ul>
                        </div>

                        {/* Section 4 */}
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-950 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">4</span>
                                Live Bidding & Auctioneer Finality
                            </h2>
                            <p>
                                In all auction scenarios, the designated <strong>Auctioneer</strong> has final authority over bid acceptance, sold declarations, force-sells, or rollbacks. While our system provides automatic timer countdowns and WebSocket synchronization, physical tournament dispute resolution rests solely with the tournament committee.
                            </p>
                        </div>

                        {/* Section 5 */}
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-950 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">5</span>
                                Intellectual Property & System Source
                            </h2>
                            <p>
                                The software architecture, user interfaces, branding, custom icons, algorithms, and mobile application packages of Dab Cric Auction are the intellectual property of developer <strong>Jainish Dabgar</strong>. Users and organizers retain complete ownership over their own player photos, team logos, and tournament names.
                            </p>
                        </div>

                        {/* Section 6 */}
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-950 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">6</span>
                                Disclaimer of Warranties & Limitation of Liability
                            </h2>
                            <p>
                                Dab Cric Auction is provided on an "as-is" and "as-available" basis. While we strive for 99.9% uptime, low-latency WebSocket delivery, and resilient offline syncing, we are not liable for local internet connectivity drops, network cellular latency on mobile devices, or hardware failures during live events. Organizers are advised to maintain stable Wi-Fi or 5G connections at auction venues.
                            </p>
                        </div>

                        {/* Section 7 */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-300">
                            <h2 className="text-sm font-black text-slate-950 mb-1 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-blue-600" />
                                Contact & Inquiries
                            </h2>
                            <p className="text-xs text-slate-900 font-medium">
                                For inquiries or legal notices regarding these Terms, please contact <strong>Jainish Dabgar</strong> at{' '}
                                <a href="mailto:jainishdabgar2901@gmail.com" className="text-blue-600 font-bold hover:underline">
                                    jainishdabgar2901@gmail.com
                                </a>{' '}
                                or call <span className="font-bold text-slate-950">+91 97732 72749</span>.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}
