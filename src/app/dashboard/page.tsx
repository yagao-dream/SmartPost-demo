'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { PlusIcon, DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/AuthContext';
import { User } from '@/types/user';

interface ContentItem {
  id: string;
  title: string;
  platforms: string[];
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [contentHistory, setContentHistory] = useState<ContentItem[]>([]);

  useEffect(() => {
    // 如果用户未登录且认证状态已加载完成，则重定向到登录页面
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }

    // 如果用户已登录，则获取其内容历史记录
    if (currentUser) {
      fetchUserContent();
    }
  }, [currentUser, authLoading, router]);

  const fetchUserContent = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/content', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('获取用户内容失败');
      }
      
      const data = await response.json();
      setContentHistory(data.records || []);
    } catch (error) {
      console.error('获取用户内容失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlatformName = (platformId: string) => {
    const platforms: Record<string, string> = {
      twitter: 'Twitter',
      xiaohongshu: '小红书',
    };
    return platforms[platformId] || platformId;
  };

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <ArrowPathIcon className="h-8 w-8 text-purple-500 animate-spin" />
            <span className="ml-2 text-lg">加载中...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">欢迎, {currentUser?.name || '用户'}</h1>
              <p className="text-gray-600">管理您的内容创作</p>
            </div>
            <div className="flex space-x-4">
              <Button onClick={handleLogout} variant="outline" className="border-gray-300">
                退出登录
              </Button>
              <Link href="/content">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  创建新内容
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">我的内容</h2>
          
          {contentHistory.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">暂无内容</h3>
              <p className="mt-1 text-gray-500">开始创建您的第一个内容优化吧</p>
              <div className="mt-6">
                <Link href="/content">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    创建新内容
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平台</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建日期</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contentHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {item.platforms.map((platform) => (
                            <span key={platform} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {getPlatformName(platform)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDate(item.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                        <Link href={`/content/edit/${item.id}`}>
                          <Button variant="outline" size="sm">
                            编辑
                          </Button>
                        </Link>
                        <Link href={`/content/${item.id}`}>
                          <Button variant="ghost" size="sm">
                            查看
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
} 