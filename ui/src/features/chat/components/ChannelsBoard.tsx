/**
 * ChannelsBoard.tsx
 *
 * Phase 3+4: The "Chat Manager" intelligence board.
 * Shows trending organizational topics in real-time from Firestore.
 * Management/HR can post official responses to close a topic.
 * Phase 4 adds: last-scan timestamp, auto-refresh indicator, SCAN_KEY auth.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTopicFeed, LiveTopic } from '../hooks/useTopicFeed';
import type { DmUser } from '../hooks/useDmChat';

interface ChannelsBoardProps {
    currentUser: DmUser | null;
    onTriggerScan: () => void;
    isScanning: boolean;
}

// Environment key sent with manual scan requests
const SCAN_KEY = 'yai-scan-2026-ui-key';

const URGENCY_CONFIG = {
    critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'CRITICAL', ring: 'rgba(239,68,68,0.45)' },
    high:     { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'HIGH',     ring: 'rgba(249,115,22,0.35)' },
    medium:   { color: '#EAB308', bg: 'rgba(234,179,8,0.1)',  label: 'MED',      ring: 'rgba(234,179,8,0.28)' },
    low:      { color: '#22C55E', bg: 'rgba(34,197,94,0.08)', label: 'LOW',      ring: 'rgba(34,197,94,0.22)' },
};

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function HeatBar({ score }: { score: number }) {
    const pct = Math.min(100, Math.max(0, score));
    const color = pct >= 80 ? '#EF4444' : pct >= 60 ? '#F97316' : pct >= 40 ? '#EAB308' : '#22C55E';
    return (
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
            />
        </div>
    );
}

function TopicCard({
    topic, currentUser, onRespond,
}: {
    topic: LiveTopic;
    currentUser: DmUser | null;
    onRespond: (topicId: string, response: string, by: string) => Promise<void>;
}) {
    const [expanded, setExpanded] = useState(false);
    const [showRespondBox, setShowRespondBox] = useState(false);
    const [responseText, setResponseText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const uc = URGENCY_CONFIG[topic.urgency] || URGENCY_CONFIG.medium;
    const isResolved = topic.status === 'resolved';

    const handleRespond = async () => {
        if (!responseText.trim() || !currentUser) return;
        setSubmitting(true);
        await onRespond(topic.id, responseText.trim(), currentUser.name);
        setSubmitting(false);
        setShowRespondBox(false);
        setResponseText('');
    };

    return (
        <div
            className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                isResolved
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-white/8 bg-[#0D1117] hover:border-white/15'
            }`}
            style={!isResolved ? { boxShadow: `0 0 18px ${uc.ring}` } : undefined}
        >
            {/* Card header */}
            <button onClick={() => setExpanded(!expanded)} className="w-full px-4 py-3 flex items-start gap-3 text-left">
                {/* Heat dial */}
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-[13px]"
                    style={{ background: uc.bg, color: uc.color, border: `1.5px solid ${uc.color}55` }}
                >
                    {topic.heatScore}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-white font-semibold text-sm leading-snug">{topic.topic}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-widest" style={{ background: uc.bg, color: uc.color }}>
                            {uc.label}
                        </span>
                        {isResolved && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">✓ RESOLVED</span>
                        )}
                    </div>
                    <p className="text-white/40 text-xs leading-snug line-clamp-1">{topic.summary}</p>
                    <HeatBar score={topic.heatScore} />
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-white/35">{topic.mentioningUserCount} 🙋</span>
                    <svg className={`w-3.5 h-3.5 text-white/20 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Expanded detail panel */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                    {/* Departments */}
                    {topic.departments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {topic.departments.map(d => (
                                <span key={d} className="text-[11px] px-2 py-0.5 rounded-full bg-[#FF6B2C]/10 text-[#FF6B2C] border border-[#FF6B2C]/20">{d}</span>
                            ))}
                        </div>
                    )}

                    {/* Sample questions */}
                    {topic.sampleQuestions?.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-white/25 uppercase tracking-widest">Employees are asking:</p>
                            {topic.sampleQuestions.map((q, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className="text-[#FF6B2C] text-xs mt-0.5 shrink-0">›</span>
                                    <p className="text-white/55 text-xs italic">"{q}"</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Suggested responder */}
                    <div className="flex items-center gap-2 text-xs">
                        <svg className="w-3.5 h-3.5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-white/30">Suggested: </span>
                        <span className="text-[#FF6B2C] font-semibold">{topic.suggestedResponder}</span>
                    </div>

                    {/* Official response (resolved) */}
                    {isResolved && topic.officialResponse && (
                        <div className="bg-green-500/8 border border-green-500/20 rounded-lg p-3">
                            <p className="text-[10px] text-green-400 uppercase tracking-widest mb-1 font-bold">
                                Official — {topic.respondedBy}
                            </p>
                            <p className="text-white/65 text-xs leading-relaxed">{topic.officialResponse}</p>
                        </div>
                    )}

                    {/* Respond action */}
                    {!isResolved && currentUser && (
                        !showRespondBox ? (
                            <button
                                onClick={() => setShowRespondBox(true)}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#FF6B2C]/10 hover:bg-[#FF6B2C]/20 text-[#FF6B2C] border border-[#FF6B2C]/30 rounded-lg transition-all font-medium"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Post Official Response
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <textarea
                                    value={responseText}
                                    onChange={e => setResponseText(e.target.value)}
                                    placeholder="Type the official company statement or action taken..."
                                    rows={3}
                                    className="w-full bg-[#1C2128] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-[#FF6B2C]/40 resize-none transition-colors"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleRespond}
                                        disabled={submitting || !responseText.trim()}
                                        className="text-xs px-4 py-1.5 bg-[#FF6B2C] hover:bg-[#E84E0F] disabled:opacity-40 text-white rounded-lg transition-all font-semibold"
                                    >
                                        {submitting ? 'Publishing...' : '✓ Publish & Resolve'}
                                    </button>
                                    <button onClick={() => setShowRespondBox(false)} className="text-xs px-3 py-1.5 text-white/35 hover:text-white/60 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}

export const ChannelsBoard: React.FC<ChannelsBoardProps> = ({ currentUser, onTriggerScan: _onTriggerScan, isScanning: _isScanning }) => {
    const { topics, loading } = useTopicFeed();
    const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
    const [isScanning, setIsScanning] = useState(false);
    const [stats, setStats] = useState<{ lastScanAt: string | null; activeCounts: number; resolvedCounts: number } | null>(null);
    const [nextScan, setNextScan] = useState<number>(30 * 60);

    // Fetch stats on mount and after each scan
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/manager/topics/stats');
            const data = await res.json();
            if (data.success) setStats(data);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    // Countdown ticker — updates every second
    useEffect(() => {
        const t = setInterval(() => {
            setNextScan(s => Math.max(0, s - 1));
        }, 1000);
        return () => clearInterval(t);
    }, []);

    // Auto-trigger scan every 30 minutes
    useEffect(() => {
        if (nextScan === 0) {
            handleScan();
            setNextScan(30 * 60);
        }
    }, [nextScan]);

    const handleScan = async () => {
        if (isScanning) return;
        setIsScanning(true);
        try {
            await fetch('/api/manager/analyze-topics', {
                method: 'POST',
                headers: { 'x-scan-key': SCAN_KEY },
            });
            await fetchStats();
            setNextScan(30 * 60); // reset countdown
        } catch (err) {
            console.error('Scan failed:', err);
        } finally {
            setIsScanning(false);
        }
    };

    const handleRespond = async (topicId: string, response: string, by: string) => {
        try {
            await fetch(`/api/manager/topics/${topicId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response, respondedBy: by }),
            });
            await fetchStats();
        } catch (err) {
            console.error('Failed to post response:', err);
        }
    };

    const filtered = topics.filter(t =>
        filter === 'all' ? true :
        filter === 'active' ? t.status !== 'resolved' :
        t.status === 'resolved'
    );

    const activeCount = topics.filter(t => t.status !== 'resolved').length;

    const countdownDisplay = () => {
        const m = Math.floor(nextScan / 60);
        const s = nextScan % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Board header */}
            <div className="px-4 py-3 border-b border-white/5 shrink-0 space-y-2.5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#FF6B2C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            Trending Now
                            {activeCount > 0 && (
                                <span className="bg-[#FF6B2C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">{activeCount}</span>
                            )}
                        </h3>
                        <p className="text-white/25 text-[10px] mt-0.5">AI-detected topics · auto-scan every 30 min</p>
                    </div>
                    <button
                        onClick={handleScan}
                        disabled={isScanning}
                        title="Manually trigger AI topic scan"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C2128] hover:bg-[#22272E] border border-white/8 hover:border-[#FF6B2C]/40 text-white/50 hover:text-[#FF6B2C] text-xs font-medium rounded-lg transition-all disabled:opacity-40"
                    >
                        <svg className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isScanning ? 'Scanning...' : 'Scan Now'}
                    </button>
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-4 text-[10px] text-white/25">
                    {stats?.lastScanAt ? (
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            Last scan: <span className="text-white/40">{timeAgo(stats.lastScanAt)}</span>
                        </span>
                    ) : (
                        <span className="text-white/20">Not yet scanned</span>
                    )}
                    <span className="flex items-center gap-1">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Next: <span className="text-white/40 font-mono">{countdownDisplay()}</span>
                    </span>
                    {stats && (
                        <span>{stats.activeCounts} active · {stats.resolvedCounts} resolved</span>
                    )}
                </div>

                {/* Status filter tabs */}
                <div className="flex gap-1">
                    {(['all', 'active', 'resolved'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`text-[11px] px-3 py-1 rounded-lg font-medium capitalize transition-all ${
                                filter === f
                                    ? 'bg-[#FF6B2C]/15 text-[#FF6B2C] border border-[#FF6B2C]/30'
                                    : 'text-white/30 hover:text-white/55'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Topic cards */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-2">
                {loading && (
                    <div className="flex items-center justify-center h-28">
                        <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                        <span className="ml-3 text-white/25 text-sm">Listening for topics...</span>
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="text-center py-10">
                        <div className="w-12 h-12 rounded-full bg-white/3 flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-white/12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <p className="text-white/20 text-sm">No topics yet</p>
                        <p className="text-white/12 text-xs mt-1">Tap "Scan Now" to analyze recent chats</p>
                    </div>
                )}

                {!loading && filtered.map(topic => (
                    <TopicCard
                        key={topic.id}
                        topic={topic}
                        currentUser={currentUser}
                        onRespond={handleRespond}
                    />
                ))}
            </div>
        </div>
    );
};
