'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon, 
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { sendChatRequest, Message, ContentPart } from '@/lib/openrouter';
import { modelOptions } from '@/lib/openrouter';

interface ContentChatInterfaceProps {
  platformId: string;
  platformName: string;
  content: string;
  onContentUpdate: (newContent: string) => void;
}

// 将可能是字符串或ContentPart[]的内容转换为字符串
const contentToString = (content: string | ContentPart[]): string => {
  if (typeof content === 'string') {
    return content;
  }
  
  return content
    .filter(part => part.type === 'text')
    .map(part => (part as { text: string }).text)
    .join('');
};

// 帮助函数：提取AI回答中的核心内容
const extractKeyContent = (content: string | ContentPart[] | undefined): string => {
  if (!content) return '';
  
  const fullContent = contentToString(content);
  
  // 尝试提取被引号包围的内容，这通常是AI生成的核心内容
  const quotedContentRegex = /(["''""])([\s\S]*?)\1/;
  const match = fullContent.match(quotedContentRegex);
  
  if (match && match[2]) {
    return match[2].trim();
  }
  
  // 如果没有引号包围的内容，尝试提取"以下是"、"这是"后面的内容
  const prefixRegex = /(以下是|这是|内容是|优化后的内容[:：]|修改后的内容[:：]|优化内容[:：]|更新后的文案[:：])([\s\S]*)/i;
  const prefixMatch = fullContent.match(prefixRegex);
  
  if (prefixMatch && prefixMatch[2]) {
    return prefixMatch[2].trim();
  }
  
  // 尝试提取段落间的最长内容块作为核心内容
  const paragraphs = fullContent.split('\n\n').filter(p => p.trim());
  if (paragraphs.length > 1) {
    // 找出最长的段落，通常是核心内容
    return paragraphs.reduce((a, b) => a.length > b.length ? a : b).trim();
  }
  
  return fullContent;
};

export default function ContentChatInterface({
  platformId,
  platformName,
  content,
  onContentUpdate
}: ContentChatInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(modelOptions[0].id);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 获取对话历史的本地存储键
  const getChatHistoryKey = () => `chat_history_${platformId}`;
  
  // 保存对话历史到localStorage
  const saveChatHistory = (messages: Message[]) => {
    try {
      // 只保存非系统消息，因为系统消息会在初始化时重新创建
      const messagesToSave = messages.filter(m => m.role !== 'system');
      localStorage.setItem(getChatHistoryKey(), JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('保存对话历史失败:', error);
    }
  };
  
  // 加载对话历史
  const loadChatHistory = (): Message[] => {
    try {
      const savedHistory = localStorage.getItem(getChatHistoryKey());
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error('加载对话历史失败:', error);
      return [];
    }
  };
  
  // 滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = 
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);
  
  // 初始化聊天消息
  useEffect(() => {
    if (content && isOpen && chatMessages.length === 0) {
      // 创建系统消息
      const systemMessage: Message = {
        role: 'system',
        content: `你是SmartPost的AI助手，负责帮助用户优化他们的${platformName}内容。当前的内容如下:

${content}

你的任务是根据用户的需求，进一步优化和调整这段内容，同时保持${platformName}平台的特点和风格。
请直接给出优化后的完整内容，不要加任何解释或者前缀后缀。
请直接输出可以直接使用的优化内容，不要添加引号或其他包装。`
      };
      
      // 创建初始助手消息
      const assistantWelcomeMessage: Message = {
        role: 'assistant',
        content: `我已准备好帮您优化${platformName}内容。请告诉我您想如何调整或改进当前内容，例如"让内容更加生动"、"添加更多表情符号"或"强调产品的某个特点"等。`
      };
      
      // 加载历史记录
      const savedMessages = loadChatHistory();
      
      if (savedMessages.length > 0) {
        // 如果有历史记录，添加系统消息和历史记录
        setChatMessages([systemMessage, ...savedMessages]);
      } else {
        // 没有历史记录，显示欢迎消息
        setChatMessages([systemMessage, assistantWelcomeMessage]);
      }
    }
  }, [content, isOpen, platformName, chatMessages.length]);
  
  // 处理消息发送
  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;
    
    // 添加用户消息
    const userMessage: Message = {
      role: 'user',
      content: message
    };
    
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setMessage('');
    
    // 请求AI回复
    setIsLoading(true);
    
    try {
      // 准备消息数组，确保内容都是字符串
      const messagesToSend = updatedMessages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : contentToString(msg.content)
      }));
      
      const response = await sendChatRequest(messagesToSend, selectedModel, 0.7);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.choices[0].message.content
      };
      
      const newMessages = [...updatedMessages, assistantMessage];
      setChatMessages(newMessages);
      
      // 保存对话历史到localStorage
      saveChatHistory(newMessages.filter(m => m.role !== 'system'));
      
      // 提取核心内容
      const extractedContent = extractKeyContent(response.choices[0].message.content);
      
      // 更新优化后的内容
      onContentUpdate(extractedContent);
    } catch (error) {
      console.error('获取AI回复失败:', error);
      // 添加错误消息
      const errorMessage: Message = {
        role: 'assistant',
        content: '很抱歉，处理您的请求时出错了。请稍后再试。'
      };
      const newMessages = [...updatedMessages, errorMessage];
      setChatMessages(newMessages);
      
      // 即使出错也保存对话历史
      saveChatHistory(newMessages.filter(m => m.role !== 'system'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="relative">
      {/* 聊天按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="absolute bottom-2 right-2"
        title="与AI对话优化内容"
      >
        <ChatBubbleLeftRightIcon className="h-4 w-4" />
      </Button>
      
      {/* 聊天弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col">
            {/* 弹窗头部 */}
            <div className="border-b p-4 flex justify-between items-center">
              <h3 className="text-lg font-medium">与AI对话优化 {platformName} 内容</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* 聊天记录区域 */}
            <div 
              ref={chatContainerRef}
              className="flex-grow overflow-y-auto p-4 space-y-4"
            >
              {chatMessages.filter(msg => msg.role !== 'system').map((msg, index) => (
                <div 
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-purple-100 text-gray-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{contentToString(msg.content)}</p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-lg flex items-center space-x-2">
                    <ArrowPathIcon className="h-4 w-4 text-gray-500 animate-spin" />
                    <span className="text-gray-500">正在思考...</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* 底部输入区域 */}
            <div className="border-t p-4">
              <div className="flex">
                <textarea
                  ref={textareaRef}
                  className="flex-grow p-2 border rounded-l-md resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="请输入优化需求..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  className="rounded-l-none"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                提示: 可以输入如"让内容更具吸引力"、"增加更多emoji"或"使内容更简洁"等需求
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 