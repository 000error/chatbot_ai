import React, { useState } from 'react';
import InputSection from './components/InputSection';
import ConfigSection from './components/ConfigSection';
import ResultSection from './components/ResultSection';
import { ModelConfig, FileAttachment, TestResult, OpenAIModel, UserPrompt } from './types';
import { generateContent } from './services/openAIService';

const App: React.FC = () => {
  // --- State ---
  const [prompts, setPrompts] = useState<UserPrompt[]>([
    {
      id: '1',
      text: '',
      files: [],
      seedUrls: []
    }
  ]);
  
  const [configs, setConfigs] = useState<ModelConfig[]>([
    {
      id: '1',
      modelName: OpenAIModel.GPT_4O_MINI,
      systemInstruction: "",
      temperature: 1.0,
      apiKey: (typeof import.meta !== 'undefined' ? (import.meta as any)?.env?.VITE_API_KEY : undefined) || "",
      baseUrl: "https://mg.aid.pub/api/v1"
    }
  ]);

  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // --- Handlers ---

  // Prompt handlers
  const addPrompt = () => {
    const newId = Date.now().toString();
    setPrompts(prev => [
      ...prev,
      { id: newId, text: '', files: [], seedUrls: [] }
    ]);
  };

  const removePrompt = (id: string) => {
    if (prompts.length <= 1) return; // 至少保留一个
    setPrompts(prev => prev.filter(p => p.id !== id));
  };

  const updatePromptText = (id: string, text: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, text } : p));
  };

  const addFileToPrompt = (promptId: string, file: FileAttachment) => {
    setPrompts(prev => prev.map(p =>
      p.id === promptId ? { ...p, files: [...p.files, file] } : p
    ));
  };

  const removeFileFromPrompt = (promptId: string, index: number) => {
    setPrompts(prev => prev.map(p =>
      p.id === promptId ? { ...p, files: p.files.filter((_, i) => i !== index) } : p
    ));
  };

  const addSeedUrlToPrompt = (promptId: string, url: string) => {
    setPrompts(prev => prev.map(p =>
      p.id === promptId ? { ...p, seedUrls: [...p.seedUrls, url] } : p
    ));
  };

  const removeSeedUrlFromPrompt = (promptId: string, index: number) => {
    setPrompts(prev => prev.map(p =>
      p.id === promptId ? { ...p, seedUrls: p.seedUrls.filter((_, i) => i !== index) } : p
    ));
  };

  const addConfig = () => {
    const newId = Date.now().toString();
    setConfigs(prev => [
        ...prev, 
        {
            id: newId,
            modelName: OpenAIModel.GPT_4O_MINI,
            systemInstruction: "",
            temperature: 1.0,
            apiKey: (typeof import.meta !== 'undefined' ? (import.meta as any)?.env?.VITE_API_KEY : undefined) || "",
            baseUrl: "https://mg.aid.pub/api/v1"
        }
    ]);
  };

  const removeConfig = (id: string) => {
    setConfigs(prev => prev.filter(c => c.id !== id));
    setResults(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
    });
  };

  const updateConfig = (id: string, updates: Partial<ModelConfig>) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const runTest = async () => {
    // 检查是否有有效输入
    const hasValidInput = prompts.some(p => p.text || p.files.length > 0 || p.seedUrls.length > 0);
    if (!hasValidInput) {
        alert("请输入提示词或上传图片。");
        return;
    }

    setIsProcessing(true);

    // Initialize loading state for all active configs
    const initialResults: Record<string, TestResult> = {};
    configs.forEach(c => {
        initialResults[c.id] = {
            configId: c.id,
            isLoading: true,
            timestamp: Date.now()
        };
    });
    setResults(initialResults);

    // Run requests in parallel
    // 每个 config 使用对应索引的 prompt，如果没有则使用第一个
    const promises = configs.map(async (config, configIndex) => {
        // 获取对应的 prompt，如果索引超出则使用第一个
        const promptData = prompts[configIndex] || prompts[0];
        const { text: promptText, files: promptFiles, seedUrls: promptSeedUrls } = promptData;
        
        try {
            const result = await generateContent(promptText, promptFiles, config, promptSeedUrls);
            setResults(prev => ({
                ...prev,
                [config.id]: {
                    configId: config.id,
                    isLoading: false,
                    textResponse: result.text,
                    imageBase64s: result.imageBase64s,
                    imageUrls: (result as any).imageUrls,
                    rawResponse: (result as any).rawResponse,
                    requestPayload: (result as any).requestPayload,
                    endpoint: (result as any).endpoint,
                    timestamp: Date.now()
                }
            }));
        } catch (error: any) {
            setResults(prev => ({
                ...prev,
                [config.id]: {
                    configId: config.id,
                    isLoading: false,
                    error: error.message || "Request failed",
                    timestamp: Date.now()
                }
            }));
        }
    });

    await Promise.all(promises);
    setIsProcessing(false);
  };

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-800 bg-gray-950">
      {/* 1. Input Section */}
      <div className="h-[40vh] lg:h-full overflow-hidden">
        <InputSection 
            prompts={prompts}
            onAddPrompt={addPrompt}
            onRemovePrompt={removePrompt}
            onUpdatePromptText={updatePromptText}
            onAddFile={addFileToPrompt}
            onRemoveFile={removeFileFromPrompt}
            onAddSeedUrl={addSeedUrlToPrompt}
            onRemoveSeedUrl={removeSeedUrlFromPrompt}
        />
      </div>

      {/* 2. Configuration Section */}
      <div className="h-[30vh] lg:h-full overflow-hidden">
        <ConfigSection 
            configs={configs}
            onAddConfig={addConfig}
            onRemoveConfig={removeConfig}
            onUpdateConfig={updateConfig}
            onRunTest={runTest}
            isProcessing={isProcessing}
        />
      </div>

      {/* 3. Result Section */}
      <div className="h-[30vh] lg:h-full overflow-hidden">
        <ResultSection 
            results={results}
            configs={configs}
        />
      </div>
    </div>
  );
};

export default App;
