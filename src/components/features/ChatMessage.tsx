'use client';

import { Message } from '@/lib/openrouter';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  // 处理消息内容
  const renderContent = () => {
    // 如果内容是字符串
    if (typeof message.content === 'string') {
      return (
        <div className="whitespace-pre-wrap">
          {message.content}
        </div>
      );
    }
    
    // 如果内容是数组（多模态内容）
    return (
      <>
        {message.content.map((part, index) => {
          if (part.type === 'text' && part.text) {
            return (
              <div key={index} className="whitespace-pre-wrap">
                {part.text}
              </div>
            );
          } else if (part.type === 'image_url' && part.image_url) {
            return (
              <img 
                key={index} 
                src={part.image_url.url} 
                alt="用户上传的图片"
                className="max-w-full h-auto rounded-md mt-2 mb-2"
                style={{ maxHeight: '300px' }} 
              />
            );
          }
          return null;
        })}
      </>
    );
  };
  
  return (
    <div 
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div 
        className={`
          max-w-[80%] rounded-lg px-4 py-2
          ${isUser 
            ? 'bg-purple-600 text-white rounded-tr-none' 
            : 'bg-gray-100 text-gray-800 rounded-tl-none'}
        `}
      >
        {renderContent()}
      </div>
    </div>
  );
} 