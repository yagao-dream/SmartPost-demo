import { createCustomPrompt, getCustomPromptsByUserId, getCustomPromptsByPlatform } from './db';

export interface CustomPrompt {
  id: number;
  user_id: string;
  platform_id: string;
  name: string;
  system_prompt: string;
  user_prompt: string;
  created_at: string;
  updated_at: string;
}

export async function savePrompt(prompt: {
  user_id: string;
  platform_id: string;
  name: string;
  system_prompt: string;
  user_prompt: string;
}): Promise<number> {
  try {
    const promptId = await createCustomPrompt(prompt);
    return promptId;
  } catch (error) {
    console.error('保存提示词失败:', error);
    throw error;
  }
}

export async function getUserPrompts(userId: string): Promise<CustomPrompt[]> {
  try {
    const prompts = await getCustomPromptsByUserId(userId) as CustomPrompt[];
    return prompts;
  } catch (error) {
    console.error('获取用户提示词失败:', error);
    return [];
  }
}

export async function getPlatformPrompts(userId: string, platformId: string): Promise<CustomPrompt[]> {
  try {
    const prompts = await getCustomPromptsByPlatform(userId, platformId) as CustomPrompt[];
    return prompts;
  } catch (error) {
    console.error('获取平台提示词失败:', error);
    return [];
  }
}

// 默认提示词
export const defaultPrompts: Record<string, { systemPrompt: string; userPrompt: string }> = {
  twitter: {
    systemPrompt: "你是Twitter内容创作专家。请根据用户提供的内容，创作一条可以直接发布的专业推文。",
    userPrompt: "请基于以下内容，创作一条不超过280字符的专业推文，要求简洁有力、有话题性，适合在Twitter上获得高互动率:\n\n{content}\n\n请直接给出优化后的推文内容，不要包含任何解释或前后缀。"
  },
  xiaohongshu: {
    systemPrompt: "你是小红书内容创作专家。请根据用户提供的内容，创作一篇可以直接发布的小红书笔记。",
    userPrompt: "请基于以下内容，创作一篇不超过1000字符的小红书笔记，要求真实、生动、有情感，适当使用emoji表情符号点缀，带有强烈的个人体验感，结尾可以添加4-6个话题标签:\n\n{content}\n\n请直接给出优化后的内容，不要包含任何解释或前后缀。"
  },
  zhihu: {
    systemPrompt: "你是知乎内容创作专家。请根据用户提供的内容，创作一个专业的知乎回答。",
    userPrompt: "请基于以下内容，创作一个专业的知乎回答，要求逻辑清晰、论述有力、观点独到，适当引用数据或案例支持论点:\n\n{content}\n\n请直接给出优化后的回答内容，不要包含任何解释或前后缀。"
  },
  weibo: {
    systemPrompt: "你是微博内容创作专家。请根据用户提供的内容，创作一条引人关注的微博。",
    userPrompt: "请基于以下内容，创作一条不超过2000字符的微博，要求话题性强、易引发讨论，适当使用表情符号增加趣味性:\n\n{content}\n\n请直接给出优化后的内容，不要包含任何解释或前后缀。"
  }
}; 