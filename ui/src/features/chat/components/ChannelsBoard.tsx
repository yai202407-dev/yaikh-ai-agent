/**
 * ChannelsBoard.tsx
 *
 * Phase 3: The "Chat Manager" intelligence board.
 * Shows trending organizational topics in real-time from Firestore.
 * Management/HR can post official responses to close a topic.
 */

import React, { useState } from 'react';
import { useTopicFeed, LiveTopic } from '../hooks/useTopicFeed';
import type { DmUser } from '../hooks/useDmChat';

interface ChannelsBoardProps {
    currentUser: DmUser | null;
    onTriggerScan: () => void;
    isScanning: boolean;
}

const URGENCY_CONFIG = {
    critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'CRITICAL', ring: 'rgba(239,68,68,0.4)' },
    high:     { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'HIGH',     ring: 'rgba(249,115,22,0.3)' },
    medium:   { color: '#EAB308', bg: 'rgba(234,179,8,0.1)',  label: 'MED',      ring: 'rgba(234,179,8,0.25)' },
    low:      { color: '#22C55E', bg: 'rgba(34,197,94,0.08)', label: 'LOW',      ring: 'rgba(34,197,94,0.2)' },
};

function HeatBar({ score }: { score: number }) {
    const pct = Math.min(100, Math.max(0, score));
    const color = pct >= 80 ? '#EF4444' : pct >= 60 ? '#F97316' : pct >= 40 ? '#EAB308' : '#22C55E';
    return (
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
            />
        </div>
    );
}

function TopicCard({
    topic,
    currentUser,
    onRespond,
}: {
    topic: LiveTopic;
    currentUser: DmUser | null;
    onRespond: (topicId: string, response: string, by: string) => void;
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
            style={!isResolved ? { boxShadow: `0 0 20px ${uc.ring}` } : undefined}
        >
            {/* Header row */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3 flex items-start gap-3 text-left"
            >
                {/* Heat circle */}
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-[13px]"
                    style={{ background: uc.bg, color: uc.color, border: `1.5px solid ${uc.color}44` }}
                >
                    {topic.heatScore}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm">{topic.topic}</span>
                        <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-widest"
                            style={{ background: uc.bg, color: uc.color }}
                        >
                            {uc.label}
                        </span>
                        {isResolved && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">
                                ✓ RESOLVED
                            </span>
                        )}
                    </div>
                    <p className="text-white/45 text-xs mt-0.5 leading-snug line-clamp-2">{topic.summary}</p>
                    <HeatBar score={topic.heatScore} />
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-white/40">{topic.mentioningUserCount} users</span>
                    <svg
                        className={`w-3.5 h-3.5 text-white/25 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Expanded details */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                    {/* Departments */}
                    {topic.departments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {topic.departments.map(d => (
                                <span key={d} className="text-[11px] px-2 py-0.5 rounded-full bg-[#FF6B2C]/10 text-[#FF6B2C] border border-[#FF6B2C]/20">
                                    {d}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Sample questions */}
                    {topic.sampleQuestions.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">Employees are asking:</p>
                            {topic.sampleQuestions.map((q, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className="text-[#FF6B2C] text-xs mt-0.5 shrink-0">›</span>
                                    <p className="text-white/60 text-xs italic">"{q}"</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Suggested responder */}
                    <div className="flex items-center gap-2 text-xs">
                        <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-white/35">Suggested: </span>
                        <span className="text-[#FF6B2C] font-medium">{topic.suggestedResponder}</span>
                    </div>

                    {/* Official response (if resolved) */}
                    {isResolved && topic.officialResponse && (
                        <div className="bg-green-500/8 border border-green-500/20 rounded-lg p-3">
                            <p className="text-[10px] text-green-400 uppercase tracking-widest mb-1 font-bold">
                                Official Response — {topic.respondedBy}
                            </p>
                            <p className="text-white/70 text-xs leading-relaxed">{topic.officialResponse}</p>
                        </div>
                    )}

                    {/* Respond button */}
                    {!isResolved && currentUser && (
                        <div>
                            {!showRespondBox ? (
                                <button
                                    onClick={() => setShowRespondBox(true)}
                                    className="text-xs px-3 py-1.5 bg-[#FF6B2C]/10 hover:bg-[#FF6B2C]/20 text-[#FF6B2C] border border-[#FF6B2C]/30 rounded-lg transition-all font-medium"
                                >
                                    Post Official Response
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <textarea
                                        value={responseText}
                                        onChange={e => setResponseText(e.target.value)}
                                        placeholder="Type the official company response or announcement..."
                                        rows={3}
                                        className="w-full bg-[#1C2128] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/20 outline-none focus:border-[#FF6B2C]/40 resize-none transition-colors"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleRespond}
                                            disabled={submitting || !responseText.trim()}
                                            className="text-xs px-4 py-1.5 bg-[#FF6B2C] hover:bg-[#E84E0F] disabled:opacity-40 text-white rounded-lg transition-all font-semibold"
                                        >
                                            {submitting ? 'Posting...' : 'Publish & Resolve'}
                                        </button>
                                        <button
                                            onClick={() => setShowRespondBox(false)}
                                            className="text-xs px-3 py-1.5 text-white/40 hover:text-white/70 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export const ChannelsBoard: React.FC<ChannelsBoardProps> = ({ currentUser, onTriggerScan, isScanning }) => {
    const { topics, loading } = useTopicFeed();
    const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

    const handleRespond = async (topicId: string, response: string, by: string) => {
        try {
            await fetch(`/api/manager/topics/${topicId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response, respondedBy: by }),
            });
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

    return (
        <div className="flex flex-col h-full">
            {/* Board header */}
            <div className="px-4 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#FF6B2C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            Trending Now
                            {activeCount > 0 && (
                                <span className="bg-[#FF6B2C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeCount}</span>
                            )}
                        </h3>
                        <p className="text-white/30 text-[11px] mt-0.5">AI-detected topics from employee chats</p>
                    </div>
                    <button
                        onClick={onTriggerScan}
                        disabled={isScanning}
                        title="Trigger AI scan of recent messages"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C2128] hover:bg-[#22272E] border border-white/8 hover:border-[#FF6B2C]/30 text-white/50 hover:text-[#FF6B2C] text-xs font-medium rounded-lg transition-all disabled:opacity-40"
                    >
                        <svg className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isScanning ? 'Scanning...' : 'Scan Now'}
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1">
                    {(['all', 'active', 'resolved'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`text-[11px] px-3 py-1 rounded-lg font-medium capitalize transition-all ${
                                filter === f
                                    ? 'bg-[#FF6B2C]/15 text-[#FF6B2C] border border-[#FF6B2C]/30'
                                    : 'text-white/35 hover:text-white/60'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Topic list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-2.5">
                {loading && (
                    <div className="flex items-center justify-center h-32">
                        <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                        <span className="ml-3 text-white/30 text-sm">Loading topics...</span>
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <p className="text-white/25 text-sm">No topics yet</p>
                        <p className="text-white/15 text-xs mt-1">Tap "Scan Now" to analyze recent chats</p>
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
