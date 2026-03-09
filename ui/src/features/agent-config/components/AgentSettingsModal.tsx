import React, { useState, useEffect } from 'react';
import { UserAgentConfig, LLMProvider, RoleProviderConfig, GeminiModel } from '../types';
import { KnowledgeIngestion } from '../../knowledge/components/KnowledgeIngestion';
import { agentConfigService } from '../services/agent-config.service';
import { useUserIdentity } from '../../chat/hooks/useUserIdentity';

interface AgentSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: UserAgentConfig | null;
    availableModels: GeminiModel[];
    onSave: (config: Partial<UserAgentConfig>) => Promise<any>;
}

type SettingsSection = 'agent' | 'knowledge' | 'system';
type AgentSubTab = 'main' | 'intent' | 'voice';
type KnowledgeSubTab = 'pdf' | 'image' | 'ingest';

export const AgentSettingsModal: React.FC<AgentSettingsModalProps> = ({
    isOpen,
    onClose,
    config,
    availableModels,
    onSave
}) => {
    const [formData, setFormData] = useState<Partial<UserAgentConfig>>({});
    const [activeSection, setActiveSection] = useState<SettingsSection>('agent');
    const [agentTab, setAgentTab] = useState<AgentSubTab>('main');
    const [knowledgeTab, setKnowledgeTab] = useState<KnowledgeSubTab>('ingest');
    const [isSaving, setIsSaving] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [systemStatus, setSystemStatus] = useState<string | null>(null);
    const { userId: activeUserId, setUserId } = useUserIdentity();
    const [userIdInput, setUserIdInput] = useState<string>(activeUserId);

    useEffect(() => {
        if (config) {
            setFormData(config);
        }
    }, [config]);

    if (!isOpen) return null;

    const handleRoleChange = (role: keyof UserAgentConfig['roles'], field: keyof RoleProviderConfig, value: any) => {
        setFormData(prev => {
            const currentRoles = (prev.roles || { mainGenerator: {} as any, intentClassifier: {} as any }) as any;
            const currentRole = currentRoles[role] || {
                provider: LLMProvider.GEMINI,
                model: availableModels.length > 0 ? availableModels[0].name : '',
                apiKey: '',
                temperature: 0.7,
                maxTokens: 2048
            };

            return {
                ...prev,
                roles: {
                    ...currentRoles,
                    [role]: {
                        ...currentRole,
                        [field]: value
                    }
                }
            };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Save failed', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearCache = async () => {
        setIsClearingCache(true);
        try {
            await agentConfigService.clearCache();
            setSystemStatus('Successfully cleared model discovery cache!');
            setTimeout(() => setSystemStatus(null), 3000);
        } catch (e: any) {
            setSystemStatus(`Error: ${e.message}`);
        } finally {
            setIsClearingCache(false);
        }
    };

    const renderRoleSettings = (role: keyof UserAgentConfig['roles']) => {
        const roleData = formData.roles?.[role];

        if (!roleData) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-in fade-in duration-500 bg-white/5 rounded-3xl border border-dashed border-border/40 m-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-text-muted">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium">Not Optimized</h3>
                        <p className="text-text-muted text-sm max-w-xs mx-auto mt-1">Configure this role to give your agent specialized instructions and capabilities.</p>
                    </div>
                    <button
                        onClick={() => handleRoleChange(role, 'provider' as any, LLMProvider.GEMINI)}
                        className="px-6 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all font-medium"
                    >
                        Configure Role
                    </button>
                </div>
            );
        }

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 p-2">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted px-1">Provider</label>
                        <select
                            value={roleData.provider}
                            onChange={(e) => handleRoleChange(role, 'provider', e.target.value)}
                            className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors cursor-pointer"
                        >
                            {Object.values(LLMProvider).map(p => (
                                <option key={p} value={p} className="bg-bg-dark">{p}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted px-1">Model</label>
                        <select
                            value={roleData.model}
                            onChange={(e) => handleRoleChange(role, 'model', e.target.value)}
                            className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors cursor-pointer"
                        >
                            {roleData.provider === LLMProvider.GEMINI ? (
                                availableModels.map(m => (
                                    <option key={m.name} value={m.name} className="bg-bg-dark">{m.displayName}</option>
                                ))
                            ) : (
                                <option value={roleData.model} className="bg-bg-dark">{roleData.model}</option>
                            )}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-text-muted px-1">API Key</label>
                    <input
                        type="password"
                        placeholder="••••••••••••••••"
                        value={roleData.apiKey}
                        onChange={(e) => handleRoleChange(role, 'apiKey', e.target.value)}
                        className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors"
                    />
                    <p className="text-[10px] text-text-muted px-1 italic">Keys are encrypted before being stored securely on the server.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted px-1 flex justify-between">
                            <span>Temperature</span>
                            <span className="text-primary font-bold">{roleData.temperature}</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={roleData.temperature}
                            onChange={(e) => handleRoleChange(role, 'temperature', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted px-1">Max Tokens</label>
                        <input
                            type="number"
                            value={roleData.maxTokens}
                            onChange={(e) => handleRoleChange(role, 'maxTokens', parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors"
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-bg-card w-full max-w-4xl h-[700px] rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex animate-in zoom-in-95 duration-300">
                {/* 1. Sidebar */}
                <div className="w-64 border-r border-border bg-white/5 flex flex-col">
                    <div className="p-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span className="font-bold text-xl tracking-tight">Settings</span>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 space-y-2">
                        <button
                            onClick={() => setActiveSection('agent')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeSection === 'agent' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-white/5 hover:text-text'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium">Agent Config</span>
                        </button>

                        <button
                            onClick={() => setActiveSection('knowledge')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeSection === 'knowledge' ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'text-text-muted hover:bg-white/5 hover:text-text'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="font-medium">Knowledge Base</span>
                        </button>

                        <button
                            onClick={() => setActiveSection('system')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeSection === 'system' ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/5 hover:text-text'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                            <span className="font-medium">System Settings</span>
                        </button>
                    </nav>

                    <div className="p-6">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-3 rounded-2xl border border-border text-text-muted hover:bg-white/5 transition-all text-sm font-medium"
                        >
                            Discard
                        </button>
                    </div>
                </div>

                {/* 2. Content Area */}
                <div className="flex-1 flex flex-col">
                    <div className="p-8 border-b border-border flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                                {activeSection === 'agent' && 'Agent Intelligence'}
                                {activeSection === 'knowledge' && 'Knowledge Ecosystem'}
                                {activeSection === 'system' && 'Kernel Operations'}
                            </h2>
                            <p className="text-text-muted text-sm mt-1">
                                {activeSection === 'agent' && 'Optimize model parameters for your assistant.'}
                                {activeSection === 'knowledge' && 'Manage how your agent learns and transcribes data.'}
                                {activeSection === 'system' && 'Core utilities for maintaining system stability.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {/* Agent Section Tabs */}
                        {activeSection === 'agent' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex p-1 bg-white/5 rounded-2xl w-fit">
                                    {[
                                        { id: 'main', label: 'Main Generator' },
                                        { id: 'intent', label: 'Intent Classifier' },
                                        { id: 'voice', label: 'Voice Processor' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setAgentTab(tab.id as any)}
                                            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${agentTab === tab.id ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                <div>
                                    {agentTab === 'main' && renderRoleSettings('mainGenerator')}
                                    {agentTab === 'intent' && renderRoleSettings('intentClassifier')}
                                    {agentTab === 'voice' && renderRoleSettings('voiceTranscriber' as any)}
                                </div>
                            </div>
                        )}

                        {/* Knowledge Section Tabs */}
                        {activeSection === 'knowledge' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex p-1 bg-white/5 rounded-2xl w-fit">
                                    {[
                                        { id: 'ingest', label: 'Content Ingestion' },
                                        { id: 'pdf', label: 'PDF OCR' },
                                        { id: 'image', label: 'Image VLM' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setKnowledgeTab(tab.id as any)}
                                            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${knowledgeTab === tab.id ? 'bg-secondary text-white shadow-md' : 'text-text-muted hover:text-text'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                <div>
                                    {knowledgeTab === 'ingest' && <KnowledgeIngestion userId={formData.userId} />}
                                    {knowledgeTab === 'pdf' && renderRoleSettings('pdfTranscriber' as any)}
                                    {knowledgeTab === 'image' && renderRoleSettings('imageTranscriber' as any)}
                                </div>
                            </div>
                        )}

                        {/* System Section */}
                        {activeSection === 'system' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-lg">

                                {/* --- User Profile Card --- */}
                                <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">Active User Identity</h3>
                                            <p className="text-sm text-text-muted mt-2 leading-relaxed">
                                                Set the userId used for all chat, memory, and conversation API calls. Changing this switches your entire context — conversations, permissions, and greeting.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-text-muted px-1">User ID</label>
                                        <div className="flex gap-2">
                                            <input
                                                id="user-id-input"
                                                type="text"
                                                value={userIdInput}
                                                onChange={(e) => setUserIdInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        setUserId(userIdInput);
                                                        setSystemStatus(`✅ Active user switched to "${userIdInput.trim() || 'admin'}"`);
                                                        setTimeout(() => setSystemStatus(null), 3000);
                                                    }
                                                }}
                                                placeholder="e.g. admin, default-user, john"
                                                className="flex-1 bg-white/5 border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors font-mono text-sm"
                                            />
                                            <button
                                                id="apply-user-id-btn"
                                                onClick={() => {
                                                    setUserId(userIdInput);
                                                    setSystemStatus(`✅ Active user switched to "${userIdInput.trim() || 'admin'}"`);
                                                    setTimeout(() => setSystemStatus(null), 3000);
                                                }}
                                                className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/80 transition-all text-sm"
                                            >
                                                Apply
                                            </button>
                                        </div>

                                        {/* Quick Presets */}
                                        <div className="flex items-center gap-2 flex-wrap pt-1">
                                            <span className="text-xs text-text-muted">Quick switch:</span>
                                            {['admin', 'default-user'].map((preset) => (
                                                <button
                                                    key={preset}
                                                    id={`preset-user-${preset}`}
                                                    onClick={() => {
                                                        setUserIdInput(preset);
                                                        setUserId(preset);
                                                        setSystemStatus(`✅ Active user switched to "${preset}"`);
                                                        setTimeout(() => setSystemStatus(null), 3000);
                                                    }}
                                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${activeUserId === preset
                                                            ? 'border-primary bg-primary/10 text-primary'
                                                            : 'border-border text-text-muted hover:border-primary/50 hover:text-white'
                                                        }`}
                                                >
                                                    {preset}
                                                    {activeUserId === preset && <span className="ml-1.5 text-[10px]">● active</span>}
                                                </button>
                                            ))}
                                        </div>

                                        <p className="text-[11px] text-text-muted px-1 italic">
                                            Currently active: <span className="font-mono text-primary font-bold">{activeUserId}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* --- Model Discovery Cache Card --- */}
                                <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">Model Discovery Cache</h3>
                                            <p className="text-sm text-text-muted mt-2 leading-relaxed">
                                                The system periodically scans Google &amp; OpenAI for new models and capabilities. Clearing this cache forces an immediate refresh of available model metadata.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            onClick={handleClearCache}
                                            disabled={isClearingCache}
                                            className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {isClearingCache ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Re-indexing Providers...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    Flush &amp; Sync Models
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {systemStatus && (
                                        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-2 duration-300 ${systemStatus.startsWith('Error') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                                            }`}>
                                            {systemStatus}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-primary animate-pulse' : 'bg-green-500'}`}></div>
                            <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">
                                {isSaving ? 'Syncing...' : 'System Ready'}
                            </span>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-10 py-3.5 rounded-2xl bg-primary hover:primary-hover text-white transition-all font-bold shadow-xl shadow-primary/30 disabled:opacity-50 flex items-center gap-3"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Applying Changes...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                    </svg>
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

