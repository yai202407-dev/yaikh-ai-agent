import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownResponseProps {
    content: string;
}

export const MarkdownResponse: React.FC<MarkdownResponseProps> = ({ content }) => {
    return (
        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <div className="rounded-xl overflow-hidden my-4 border border-border/50">
                                <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-border/50">
                                    <span className="text-xs font-mono text-text-muted uppercase">{match[1]}</span>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                                        className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1.5"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copy
                                    </button>
                                </div>
                                <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{
                                        margin: 0,
                                        padding: '1.25rem',
                                        background: 'rgba(15, 23, 42, 0.4)',
                                        fontSize: '0.9rem',
                                    }}
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            </div>
                        ) : (
                            <code className="bg-white/10 px-1.5 py-0.5 rounded-md text-primary font-mono text-[0.9em]" {...props}>
                                {children}
                            </code>
                        );
                    },
                    // Style other elements for premium look
                    p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-primary">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 text-primary/90">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2">{children}</ol>,
                    li: ({ children }) => <li className="text-text-main/90">{children}</li>,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary/40 pl-4 py-1 my-4 italic bg-white/5 rounded-r-lg">
                            {children}
                        </blockquote>
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-6 rounded-xl border border-border/50">
                            <table className="w-full text-left border-collapse">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-white/5 text-text-muted text-sm uppercase">{children}</thead>,
                    th: ({ children }) => <th className="px-4 py-3 font-semibold border-b border-border/50">{children}</th>,
                    td: ({ children }) => <td className="px-4 py-3 border-b border-border/50 text-sm">{children}</td>,
                    hr: () => <hr className="my-8 border-border/50" />,
                    a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-4">
                            {children}
                        </a>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div >
    );
};
