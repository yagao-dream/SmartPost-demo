'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/features/Sidebar';
import { Button } from '@/components/ui/Button';
import { generateOptimizedContent } from '@/lib/openrouter';
import { 
  TrashIcon,
  PencilIcon,
  ArrowLeftIcon,
  ClipboardIcon,
  CalendarIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import React from 'react';
import { ChatInterface } from '@/components/features/ChatInterface';

// 定义类型
type PageProps = {
  params: {
    id: string;
  };
};

interface GeneratedContent {
  id: string;
  platform: string;
  content: string;
  title?: string;
  customPrompt: {
    id: string;
    name: string;
  } | null;
}

interface ContentRecord {
  id: string;
  title: string;
  originalContent: string;
  platforms: string[];
  generatedContents: GeneratedContent[];
  model?: string;
  createdAt?: string;
}

export default function ContentDetailPage({ params }: PageProps) {
  const contentId = params.id;
  
  const router = useRouter();
  const [content, setContent] = useState<ContentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPlatform, setGeneratingPlatform] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  
  // 聊天相关状态
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatPlatform, setActiveChatPlatform] = useState('');
  const [activeChatPlatformId, setActiveChatPlatformId] = useState('');
  
  // 为每个内容ID创建唯一的会话ID，确保不同内容间对话不混淆
  const sessionId = `content_${contentId}`;

  useEffect(() => {
    if (contentId) {
      fetchContent(contentId);
    }
  }, [contentId]);

  const fetchContent = async (id: string) => {
    try {
      setIsLoading(true);
      
      console.log('正在获取内容ID:', id);
      const response = await fetch(`/api/content/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('获取内容失败');
      }

      const data = await response.json();
      console.log("获取到的内容:", data.record);
      
      if (!data.record) {
        throw new Error('API返回数据格式错误');
      }
      
      // 确保generatedContents存在并且是数组
      if (!data.record.generatedContents || !Array.isArray(data.record.generatedContents)) {
        console.warn('API返回的generatedContents不是数组，使用空数组替代');
        data.record.generatedContents = [];
      }
      
      // 确保platforms存在并且是数组
      if (!data.record.platforms || !Array.isArray(data.record.platforms)) {
        console.warn('API返回的platforms不是数组，使用空数组替代');
        data.record.platforms = [];
      }
      
      setContent(data.record);
    } catch (error) {
      console.error('获取内容失败:', error);
      setError(error instanceof Error ? error.message : '获取内容失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateContent = async (platform: string) => {
    if (!content || !content.originalContent) {
      setError('无原始内容可生成');
      return;
    }
    
    setIsGenerating(true);
    setGeneratingPlatform(platform);
    
    try {
      const optimizedContent = await generateOptimizedContent(
        content.originalContent,
        platform,
        content.model || "google/gemini-2.0-flash-001"
      );
      
      // 创建生成内容记录
      const response = await fetch(`/api/content/${contentId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          platform,
          content: optimizedContent
        })
      });
      
      if (!response.ok) {
        throw new Error('保存生成内容失败');
      }
      
      // 刷新内容
      await fetchContent(contentId);
      
    } catch (error) {
      console.error('生成内容失败:', error);
      setError(error instanceof Error ? error.message : '生成内容失败');
    } finally {
      setIsGenerating(false);
      setGeneratingPlatform(null);
    }
  };

  const handleDelete = async () => {
    if (!contentId || !confirm('确定要删除这个内容吗？此操作不可撤销。')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/content?id=${contentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('删除内容失败');
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('删除内容失败:', error);
      setError(error instanceof Error ? error.message : '删除内容失败');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (contentId) {
      router.push(`/content/edit/${contentId}`);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCopy = (text: string, platform: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedPlatform(platform);
        setTimeout(() => setCopiedPlatform(null), 2000);
      })
      .catch(err => console.error('复制失败:', err));
  };

  const getPlatformName = (platform: string) => {
    switch(platform) {
      case 'twitter': return 'Twitter';
      case 'xiaohongshu': return '小红书';
      case 'zhihu': return '知乎';
      case 'weibo': return '微博';
      default: return platform;
    }
  };

  // 处理打开聊天对话
  const handleOpenChat = (platform: string, content: string) => {
    setActiveChatPlatform(getPlatformName(platform));
    setActiveChatPlatformId(platform);
    setIsChatOpen(true);
  };

  // 处理聊天优化内容更新
  const handleChatOptimizedContent = async (optimizedContent: string) => {
    if (!activeChatPlatformId) return;
    
    try {
      // 立即更新UI上显示的内容
      setContent(prev => {
        if (!prev) return prev;
        
        const updatedGeneratedContents = prev.generatedContents.map(gc => {
          if (gc.platform === activeChatPlatformId) {
            return { ...gc, content: optimizedContent };
          }
          return gc;
        });
        
        return {
          ...prev,
          generatedContents: updatedGeneratedContents
        };
      });
      
      // 更新生成内容记录到服务器
      const response = await fetch(`/api/content/${contentId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          platform: activeChatPlatformId,
          content: optimizedContent
        })
      });
      
      if (!response.ok) {
        throw new Error('保存优化内容失败');
      }
      
    } catch (error) {
      console.error('保存优化内容失败:', error);
      setError(error instanceof Error ? error.message : '保存优化内容失败');
      // 出错时刷新获取最新内容
      await fetchContent(contentId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error || '内容不存在'}</div>
      </div>
    );
  }

  // 检查哪些平台尚未生成内容
  const generatedPlatforms = new Set(content.generatedContents.map(gc => gc.platform));
  const missingPlatforms = content.platforms.filter(platform => !generatedPlatforms.has(platform));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mr-4"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-800">{content.title}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleEdit}
                className="text-gray-600"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                编辑
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                className="text-red-600"
                disabled={isDeleting}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {isDeleting ? '删除中...' : '删除'}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">内容详情</h2>
              <div className="flex items-center text-sm text-gray-500">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {formatDate(content.createdAt || '')}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">使用模型</p>
                <p className="font-medium">{content.model || '未指定'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">优化平台</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {content.platforms.map(platform => (
                    <span key={platform} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {getPlatformName(platform)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">原始内容</h2>
            <div className="prose max-w-none whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
              {content.originalContent || '无原始内容'}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">生成内容</h2>
            
            {content.generatedContents.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
                暂无生成内容
                {content.platforms.length > 0 && (
                  <div className="flex justify-center mt-4 space-x-2">
                    {content.platforms.map(platform => (
                      <Button
                        key={platform}
                        onClick={() => handleGenerateContent(platform)}
                        disabled={isGenerating}
                        size="sm"
                        className="flex items-center"
                      >
                        {isGenerating && generatingPlatform === platform ? (
                          <div className="mr-1 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                        ) : (
                          <BoltIcon className="h-4 w-4 mr-1" />
                        )}
                        生成{getPlatformName(platform)}内容
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {content.generatedContents.map(generatedContent => (
                  <div key={generatedContent.id} className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-900">
                        {getPlatformName(generatedContent.platform)}
                      </h3>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(generatedContent.content, generatedContent.platform)}
                          className="flex items-center"
                        >
                          <ClipboardIcon className="h-4 w-4 mr-1" />
                          {copiedPlatform === generatedContent.platform ? '已复制' : '复制'}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenChat(generatedContent.platform, generatedContent.content)}
                          className="flex items-center"
                        >
                          <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                          优化
                        </Button>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md whitespace-pre-wrap text-sm">
                      {generatedContent.content}
                    </div>
                  </div>
                ))}
                
                {/* 显示未生成内容的平台 */}
                {missingPlatforms.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">尚未生成的平台:</h3>
                    <div className="flex flex-wrap gap-2">
                      {missingPlatforms.map(platform => (
                        <Button
                          key={platform}
                          onClick={() => handleGenerateContent(platform)}
                          disabled={isGenerating}
                          size="sm"
                          className="flex items-center"
                        >
                          {isGenerating && generatingPlatform === platform ? (
                            <div className="mr-1 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                          ) : (
                            <BoltIcon className="h-4 w-4 mr-1" />
                          )}
                          生成{getPlatformName(platform)}内容
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 聊天对话框 */}
      {isChatOpen && content && (
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
                initialContent={content.originalContent}
                initialPlatform={activeChatPlatform}
                currentContent={content.generatedContents.find(gc => gc.platform === activeChatPlatformId)?.content || ''}
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