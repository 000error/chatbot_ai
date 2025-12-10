import React, { useState, useEffect } from 'react';
import { Menu, ChevronDown, Sparkles, Settings } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import ModelSelector from './components/ModelSelector';
import ConfigModal from './components/ConfigModal';
import { sendMessageToApi } from './services/api';

const MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', description: '最新最强，全能表现', color: 'bg-purple-100', icon: '🧠' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5', description: '快速经济，日常对话', color: 'bg-green-100', icon: '⚡' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: '文采斐然，情感细腻', color: 'bg-orange-100', icon: '🎨' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5', description: '超长上下文，多模态', color: 'bg-blue-100', icon: '✨' },
  { id: 'GPT-5.1-Chat', name: 'GPT-5.1-Chat', description: '超前体验，高智对话', color: 'bg-pink-100', icon: '💬' },
  { id: 'GPT-5.1', name: 'GPT-5.1', description: '新一代对话模型', color: 'bg-pink-100', icon: '💬' },
  { id: 'Qwen/QwQ-32B', name: 'QwQ 32B', description: '国产之光，深度思考', color: 'bg-red-100', icon: '🐲' },
  { id: 'Claude-Opus-4.1', name: 'Claude-Opus-4.1', description: '高阶推理，企业接入', color: 'bg-yellow-100', icon: '🧩' },
  { id: 'Deepseek', name: 'Deepseek', description: '高效推理与知识检索', color: 'bg-gray-100', icon: '🔎' },
  // Google (ModelGate page lists)
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', description: 'Google旗舰，超长上下文多模态', color: 'bg-blue-100', icon: '✨' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: '高性价比，快速推理', color: 'bg-blue-100', icon: '⚡' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: '高级推理与工具调用', color: 'bg-blue-100', icon: '🔧' },
  // Anthropic
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', description: '强推理与写作能力', color: 'bg-orange-100', icon: '🎼' },
  // X (xAI)
  { id: 'grok-2', name: 'Grok 2', description: 'X AI 新一代模型', color: 'bg-slate-100', icon: '🛰️' },
  { id: 'grok-1.5', name: 'Grok 1.5', description: 'X AI 推理与对话', color: 'bg-slate-100', icon: '🛰️' },
  { id: 'grok-4', name: 'Grok-4', description: 'X AI 最新一代模型', color: 'bg-slate-100', icon: '🛰️' },
  { id: 'Claude-Haiku-4.5', name: 'Claude-Haiku-4.5', description: '轻量快速写作与推理', color: 'bg-orange-100', icon: '📝' },
  { id: 'Claude-Sonnet-4.5', name: 'Claude-Sonnet-4.5', description: '综合能力与稳定输出', color: 'bg-orange-100', icon: '🎼' },
  { id: 'google/nano-banana-pro', name: 'Nano Banana Pro', description: '图像生成，1024x1024，Base64输出', color: 'bg-blue-100', icon: '🖼️' },
];

function App() {
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: '你好！我是你的AI助手。请先点击右上角的设置按钮配置 API Key ⚡️',
      timestamp: Date.now(),
      modelName: MODELS[0].name
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Load config from localStorage
  const [apiConfig, setApiConfig] = useState(() => {
    const saved = localStorage.getItem('apiConfig');
    return saved ? JSON.parse(saved) : {
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      useFileContext: true,
      loadedFiles: []
    };
  });

  const filteredModels = React.useMemo(() => {
    const url = String(apiConfig?.baseUrl || '').toLowerCase();
    if (url.includes('mg.aid.pub')) {
      const mgAllowed = [
        'grok-4',
        'gemini-3-pro',
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'claude-opus-4.1',
        'claude-haiku-4.5',
        'gpt-5.1-chat',
        'gpt-5.1',
        'claude-sonnet-4.5',
        'google/nano-banana-pro',
      ];
      return MODELS.filter(m => mgAllowed.includes(String(m.id).toLowerCase()));
    }
    if (url.includes('api.siliconflow.cn')) {
      return MODELS.filter(m => ['Qwen/QwQ-32B', 'GPT-5.1', 'Deepseek'].includes(m.id));
    }
    return MODELS;
  }, [apiConfig?.baseUrl]);

  useEffect(() => {
    if (!filteredModels.some(m => m.id === currentModel.id)) {
      if (filteredModels[0]) setCurrentModel(filteredModels[0]);
    }
  }, [filteredModels, currentModel.id]);

  const handleSaveConfig = (newConfig) => {
    setApiConfig(newConfig);
    localStorage.setItem('apiConfig', JSON.stringify(newConfig));
  };

  const handleSendMessage = async (text) => {
    // Add user message
    const newUserMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      // Call API
      const content = await sendMessageToApi({
        messages: [...messages.filter(m => m.id !== 1), newUserMsg], // Filter out initial welcome message if needed, or keep context
        config: apiConfig,
        model: currentModel
      });

      const aiResponse = {
        id: Date.now() + 1,
        role: 'assistant',
        content: content,
        timestamp: Date.now(),
        modelName: currentModel.name
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ 出错了: ${error.message}\n请检查 API Key 和网络连接。`,
        timestamp: Date.now(),
        modelName: 'System'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen bg-[#f0f2f5] flex flex-col overflow-hidden font-sans relative">
      <div className="bg-texture" />
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">
            AI
          </div>
          <span className="font-bold text-lg tracking-tight">ChatBox</span>
        </div>

        <div className="flex items-center gap-3">
           <button 
            onClick={() => setIsModelSelectorOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95"
          >
            <span className="text-xl">{currentModel.icon}</span>
            <span className="font-semibold text-sm text-gray-700 hidden md:inline">{currentModel.name}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative min-h-0">
        <ChatInterface 
          messages={messages} 
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
        />
      </main>

      {/* Modals */}
      <ModelSelector 
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        models={filteredModels}
        currentModel={currentModel}
        onSelectModel={setCurrentModel}
      />
      
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={apiConfig}
        onSave={handleSaveConfig}
      />
    </div>
  );
}

export default App;
