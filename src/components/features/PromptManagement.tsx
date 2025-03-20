'use client';

import { useState, useEffect } from 'react';
import { platforms } from '@/lib/utils';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

// 自定义提示词接口
interface CustomPrompt {
  id: string;
  userId: string;
  platform: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
  createdAt: string;
  updatedAt: string;
}

interface PromptManagementProps {
  userId: string;
  platformId?: string;
  onSelectPrompt?: (prompt: CustomPrompt | null) => void;
  onClose?: () => void;
}

export function PromptManagement({ 
  userId, 
  platformId,
  onSelectPrompt,
  onClose 
}: PromptManagementProps) {
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // 编辑状态
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedPlatformId, setSelectedPlatformId] = useState(platformId || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    fetchCustomPrompts();
  }, [userId, platformId]);
  
  const fetchCustomPrompts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 检查用户ID是否存在
      if (!userId) {
        setError('用户未登录，无法获取提示词');
        setIsLoading(false);
        return;
      }
      
      // 设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // 构建 URL
      const url = platformId 
        ? `/api/platforms/prompts?platform=${platformId}`
        : '/api/platforms/prompts';
      
      // 获取提示词数据
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`获取失败: ${response.status}`);
      }
      
      const prompts = await response.json();
      setCustomPrompts(prompts);
    } catch (error) {
      console.error('获取自定义提示词失败:', error);
      setError(error instanceof Error ? error.message : '获取提示词失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateNew = () => {
    setError(null);
    setSelectedPrompt(null);
    setName('');
    setSystemPrompt('');
    setUserPrompt('');
    setSelectedPlatformId(platformId || '');
    setIsCreating(true);
    setIsEditing(true);
  };
  
  const handleSelectPrompt = (prompt: CustomPrompt) => {
    setError(null);
    setSelectedPrompt(prompt);
    setName(prompt.name);
    setSystemPrompt(prompt.systemPrompt);
    setUserPrompt(prompt.userPrompt);
    setSelectedPlatformId(prompt.platform);
    setIsCreating(false);
    
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
    }
  };
  
  const handleEditPrompt = () => {
    setError(null);
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setError(null);
    if (selectedPrompt) {
      setName(selectedPrompt.name);
      setSystemPrompt(selectedPrompt.systemPrompt);
      setUserPrompt(selectedPrompt.userPrompt);
      setSelectedPlatformId(selectedPrompt.platform);
    } else {
      setName('');
      setSystemPrompt('');
      setUserPrompt('');
      setSelectedPlatformId(platformId || '');
    }
    setIsEditing(false);
    setIsCreating(false);
  };
  
  const handleSavePrompt = async () => {
    if (!name.trim() || !systemPrompt.trim() || !userPrompt.trim() || !selectedPlatformId) {
      setError('请填写所有必填字段');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // 添加超时处理
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const promptData = {
        name,
        systemPrompt,
        userPrompt,
        platform: selectedPlatformId
      };
      
      // 根据是创建还是更新选择不同的操作
      let response;
      if (isCreating) {
        // 创建新提示词
        response = await fetch('/api/platforms/prompts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(promptData),
          signal: controller.signal
        });
      } else if (selectedPrompt) {
        // 更新现有提示词
        response = await fetch(`/api/platforms/prompts?id=${selectedPrompt.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(promptData),
          signal: controller.signal
        });
      } else {
        throw new Error('无效的操作');
      }
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '操作失败');
      }
      
      // 刷新提示词列表
      await fetchCustomPrompts();
      setIsEditing(false);
      setIsCreating(false);
    } catch (error) {
      console.error('保存提示词失败:', error);
      setError(error instanceof Error ? error.message : '保存提示词失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('确定要删除这个提示词吗？此操作不可撤销。')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/platforms/prompts?id=${promptId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除失败');
      }
      
      setSelectedPrompt(null);
      await fetchCustomPrompts();
    } catch (error) {
      console.error('删除提示词失败:', error);
      setError(error instanceof Error ? error.message : '删除失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUsePrompt = () => {
    if (selectedPrompt && onSelectPrompt) {
      onSelectPrompt(selectedPrompt);
      if (onClose) {
        onClose();
      }
    }
  };
  
  const getPlatformName = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform ? platform.name : '未知平台';
  };
  
  const handleRetry = () => {
    if (isEditing) {
      handleSavePrompt();
    } else {
      fetchCustomPrompts();
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex justify-between items-center border-b px-4 py-3">
        <h2 className="text-lg font-semibold">提示词管理</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* 显示全局错误信息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 m-4 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <XMarkIcon className="h-5 w-5 text-red-500" />
          </button>
        </div>
      )}
      
      <div className="flex h-[calc(100%-57px)]">
        {/* 左侧提示词列表 */}
        <div className="w-64 border-r h-full overflow-y-auto">
          <div className="p-3 border-b">
            <Button
              onClick={handleCreateNew}
              variant="outline"
              className="w-full text-sm"
              size="sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              创建新提示词
            </Button>
          </div>
          
          <div className="divide-y">
            {isLoading ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : customPrompts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {error ? (
                  <div className="mt-2">
                    <Button 
                      onClick={handleRetry} 
                      variant="outline" 
                      size="sm"
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      重试
                    </Button>
                  </div>
                ) : (
                  '暂无自定义提示词'
                )}
              </div>
            ) : (
              customPrompts.map((prompt) => (
                <div 
                  key={prompt.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedPrompt?.id === prompt.id ? 'bg-purple-50' : ''}`}
                  onClick={() => handleSelectPrompt(prompt)}
                >
                  <div className="font-medium text-sm truncate">{prompt.name}</div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-xs text-gray-500">{getPlatformName(prompt.platform)}</div>
                    <div className="flex space-x-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPrompt(prompt);
                          handleEditPrompt();
                        }}
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <PencilIcon className="h-3 w-3 text-gray-500" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPrompt(prompt);
                          handleDeletePrompt(prompt.id);
                        }}
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <TrashIcon className="h-3 w-3 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* 右侧详情/编辑区域 */}
        <div className="flex-1 p-4 overflow-y-auto">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  提示词名称
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="为你的提示词起个名字"
                />
              </div>
              
              {!platformId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    适用平台
                  </label>
                  <select
                    value={selectedPlatformId}
                    onChange={(e) => setSelectedPlatformId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">选择平台</option>
                    {platforms.map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  系统提示词
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 min-h-[100px]"
                  placeholder="输入系统提示词，用于指定AI的角色和行为"
                />
                <p className="mt-1 text-xs text-gray-500">
                  提示: 描述AI的角色和行为，例如"你是Twitter内容创作专家"
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户提示词
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 min-h-[150px]"
                  placeholder="输入用户提示词，用于指定具体的任务和要求"
                />
                <p className="mt-1 text-xs text-gray-500">
                  提示: 使用{`{content}`}作为要处理的内容的占位符，{`{maxLength}`}作为平台字数限制的占位符
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-3">
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  disabled={isSaving}
                >
                  取消
                </Button>
                <Button
                  onClick={handleSavePrompt}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-4 w-4 mr-1" />
                      保存
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : selectedPrompt ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">{selectedPrompt.name}</h3>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleEditPrompt}
                    variant="outline"
                    size="sm"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    编辑
                  </Button>
                  {onSelectPrompt && (
                    <Button
                      onClick={handleUsePrompt}
                      size="sm"
                    >
                      使用此提示词
                    </Button>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">适用平台</h4>
                <div className="text-sm bg-gray-50 rounded p-3">
                  {getPlatformName(selectedPrompt.platform)}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">系统提示词</h4>
                <div className="text-sm bg-gray-50 rounded p-3 whitespace-pre-wrap">
                  {selectedPrompt.systemPrompt}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">用户提示词</h4>
                <div className="text-sm bg-gray-50 rounded p-3 whitespace-pre-wrap">
                  {selectedPrompt.userPrompt}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="mb-4">选择或创建一个提示词</p>
              <Button
                onClick={handleCreateNew}
                variant="outline"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                创建新提示词
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 