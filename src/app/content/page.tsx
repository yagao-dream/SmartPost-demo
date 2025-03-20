'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/features/Sidebar';
import { useAuth } from '@/lib/AuthContext';
import { 
  ArrowPathIcon,
  DocumentIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  DocumentTextIcon,
  BoltIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  LinkIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  ArrowDownTrayIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { FileUpload } from '@/components/features/FileUpload';
import { PlatformSelect } from '@/components/features/PlatformSelect';
import { ContentTextarea } from '@/components/features/ContentTextarea';
import { GeneratedContent } from '@/components/features/GeneratedContent';
import { PromptSelector } from '@/components/features/PromptSelector';
import { Button } from '@/components/ui/Button';
import { platforms } from '@/lib/utils';
import { generateOptimizedContent } from '@/lib/openrouter';
import { extractTextFromFile, fetchContentFromUrl } from '@/lib/fileProcessing';
import { CustomPrompt } from '@/types/prompt';
import { formatBytes } from '@/lib/utils';
import { modelOptions } from '@/lib/openrouter';
import { ChatInterface } from '@/components/features/ChatInterface';

type InputType = 'sentence' | 'longtext' | 'document' | 'link' | null;

export default function ContentPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  
  // 创建文案相关状态
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedModel] = useState("google/gemini-2.0-flash-001");
  const [inputContent, setInputContent] = useState('');
  const [inputType, setInputType] = useState<InputType>(null);
  const [extractedContent, setExtractedContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkContent, setLinkContent] = useState('');
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPlatform, setGeneratingPlatform] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState('');
  
  // 自定义提示词相关状态
  const [selectedPrompts, setSelectedPrompts] = useState<Record<string, CustomPrompt | null>>({});
  
  // 添加聊天相关状态
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatPlatform, setActiveChatPlatform] = useState('');
  const [activeChatPlatformId, setActiveChatPlatformId] = useState('');
  
  // 会话唯一ID，用于保持对话上下文
  const [sessionId] = useState(() => `session_${Date.now()}`);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);
  
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
        setProcessingMessage(`正在处理 ${file.name}...`);
        
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          setProcessingMessage(`正在解析PDF文件: ${file.name}，这可能需要一些时间...`);
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

  const handleFileSelect = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setInputType('document');
  };

  const handlePlatformChange = (platforms: string[]) => {
    setSelectedPlatforms(platforms);
    
    // 初始化新选择的平台的提示词状态
    const updatedPrompts = { ...selectedPrompts };
    platforms.forEach(platformId => {
      if (!updatedPrompts[platformId]) {
        updatedPrompts[platformId] = null; // 默认使用系统提示词
      }
    });
    
    // 移除不再选择的平台
    Object.keys(updatedPrompts).forEach(platformId => {
      if (!platforms.includes(platformId)) {
        delete updatedPrompts[platformId];
      }
    });
    
    setSelectedPrompts(updatedPrompts);
  };

  const handleSelectPrompt = (platformId: string, prompt: CustomPrompt | null) => {
    setSelectedPrompts(prev => ({
      ...prev,
      [platformId]: prompt
    }));
  };

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
      setExtractedContent(content); // 同时设置提取的内容，保持一致性
    } catch (error) {
      console.error('抓取链接内容时出错:', error);
      alert('抓取链接内容时出错，请检查URL或稍后重试');
      setLinkContent('');
    } finally {
      setIsLoadingLink(false);
    }
  };

  // 更新获取处理内容的函数，添加链接支持
  const getContentToProcess = () => {
    if (inputType === 'document') {
      return extractedContent;
    } else if (inputType === 'link') {
      return linkContent || `从链接获取内容: ${linkUrl}`;
    } else {
      return inputContent;
    }
  };

  // 更新选择输入类型函数，添加对链接的支持
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

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      alert('请至少选择一个目标平台');
      return;
    }

    const contentToProcess = getContentToProcess();
    
    if (!contentToProcess.trim()) {
      alert('请输入要处理的内容');
      return;
    }

    setIsGenerating(true);
    const newGeneratedContent = { ...generatedContent };

    for (const platform of selectedPlatforms) {
      try {
        setGeneratingPlatform(platform);
        
        // 使用API生成内容，使用自定义提示词或默认提示词
        const customPrompt = selectedPrompts[platform] || null;
        const optimizedContent = await generateOptimizedContent(
          contentToProcess,
          platform,
          "google/gemini-2.0-flash-001",
          customPrompt
        );
        
        // 保存生成的内容
        newGeneratedContent[platform] = optimizedContent;
        
      } catch (error) {
        console.error(`为 ${platform} 生成内容时出错:`, error);
        alert(`为 ${platforms.find(p => p.id === platform)?.name} 生成内容时出错，请重试`);
      }
    }

    setGeneratedContent(newGeneratedContent);
    setGeneratingPlatform(null);
    setIsGenerating(false);
  };

  const handleSaveContent = async () => {
    if (!currentUser) {
      setError('请先登录');
      router.push('/login');
      return;
    }

    if (Object.keys(generatedContent).length === 0) {
      setError('请先生成内容');
      return;
    }

    if (!title.trim()) {
      setError('请输入内容标题');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // 准备生成内容数据
      const generatedContentData: Record<string, string> = {};
      const platformsWithContent: string[] = [];
      
      for (const platform of selectedPlatforms) {
        if (generatedContent[platform]) {
          generatedContentData[platform] = generatedContent[platform];
          platformsWithContent.push(platform);
        }
      }
      
      if (platformsWithContent.length === 0) {
        setError('没有生成任何平台的内容');
        setIsSaving(false);
        return;
      }

      // 准备保存的数据
      const contentData = {
        title: title.trim(),
        platforms: platformsWithContent,
        originalContent: getContentToProcess(),
        model: selectedModel,
        generatedContent: generatedContentData,
        customPrompts: Object.entries(selectedPrompts).reduce((acc, [platformId, prompt]) => {
          if (platformsWithContent.includes(platformId)) {
            acc[platformId] = prompt ? prompt.id : null;
          }
          return acc;
        }, {} as Record<string, string | null>)
      };
      
      console.log('准备保存内容:', {
        title: contentData.title,
        platforms: contentData.platforms,
        originalContentLength: contentData.originalContent.length,
        generatedContentKeys: Object.keys(contentData.generatedContent)
      });
      
      // 保存内容
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(contentData)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('保存内容失败，状态码:', response.status, responseData);
        throw new Error(responseData.error || '保存失败');
      }

      console.log('内容保存成功:', responseData);
      
      // 保存成功，跳转到内容详情页
      if (responseData.contentId) {
        router.push(`/content/${responseData.contentId}`);
      } else {
        console.error('返回数据缺少contentId:', responseData);
        setError('保存成功但无法获取内容ID');
      }
    } catch (error) {
      console.error('保存内容失败:', error);
      setError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentUpdate = (platformId: string, optimizedContent: string) => {
    setGeneratedContent({
      ...generatedContent,
      [platformId]: optimizedContent
    });
  };

  // 处理为单个平台重新生成内容
  const handleRegenerateForPlatform = async (platformId: string) => {
    if (!getContentToProcess().trim()) {
      alert('请输入要处理的内容');
      return;
    }

    setIsGenerating(true);
    setGeneratingPlatform(platformId);

    try {
      // 使用API重新生成内容
      const customPrompt = selectedPrompts[platformId] || null;
      const optimizedContent = await generateOptimizedContent(
        getContentToProcess(),
        platformId,
        "google/gemini-2.0-flash-001",
        customPrompt
      );
      
      // 更新生成的内容
      setGeneratedContent(prev => ({
        ...prev,
        [platformId]: optimizedContent
      }));
    } catch (error) {
      console.error(`为 ${platformId} 重新生成内容时出错:`, error);
      alert(`重新生成内容时出错，请重试`);
    } finally {
      setIsGenerating(false);
      setGeneratingPlatform(null);
    }
  };

  // 处理复制内容到剪贴板
  const handleCopyContent = (platformId: string) => {
    const content = generatedContent[platformId];
    if (!content) return;
    
    navigator.clipboard.writeText(content)
      .then(() => alert('内容已复制到剪贴板'))
      .catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
      });
  };

  // 处理打开聊天对话
  const handleOpenChat = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return;
    
    setActiveChatPlatform(platform.name);
    setActiveChatPlatformId(platformId);
    setIsChatOpen(true);
  };

  // 处理聊天优化内容更新
  const handleChatOptimizedContent = (content: string) => {
    if (activeChatPlatformId) {
      // 直接更新生成内容
      setGeneratedContent(prev => ({
        ...prev,
        [activeChatPlatformId]: content
      }));
    }
  };
  
  // 添加导出内容函数

  // 导出为文本
  const exportAsText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 导出为Markdown
  const exportAsMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 导出为PDF
  const exportAsPDF = async (content: string, filename: string) => {
    try {
      // 创建一个临时的 div 元素
      const element = document.createElement('div');
      element.style.width = '210mm'; // A4 纸宽度
      element.style.padding = '20mm'; // 页边距
      element.style.fontFamily = 'Arial, "Microsoft YaHei", sans-serif'; // 使用系统中文字体
      element.style.fontSize = '12pt';
      element.style.lineHeight = '1.5';
      element.style.whiteSpace = 'pre-wrap';
      element.style.wordBreak = 'break-word';
      element.innerHTML = content.replace(/\n/g, '<br>');
      
      document.body.appendChild(element);
      
      // 导入 html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      // 配置选项
      const opt = {
        margin: 10,
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      };
      
      // 生成 PDF
      await html2pdf().from(element).set(opt).save();
      
      // 移除临时元素
      document.body.removeChild(element);
    } catch (error) {
      console.error('导出PDF失败:', error);
      alert('导出PDF失败，请稍后重试');
    }
  };

  // 导出为图片
  const exportAsImage = async (content: string, filename: string) => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.padding = '20px';
      tempDiv.style.width = '600px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.innerText = content;
      
      document.body.appendChild(tempDiv);
      
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(tempDiv);
      
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
      
      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('导出图片失败:', error);
      alert('导出图片失败，请稍后重试');
    }
  };

  // 处理导出内容
  const handleExportContent = (platformId: string, format: 'text' | 'pdf' | 'markdown' | 'image') => {
    const content = generatedContent[platformId];
    if (!content) return;
    
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return;
    
    const filename = `${platform.name}_内容_${new Date().toLocaleDateString('zh-CN')}`;
    
    // 关闭导出菜单
    const exportMenu = document.getElementById(`export-menu-${platformId}`);
    if (exportMenu) {
      exportMenu.classList.add('hidden');
    }
    
    switch (format) {
      case 'text':
        exportAsText(content, filename);
        break;
      case 'pdf':
        exportAsPDF(content, filename);
        break;
      case 'markdown':
        exportAsMarkdown(content, filename);
        break;
      case 'image':
        exportAsImage(content, filename);
        break;
    }
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  // 渲染输入区域
  const renderInputArea = () => {
    if (!inputType) {
      return (
        <div className="flex flex-wrap gap-4 justify-center my-8">
          <div 
            className="w-40 h-40 bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
            onClick={() => handleInputTypeSelect('sentence')}
          >
            <ChatBubbleOvalLeftEllipsisIcon className="h-10 w-10 text-purple-500" />
            <span className="text-sm font-medium">一句话</span>
          </div>
          
          <div 
            className="w-40 h-40 bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
            onClick={() => handleInputTypeSelect('longtext')}
          >
            <DocumentTextIcon className="h-10 w-10 text-purple-500" />
            <span className="text-sm font-medium">长文本</span>
          </div>
          
          <div 
            className="w-40 h-40 bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
            onClick={() => handleInputTypeSelect('document')}
          >
            <div className="flex flex-col items-center">
              <div className="flex">
                <DocumentIcon className="h-10 w-10 text-purple-500" />
                <PhotoIcon className="h-10 w-10 text-purple-500 -ml-2" />
              </div>
              <span className="text-sm font-medium">文档/图片</span>
            </div>
          </div>
          
          <div 
            className="w-40 h-40 bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
            onClick={() => handleInputTypeSelect('link')}
          >
            <LinkIcon className="h-10 w-10 text-purple-500" />
            <span className="text-sm font-medium">链接</span>
          </div>
        </div>
      );
    }

    switch (inputType) {
      case 'sentence':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">一句话描述</h3>
              <button 
                onClick={() => handleInputTypeSelect(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <textarea
              className="w-full border-gray-300 border rounded-lg p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="请输入简短的内容描述..."
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
            />
          </div>
        );
        
      case 'longtext':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">长文本输入</h3>
              <button 
                onClick={() => handleInputTypeSelect(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <textarea
              className="w-full border-gray-300 border rounded-lg p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="请输入详细内容..."
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
            />
          </div>
        );
        
      case 'document':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">上传文档或图片</h3>
              <button 
                onClick={() => handleInputTypeSelect(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
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
              <p className="text-sm text-gray-500">
                {files.length > 0 
                  ? `已选择: ${files[0].name} (${formatBytes(files[0].size)})` 
                  : "点击上传，支持 PDF、Word、TXT 文档和 PNG、JPG 图片"}
              </p>
            </div>
            
            {isProcessingFile && (
              <div className="text-center py-4">
                <ArrowPathIcon className="h-5 w-5 animate-spin inline-block mr-2" />
                <span className="text-sm text-gray-500">{processingMessage || '正在处理文件...'}</span>
              </div>
            )}
            
            {extractedContent && !isProcessingFile && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">内容预览</h4>
                <div className="max-h-[200px] overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {extractedContent.length > 500 
                      ? `${extractedContent.substring(0, 500)}...` 
                      : extractedContent}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'link':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">输入链接</h3>
              <button 
                onClick={() => handleInputTypeSelect(null)}
                className="text-gray-400 hover:text-gray-600"
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
              <div className="text-center py-4">
                <ArrowPathIcon className="h-5 w-5 animate-spin inline-block mr-2" />
                <span className="text-sm text-gray-500">正在抓取链接内容，请稍候...</span>
              </div>
            )}
            
            {linkContent && !isLoadingLink && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">抓取的内容预览</h4>
                <div className="max-h-[200px] overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {linkContent.length > 500 
                      ? `${linkContent.substring(0, 500)}...` 
                      : linkContent}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">创建新内容</h1>
          
          <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="mb-6">
              <label 
                htmlFor="title" 
                className="block text-sm font-medium mb-1"
              >
                内容标题
              </label>
              <input
                id="title"
                type="text"
                className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="请输入标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            {!inputType ? (
              <div className="space-y-4">
                <h3 className="font-medium">选择输入方式</h3>
                {renderInputArea()}
              </div>
            ) : (
              <div className="space-y-6">
                {renderInputArea()}
                
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-4">选择目标平台</h3>
                  <PlatformSelect onPlatformChange={handlePlatformChange} />
                </div>
                
                {selectedPlatforms.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleGenerate}
                        disabled={isGenerating || isProcessingFile || isLoadingLink || (!extractedContent && !inputContent && !linkContent)}
                        className="flex items-center space-x-2"
                      >
                        {isGenerating ? (
                          <>
                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            <span>生成中...</span>
                          </>
                        ) : (
                          <>
                            <BoltIcon className="h-5 w-5" />
                            <span>生成内容</span>
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {selectedPlatforms.map(platformId => {
                      const platform = platforms.find(p => p.id === platformId);
                      if (!platform) return null;
                      
                      return (
                        <div 
                          key={platformId} 
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{platform.name}</span>
                              {isGenerating && generatingPlatform === platformId && (
                                <ArrowPathIcon className="h-4 w-4 animate-spin text-purple-500" />
                              )}
                            </div>
                            <PromptSelector 
                              userId={currentUser?.id || ''}
                              platformId={platformId}
                              onSelectPrompt={(prompt: CustomPrompt | null) => handleSelectPrompt(platformId, prompt)} 
                              selectedPromptId={selectedPrompts[platformId]?.id}
                            />
                          </div>
                          
                          {generatedContent[platformId] ? (
                            <div className="space-y-2">
                              <textarea
                                className="w-full border-gray-300 border rounded-lg p-3 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={generatedContent[platformId]}
                                onChange={(e) => {
                                  setGeneratedContent({
                                    ...generatedContent,
                                    [platformId]: e.target.value
                                  });
                                }}
                              />
                              
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRegenerateForPlatform(platformId)}
                                  disabled={isGenerating}
                                >
                                  重新生成
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCopyContent(platformId)}
                                >
                                  复制
                                </Button>
                                <div className="relative">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const exportMenu = document.getElementById(`export-menu-${platformId}`);
                                      if (exportMenu) {
                                        exportMenu.classList.toggle('hidden');
                                      }
                                    }}
                                    className="flex items-center space-x-1"
                                  >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                    <span>导出</span>
                                  </Button>
                                  <div 
                                    id={`export-menu-${platformId}`} 
                                    className="absolute right-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-10 hidden"
                                  >
                                    <div className="py-1">
                                      <button
                                        onClick={() => handleExportContent(platformId, 'text')}
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      >
                                        <DocumentTextIcon className="h-4 w-4 mr-2" />
                                        导出为文本文件 (.txt)
                                      </button>
                                      <button
                                        onClick={() => handleExportContent(platformId, 'markdown')}
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      >
                                        <CodeBracketIcon className="h-4 w-4 mr-2" />
                                        导出为Markdown (.md)
                                      </button>
                                      <button
                                        onClick={() => handleExportContent(platformId, 'pdf')}
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      >
                                        <DocumentIcon className="h-4 w-4 mr-2" />
                                        导出为PDF (.pdf)
                                      </button>
                                      <button
                                        onClick={() => handleExportContent(platformId, 'image')}
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      >
                                        <PhotoIcon className="h-4 w-4 mr-2" />
                                        导出为图片 (.png)
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenChat(platformId)}
                                  className="flex items-center space-x-1 text-purple-600"
                                >
                                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                  <span>AI对话</span>
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="h-[150px] border border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                              <p className="text-gray-400 text-sm">点击"生成内容"按钮生成</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {Object.keys(generatedContent).length > 0 && (
              <div className="mt-8 pt-6 border-t flex justify-between">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/content')}
                    disabled={isSaving}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleSaveContent}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                        保存中...
                      </>
                    ) : '保存内容'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 聊天对话框 */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold">AI 助手 - 优化 {activeChatPlatform} 内容</h3>
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
                initialPlatform={activeChatPlatform}
                currentContent={generatedContent[activeChatPlatformId] || ''}
                onOptimizedContent={handleChatOptimizedContent}
                sessionId={sessionId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 