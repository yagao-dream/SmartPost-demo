'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, sendChatRequest, modelOptions, ContentPart, formatContentOptimizationPrompt } from '@/lib/openrouter';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { ArrowPathIcon, CheckIcon, LightBulbIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

// 帮助函数：将内容转换为字符串
const contentToString = (content: string | ContentPart[] | undefined): string => {
  if (!content) return '';
  
  if (typeof content === 'string') {
    return content;
  }
  // 如果是内容部分数组，提取所有文本部分
  return content
    .filter(part => part.type === 'text' && part.text)
    .map(part => (part.type === 'text' ? part.text || '' : ''))
    .join('\n');
};

// 在contentToString函数后添加提取核心内容的函数
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
  const prefixRegex = /(以下是|这是|内容是|优化后的内容[:：]|修改后的内容[:：]|优化内容[:：]|更新后的文案[:：]|我已经|这里是)([\s\S]*)/i;
  const prefixMatch = fullContent.match(prefixRegex);
  
  if (prefixMatch && prefixMatch[2]) {
    return prefixMatch[2].trim();
  }
  
  // 如果内容包含明显的解释部分，提取最长的非解释部分
  if (fullContent.includes('希望这能帮到你') || 
      fullContent.includes('如果你需要') || 
      fullContent.includes('如果有任何其他')) {
    const parts = fullContent.split(/希望这能帮到你|如果你需要|如果有任何其他/);
    return parts[0].trim();
  }
  
  // 尝试提取段落间的最长内容块作为核心内容
  const paragraphs = fullContent.split('\n\n').filter(p => p.trim());
  if (paragraphs.length > 1) {
    // 找出最长的段落，通常是核心内容
    return paragraphs.reduce((a, b) => a.length > b.length ? a : b).trim();
  }
  
  return fullContent;
};

// 建议提示类型
type SuggestionPrompt = {
  icon: React.ReactNode;
  text: string;
  prompt: string;
};

interface ChatInterfaceProps {
  initialContent?: string;
  initialPlatform?: string;
  currentContent?: string; // 当前平台生成的内容
  onOptimizedContent?: (content: string) => void;
  sessionId?: string; // 添加会话ID，用于区分不同的创建内容会话
}

export function ChatInterface({ 
  initialContent = '', 
  initialPlatform = '',
  currentContent = '',
  onOptimizedContent,
  sessionId = 'default'
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.0-flash-001");
  const [error, setError] = useState<string | null>(null);
  const [optimizedContent, setOptimizedContent] = useState('');
  const [hasOptimizedContent, setHasOptimizedContent] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false); // 添加应用成功状态
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const onOptimizedContentRef = useRef(onOptimizedContent);
  
  // 更新回调函数引用
  useEffect(() => {
    onOptimizedContentRef.current = onOptimizedContent;
  }, [onOptimizedContent]);
  
  // 持久化存储相关函数
  const getChatHistoryKey = () => `chat_history_${sessionId}_${initialPlatform}`;
  
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
  
  // 初始化欢迎消息
  useEffect(() => {
    // 创建初始系统消息 - 调整提示词以确保AI只返回优化后的结果
    const systemMessage = {
      role: 'system' as const,
      content: `你是一位专业的社交媒体内容优化专家，正在帮助用户优化${initialPlatform}平台的内容。

用户当前需要优化的内容是: "${currentContent || initialContent}"

请严格按照以下要求回复:
1. 仅输出优化后的完整内容，不要添加任何解释、前言或结语
2. 不要使用引号或其他标记包裹内容
3. 不要添加"以下是优化后的内容"等前缀
4. 只输出可以直接使用的文本内容
5. 根据用户的优化要求直接修改原文，保持内容的完整性

您的回复将被直接用作最终内容，所以必须只包含优化后的文案本身。`
    };
    
    // 创建初始欢迎消息
    const welcomeMessage = {
      role: 'assistant' as const,
      content: `👋 我已准备好帮您优化${initialPlatform}平台的内容。请告诉我您想要如何调整内容，例如增加吸引力、调整语气或添加特定元素等。`
    };
    
    // 加载保存的对话历史
    const savedMessages = loadChatHistory();
    
    if (savedMessages.length > 0) {
      // 如果有历史记录，将系统消息和历史记录合并
      setMessages([systemMessage, ...savedMessages]);
      
      // 获取最后一条助手消息作为优化内容
      const lastAssistantMessage = savedMessages
        .filter(msg => msg.role === 'assistant')
        .pop();
        
      if (lastAssistantMessage) {
        // 直接使用AI回复作为优化后的内容，不再使用extractKeyContent
        const content = contentToString(lastAssistantMessage.content);
        setOptimizedContent(content);
        setHasOptimizedContent(true);
        
        // 自动应用最新的优化内容到编辑框
        if (onOptimizedContentRef.current) {
          onOptimizedContentRef.current(content);
        }
      }
    } else {
      // 没有历史记录，只显示欢迎消息
      setMessages([systemMessage, welcomeMessage]);
    }
  }, [initialPlatform, initialContent, currentContent, sessionId]);
  
  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 处理用户消息发送
  const handleSendMessage = async (content: string) => {
    setError(null);
    setApplySuccess(false); // 重置应用成功状态
    
    // 创建用户消息
    const userMessage: Message = {
      role: 'user',
      content
    };
    
    // 添加用户消息到历史
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    
    try {
      // 准备消息数组，确保内容都是字符串
      const messagesToSend = updatedMessages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : contentToString(msg.content)
      }));
      
      // 发送请求到API
      const response = await sendChatRequest(messagesToSend, selectedModel);
      
      // 获取AI回复内容
      const assistantContent = response.choices[0].message.content;
      
      // 添加AI回复到历史
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent
      };
      
      const newMessages = [...updatedMessages, assistantMessage];
      setMessages(newMessages);
      
      // 保存对话历史到localStorage
      saveChatHistory(newMessages.filter(m => m.role !== 'system'));
      
      // 直接使用AI回复作为优化后的内容，不再使用extractKeyContent
      const formattedContent = contentToString(assistantContent);
      setOptimizedContent(formattedContent);
      setHasOptimizedContent(true);
      
      // 自动应用优化后的内容
      if (onOptimizedContentRef.current) {
        onOptimizedContentRef.current(formattedContent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败，请重试');
      console.error('Chat request error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 应用优化后的内容
  const handleApplyChanges = () => {
    if (onOptimizedContentRef.current && hasOptimizedContent) {
      onOptimizedContentRef.current(optimizedContent);
      // 显示应用成功提示
      setApplySuccess(true);
      // 3秒后自动隐藏提示
      setTimeout(() => {
        setApplySuccess(false);
      }, 3000);
    }
  };

  // 常用优化建议提示词
  const suggestionPrompts: SuggestionPrompt[] = [
    { 
      icon: <LightBulbIcon className="h-4 w-4" />, 
      text: "提高吸引力", 
      prompt: `请帮我提高这段${initialPlatform}内容的吸引力，使其更能吸引目标受众。保持原有主题，但让表达更有魅力。` 
    },
    { 
      icon: <PencilIcon className="h-4 w-4" />, 
      text: "改进语言表达", 
      prompt: `请改进这段${initialPlatform}内容的语言表达，使其更流畅、更专业，并且消除任何语法或表达问题。` 
    },
    { 
      icon: <LightBulbIcon className="h-4 w-4" />, 
      text: "简化内容", 
      prompt: `请帮我简化这段${initialPlatform}内容，使其更简洁明了，同时保留关键信息和核心观点。` 
    }
  ];
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="text-sm font-medium text-gray-500">
          使用AI助手优化您的内容
        </div>
        <div className="flex items-center space-x-3">
          <ModelSelector 
            selectedModel={selectedModel} 
            onSelectModel={setSelectedModel} 
          />
          
          {hasOptimizedContent && (
            <div className="flex items-center gap-2">
              {applySuccess && (
                <span className="text-green-500 text-xs animate-fade-out">更改已应用</span>
              )}
              <Button 
                onClick={handleApplyChanges}
                className="flex items-center"
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                应用更改
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length <= 1 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            {isLoading ? (
              <div className="flex items-center">
                <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                <span>正在初始化...</span>
              </div>
            ) : (
              <p>AI助手将帮您优化 {initialPlatform} 平台内容</p>
            )}
          </div>
        ) : (
          <>
            {messages.filter(msg => msg.role !== 'system').map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {isLoading && messages.length > 1 && (
          <div className="flex items-center text-gray-500 mb-4">
            <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
            <span>AI正在思考...</span>
          </div>
        )}
      </div>
      
      {/* 常用优化建议 */}
      {!isLoading && messages.length > 0 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">常用优化建议：</p>
          <div className="flex flex-wrap gap-2">
            {suggestionPrompts.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(suggestion.prompt)}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
              >
                {suggestion.icon}
                <span className="ml-1">{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="p-4 border-t">
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={isLoading} 
          placeholder="输入修改意见或问题，按 Enter 发送..."
        />
        <p className="text-xs text-gray-400 mt-1">
          提示：尝试要求AI优化特定部分，或提供具体的改进方向
        </p>
      </div>
    </div>
  );
} 