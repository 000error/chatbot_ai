import React, { useState } from 'react';
import InputSection from './components/InputSection';
import ConfigSection from './components/ConfigSection';
import ResultSection from './components/ResultSection';
import { ModelConfig, FileAttachment, TestResult, OpenAIModel } from './types';
import { generateContent } from './services/openAIService';

const App: React.FC = () => {
  // --- State ---
  const [prompt, setPrompt] = useState<string>("");
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [seedUrls, setSeedUrls] = useState<string[]>([]);
  
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

  const addFile = (file: FileAttachment) => {
    setFiles(prev => [...prev, file]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addSeedUrl = (url: string) => {
    setSeedUrls(prev => [...prev, url]);
  };

  const removeSeedUrl = (index: number) => {
    setSeedUrls(prev => prev.filter((_, i) => i !== index));
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
    if (!prompt && files.length === 0 && seedUrls.length === 0) {
        alert("Please enter a prompt or upload an image.");
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
    const promises = configs.map(async (config) => {
        try {
            const result = await generateContent(prompt, files, config, seedUrls);
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
            prompt={prompt} 
            setPrompt={setPrompt} 
            files={files} 
            onAddFile={addFile} 
            onRemoveFile={removeFile}
            seedUrls={seedUrls}
            onAddSeedUrl={addSeedUrl}
            onRemoveSeedUrl={removeSeedUrl}
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
