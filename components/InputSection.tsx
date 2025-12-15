import React, { useRef, useState } from 'react';
import { FileAttachment, UserPrompt } from '../types';

interface InputSectionProps {
  prompts: UserPrompt[];
  onAddPrompt: () => void;
  onRemovePrompt: (id: string) => void;
  onUpdatePromptText: (id: string, text: string) => void;
  onAddFile: (promptId: string, file: FileAttachment) => void;
  onRemoveFile: (promptId: string, index: number) => void;
  onAddSeedUrl: (promptId: string, url: string) => void;
  onRemoveSeedUrl: (promptId: string, index: number) => void;
}

// 单个 Prompt 卡片组件（仿照 ConfigSection 样式）
const PromptCard: React.FC<{
  prompt: UserPrompt;
  index: number;
  canDelete: boolean;
  onRemove: () => void;
  onUpdateText: (text: string) => void;
  onAddFile: (file: FileAttachment) => void;
  onRemoveFile: (index: number) => void;
  onAddSeedUrl: (url: string) => void;
  onRemoveSeedUrl: (index: number) => void;
}> = ({
  prompt,
  index,
  canDelete,
  onRemove,
  onUpdateText,
  onAddFile,
  onRemoveFile,
  onAddSeedUrl,
  onRemoveSeedUrl
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const seedUrlRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const result = event.target.result as string;
          onAddFile({
            name: file.name,
            mimeType: file.type,
            data: result,
            preview: result
          });
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 获取简短信息
  const getCompactInfo = () => {
    const parts = [];
    if (prompt.text) parts.push(`${prompt.text.substring(0, 20)}${prompt.text.length > 20 ? '...' : ''}`);
    if (prompt.files.length > 0) parts.push(`${prompt.files.length} file(s)`);
    if (prompt.seedUrls.length > 0) parts.push(`${prompt.seedUrls.length} URL(s)`);
    return parts.length > 0 ? parts.join(' • ') : 'Empty';
  };

  return (
    <div 
      className={`rounded-lg border transition-all duration-200 overflow-hidden ${
        isExpanded 
        ? 'bg-gray-800 border-blue-500/50 shadow-md' 
        : 'bg-gray-850 border-gray-700 hover:border-gray-600'
      }`}
    >
      {/* Compact Header / Button - 仿照 ConfigSection */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3 cursor-pointer select-none group"
      >
        <div className="flex items-center gap-3">
          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${isExpanded ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
            {index + 1}
          </span>
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${isExpanded ? 'text-gray-200' : 'text-gray-400'}`}>
              Prompt {index + 1}
            </span>
            {!isExpanded && (
              <span className="text-[10px] text-gray-600">
                {getCompactInfo()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Delete Button - 仿照 ConfigSection，hover 时显示 */}
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className={`p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-all ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              title="Remove Prompt"
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

      {/* Expanded Content - 仿照 ConfigSection */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-700 bg-gray-900/30 animate-in slide-in-from-top-2 duration-200 space-y-4">
          {/* Text Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-400">User Prompt</label>
            <textarea
              className="w-full h-32 p-3 bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-mono text-sm leading-relaxed"
              placeholder="Type your prompt here..."
              value={prompt.text}
              onChange={(e) => onUpdateText(e.target.value)}
            />
          </div>

          {/* File Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-400">Attachments (Images)</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />

            {prompt.files.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-gray-500 transition-colors hover:bg-gray-800/50"
              >
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 text-xs">Click to upload</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {prompt.files.map((file, idx) => (
                  <div key={idx} className="relative group border border-gray-700 rounded-lg overflow-hidden h-16">
                    <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => onRemoveFile(idx)}
                        className="bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-16 border border-dashed border-gray-700 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-500 hover:bg-gray-800 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Seed URLs */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-400">Seed Image URLs</label>
            <div className="flex gap-2">
              <input
                type="url"
                ref={seedUrlRef}
                placeholder="https://example.com/image.jpg"
                className="flex-1 bg-gray-900 text-gray-100 rounded-lg border border-gray-700 p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
              />
              <button
                onClick={() => {
                  const v = seedUrlRef.current?.value?.trim();
                  if (v) {
                    onAddSeedUrl(v);
                    if (seedUrlRef.current) seedUrlRef.current.value = '';
                  }
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs border border-gray-600"
              >
                Add
              </button>
            </div>
            {prompt.seedUrls.length > 0 && (
              <div className="space-y-1">
                {prompt.seedUrls.map((u, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded px-2 py-1">
                    <span className="text-[10px] text-gray-300 truncate mr-2">{u}</span>
                    <button
                      onClick={() => onRemoveSeedUrl(idx)}
                      className="text-red-400 hover:text-red-300 text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 主组件
const InputSection: React.FC<InputSectionProps> = ({
  prompts,
  onAddPrompt,
  onRemovePrompt,
  onUpdatePromptText,
  onAddFile,
  onRemoveFile,
  onAddSeedUrl,
  onRemoveSeedUrl
}) => {

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      <div className="p-4 border-b border-gray-800 bg-gray-850 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            1. Input
          </h2>
          <p className="text-xs text-gray-500 mt-1">Provide content for the model to process.</p>
        </div>
        <button
          onClick={onAddPrompt}
          className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1 shadow-sm border border-gray-600"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {prompts.map((prompt, index) => (
          <PromptCard
            key={prompt.id}
            prompt={prompt}
            index={index}
            canDelete={prompts.length > 1}
            onRemove={() => onRemovePrompt(prompt.id)}
            onUpdateText={(text) => onUpdatePromptText(prompt.id, text)}
            onAddFile={(file) => onAddFile(prompt.id, file)}
            onRemoveFile={(idx) => onRemoveFile(prompt.id, idx)}
            onAddSeedUrl={(url) => onAddSeedUrl(prompt.id, url)}
            onRemoveSeedUrl={(idx) => onRemoveSeedUrl(prompt.id, idx)}
          />
        ))}
      </div>
    </div>
  );
};

export default InputSection;
