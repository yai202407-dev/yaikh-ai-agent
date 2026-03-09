import React, { useState, useRef } from 'react';
import { knowledgeService } from '../services/knowledge.service';

interface KnowledgeIngestionProps {
    userId?: string;
}

export const KnowledgeIngestion: React.FC<KnowledgeIngestionProps> = ({ userId }) => {

    const [content, setContent] = useState('');
    const [filename, setFilename] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [folder, setFolder] = useState('general');
    const [isIngesting, setIsIngesting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFilename(file.name);
        setSelectedFile(file);

        if (file.type === 'application/pdf') {
            setContent('(PDF file selected for upload)');
            return;
        }

        if (file.type.startsWith('image/')) {
            setContent('(Image selected for VLM transcription)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setContent(text);
        };
        reader.readAsText(file);
    };

    const handleIngest = async () => {
        if (!content.trim() && !selectedFile) {
            setStatus({ type: 'error', message: 'Please provide content or select a file to ingest.' });
            return;
        }

        setIsIngesting(true);
        setStatus(null);

        try {
            const metadata = {
                filename: filename || (selectedFile ? selectedFile.name : 'manual-entry.txt'),
                folder,
                source: 'web-ui'
            };

            if (selectedFile && selectedFile.type === 'application/pdf') {
                await knowledgeService.uploadPDF(selectedFile, metadata, userId);
            } else if (selectedFile && selectedFile.type.startsWith('image/')) {
                await knowledgeService.uploadImage(selectedFile, metadata, userId);
            } else {
                await knowledgeService.ingestDocument(content, metadata, userId);
            }

            setStatus({ type: 'success', message: 'Knowledge ingested successfully and added to agent memory!' });
            setContent('');
            setFilename('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Failed to ingest document' });
        } finally {
            setIsIngesting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h4 className="font-semibold text-primary">Expand Agent Knowledge</h4>
                    <p className="text-sm text-text-muted mt-1">
                        Upload documents or paste content here. The agent will use this information to provide more accurate and context-aware responses.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-text-muted">Target Folder/Category</label>
                    <input
                        type="text"
                        value={folder}
                        onChange={(e) => setFolder(e.target.value)}
                        placeholder="e.g. policies, help-desk, features"
                        className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-text-muted">Document Name</label>
                    <input
                        type="text"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        placeholder="Title of the document"
                        className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-text-muted">Content</label>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload Document
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".txt,.md,.json,.pdf,image/*"
                        className="hidden"
                    />
                </div>
                {selectedFile && selectedFile.type.startsWith('image/') ? (
                    <div className="w-full bg-white/5 border border-border rounded-xl p-4 flex flex-col items-center gap-4">
                        <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="Preview"
                            className="max-h-64 rounded-lg object-contain border border-primary/20"
                        />
                        <p className="text-xs text-primary font-medium">Image selected. VLM will extract text during ingestion.</p>
                        <button
                            onClick={() => {
                                setSelectedFile(null);
                                setFilename('');
                                setContent('');
                            }}
                            className="text-xs text-red-500 hover:underline"
                        >
                            Remove Image
                        </button>
                    </div>
                ) : (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Paste document content here..."
                        rows={8}
                        className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors resize-none custom-scrollbar"
                    />
                )}
            </div>

            {status && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in zoom-in-95 duration-200 ${status.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                    {status.type === 'success' ? (
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    <span className="text-sm font-medium">{status.message}</span>
                </div>
            )}

            <button
                onClick={handleIngest}
                disabled={isIngesting || !content.trim()}
                className="w-full py-3 rounded-xl bg-primary hover:primary-hover text-white transition-all font-bold shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isIngesting ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Ingesting Knowledge...
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add to Knowledge Base
                    </>
                )}
            </button>
        </div>
    );
};
