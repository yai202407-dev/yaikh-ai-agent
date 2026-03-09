import React, { useRef, useEffect, useState } from 'react';
import { Message } from '../types';
import { MarkdownResponse } from './MarkdownResponse';
import { chatService } from '../services/chat.service';

interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [feedbackSent, setFeedbackSent] = useState<Record<number, boolean>>({});

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const [userName, setUserName] = useState<string>('');

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem('auth_token') || 'YOUR_PROVIDED_TOKEN_HERE';
                const response = await fetch('https://ym.yaikh.com/api/v1/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.name) {
                        setUserName(data.name);
                    } else if (data && data.data && data.data.name) {
                        setUserName(data.data.name);
                    } else if (data && data.user && data.user.name) {
                        setUserName(data.user.name);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user init name:", error);
            }
        };
        fetchUser();
    }, []);

    const handleFeedback = async (index: number, isCorrect: boolean) => {
        if (feedbackSent[index]) return;

        const aiMsg = messages[index];
        const userMsg = messages[index - 1];

        try {
            await chatService.sendFeedback({
                prompt: userMsg?.content || "No context",
                response: aiMsg.content,
                isCorrect,
                agentRole: 'general'
            });
            setFeedbackSent(prev => ({ ...prev, [index]: true }));
        } catch (error) {
            console.error('Failed to send feedback:', error);
        }
    };

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[650px] mx-auto mt-[8vh]">
                <div className="text-center mb-10 text-white font-sans">
                    <p className="text-white/60 text-[13px] mb-2 font-medium">{userName ? `Hi ${userName}` : 'Hi there'}</p>
                    <h2 className="text-[34px] font-bold text-white tracking-tight leading-none drop-shadow-md">Where should we start?</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-10">
            {messages.map((msg, index) => (
                <div
                    key={index}
                    className={`flex flex-col animate-fade-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                    <div className={`group relative max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                        <div className={`p-4 md:p-5 rounded-3xl shadow-xl transition-all duration-300 ${msg.role === 'user'
                            ? 'bg-[#2A2D3A] text-white/90 rounded-tr-[4px] border border-white/5'
                            : 'bg-transparent text-white/90 rounded-tl-sm'
                            }`}>
                            {msg.role === 'assistant' ? (
                                <MarkdownResponse content={msg.content} />
                            ) : (
                                <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</div>
                            )}
                        </div>

                        <div className={`absolute -bottom-6 flex items-center gap-3 text-[11px] text-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${msg.role === 'user' ? 'right-2' : 'left-2'}`}>
                            <span>{msg.timestamp}</span>
                            {msg.role === 'assistant' && !feedbackSent[index] && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleFeedback(index, true)}
                                        className="hover:text-green-400 transition-colors flex items-center gap-1"
                                        title="Correct/Helpful"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleFeedback(index, false)}
                                        className="hover:text-red-400 transition-colors flex items-center gap-1"
                                        title="Incorrect/Unhelpful"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.737 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-6h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                            {feedbackSent[index] && <span className="text-green-500/80 scale-90">Feedback recorded</span>}
                        </div>
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="max-w-[80%] flex flex-col self-start animate-fade-in mt-4">
                    <div className="flex gap-1.5 p-2 items-center text-white/50 text-sm">
                        <div className="w-[5px] h-[5px] bg-white/40 rounded-full animate-bounce-custom"></div>
                        <div className="w-[5px] h-[5px] bg-white/40 rounded-full animate-bounce-custom [animation-delay:0.2s]"></div>
                        <div className="w-[5px] h-[5px] bg-white/40 rounded-full animate-bounce-custom [animation-delay:0.4s]"></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};
