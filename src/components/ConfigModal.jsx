import React, { useState, useRef } from 'react';
import { X, Settings, Save } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

const ConfigModal = ({ isOpen, onClose, config, onSave }) => {
  const [formData, setFormData] = useState(() => ({
    apiKey: config?.apiKey || '',
    baseUrl: config?.baseUrl || 'https://api.openai.com/v1',
    useFileContext: config?.useFileContext ?? true,
    loadedFiles: Array.isArray(config?.loadedFiles) ? config.loadedFiles : []
  }));
  
  
  const loadConfigInputRef = useRef(null);

  

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  


  const handleSaveToFile = () => {
    const payload = {
      baseUrl: formData.baseUrl,
      apiKey: formData.apiKey,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePickConfigFile = () => {
    loadConfigInputRef.current?.click();
  };

  const handleLoadConfigFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data = {};
      try {
        data = JSON.parse(String(reader.result || '{}'));
      } catch {
        data = {};
      }
      setFormData((prev) => ({
        ...prev,
        baseUrl: typeof data.baseUrl === 'string' ? data.baseUrl : prev.baseUrl,
        apiKey: typeof data.apiKey === 'string' ? data.apiKey : prev.apiKey,
      }));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          
          {/* Modal */}
          <Motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.95, rotate: 2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white w-full max-w-md p-6 rounded-sm shadow-float relative transform rotate-1">
              {/* Tape effect */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/80 rotate-1 shadow-sm backdrop-blur-[1px]" />
              
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  API 设置
                </h2>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Base URL
                  </label>
                  <input
                    type="text"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-xl outline-none transition-all font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1 ml-1">
                    默认为 OpenAI 官方地址，也可填写第三方中转地址
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-xl outline-none transition-all font-mono text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveToFile}
                    className="px-4 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-transform active:scale-95 shadow-lg"
                  >
                    一键保存
                  </button>
                  <button
                    type="button"
                    onClick={handlePickConfigFile}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-transform active:scale-95"
                  >
                    一键加载
                  </button>
                  <input
                    ref={loadConfigInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleLoadConfigFile}
                    className="hidden"
                  />
                </div>

                

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    保存配置
                  </button>
                </div>
              </form>
            </div>
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfigModal;
