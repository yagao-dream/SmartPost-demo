import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名
 * 使用 clsx 处理条件类名，使用 tailwind-merge 合并和处理 Tailwind 类名冲突
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期
 * @param date 日期对象或日期字符串
 * @param options 格式化选项
 */
export function formatDate(
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('zh-CN', options).format(d);
}

/**
 * 截断文本
 * @param text 需要截断的文本
 * @param maxLength 最大长度
 */
export function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

export const platforms = [
  { id: 'twitter', name: 'Twitter', icon: 'twitter', maxLength: 280 },
  { id: 'xiaohongshu', name: '小红书', icon: 'xiaohongshu', maxLength: 1000 },
  { id: 'zhihu', name: '知乎', icon: 'zhihu', maxLength: 2000 },
  { id: 'weibo', name: '微博', icon: 'weibo', maxLength: 280 }
];

export function getPlatforms() {
  return platforms;
}

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
} 