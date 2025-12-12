import React, { useState, useRef } from 'react';
import { ModelConfig, OpenAIModel } from '../types';

interface ConfigSectionProps {
  configs: ModelConfig[];
  onAddConfig: () => void;
  onRemoveConfig: (id: string) => void;
  onUpdateConfig: (id: string, updates: Partial<ModelConfig>) => void;
  onRunTest: () => void;
  isProcessing: boolean;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({
  configs,
  onAddConfig,
  onRemoveConfig,
  onUpdateConfig,
  onRunTest,
  isProcessing
}) => {
  // Track which config is currently expanded. Default to the first one if it exists.
  const [expandedId, setExpandedId] = useState<string | null>(configs[0]?.id || null);
  
  // State to track which config is currently requesting an import
  const [importTargetId, setImportTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleAddConfig = () => {
    onAddConfig();
  };

  const handleExportConfig = (config: ModelConfig) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `openai-config-${config.modelName || 'custom'}-${config.id}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const triggerImport = (id: string) => {
    setImportTargetId(id);
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset to allow same file selection
        fileInputRef.current.click();
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !importTargetId) return;

    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            // Validate basic structure if needed, or just merge
            // Ensure we don't overwrite the ID, keeping the UI stable
            const { id, ...importedConfig } = json; 
            onUpdateConfig(importTargetId, importedConfig);
        } catch (err) {
            console.error("Failed to parse config JSON", err);
            alert("Invalid configuration file.");
        } finally {
            setImportTargetId(null);
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Hidden File Input for Imports */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".json"
      />

      <div className="p-4 border-b border-gray-800 bg-gray-850 flex justify-between items-center">
        <div>
            <h2 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            2. Configuration
            </h2>
            <p className="text-xs text-gray-500 mt-1">Manage parameters & API keys.</p>
        </div>
        <button
            onClick={handleAddConfig}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1 shadow-sm border border-gray-600"
        >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {configs.map((config, index) => {
            const isExpanded = expandedId === config.id;
            
            return (
                <div 
                    key={config.id} 
                    className={`rounded-lg border transition-all duration-200 overflow-hidden ${
                        isExpanded 
                        ? 'bg-gray-800 border-purple-500/50 shadow-md' 
                        : 'bg-gray-850 border-gray-700 hover:border-gray-600'
                    }`}
                >
                    {/* Compact Header / Button */}
                    <div 
                        onClick={() => toggleExpand(config.id)}
                        className="flex items-center justify-between p-3 cursor-pointer select-none group"
                    >
                        <div className="flex items-center gap-3">
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${isExpanded ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                {index + 1}
                            </span>
                            <div className="flex flex-col">
                                <span className={`text-sm font-medium ${isExpanded ? 'text-gray-200' : 'text-gray-400'}`}>
                                    {config.modelName || 'No Model'}
                                </span>
                                {!isExpanded && (
                                    <span className="text-[10px] text-gray-600 flex gap-2">
                                        <span>Temp: {config.temperature}</span>
                                        {config.apiKey && <span>• Custom Key</span>}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Delete Button (Visible on hover or if expanded) */}
                            {configs.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveConfig(config.id);
                                    }}
                                    className={`p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-all ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                    title="Remove Config"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            )}
                            
                            {/* Chevron */}
                            <svg 
                                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                        <div className="p-4 border-t border-gray-700 bg-gray-900/30 animate-in slide-in-from-top-2 duration-200">
                             {/* Save / Load Actions */}
                             <div className="flex gap-2 mb-4">
                                <button 
                                    onClick={() => handleExportConfig(config)}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 text-[10px] uppercase font-bold py-2 px-3 rounded border border-gray-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Save JSON
                                </button>
                                <button 
                                    onClick={() => triggerImport(config.id)}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 text-[10px] uppercase font-bold py-2 px-3 rounded border border-gray-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    Load JSON
                                </button>
                             </div>

                             {/* Advanced API Config */}
                             <div className="grid grid-cols-1 gap-3 mb-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">API Key</label>
                                        <input
                                            type="password"
                                            value={config.apiKey || ''}
                                            onChange={(e) => onUpdateConfig(config.id, { apiKey: e.target.value })}
                                            placeholder="Env Default"
                                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded p-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none placeholder-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Base URL</label>
                                        <input
                                            type="text"
                                            value={config.baseUrl || ''}
                                            onChange={(e) => onUpdateConfig(config.id, { baseUrl: e.target.value })}
                                            placeholder="OpenAI Default"
                                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded p-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none placeholder-gray-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Model</label>
                                <input
                                    type="text"
                                    list={`model-suggestions-${config.id}`}
                                    value={config.modelName}
                                    onChange={(e) => onUpdateConfig(config.id, { modelName: e.target.value })}
                                    placeholder="Select or type model name..."
                                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-md p-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                                />
                                <datalist id={`model-suggestions-${config.id}`}>
                                    {[...Object.values(OpenAIModel), 'google/nano-banana', 'google/nano-banana-pro', 'volcengine/doubao-seedream-4-0'].map(model => (
                                        <option key={model} value={model} />
                                    ))}
                                </datalist>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Number Results</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={typeof config.numberResults === 'number' ? config.numberResults : 1}
                                        onChange={(e) => onUpdateConfig(config.id, { numberResults: parseInt(e.target.value || '1', 10) || 1 })}
                                        placeholder="e.g. 3"
                                        className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded p-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none placeholder-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Size (WxH)</label>
                                    <input
                                        type="text"
                                        value={config.size || ''}
                                        onChange={(e) => onUpdateConfig(config.id, { size: e.target.value })}
                                        placeholder="e.g. 2560x1440"
                                        className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded p-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none placeholder-gray-700"
                                    />
                                </div>
                            </div>

                            {/* 七牛云图床配置 */}
                            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                <label className="block text-[10px] uppercase text-gray-400 font-bold mb-3">
                                    七牛云图床配置
                                    <span className="text-gray-600 normal-case font-normal ml-1">(可选，用于 Google 模型参考图)</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-[9px] text-gray-500 mb-1">Access Key</label>
                                        <input
                                            type="password"
                                            value={config.qiniuAccessKey || ''}
                                            onChange={(e) => onUpdateConfig(config.id, { qiniuAccessKey: e.target.value })}
                                            placeholder="AK"
                                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded p-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none placeholder-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] text-gray-500 mb-1">Secret Key</label>
                                        <input
                                            type="password"
                                            value={config.qiniuSecretKey || ''}
                                            onChange={(e) => onUpdateConfig(config.id, { qiniuSecretKey: e.target.value })}
                                            placeholder="SK"
                                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded p-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none placeholder-gray-700"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[9px] text-gray-500 mb-1">Bucket 名称</label>
                                        <input
                                            type="text"
                                            value={config.qiniuBucket || ''}
                                            onChange={(e) => onUpdateConfig(config.id, { qiniuBucket: e.target.value })}
                                            placeholder="存储空间名称"
                                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded p-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none placeholder-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] text-gray-500 mb-1">存储区域</label>
                                        <select
                                            value={config.qiniuRegion || 'z0'}
                                            onChange={(e) => onUpdateConfig(config.id, { qiniuRegion: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded p-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                                        >
                                            <option value="z0">华东</option>
                                            <option value="z1">华北</option>
                                            <option value="z2">华南</option>
                                            <option value="cn-east-2">华东-浙江2</option>
                                            <option value="na0">北美</option>
                                            <option value="as0">东南亚</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className="block text-[9px] text-gray-500 mb-1">访问域名</label>
                                    <input
                                        type="text"
                                        value={config.qiniuDomain || ''}
                                        onChange={(e) => onUpdateConfig(config.id, { qiniuDomain: e.target.value })}
                                        placeholder="http://xxx.bkt.clouddn.com"
                                        className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded p-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none placeholder-gray-700"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-600 mt-2">
                                    配置后，本地上传的参考图会自动上传到七牛云，以支持 Google Banana Pro 模型
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">System Instructions</label>
                                <textarea
                                    value={config.systemInstruction}
                                    onChange={(e) => onUpdateConfig(config.id, { systemInstruction: e.target.value })}
                                    placeholder="e.g. 'You are a senior frontend engineer...'"
                                    className="w-full h-20 bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-md p-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none font-mono"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-[10px] uppercase text-gray-500 font-bold">Temperature</label>
                                    <span className="text-xs text-purple-400 font-mono">{config.temperature}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={config.temperature}
                                    onChange={(e) => onUpdateConfig(config.id, { temperature: parseFloat(e.target.value) })}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                                <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                                    <span>Precise (0.0)</span>
                                    <span>Creative (2.0)</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-850">
        <button
            onClick={onRunTest}
            disabled={isProcessing}
            className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]
                ${isProcessing 
                    ? 'bg-gray-600 cursor-not-allowed opacity-75' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'}`}
        >
            {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running {configs.length} Test{configs.length > 1 ? 's' : ''}...
                </span>
            ) : (
                <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Run All Tests
                </span>
            )}
        </button>
      </div>
    </div>
  );
};

export default ConfigSection;
