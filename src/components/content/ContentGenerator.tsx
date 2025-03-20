'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { ExportOptions } from '@/components/features/ExportOptions';

interface GeneratedContent {
  id: string;
  title: string;
  content: string;
  platform: string;
  createdAt: string;
}

const PLATFORMS = [
  { id: 'twitter', name: 'Twitter' },
  { id: 'xiaohongshu', name: '小红书' },
  { id: 'zhihu', name: '知乎' },
  { id: 'wechat', name: '微信' },
];

export function ContentGenerator() {
  const [contents, setContents] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    platform: '',
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      const response = await fetch('/api/content');
      if (!response.ok) {
        throw new Error('获取内容失败');
      }
      const data = await response.json();
      setContents(data.contents);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取内容失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: formData.platform,
          title: formData.title,
        }),
      });

      if (!response.ok) {
        throw new Error('生成内容失败');
      }

      const data = await response.json();
      
      // 保存生成的内容
      const saveResponse = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: data.content,
          platform: formData.platform,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('保存内容失败');
      }

      const savedContent = await saveResponse.json();
      setContents([savedContent, ...contents]);
      setFormData({ title: '', content: '', platform: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成内容失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/content?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除内容失败');
      }

      setContents(contents.filter(content => content.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除内容失败');
    }
  };

  if (loading) {
    return <div className="text-center">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">生成内容</h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入内容标题"
              required
            />
          </div>
          <div>
            <Label htmlFor="platform">平台</Label>
            <select
              id="platform"
              value={formData.platform}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">选择平台</option>
              {PLATFORMS.map(platform => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <Button type="submit" disabled={generating}>
            {generating ? '生成中...' : '生成内容'}
          </Button>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">已生成的内容</h3>
        <div className="space-y-4">
          {contents.map(content => (
            <div key={content.id} className="p-4 border rounded">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{content.title}</h4>
                  <p className="text-sm text-gray-500">
                    {PLATFORMS.find(p => p.id === content.platform)?.name || content.platform}
                  </p>
                  <p className="mt-2 text-gray-600 whitespace-pre-wrap">{content.content}</p>
                </div>
                <div className="space-x-2">
                  <ExportOptions content={content.content} title={content.title} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(content.id)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {contents.length === 0 && (
            <p className="text-gray-500">暂无生成的内容</p>
          )}
        </div>
      </div>
    </div>
  );
} 