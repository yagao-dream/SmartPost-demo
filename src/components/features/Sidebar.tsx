'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  ChevronRightIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon,
  DocumentTextIcon,
  ClockIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/AuthContext';
import { User } from '@/types/user';

interface ContentItem {
  id: string;
  title: string;
  createdAt: Date | string;
  size?: string;
  platforms?: string[];
}

export function Sidebar() {
  const router = useRouter();
  const { currentUser, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentContents, setRecentContents] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  useEffect(() => {
    if (currentUser) {
      fetchRecentContent();
    }
  }, [currentUser]);
  
  const fetchRecentContent = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/content/recent', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('获取最近内容失败');
      }
      
      const data = await response.json();
      
      const recentItems: ContentItem[] = data.map((item: any) => {
        // 计算所有生成内容的总大小
        const contentSize = item.generatedContents 
          ? item.generatedContents.reduce((total: number, gc: any) => total + gc.content.length, 0) 
          : 0;
        
        return {
          id: item.id,
          title: item.title,
          createdAt: item.createdAt,
          platforms: item.platforms || [],
          size: formatSize(contentSize * 2) // 近似字符长度到字节
        };
      });
      
      setRecentContents(recentItems);
    } catch (error) {
      console.error('获取最近内容失败:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const searchContent = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      
      const response = await fetch(`/api/content/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('搜索内容失败');
      }
      
      const data = await response.json();
      
      const searchItems: ContentItem[] = data.map((item: any) => {
        return {
          id: item.id,
          title: item.title,
          createdAt: item.createdAt,
          platforms: item.platforms || [],
          size: formatSize(item.size * 2) // 近似字符长度到字节
        };
      });
      
      setSearchResults(searchItems);
    } catch (error) {
      console.error('搜索内容失败:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchContent(query);
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };
  
  const formatDate = (date: Date | string) => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  };
  
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  
  const handleCreateNew = () => {
    router.push('/create');
  };
  
  const getPlatformName = (platform: string) => {
    switch(platform) {
      case 'twitter': return 'Twitter';
      case 'xiaohongshu': return '小红书';
      case 'zhihu': return '知乎';
      case 'weibo': return '微博';
      default: return platform;
    }
  };
  
  const renderContentList = (items: ContentItem[]) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-4 text-sm text-gray-500">
          <DocumentTextIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          暂无内容记录
        </div>
      );
    }

    return (
      <ul className="space-y-2">
        {items.map((content) => (
          <li key={content.id}>
            <Link 
              href={`/content/${content.id}`}
              className="block p-2 rounded-md hover:bg-purple-50"
            >
              <div className="flex items-start">
                <DocumentTextIcon className="h-5 w-5 text-orange-500 flex-shrink-0 mr-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{content.title}</p>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <div className="flex items-center space-x-1">
                      <span>{content.size}</span>
                      {content.platforms && content.platforms.length > 0 && (
                        <span className="text-xs text-purple-500">
                          {content.platforms.length > 1 
                            ? `(${content.platforms.length}个平台)` 
                            : getPlatformName(content.platforms[0])}
                        </span>
                      )}
                    </div>
                    <span>{formatDate(content.createdAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  };
  
  return (
    <div className="h-screen flex flex-col bg-gray-50 border-r border-gray-200 w-64 flex-shrink-0">
      {/* 顶部标题和搜索 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-5">
          <Link href="/" className="flex items-center">
            <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500">
              SmartPost
            </span>
          </Link>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            placeholder="搜索"
            value={searchQuery}
            onChange={handleSearchInput}
          />
          {searchQuery && (
            <button 
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
      
      {/* 导航菜单 */}
      <div className="px-4 py-2">
        <Link href="/" className="flex items-center py-2 px-4 text-sm text-gray-700 hover:bg-purple-100 rounded-lg">
          <HomeIcon className="h-5 w-5 mr-3 text-gray-500" />
          首页
        </Link>
        
        <button 
          className="w-full flex items-center py-2 px-4 text-sm text-gray-700 hover:bg-purple-100 rounded-lg"
          onClick={handleCreateNew}
        >
          <PlusIcon className="h-5 w-5 mr-3 text-gray-500" />
          创建新内容
        </button>
      </div>
      
      {/* 内容列表 */}
      <div className="mt-4 flex-grow overflow-y-auto">
        <div className="px-4 py-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
            {searchQuery ? '搜索结果' : '最近使用'}
          </h3>
          {isLoading || isSearching ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-purple-500 rounded-full border-t-transparent"></div>
            </div>
          ) : (
            renderContentList(searchQuery ? searchResults : recentContents)
          )}
        </div>
      </div>
      
      {/* 底部用户区域 */}
      <div className="mt-auto border-t border-gray-200">
        <div className="p-4">
          <div className="flex items-center">
            {currentUser?.avatar_url ? (
              <img 
                src={currentUser.avatar_url} 
                alt="用户头像" 
                className="h-8 w-8 rounded-full mr-2"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                <UserIcon className="h-4 w-4 text-purple-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentUser?.name || '用户'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-1 rounded-full hover:bg-gray-200"
              title="退出登录"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 