'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { PromptManagement } from './PromptManagement';
import { 
  ChevronDownIcon, 
  PencilSquareIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Popover } from '@/components/ui/Popover';

// 复用相同的自定义提示词类型
export interface CustomPrompt {
  id: string;
  userId: string;
  platform: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
  createdAt: string;
  updatedAt: string;
}

interface PromptSelectorProps {
  userId: string;
  platformId: string;
  onSelectPrompt: (prompt: CustomPrompt | null) => void;
  selectedPromptId?: string | null;
}

export function PromptSelector({ 
  userId, 
  platformId, 
  onSelectPrompt,
  selectedPromptId
}: PromptSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(null);

  useEffect(() => {
    if (userId && platformId) {
      fetchCustomPrompts();
    }
  }, [userId, platformId, isManagementOpen]); // 管理窗口关闭后重新加载

  useEffect(() => {
    if (selectedPromptId && customPrompts.length > 0) {
      const prompt = customPrompts.find(p => p.id === selectedPromptId);
      if (prompt) {
        setSelectedPrompt(prompt);
      }
    }
  }, [selectedPromptId, customPrompts]);

  const fetchCustomPrompts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/platforms/prompts?platform=${platformId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) {
        throw new Error('获取提示词失败');
      }
      const prompts = await response.json();
      setCustomPrompts(prompts);
    } catch (error) {
      console.error('获取提示词失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPrompt = (prompt: CustomPrompt | null) => {
    setSelectedPrompt(prompt);
    onSelectPrompt(prompt);
    setIsOpen(false);
  };

  const handleManagePrompts = () => {
    setIsManagementOpen(true);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          提示词设置
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManagePrompts}
          className="text-xs text-gray-500 hover:text-purple-600 hover:bg-purple-50"
        >
          <PencilSquareIcon className="h-3 w-3 mr-1" />
          管理提示词
        </Button>
      </div>

      <Popover
        open={isOpen}
        onOpenChange={setIsOpen}
        trigger={
          <button
            type="button"
            className={`w-full flex items-center justify-between px-4 py-2.5 border ${selectedPrompt ? 'border-purple-200 bg-purple-50/50' : 'border-gray-200 bg-white'} rounded-xl shadow-sm hover:border-purple-300 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200`}
          >
            <div className="flex items-center min-w-0">
              {selectedPrompt ? (
                <>
                  <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <SparklesIcon className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 ml-2 truncate">{selectedPrompt.name}</span>
                </>
              ) : (
                <>
                  <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <SparklesIcon className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-500 ml-2">使用默认提示词</span>
                </>
              )}
            </div>
            <ChevronDownIcon className={`h-4 w-4 ${selectedPrompt ? 'text-purple-500' : 'text-gray-400'} transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
          </button>
        }
      >
        <div className="w-[calc(100vw-2rem)] sm:w-[320px] bg-white rounded-xl shadow-xl border border-gray-100 py-1 max-h-[300px] overflow-y-auto divide-y divide-gray-100 ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            <button
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-purple-50 flex items-center group transition-colors ${!selectedPrompt ? 'bg-purple-50 text-purple-700' : 'text-gray-700'}`}
              onClick={() => handleSelectPrompt(null)}
            >
              <div className={`h-6 w-6 rounded-full ${!selectedPrompt ? 'bg-purple-100' : 'bg-gray-100 group-hover:bg-purple-100'} flex items-center justify-center flex-shrink-0 transition-colors`}>
                <SparklesIcon className={`h-3.5 w-3.5 ${!selectedPrompt ? 'text-purple-600' : 'text-gray-500 group-hover:text-purple-600'} transition-colors`} />
              </div>
              <span className="ml-2 font-medium">使用默认提示词</span>
            </button>
          </div>
          
          <div className="py-1">
            {isLoading ? (
              <div className="px-4 py-4 text-center">
                <div className="animate-spin inline-block h-5 w-5 border-2 border-purple-500 rounded-full border-t-transparent"></div>
              </div>
            ) : customPrompts.length === 0 ? (
              <div className="px-4 py-4 text-sm text-gray-500 text-center">
                暂无自定义提示词
              </div>
            ) : (
              customPrompts.map(prompt => (
                <button
                  key={prompt.id}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-purple-50 flex items-center group transition-colors ${selectedPrompt?.id === prompt.id ? 'bg-purple-50 text-purple-700' : 'text-gray-700'}`}
                  onClick={() => handleSelectPrompt(prompt)}
                >
                  <div className={`h-6 w-6 rounded-full ${selectedPrompt?.id === prompt.id ? 'bg-purple-100' : 'bg-gray-100 group-hover:bg-purple-100'} flex items-center justify-center flex-shrink-0 transition-colors`}>
                    <SparklesIcon className={`h-3.5 w-3.5 ${selectedPrompt?.id === prompt.id ? 'text-purple-600' : 'text-gray-500 group-hover:text-purple-600'} transition-colors`} />
                  </div>
                  <span className="ml-2 font-medium truncate">{prompt.name}</span>
                </button>
              ))
            )}
          </div>
          
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:text-purple-600 hover:bg-purple-50 flex items-center group transition-colors"
              onClick={handleManagePrompts}
            >
              <div className="h-6 w-6 rounded-full bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center flex-shrink-0 transition-colors">
                <PencilSquareIcon className="h-3.5 w-3.5 text-gray-500 group-hover:text-purple-600 transition-colors" />
              </div>
              <span className="ml-2 font-medium">管理提示词...</span>
            </button>
          </div>
        </div>
      </Popover>

      {/* 提示词管理对话框 */}
      <Dialog
        isOpen={isManagementOpen}
        onClose={() => setIsManagementOpen(false)}
        title=""
        className="max-w-4xl h-[80vh]"
      >
        <PromptManagement
          userId={userId}
          platformId={platformId}
          onSelectPrompt={handleSelectPrompt}
          onClose={() => setIsManagementOpen(false)}
        />
      </Dialog>
    </div>
  );
} 