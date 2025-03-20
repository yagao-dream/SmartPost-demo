'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { 
  ArrowRightIcon, 
  ChatBubbleLeftRightIcon, 
  RocketLaunchIcon, 
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  DocumentTextIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [currentUser, loading]);

  const handleGetStarted = () => {
    if (currentUser) {
      router.push('/content');
    } else {
      router.push('/login');
    }
  };

  return (
    <MainLayout>
      {showBanner && (
        <div className="bg-gradient-to-r from-purple-100 to-blue-50 border-b border-purple-200">
          <div className="container mx-auto px-4 py-3 flex items-center justify-center">
            <p className="text-sm text-purple-800">
              <span className="font-medium">开启您的 AI 创作之旅</span>
              <span className="hidden sm:inline"> - 登录后即可体验全部功能</span>
            </p>
          </div>
        </div>
      )}

      <section className="pt-20 pb-32 bg-gradient-to-b from-white via-purple-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center bg-purple-100 rounded-full px-4 py-1.5 mb-8">
              <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-purple-800">AI 驱动的新一代内容创作平台</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-8">
              让 AI 为您的社交内容赋能
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              SmartPost 利用先进的 AI 技术，帮助您在各大社交平台创作出更具吸引力的内容。
              一键优化，多平台适配，让您的创作效率提升 10 倍。
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" onClick={handleGetStarted} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                {currentUser ? '开始创作' : '免费开始使用'}
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">一站式内容创作解决方案</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              从创意发想到内容优化，SmartPost 为您提供全方位的智能创作支持
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-purple-100 hover:border-purple-300 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <ChatBubbleLeftRightIcon className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">智能平台适配</h3>
              <p className="text-gray-600 leading-relaxed">
                自动识别不同平台的内容特点，智能调整格式与表达方式，让您的内容在每个平台都能获得最佳展现。
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-purple-100 hover:border-purple-300 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <RocketLaunchIcon className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI 创意助手</h3>
              <p className="text-gray-600 leading-relaxed">
                突破创作瓶颈，AI 助手为您提供创意灵感，生成吸引眼球的标题和富有感染力的文案。
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-purple-100 hover:border-purple-300 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <AdjustmentsHorizontalIcon className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">个性化定制</h3>
              <p className="text-gray-600 leading-relaxed">
                根据您的品牌调性和目标受众，量身定制内容风格，打造独特的品牌声音。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-b from-white via-purple-50 to-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold mb-8">三步开启智能创作</h2>
              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mr-4 text-white font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">输入您的创作内容</h3>
                    <p className="text-gray-600 leading-relaxed">
                      支持文本、文档、图片等多种格式，一键导入您的原始内容。
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mr-4 text-white font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">选择目标平台</h3>
                    <p className="text-gray-600 leading-relaxed">
                      覆盖主流社交平台，一次创作，多平台适配，智能优化。
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mr-4 text-white font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">一键优化发布</h3>
                    <p className="text-gray-600 leading-relaxed">
                      AI 自动优化内容，实时预览效果，随时调整完善。
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <Button size="lg" onClick={handleGetStarted} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  {currentUser ? '开始创作' : '立即体验'}
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-purple-100">
                <div className="aspect-video bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl mb-6 flex items-center justify-center">
                  <DocumentTextIcon className="h-20 w-20 text-purple-300" />
                </div>
                <div className="space-y-4">
                  <div className="h-2 bg-purple-100 rounded-full w-3/4"></div>
                  <div className="h-2 bg-purple-100 rounded-full w-1/2"></div>
                  <div className="h-2 bg-purple-100 rounded-full w-5/6"></div>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="h-24 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg flex items-center justify-center">
                    <GlobeAltIcon className="h-8 w-8 text-purple-300" />
                  </div>
                  <div className="h-24 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-purple-300" />
                  </div>
                  <div className="h-24 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="h-8 w-8 text-purple-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 text-center">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
              开启您的 AI 创作之旅
            </h2>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              加入 SmartPost，让 AI 助您打造更具影响力的社交媒体内容，
              提升创作效率，获得更多关注与互动。
            </p>
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {currentUser ? '开始创作' : '免费开始使用'}
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
