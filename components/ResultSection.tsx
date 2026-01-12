import React, { useState } from 'react';
import { ModelConfig, TestResult } from '../types';

interface ResultSectionProps {
  results: Record<string, TestResult>;
  configs: ModelConfig[];
}

// 图片下载函数
const downloadImage = (src: string, filename: string) => {
  const link = document.createElement('a');
  link.href = src;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 可折叠组件
const Collapsible: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-gray-700 rounded">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-750 text-left transition-colors"
      >
        <span className="text-[10px] text-gray-500 font-bold uppercase">{title}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-3 bg-gray-900">{children}</div>}
    </div>
  );
};

// 图片查看器组件
const ImageViewer: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-[90vw] max-h-[90vh]">
        <img src={src} alt="preview" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-800/80 hover:bg-gray-700 text-white p-2 rounded-full"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadImage(src, `image_${Date.now()}.png`);
          }}
          className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          下载图片
        </button>
      </div>
    </div>
  );
};

// 图片卡片组件
const ImageCard: React.FC<{ src: string; index: number }> = ({ src, index }) => {
  const [showViewer, setShowViewer] = useState(false);
  return (
    <>
      <div className="relative group">
        <img
          src={src}
          alt={`image ${index + 1}`}
          className="rounded border border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setShowViewer(true)}
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
          <button
            onClick={() => setShowViewer(true)}
            className="bg-gray-800/80 hover:bg-gray-700 text-white p-2 rounded-full"
            title="放大查看"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadImage(src, `image_${index + 1}_${Date.now()}.png`);
            }}
            className="bg-blue-600/80 hover:bg-blue-500 text-white p-2 rounded-full"
            title="下载图片"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>
      {showViewer && <ImageViewer src={src} onClose={() => setShowViewer(false)} />}
    </>
  );
};

// Debug 信息组件
const DebugInfo: React.FC<{ result: TestResult }> = ({ result }) => {
  if (!result.rawResponse && !result.endpoint && !result.requestPayload) return null;

  // 解析 requestPayload 获取图片上传信息
  const getImageUploadInfo = () => {
    if (!result.requestPayload) return null;
    try {
      const payload = JSON.parse(result.requestPayload);
      const seedImages = payload.seed_images || [];
      const hasImages = seedImages.length > 0;
      
      // 分类：URL 图片和 base64 图片
      const urlImages = seedImages.filter((img: string) => /^https?:\/\//i.test(img));
      const base64Images = seedImages.filter((img: string) => img.startsWith('data:'));
      
      return {
        hasImages,
        totalCount: seedImages.length,
        urlImages,
        base64Images,
      };
    } catch {
      return null;
    }
  };

  const imageInfo = getImageUploadInfo();

  return (
    <div className="mt-4">
      <Collapsible title="调试信息 (Request & Response)">
        <div className="space-y-4">
          {/* 图片上传状态 - 醒目显示 */}
          <div>
            <div className="text-[11px] text-gray-400 font-semibold mb-2 border-b border-gray-700 pb-1">📷 输入图片状态</div>
            <div className="bg-gray-950 p-3 rounded space-y-2">
              {imageInfo ? (
                <>
                  <div className={`text-sm font-medium ${imageInfo.hasImages ? 'text-green-400' : 'text-yellow-400'}`}>
                    {imageInfo.hasImages 
                      ? `✅ 已上传 ${imageInfo.totalCount} 张参考图` 
                      : '⚠️ 未上传参考图'}
                  </div>
                  {imageInfo.hasImages && (
                    <div className="text-xs text-gray-400 space-y-1">
                      {imageInfo.urlImages.length > 0 && (
                        <div>
                          <span className="text-blue-400">URL图片 ({imageInfo.urlImages.length}):</span>
                          <ul className="mt-1 ml-4 space-y-1">
                            {imageInfo.urlImages.map((url: string, i: number) => (
                              <li key={i} className="break-all text-gray-300">
                                <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 underline">
                                  {url}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {imageInfo.base64Images.length > 0 && (
                        <div>
                          <span className="text-purple-400">Base64图片 ({imageInfo.base64Images.length}):</span>
                          <span className="text-gray-500 ml-2">(本地上传，已转为data URL)</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500">⚪ 非图片生成请求或无法解析</div>
              )}
            </div>
          </div>

          {/* Request 部分 */}
          {(result.endpoint || result.requestPayload) && (
            <div>
              <div className="text-[11px] text-gray-400 font-semibold mb-2 border-b border-gray-700 pb-1">Request</div>
              {result.endpoint && (
                <div className="text-xs text-gray-400 mb-2">Endpoint: {result.endpoint}</div>
              )}
              {result.requestPayload && (
                <pre className="text-gray-400 overflow-x-auto text-xs whitespace-pre-wrap break-all bg-gray-950 p-2 rounded">
                  {result.requestPayload}
                </pre>
              )}
            </div>
          )}
          {/* Raw Response 部分 */}
          {result.rawResponse && (
            <div>
              <div className="text-[11px] text-gray-400 font-semibold mb-2 border-b border-gray-700 pb-1">Raw Response</div>
              <pre className="text-gray-400 overflow-x-auto text-xs whitespace-pre-wrap break-all bg-gray-950 p-2 rounded">
                {result.rawResponse}
              </pre>
            </div>
          )}
        </div>
      </Collapsible>
    </div>
  );
};

// 结果卡片组件（支持折叠）
const ResultCard: React.FC<{
  config: ModelConfig;
  result: TestResult | undefined;
  index: number;
}> = ({ config, result, index }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // 获取状态标签
  const getStatusBadge = () => {
    if (!result) {
      return <span className="text-gray-500 text-xs">等待运行</span>;
    }
    if (result.isLoading) {
      return (
        <span className="flex items-center gap-1 text-yellow-400 text-xs">
          <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          运行中...
        </span>
      );
    }
    if (result.error) {
      return <span className="text-red-400 text-xs">失败</span>;
    }
    return <span className="text-green-400 text-xs">成功</span>;
  };

  return (
    <div className={`rounded-lg border transition-all duration-200 overflow-hidden ${
      isExpanded 
      ? 'bg-gray-800 border-green-500/50 shadow-md' 
      : 'bg-gray-850 border-gray-700 hover:border-gray-600'
    }`}>
      {/* Header for Result Card - 可点击折叠 */}
      <div
        className="flex items-center justify-between p-3 h-12 cursor-pointer select-none group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${isExpanded ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
            {index + 1}
          </span>
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-medium truncate ${isExpanded ? 'text-gray-200' : 'text-gray-400'}`}>
              {config.modelName || 'No Model'}
            </span>
            {!isExpanded && (
              <span className="text-[10px] text-gray-600 truncate">
                Temp: {config.temperature}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {getStatusBadge()}
          {result?.timestamp && !result.isLoading && (
            <span className="text-[10px] text-gray-500">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 可折叠内容 */}
      {isExpanded && (
        <div className="p-4 min-h-[120px] space-y-3 border-t border-gray-700 bg-gray-900/30">
          {!result ? (
            <div className="h-full flex items-center justify-center text-gray-600 italic text-sm">
              Waiting to run...
            </div>
          ) : result.isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3 py-6">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-400 animate-pulse">Generating response...</span>
            </div>
          ) : result.error ? (
            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-900/50">
              <strong>Error:</strong> {result.error}
            </div>
          ) : (
            result.imageBase64s && result.imageBase64s.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {result.imageBase64s.map((b64, i) => (
                    <ImageCard
                      key={i}
                      src={`data:image/png;base64,${b64}`}
                      index={i}
                    />
                  ))}
                </div>
                <DebugInfo result={result} />
              </div>
            ) : result.imageUrls && result.imageUrls.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {result.imageUrls.map((url, i) => (
                    <ImageCard key={i} src={url} index={i} />
                  ))}
                </div>
                <DebugInfo result={result} />
              </div>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none space-y-3">
                <div className="whitespace-pre-wrap font-sans text-gray-200 leading-relaxed">
                  {result.textResponse}
                </div>
                <DebugInfo result={result} />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

const ResultSection: React.FC<ResultSectionProps> = ({ results, configs }) => {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 border-b border-gray-800 bg-gray-850">
        <h2 className="text-lg font-semibold text-green-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          3. Results
        </h2>
        <p className="text-xs text-gray-500 mt-1">Output from the configured models.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {configs.length === 0 && (
             <div className="text-center text-gray-600 mt-20">
                <p>No active configurations.</p>
             </div>
        )}

        {configs.map((config, index) => (
          <ResultCard
            key={config.id}
            config={config}
            result={results[config.id]}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default ResultSection;
