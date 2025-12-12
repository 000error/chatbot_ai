import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Mic, Download } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

const ChatInterface = ({ messages, onSendMessage, isTyping }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (autoScroll) scrollToBottom();
  }, [messages, autoScroll]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom <= 4;
    setAutoScroll(atBottom);
  };

  const jumpToBottom = () => {
    setAutoScroll(true);
    scrollToBottom();
  };

  const handleDownloadImage = async (url) => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const pickName = (ext) => `ai-image-${ts}.${ext || 'png'}`;
    const extFromMime = (mime) => {
      if (!mime) return null;
      if (!mime.startsWith('image/')) return null;
      const raw = mime.split('/')[1];
      if (raw === 'jpeg') return 'jpg';
      return raw || null;
    };
    const extFromUrl = (u) => {
      const m = String(u).match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
      if (!m) return null;
      const ext = m[1].toLowerCase();
      if (['png','jpg','jpeg','webp','gif','bmp'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
      return null;
    };
    const sniffExt = async (blob) => {
      try {
        const ab = await blob.arrayBuffer();
        const u8 = new Uint8Array(ab.slice(0, 12));
        const png = u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4E && u8[3] === 0x47;
        const jpg = u8[0] === 0xFF && u8[1] === 0xD8;
        const riff = u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46;
        if (png) return 'png';
        if (jpg) return 'jpg';
        if (riff) return 'webp';
      } catch {
        return null;
      }
      return null;
    };
    if (String(url).startsWith('data:')) {
      const m = String(url).match(/^data:([^;]+);/);
      const ext = extFromMime(m?.[1]) || 'png';
      const filename = pickName(ext);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const mime = resp.headers.get('content-type') || blob.type || '';
      const extMime = extFromMime(mime);
      const extUrl = extFromUrl(url);
      const extSniff = await sniffExt(blob);
      const ext = extMime || extUrl || extSniff || 'png';
      const filename = pickName(ext);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 max-w-2xl mx-auto relative">
      {/* Messages Area */}
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-scroll p-4 space-y-6 pb-28 messages-scroll">
        <AnimatePresence>
          {messages.map((msg) => (
            <Motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl overflow-hidden border shadow-md ${
                  msg.role === 'user' ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'
                }`}
              >
                <div className="p-4 space-y-3">
                  {Array.isArray(msg.content) ? (
                    msg.content.map((part, idx) => (
                      part?.type === 'image' && part?.url ? (
                        <div key={idx} className="relative">
                          <img
                            src={part.url}
                            alt="image"
                            className="rounded-xl border border-gray-200 w-full max-h-[420px] object-contain bg-gray-50"
                            loading="lazy"
                          />
                          <button
                            onClick={() => handleDownloadImage(part.url)}
                            className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full border border-gray-200 shadow-sm active:scale-95"
                            aria-label="下载原图"
                            title="下载原图"
                          >
                            <Download className="w-4 h-4 text-gray-700" />
                          </button>
                        </div>
                      ) : (
                        <p
                          key={idx}
                          className="text-gray-800 text-sm md:text-base leading-relaxed whitespace-pre-line font-medium"
                        >
                          {String(part?.text ?? part ?? '').trim()}
                        </p>
                      )
                    ))
                  ) : (
                    <p className="text-gray-800 text-sm md:text-base leading-relaxed whitespace-pre-line font-medium">
                      {String(msg.content ?? '').trim()}
                    </p>
                  )}
                </div>
                <div className="px-4 pb-3 text-[11px] text-gray-400 flex justify-between items-center">
                  <span className="font-mono uppercase tracking-widest">
                    {msg.role === 'user' ? 'ME' : msg.modelName?.toUpperCase()}
                  </span>
                  <span className="font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </Motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white p-4 shadow-md rounded-2xl border border-gray-200">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </Motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-6 left-4 right-4">
        {!autoScroll && (
          <button
            onClick={jumpToBottom}
            className="absolute -top-10 right-2 px-3 py-1.5 rounded-full bg-black text-white text-xs shadow-md hover:bg-gray-800 active:scale-95"
          >
            回到底部
          </button>
        )}
        <form 
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-md p-2 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 flex items-center gap-2"
        >
          <button 
            type="button"
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="写下你的想法..."
            className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 font-medium px-2"
          />
          
          {inputValue.trim() ? (
            <button 
              type="submit"
              className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg transform active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
             <button 
              type="button"
              className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
