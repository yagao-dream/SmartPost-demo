'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/features/Sidebar';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { PlatformSelect } from '@/components/features/PlatformSelect';
import { generateOptimizedContent } from '@/lib/openrouter';
import { 
  ArrowLeftIcon,
  CheckIcon,
  TrashIcon,
  ClipboardIcon
} from '@heroicons/react/24/outline';
import React from 'react';

interface GeneratedContent {
  id: string;
  platform: string;
  content: string;
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

export default function EditContentPage({ params }: { params: { id: string } }) {
  const contentId = params.id;
  
  const router = useRouter();
  const [content, setContent] = useState<ContentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [generatedContents, setGeneratedContents] = useState<GeneratedContent[]>([]);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (contentId) {
      fetchContent(contentId);
    }
  }, [contentId]);

  const fetchContent = async (id: string) => {
    try {
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
      setContent(data.record);
      setTitle(data.record.title);
      setOriginalContent(data.record.originalContent);
      setSelectedPlatforms(data.record.platforms);
      setGeneratedContents(data.record.generatedContents);
    } catch (error) {
      console.error('获取内容失败:', error);
      setError(error instanceof Error ? error.message : '获取内容失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!contentId || !title.trim() || !originalContent.trim() || selectedPlatforms.length === 0) {
      setError('请填写所有必填字段');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/content?id=${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          title,
          originalContent,
          platforms: selectedPlatforms,
          generatedContents
        })
      });

      if (!response.ok) {
        throw new Error('保存内容失败');
      }

      router.push(`/content/${contentId}`);
    } catch (error) {
      console.error('保存内容失败:', error);
      setError(error instanceof Error ? error.message : '保存内容失败');
    } finally {
      setIsSaving(false);
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

  const handleGenerateContent = async (platform: string) => {
    try {
      const result = await generateOptimizedContent(originalContent, platform);
      const newGeneratedContent = {
        id: Date.now().toString(),
        platform,
        content: result,
        customPrompt: null
      };
      setGeneratedContents(prev => [...prev, newGeneratedContent]);
    } catch (error) {
      console.error('生成内容失败:', error);
      setError(error instanceof Error ? error.message : '生成内容失败');
    }
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
              <h1 className="text-2xl font-bold text-gray-800">编辑内容</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleDelete}
                className="text-red-600"
                disabled={isDeleting}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {isDeleting ? '删除中...' : '删除'}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>

          {content && content.model && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">使用模型</p>
                  <p className="font-medium">{content.model || '未指定'}</p>
                </div>
                {content.createdAt && (
                  <div>
                    <p className="text-sm text-gray-500">创建时间</p>
                    <p className="font-medium">{new Date(content.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">标题</h2>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入标题"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">原始内容</h2>
              <Textarea
                value={originalContent}
                onChange={(e) => setOriginalContent(e.target.value)}
                placeholder="请输入原始内容"
                rows={10}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">选择平台</h2>
              <PlatformSelect
                initialSelected={selectedPlatforms}
                onPlatformChange={setSelectedPlatforms}
                multiSelect={true}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">生成的内容</h2>
              
              {generatedContents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无生成内容
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedContents.map((generated) => (
                    <div key={generated.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2">
                            {getPlatformName(generated.platform)}
                          </span>
                          {generated.customPrompt && (
                            <span className="text-sm text-gray-500">
                              使用提示词: {generated.customPrompt.name}
                            </span>
                          )}
                          {!generated.customPrompt && (
                            <span className="text-sm text-gray-500">
                              使用默认提示词
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-gray-700"
                            onClick={() => handleCopy(generated.content, generated.platform)}
                          >
                            <ClipboardIcon className="h-4 w-4 mr-1" />
                            {copiedPlatform === generated.platform ? '已复制' : '复制'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateContent(generated.platform)}
                            className="text-sm"
                          >
                            重新生成
                          </Button>
                        </div>
                      </div>
                      <div className="prose max-w-none bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                        {generated.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 