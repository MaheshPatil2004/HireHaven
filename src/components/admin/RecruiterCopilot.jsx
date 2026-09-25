import React, { useState, useRef, useEffect } from 'react';
import { Send, PlusCircle, Bot } from 'lucide-react';

const RecruiterCopilot = ({ messages, onSendMessage, isTyping, onNewChat }) => {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);

    // Auto-scroll to the newest message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = () => {
        if (input.trim() === "") return;
        onSendMessage(input);
        setInput("");
    };

    return (
        <div className="flex flex-col h-[700px] bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-purple-50 rounded-t-lg">
                <div className="flex items-center gap-2 text-purple-800 font-semibold">
                    <Bot className="w-5 h-5" />
                    <h2>Recruiter Copilot</h2>
                </div>
                <button 
                    onClick={onNewChat}
                    className="text-purple-600 hover:text-purple-800 flex items-center gap-1 text-xs font-bold transition-colors bg-purple-100 px-3 py-1.5 rounded-full"
                >
                    <PlusCircle className="w-3.5 h-3.5" /> New Chat
                </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 text-sm mt-10 flex flex-col items-center gap-2">
                        <Bot className="w-8 h-8 text-gray-300" />
                        <p>Start chatting to filter, rank, and evaluate candidates.</p>
                    </div>
                )}
                
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-purple-600 text-white rounded-br-none shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="max-w-[85%] p-3 rounded-lg bg-white border border-gray-200 text-gray-500 rounded-bl-none shadow-sm flex items-center gap-2 text-sm">
                            <Bot className="w-4 h-4 animate-pulse text-purple-600" /> AI is reviewing resumes...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-gray-200 bg-white rounded-b-lg flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="e.g., 'Filter out candidates without Docker'"
                    className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-gray-50"
                    disabled={isTyping}
                />
                <button 
                    onClick={handleSend}
                    disabled={isTyping || !input.trim()}
                    className="bg-purple-600 text-white p-2.5 rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default RecruiterCopilot;