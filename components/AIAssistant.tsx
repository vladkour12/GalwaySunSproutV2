
import React, { useState, useRef, useEffect } from 'react';
import { generateAIResponse } from '../services/geminiService';
import { AppState } from '../types';
import { Send, Sparkles, User, Sprout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAssistantProps {
  state: AppState;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ state }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello Chef! I'm Sprout, your microgreens consultant. How can I help optimize your 2x2m shed today?",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await generateAIResponse(userMessage.text, state);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
         id: (Date.now() + 1).toString(),
         sender: 'ai',
         text: "I encountered a glitch in the roots. Please try again.",
         timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-ocean-primary rounded-3xl shadow-sm border border-ocean-contrast overflow-hidden relative">
      {/* Header */}
      <div className="bg-ocean-primary/90 backdrop-blur-sm border-b border-ocean-contrast p-4 flex items-center justify-center absolute top-0 left-0 right-0 z-10">
         <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-ocean-light uppercase tracking-widest mb-0.5">Consultant</span>
            <div className="flex items-center space-x-1.5">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ocean-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-ocean-accent"></span>
               </span>
               <h3 className="font-bold text-white">Sprout AI</h3>
            </div>
         </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto pt-20 pb-4 px-4 space-y-6 bg-gradient-to-b from-ocean-dark to-ocean-primary">
        <AnimatePresence>
        {messages.map((msg) => (
          <motion.div 
            key={msg.id} 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'} items-end space-x-2`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.sender === 'user' ? 'bg-ocean-accent' : 'bg-ocean-primary/60 border border-ocean-secondary'}`}>
                {msg.sender === 'user' ? <User className="w-4 h-4 text-white" /> : <Sprout className="w-4 h-4 text-ocean-light" />}
               </div>
               
               <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
                 msg.sender === 'user' 
                   ? 'bg-ocean-accent text-white rounded-br-none' 
                   : 'bg-ocean-primary text-white border border-ocean-contrast rounded-bl-none'
               }`}>
                 <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
                 <span className={`text-[10px] block mt-2 opacity-60 ${msg.sender === 'user' ? 'text-white' : 'text-ocean-light'}`}>
                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
               </div>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
             <div className="flex items-center space-x-2 bg-ocean-primary border border-ocean-contrast px-4 py-3 rounded-2xl rounded-bl-none shadow-sm ml-10">
               <div className="w-1.5 h-1.5 bg-ocean-light rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
               <div className="w-1.5 h-1.5 bg-ocean-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
               <div className="w-1.5 h-1.5 bg-ocean-contrast rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-ocean-primary border-t border-ocean-contrast">
        <div className="flex items-center space-x-2 bg-ocean-dark p-2 rounded-2xl border border-ocean-contrast focus-within:ring-2 focus-within:ring-ocean-accent transition-shadow">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about planting schedules..."
            className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder:text-ocean-light font-medium p-2"
            disabled={isLoading}
          />
          <motion.button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-ocean-accent hover:bg-ocean-accent/90 disabled:bg-ocean-contrast text-white p-3 rounded-xl transition-all shadow-md"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
