'use client';

import { CustomPrompt } from '@/types/prompt';

// OpenRouter API 集成
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const SITE_URL = "https://smartpost.ai";
const SITE_NAME = "SmartPost";

import { platforms } from '@/lib/utils';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface ChatCompletionResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    index: number;
    finish_reason: string;
  }[];
  model: string;
  created: number;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  maxTokens?: number;
}

export const modelOptions: ModelOption[] = [
  { 
    id: "google/gemini-2.0-flash-001", 
    name: "Gemini Flash 2.0", 
    description: "Google的快速模型，适合日常问答和内容生成",
    maxTokens: 32768
  },
  { 
    id: "deepseek/deepseek-r1:free", 
    name: "DeepSeek R1 (免费版)", 
    description: "免费的R1模型，适合一般问答和文本处理",
    maxTokens: 32768
  },
  { 
    id: "anthropic/claude-3.5-sonnet", 
    name: "Claude 3.5 Sonnet", 
    description: "Anthropic的高级模型，擅长创意写作和复杂推理",
    maxTokens: 200000
  },
  { 
    id: "anthropic/claude-3.7-sonnet", 
    name: "Claude 3.7 Sonnet", 
    description: "Anthropic最新的Claude模型，具有更强的创意和推理能力",
    maxTokens: 200000
  },
  { 
    id: "meta-llama/llama-3.3-70b-instruct", 
    name: "Llama 3.3 70B", 
    description: "Meta最新的大型Llama模型，性能卓越",
    maxTokens: 80000
  },
  { 
    id: "openai/gpt-4o-mini", 
    name: "GPT-4o-mini", 
    description: "OpenAI的小型GPT-4模型，性能与速度的良好平衡",
    maxTokens: 128000
  }
];

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
      role: 'assistant';
    };
    index: number;
    finish_reason: string;
  }[];
}

export async function sendChatRequest(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string = 'google/gemini-2.0-flash-001',
  temperature: number = 0.7
): Promise<OpenRouterResponse> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': SITE_URL,
      'X-Title': SITE_NAME
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 1500
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('API请求错误详情:', errorData);
    throw new Error(`API请求失败: ${response.status} ${JSON.stringify(errorData)}`);
  }

  return await response.json();
}

// 获取平台的默认提示词
export function getDefaultPrompts(platformId: string, content: string): { systemPrompt: string; userPrompt: string } {
  const platform = platforms.find(p => p.id === platformId);
  if (!platform) {
    throw new Error(`不支持的平台: ${platformId}`);
  }

  let systemPrompt = "";
  let userPrompt = "";

  switch (platformId) {
    case 'twitter':
      systemPrompt = "你是Twitter内容创作专家。请根据用户提供的内容，创作一条可以直接发布的专业推文。";
      userPrompt = `请基于以下内容，创作一条不超过${platform.maxLength}字符的专业推文，要求简洁有力、有话题性，适合在Twitter上获得高互动率:\n\n${content}\n\n请直接给出优化后的推文内容，不要包含任何解释或前后缀。输出的内容应当可以直接复制粘贴发布。`;
      break;
    case 'xiaohongshu':
      systemPrompt = "你是小红书内容创作专家。请根据用户提供的内容，创作一篇可以直接发布的小红书笔记。";
      userPrompt = `请基于以下内容，创作一篇不超过${platform.maxLength}字符的小红书笔记，要求真实、生动、有情感，适当使用emoji表情符号点缀，带有强烈的个人体验感，结尾可以添加4-6个话题标签:\n\n${content}\n\n请直接给出优化后的内容，不要包含任何解释或前后缀。输出的内容应当可以直接复制粘贴发布。`;
      break;
    case 'zhihu':
      systemPrompt = "你是知乎内容创作专家。请根据用户提供的内容，创作一篇可以直接发布的知乎回答。";
      userPrompt = `请基于以下内容，创作一篇不超过${platform.maxLength}字符的知乎回答，要求有理有据、逻辑清晰、专业性强，适当分段，可以加入自己的观点和分析，适合在知乎获得高赞:\n\n${content}\n\n请直接给出优化后的内容，不要包含任何解释或前后缀。输出的内容应当可以直接复制粘贴发布。`;
      break;
    case 'weibo':
      systemPrompt = "你是微博内容创作专家。请根据用户提供的内容，创作一条可以直接发布的微博。";
      userPrompt = `请基于以下内容，创作一条不超过${platform.maxLength}字符的微博，要求简洁有趣、有话题性，适当使用emoji，容易引起转发和评论:\n\n${content}\n\n请直接给出优化后的内容，不要包含任何解释或前后缀。输出的内容应当可以直接复制粘贴发布。`;
      break;
    default:
      systemPrompt = "你是内容创作专家。请根据用户提供的内容，创作一篇可以直接发布的优化内容。";
      userPrompt = `请基于以下内容，创作优化后的内容:\n\n${content}\n\n请直接给出优化后的内容，不要包含任何解释或前后缀。输出的内容应当可以直接复制粘贴发布。`;
  }

  return { systemPrompt, userPrompt };
}

// 使用自定义提示词处理内容
function processCustomPrompt(customPrompt: CustomPrompt, content: string): { systemPrompt: string; userPrompt: string } {
  // 直接使用用户定义的提示词
  let systemPrompt = customPrompt.systemPrompt;
  let userPrompt = customPrompt.userPrompt;
  
  // 替换提示词中的变量
  const platform = platforms.find(p => p.id === customPrompt.platform);
  const maxLength = platform ? platform.maxLength : 2000;
  
  // 替换内容变量
  userPrompt = userPrompt.replace(/{content}/g, content);
  
  // 替换最大长度变量
  userPrompt = userPrompt.replace(/{maxLength}/g, maxLength.toString());
  
  return { systemPrompt, userPrompt };
}

// 生成优化内容的函数
export async function generateOptimizedContent(
  content: string,
  platformId: string,
  model: string = 'google/gemini-2.0-flash-001',
  customPrompt?: CustomPrompt | null
): Promise<string> {
  const platform = platforms.find(p => p.id === platformId);
  if (!platform) {
    throw new Error(`不支持的平台: ${platformId}`);
  }

  // 获取提示词（使用自定义或默认）
  let { systemPrompt, userPrompt } = customPrompt 
    ? processCustomPrompt(customPrompt, content)
    : getDefaultPrompts(platformId, content);

  // 发送请求
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt }
  ];

  try {
    const response = await sendChatRequest(messages, model, 0.7);
    
    if (typeof response.choices[0].message.content === 'string') {
      return response.choices[0].message.content;
    }
    
    return '生成内容失败，请重试';
  } catch (error) {
    console.error('生成内容失败:', error);
    throw error;
  }
}

/**
 * 构建内容优化提示
 */
export function formatContentOptimizationPrompt(content: string, platform: string): Message[] {
  const platformName = platform === "twitter" ? "Twitter" : 
                       platform === "xiaohongshu" ? "小红书" : 
                       platform;
  
  const systemPrompt: Message = {
    role: 'system',
    content: `你是一位专业的社交媒体内容优化专家，精通各种平台的内容创作和优化。请帮助用户优化${platformName}平台的帖子，保持原始内容的核心观点和信息，并适应该平台的语言风格和格式。`
  };
  
  const userPrompt: Message = {
    role: 'user',
    content: `我希望你帮我将以下内容优化为适合${platformName}平台的帖子:

${content}

请保持原始内容的核心观点和信息，并适应${platformName}平台的语言风格和格式。如有必要，请添加适当的标点符号、分段和表情。`
  };

  return [systemPrompt, userPrompt];
}

// 平台优化接口
export async function generateContent(
  content: string, 
  platformId: string, 
  temperature = 0.7, 
  customPrompt?: CustomPrompt
): Promise<string> {
  return generateOptimizedContent(content, platformId, modelOptions[0].id, customPrompt);
} 