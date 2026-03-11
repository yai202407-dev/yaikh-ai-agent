import React from 'react';

interface NotebookSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onToolClick?: (toolName: string) => void;
}

export const NotebookSidebar: React.FC<NotebookSidebarProps> = ({ isOpen, onClose, onToolClick }) => {
    if (!isOpen) return null;

    const primaryTools = [
        { name: 'Infograp...', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { name: 'Flashcards', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
        { name: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { name: 'Data Table', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
        { name: 'Quiz', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
    ];

    const advancedTools = [
        { name: 'Slide Deck', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' }, 
        { name: 'Audio...', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
        { name: 'Video...', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
        { name: 'Mind Map', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
    ];

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = React.useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Assume the API is accessible via standard routing setup
            // This maps to the /api/agent/upload-source endpoint in Express
            const response = await fetch('/api/agent/upload-source', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            
            // Pass the extracted content straight into the Chat
            if (onToolClick && data.content) {
                // Formatting it as a system-like context injection
                onToolClick(`[WORKSPACE SYSTEM EVENT: User has successfully uploaded source file "${file.name}"]\n\nExtracted Source Data:\n${data.content}`);
            }

        } catch (error) {
            console.error("File upload error", error);
            alert("Failed to process workspace source file.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-80 border-l border-white/5 bg-[#010409] flex flex-col h-full shadow-2xl relative z-20 flex-shrink-0 transition-transform duration-300">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0d1117]">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    <h2 className="text-sm font-bold text-white tracking-wide">Data Workspace</h2>
                </div>
                <button onClick={onClose} className="text-white/50 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-transparent to-black/30">
                
                {/* Source Upload Panel */}
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Pinned Sources</h3>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange} 
                />
                <div 
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`border border-dashed border-white/20 rounded-xl p-6 text-center hover:border-orange-500/50 hover:bg-orange-500/5 transition-all mb-8 relative group ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <div className="absolute inset-0 bg-orange-400/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                    {isUploading ? (
                        <>
                            <svg className="w-8 h-8 text-orange-400 mx-auto mb-3 animate-spin" fill="none" viewBox="0 0 24 24">
<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-sm text-orange-400 font-medium">Ingesting to Cloud...</p>
                        </>
                    ) : (
                        <>
                            <svg className="w-8 h-8 text-white/20 group-hover:text-orange-400/80 transition-colors mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <p className="text-sm text-white/70 font-medium">Drop files to add sources</p>
                            <p className="text-xs text-white/30 mt-1">Files, images, or audio</p>
                        </>
                    )}
                </div>

                {/* AI Generator Tools */}
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">AI Tools</h3>
                
                <div className="flex flex-col gap-2">
                    {primaryTools.map((tool) => (
                        <button 
                            key={tool.name} 
                            onClick={() => onToolClick?.(tool.name)}
                            className="flex items-center gap-3 bg-[#1C2128]/80 hover:bg-[#22272E] border border-white/5 rounded-xl px-4 py-3.5 transition-all hover:border-orange-500/30 hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] group overflow-hidden relative text-left"
                        >
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            <svg className="w-5 h-5 text-white/50 group-hover:text-orange-400 transition-colors drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tool.icon} /></svg>
                            <span className="text-[13px] font-medium text-white/60 group-hover:text-white/90">{tool.name}</span>
                        </button>
                    ))}
                    
                    <div className="h-4"></div> {/* Space separator */}
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-[1px] bg-white/10 flex-1"></div>
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Advanced / Limited</span>
                        <div className="h-[1px] bg-white/10 flex-1"></div>
                    </div>

                    {advancedTools.map((tool) => (
                        <button 
                            key={tool.name} 
                            onClick={() => onToolClick?.(tool.name)}
                            className="flex items-center gap-3 bg-[#1C2128]/40 hover:bg-[#22272E] border border-white/5 rounded-xl px-4 py-3.5 transition-all hover:border-orange-500/30 hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] group overflow-hidden relative text-left"
                        >
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            <svg className="w-5 h-5 text-white/30 group-hover:text-orange-400 transition-colors drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tool.icon} /></svg>
                            <span className="text-[13px] font-medium text-white/40 group-hover:text-white/90">{tool.name}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-8 pt-4 border-t border-white/5">
                    <p className="text-[10px] text-center text-white/30 italic">Select sources first to use a generator.</p>
                </div>

            </div>
        </div>
    );
};
