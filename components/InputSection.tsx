import React, { useRef } from 'react';
import { FileAttachment } from '../types';

interface InputSectionProps {
  prompt: string;
  setPrompt: (val: string) => void;
  files: FileAttachment[];
  onAddFile: (file: FileAttachment) => void;
  onRemoveFile: (index: number) => void;
  seedUrls: string[];
  onAddSeedUrl: (url: string) => void;
  onRemoveSeedUrl: (index: number) => void;
}

const InputSection: React.FC<InputSectionProps> = ({ 
  prompt, 
  setPrompt, 
  files, 
  onAddFile, 
  onRemoveFile,
  seedUrls,
  onAddSeedUrl,
  onRemoveSeedUrl
}) => {
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
    // Reset value so same file can be selected again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      <div className="p-4 border-b border-gray-800 bg-gray-850">
        <h2 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          1. Input
        </h2>
        <p className="text-xs text-gray-500 mt-1">Provide content for the model to process.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Text Input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-400">User Prompt</label>
          <textarea
            className="w-full h-64 p-3 bg-gray-800 text-gray-100 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-mono text-sm leading-relaxed"
            placeholder="Type your prompt here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        {/* File Input */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
             <label className="text-sm font-medium text-gray-400">Attachments (Images)</label>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
          />

          {files.length === 0 && (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-gray-500 transition-colors hover:bg-gray-800/50"
            >
                <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-gray-500 text-sm">Click to upload images</p>
                </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {files.map((file, idx) => (
                <div key={idx} className="relative group border border-gray-700 rounded-lg overflow-hidden h-24">
                  <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => onRemoveFile(idx)}
                      className="bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 text-xs px-2 py-1 truncate text-gray-300">
                    {file.name}
                  </div>
                </div>
              ))}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="h-24 border border-dashed border-gray-700 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-500 hover:bg-gray-800 transition-all"
                title="Add more files"
              >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-400">Seed Image URLs (Google)</label>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              ref={seedUrlRef}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-gray-800 text-gray-100 rounded-lg border border-gray-700 p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={() => {
                const v = seedUrlRef.current?.value?.trim();
                if (v) {
                  onAddSeedUrl(v);
                  if (seedUrlRef.current) seedUrlRef.current.value = '';
                }
              }}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm border border-gray-600"
            >
              Add
            </button>
          </div>
          {seedUrls.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              {seedUrls.map((u, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded px-3 py-2">
                  <span className="text-xs text-gray-300 truncate mr-2">{u}</span>
                  <button
                    onClick={() => onRemoveSeedUrl(idx)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InputSection;
