import React, { useState, useEffect } from 'react';

interface ChatLayoutProps {
    headerContent?: React.ReactNode;
    children: React.ReactNode;
    inputContent: React.ReactNode;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
    headerContent,
    children,
    inputContent
}) => {
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState('Yai 2');
    const [userName, setUserName] = useState('Yai Data');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Fetching user info assuming cookie/token might be handling auth implicitly.
                const token = localStorage.getItem('auth_token') || 'YOUR_PROVIDED_TOKEN_HERE';
                const response = await fetch('https://ym.yaikh.com/api/v1/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    // Handle common JSON response patterns
                    if (data && data.name) {
                        setUserName(data.name);
                    } else if (data && data.data && data.data.name) {
                        setUserName(data.data.name);
                    } else if (data && data.user && data.user.name) {
                        setUserName(data.user.name);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user info:", error);
            }
        };
        fetchUser();
    }, []);

    const models = [
        {
            id: 'yai-2', name: 'Yai 2', icon: '#3B82F6', text: 'Website Assistant',
            svgPath: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        },
        {
            id: 'gemini', name: 'Gemini AI', icon: '#8b5cf6', text: 'Google Deepmind',
            // Google Gemini 4-point Sparkle 
            svgPath: <path d="M12 2C12 2 12 8 18 8C12 8 12 14 12 14C12 14 12 8 6 8C12 8 12 2 12 2ZM6 16C6 16 6 18 8 18C6 18 6 20 6 20C6 20 6 18 4 18C6 18 6 16 6 16Z" fill="currentColor" stroke="currentColor" strokeWidth={0.5} strokeLinejoin="round" />
        },
        {
            id: 'claude', name: 'Claude 3.5', icon: '#d97757', text: 'Anthropic',
            // Anthropic Claude Geometric asterisk
            svgPath: <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5z M20 18L21 21L24 22L21 23L20 26L19 23L16 22L19 21z" fill="currentColor" />
        },
        {
            id: 'deepseek', name: 'DeepSeek-V3', icon: '#0ea5e9', text: 'DeepSeek AI',
            // Deepseek intelligent circuit node
            svgPath: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v7M4.929 4.929l4.95 4.95M2 12h7M4.929 19.071l4.95-4.95M12 22v-7M19.071 19.071l-4.95-4.95M22 12h-7M19.071 4.929l-4.95 4.95" /></>
        }
    ];

    const activeModel = models.find(m => m.name === selectedModel) || models[0];

    return (
        <div className="flex h-screen w-full bg-[#010409] text-white relative overflow-hidden font-sans">
            {/* Deep space background layers */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] left-[40%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px]" />

                {/* Random floating stars */}
                <div className="absolute top-[15%] left-[10%] w-[2px] h-[2px] bg-white/60 rounded-full shadow-[0_0_8px_white]" />
                <div className="absolute top-[25%] left-[80%] w-[3px] h-[3px] bg-white/50 rounded-full shadow-[0_0_10px_white]" />
                <div className="absolute top-[65%] left-[15%] w-[2px] h-[2px] bg-white/40 rounded-full" />
                <div className="absolute top-[50%] left-[85%] w-[3px] h-[3px] bg-white/70 rounded-full shadow-[0_0_8px_white]" />
                <div className="absolute top-[85%] left-[30%] w-[2px] h-[2px] bg-white/50 rounded-full shadow-[0_0_6px_white]" />
                <div className="absolute top-[35%] left-[45%] w-[2.5px] h-[2.5px] bg-white/60 rounded-full shadow-[0_0_8px_white]" />
                <div className="absolute top-[10%] left-[55%] w-[1.5px] h-[1.5px] bg-white/30 rounded-full" />
                <div className="absolute top-[75%] left-[70%] w-[2px] h-[2px] bg-white/40 rounded-full" />
            </div>

            <main className="flex-1 flex flex-col z-10 relative max-w-[1400px] mx-auto w-full">
                <header className="pt-8 pb-4 px-10 flex items-start justify-between relative">
                    {/* Left Header Controls */}
                    <div className="flex flex-col gap-6">
                        <button
                            onClick={() => {
                                // If embedded in iframe, try to navigate parent Document
                                if (window.parent && window.parent !== window) {
                                    try {
                                        window.parent.location.href = 'https://ym.yaikh.com/';
                                    } catch (e) {
                                        // Handle cross-origin iframe security restrictions
                                        window.parent.postMessage({ type: 'close-chat-overlay' }, '*');
                                    }
                                } else {
                                    window.location.href = 'https://ym.yaikh.com/';
                                }
                            }}
                            className="text-[13px] font-medium text-white/50 hover:text-white flex items-center gap-2 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                            Back
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#FF6B2C] to-[#E84E0F] flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(255,107,44,0.3)] border border-[#FF8A5B]/20 pointer-events-none">
                                <span className="text-[15px] tracking-tight">{userName.substring(0, 3)}</span>
                            </div>
                            <span className="font-bold text-[17px] tracking-wide text-white/90">{userName}</span>
                        </div>
                    </div>

                    {/* Center Badge Dropdown */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-10 flex flex-col items-center z-50">
                        <div
                            onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                            className="flex items-center gap-2.5 bg-[#0F121A]/80 border border-white/5 rounded-full pl-2 pr-4 py-1.5 backdrop-blur-md shadow-2xl cursor-pointer hover:bg-[#161A25] transition-colors"
                        >
                            <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: activeModel.icon }}>
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {activeModel.svgPath}
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-[12px] text-white leading-none mb-0.5">{activeModel.name}</span>
                                <span className="text-white/40 text-[9px] leading-none uppercase tracking-wider font-semibold">{activeModel.text}</span>
                            </div>
                            <svg className={`w-3.5 h-3.5 text-white/40 ml-1 transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        </div>

                        {/* Dropdown Menu */}
                        {isModelSelectorOpen && (
                            <div className="absolute top-14 w-[320px] bg-[#0F121A]/95 border border-white/10 rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl p-3 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-4 py-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Select AI Model</div>
                                <div className="flex flex-col gap-1.5">
                                    {models.map(model => (
                                        <button
                                            key={model.id}
                                            onClick={() => {
                                                setSelectedModel(model.name);
                                                setIsModelSelectorOpen(false);
                                            }}
                                            className={`flex items-center gap-4 p-4 rounded-2xl transition-all border border-transparent ${selectedModel === model.name ? 'bg-white/10 border-white/5' : 'hover:bg-white/5'}`}
                                        >
                                            <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center shadow-lg shrink-0" style={{ backgroundColor: model.icon }}>
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {model.svgPath}
                                                </svg>
                                            </div>
                                            <div className="flex flex-col items-start truncate text-left flex-1">
                                                <span className="font-bold text-[19px] text-white/90 leading-tight mb-0.5">{model.name}</span>
                                                <span className="text-white/40 text-[11px] leading-tight uppercase tracking-wider font-semibold">{model.text}</span>
                                            </div>
                                            {selectedModel === model.name && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] mr-1"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Header Controls (Optional Settings) */}
                    <div className="flex items-start">
                        {headerContent}
                    </div>
                </header>

                <section className="flex-1 overflow-y-auto p-4 md:px-10 flex flex-col scroll-smooth custom-scrollbar mt-4">
                    {children}
                </section>

                <footer className="px-4 md:px-10 pb-8 pt-2">
                    {inputContent}
                </footer>
            </main>
        </div>
    );
};
