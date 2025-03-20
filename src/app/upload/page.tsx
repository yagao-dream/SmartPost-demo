'use client';

import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileUpload } from '@/components/features/FileUpload';
import { PlatformSelect } from '@/components/features/PlatformSelect';
import { ContentTextarea } from '@/components/features/ContentTextarea';
import { GeneratedContent } from '@/components/features/GeneratedContent';
import { Button } from '@/components/ui/Button';
import { platforms } from '@/lib/utils';
import { modelOptions } from '@/lib/openrouter';
import { extractTextFromFile, fetchContentFromUrl } from '@/lib/fileProcessing';
import { ChatInterface } from '@/components/features/ChatInterface';
import { 
  ArrowRightIcon, 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  DocumentIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  DocumentTextIcon,
  LinkIcon,
  ArrowUpTrayIcon,
  SparklesIcon,
  ArrowPathIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

type InputType = 'sentence' | 'longtext' | 'document' | 'link' | null;

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(modelOptions[0].id);
  const [inputContent, setInputContent] = useState('');
  const [inputType, setInputType] = useState<InputType>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkContent, setLinkContent] = useState('');
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [extractedContent, setExtractedContent] = useState('');
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPlatform, setGeneratingPlatform] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState('');
  const [activePlatformId, setActivePlatformId] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  useEffect(() => {
    async function processFiles() {
      if (files.length === 0) {
        setExtractedContent('');
        return;
      }

      setIsProcessingFile(true);
      try {
        const file = files[0]; // 目前只处理第一个文件
        
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          setProcessingMessage(`正在解析PDF文件: ${file.name}，这可能需要一些时间...`);
        } else if (file.type.startsWith('image/')) {
          setProcessingMessage(`正在对图片进行OCR文本识别: ${file.name}，这可能需要一些时间...`);
        } else {
          setProcessingMessage(`正在处理 ${file.name}...`);
        }
        
        const content = await extractTextFromFile(file);
        setExtractedContent(content);
      } catch (error) {
        console.error('处理文件时出错:', error);
        alert('处理文件时出错，请重试或使用其他文件');
      } finally {
        setIsProcessingFile(false);
        setProcessingMessage('');
      }
    }

    processFiles();
  }, [files]);

  // 处理链接内容抓取
  const handleFetchLink = async () => {
    if (!linkUrl) {
      alert('请输入有效的URL');
      return;
    }

    setIsLoadingLink(true);
    try {
      const content = await fetchContentFromUrl(linkUrl);
      setLinkContent(content);
    } catch (error) {
      console.error('抓取链接内容时出错:', error);
      alert('抓取链接内容时出错，请检查URL或稍后重试');
      setLinkContent('');
    } finally {
      setIsLoadingLink(false);
    }
  };

  const handleFileSelect = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setInputType('document');
  };

  const handlePlatformChange = (platforms: string[]) => {
    setSelectedPlatforms(platforms);
  };
  
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const getContentToProcess = () => {
    if (inputType === 'document') {
      return extractedContent;
    } else if (inputType === 'link') {
      return linkContent || `从链接获取内容: ${linkUrl}`;
    } else {
      return inputContent;
    }
  };

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      alert('请至少选择一个目标平台');
      return;
    }

    const contentToProcess = getContentToProcess();
    if (!contentToProcess) {
      alert('请输入或上传内容');
      return;
    }

    setIsGenerating(true);

    try {
      // 调用 API 生成内容
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          content: contentToProcess,
          fileName: files.length > 0 ? files[0].name : undefined,
          model: selectedModel
        }),
      });

      if (!response.ok) {
        throw new Error('API 请求失败');
      }

      const data = await response.json();
      
      if (data.success && data.results) {
        setGeneratedContent(data.results);
      } else {
        throw new Error(data.error || '生成内容失败');
      }
    } catch (error) {
      console.error('生成内容时出错:', error);
      alert('生成内容时出错，请重试');
    } finally {
      setIsGenerating(false);
      setGeneratingPlatform(null);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(
      () => {
        alert('内容已复制到剪贴板');
      },
      (err) => {
        console.error('无法复制内容:', err);
        alert('复制失败，请手动复制');
      }
    );
  };

  const handleRegenerate = async (platformId: string) => {
    setGeneratingPlatform(platformId);
    setIsGenerating(true);

    try {
      // 调用 API 重新生成内容
      const contentToProcess = getContentToProcess();
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platforms: [platformId],
          content: contentToProcess,
          fileName: files.length > 0 ? files[0].name : undefined,
          regenerate: true,
          model: selectedModel
        }),
      });

      if (!response.ok) {
        throw new Error('API 请求失败');
      }

      const data = await response.json();
      
      if (data.success && data.results) {
        setGeneratedContent(prev => ({
          ...prev,
          [platformId]: data.results[platformId]
        }));
      } else {
        throw new Error(data.error || '重新生成内容失败');
      }
    } catch (error) {
      console.error('重新生成内容时出错:', error);
      alert('重新生成内容时出错，请重试');
    } finally {
      setIsGenerating(false);
      setGeneratingPlatform(null);
    }
  };

  // 使用 AI 助手优化内容
  const handleOptimizeWithAI = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return;
    
    setActivePlatform(platform.name);
    setActivePlatformId(platformId);
    setIsChatOpen(true);
  };

  // 当 AI 助手优化完成内容后的回调
  const handleOptimizedContent = (content: string) => {
    setGeneratedContent(prev => ({
      ...prev,
      [activePlatformId]: content
    }));
  };
  
  const handleInputTypeSelect = (type: InputType) => {
    setInputType(type);
    // 清除其他输入方式的数据
    if (type !== 'document') {
      setFiles([]);
      setExtractedContent('');
    }
    if (type !== 'link') {
      setLinkUrl('');
      setLinkContent('');
    }
    if (type !== 'sentence' && type !== 'longtext') {
      setInputContent('');
    }
  };
  
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const renderInputArea = () => {
    if (!inputType) {
      return (
        <div className="flex flex-wrap gap-3 justify-center">
          <div 
            className="w-40 h-40 bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors"
            onClick={() => handleInputTypeSelect('sentence')}
          >
            <ChatBubbleOvalLeftEllipsisIcon className="h-10 w-10 text-purple-500" />
            <span className="text-sm font-medium text-center">一句话</span>
          </div>
          
          <div 
            className="w-40 h-40 bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors"
            onClick={() => handleInputTypeSelect('longtext')}
          >
            <DocumentTextIcon className="h-10 w-10 text-purple-500" />
            <span className="text-sm font-medium text-center">长文本</span>
          </div>
          
          <div 
            className="w-40 h-40 bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors"
            onClick={() => handleInputTypeSelect('document')}
          >
            <DocumentIcon className="h-10 w-10 text-purple-500" />
            <span className="text-sm font-medium text-center">文档/图片</span>
          </div>
          
          <div 
            className="w-40 h-40 bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors"
            onClick={() => handleInputTypeSelect('link')}
          >
            <LinkIcon className="h-10 w-10 text-purple-500" />
            <span className="text-sm font-medium text-center">链接</span>
          </div>
        </div>
      );
    }

    switch (inputType) {
      case 'sentence':
        return (
          <div className="bg-white border rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">一句话描述</h3>
              <button 
                className="text-gray-400 hover:text-gray-600" 
                onClick={() => setInputType(null)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <textarea
              className="w-full border-gray-300 border rounded-lg p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="描述您想要生成的内容"
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
            />
          </div>
        );
        
      case 'longtext':
        return (
          <div className="bg-white border rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">长文本输入</h3>
              <button 
                className="text-gray-400 hover:text-gray-600" 
                onClick={() => setInputType(null)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <textarea
              className="w-full border-gray-300 border rounded-lg p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="描述您想要生成的内容"
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
            />
          </div>
        );
        
      case 'document':
        return (
          <div className="bg-white border rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">上传文档或图片</h3>
              <button 
                className="text-gray-400 hover:text-gray-600" 
                onClick={() => setInputType(null)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
              onClick={triggerFileUpload}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect([...e.target.files]);
                  }
                }}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              />
              <div className="flex justify-center gap-2 mb-2">
                <DocumentIcon className="h-10 w-10 text-gray-400" />
                <PhotoIcon className="h-10 w-10 text-gray-400" />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {files.length > 0 
                  ? `已选择: ${files[0].name}` 
                  : "点击上传，支持 PDF, Doc, TXT, PNG, JPG"}
              </p>
            </div>
            
            {isProcessingFile && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">{processingMessage || '正在处理文件...'}</p>
              </div>
            )}
            
            {extractedContent && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">提取的内容预览</h4>
                <p className="text-sm text-gray-700">
                  {extractedContent.length > 200 
                    ? `${extractedContent.substring(0, 200)}...` 
                    : extractedContent}
                </p>
              </div>
            )}
          </div>
        );
        
      case 'link':
        return (
          <div className="bg-white border rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">输入链接</h3>
              <button 
                className="text-gray-400 hover:text-gray-600" 
                onClick={() => setInputType(null)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <LinkIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="url"
                  className="w-full pl-10 pr-4 py-3 border-gray-300 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="粘贴 URL 到这里"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
              <button
                onClick={handleFetchLink}
                disabled={isLoadingLink || !linkUrl}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingLink ? '抓取中...' : '抓取内容'}
              </button>
            </div>
            
            {isLoadingLink && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">正在抓取链接内容，请稍候...</p>
              </div>
            )}
            
            {linkContent && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">抓取的内容预览</h4>
                <p className="text-sm text-gray-700">
                  {linkContent.length > 200 
                    ? `${linkContent.substring(0, 200)}...` 
                    : linkContent}
                </p>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-8 text-center">SmartPost 内容智能创作平台</h1>
          
          <div className="mb-8">
            {renderInputArea()}
          </div>
          
          {inputType && (
            <>
              <div className="bg-white border rounded-xl p-6 mb-8">
                <h3 className="text-lg font-medium mb-4">选择目标平台</h3>
                <PlatformSelect onPlatformChange={handlePlatformChange} />
              </div>
              
              <div className="bg-white border rounded-xl p-6 mb-8">
                <h3 className="text-lg font-medium mb-4">选择大模型</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {modelOptions.map((model) => (
                    <div 
                      key={model.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedModel === model.id 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                      onClick={() => handleModelChange(model.id)}
                    >
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {model.description.length > 50 
                          ? `${model.description.substring(0, 50)}...` 
                          : model.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={
                  isGenerating || 
                  isProcessingFile || 
                  (inputType === 'document' && !extractedContent) || 
                  (inputType === 'link' && !linkUrl) ||
                  ((inputType === 'sentence' || inputType === 'longtext') && !inputContent) ||
                  selectedPlatforms.length === 0
                }
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg mb-8"
              >
                {isGenerating ? (
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <SparklesIcon className="h-5 w-5 mr-2" />
                )}
                {isGenerating ? '生成中...' : '立即生成'}
              </button>
            </>
          )}
          
          {Object.keys(generatedContent).length > 0 && (
            <div className="space-y-8">
              <h2 className="text-xl font-semibold">生成内容预览</h2>
              {selectedPlatforms.map((platformId) => {
                const platform = platforms.find(p => p.id === platformId);
                if (!platform) return null;
                
                return (
                  <div key={platformId} className="relative">
                    <GeneratedContent
                      platform={platform}
                      content={generatedContent[platformId] || ''}
                      isLoading={isGenerating && generatingPlatform === platformId}
                      onRegenerateClick={handleRegenerate}
                      onCopy={handleCopy}
                    />
                    <div className="absolute bottom-4 right-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOptimizeWithAI(platformId)}
                        className="bg-white text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-full shadow-sm p-2"
                      >
                        <ChatBubbleLeftRightIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* 对话框 */}
        {isChatOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-lg font-semibold">AI 助手 - 优化 {activePlatform} 内容</h3>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <ChatInterface 
                  initialContent={getContentToProcess()}
                  initialPlatform={activePlatform}
                  onOptimizedContent={handleOptimizedContent}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 