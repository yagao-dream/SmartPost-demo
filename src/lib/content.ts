import { createContentRecord, getContentRecordsByUserId } from './db';

export interface GeneratedContent {
  platform_id: string;
  content: string;
  custom_prompt_id?: number;
}

export interface ContentRecord {
  id: number;
  user_id: string;
  title: string;
  original_content: string;
  model: string;
  created_at: string;
  updated_at: string;
  generated_contents: GeneratedContent[];
}

export async function saveContent(content: {
  user_id: string;
  title: string;
  original_content: string;
  model: string;
  generated_contents: GeneratedContent[];
}): Promise<number> {
  try {
    const recordId = await createContentRecord(content);
    return recordId;
  } catch (error) {
    console.error('保存内容失败:', error);
    throw error;
  }
}

export async function getUserContents(userId: string): Promise<ContentRecord[]> {
  try {
    const records = await getContentRecordsByUserId(userId) as ContentRecord[];
    return records;
  } catch (error) {
    console.error('获取用户内容失败:', error);
    return [];
  }
} 