'use client';

import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { PaperAirplaneIcon, PhotoIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onSendImage?: (imageUrl: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSendMessage, 
  onSendImage, 
  isLoading, 
  placeholder = '输入消息...' 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 调整文本区域的高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [message]);
  
  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      
      // 重置文本区域高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 只有在按下回车键且不按住Shift键且不在输入法组合状态时提交
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSendImage) {
      // 在实际应用中，这里应该上传图片到服务器，然后获取URL
      // 现在我们使用本地URL模拟
      const imageUrl = URL.createObjectURL(file);
      onSendImage(imageUrl);
      
      // 清除文件输入
      e.target.value = '';
    }
  };
  
  return (
    <form 
      onSubmit={handleSubmit} 
      className="relative bg-white border rounded-lg shadow-sm p-2"
    >
      <div className="flex items-center">
        {onSendImage && (
          <label className="cursor-pointer mr-2 text-gray-500 hover:text-purple-600">
            <PhotoIcon className="h-6 w-6" />
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
              disabled={isLoading}
            />
          </label>
        )}
        
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading}
          className="flex-grow resize-none border-0 bg-transparent py-2 px-2 focus:ring-0 focus:outline-none text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50"
        />
        
        <Button 
          type="submit" 
          disabled={!message.trim() || isLoading}
          className="rounded-full p-2 w-10 h-10 flex items-center justify-center"
        >
          {isLoading ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <PaperAirplaneIcon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
} 