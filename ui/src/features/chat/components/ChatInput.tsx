import React, { useState } from 'react';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="max-w-[700px] mx-auto w-full">
            <div className="bg-[#12151D]/90 backdrop-blur-md border border-white/5 rounded-full flex items-center p-1.5 pl-3 transition-all duration-300 focus-within:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">

                {/* Left Plus Button */}

                {/* Input Field */}
                <input
                    className="flex-1 bg-transparent border-none text-white/90 text-[14px] px-2 py-3 outline-none placeholder:text-white/30 font-sans"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={"Ask about the website..."}
                    disabled={isLoading}
                    autoFocus
                />

                {/* Right Controls */}
                <div className="flex items-center gap-1 pr-2">
                </div>
            </div>

            <div className="text-center mt-3 mb-2 invisible h-0">
                {/* Reserved for layout spacing below the bar if needed */}
            </div>
        </div>
    );
};
