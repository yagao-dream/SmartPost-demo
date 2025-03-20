'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

interface PlatformPrompt {
  id: string;
  platform: string;
  prompt: string;
}

const PLATFORMS = [
  { id: 'twitter', name: 'Twitter' },
  { id: 'xiaohongshu', name: '小红书' },
  { id: 'zhihu', name: '知乎' },
  { id: 'wechat', name: '微信' },
];

export function PlatformPrompts() {
  const [prompts, setPrompts] = useState<PlatformPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPrompt, setEditingPrompt] = useState<PlatformPrompt | null>(null);
  const [formData, setFormData] = useState({
    platform: '',
    prompt: '',
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/platforms/prompts');
      if (!response.ok) {
        throw new Error('获取提示词失败');
      }
      const data = await response.json();
      setPrompts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取提示词失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/platforms/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('保存提示词失败');
      }

      const data = await response.json();
      setPrompts(prompts.map(p => 
        p.platform === data.platform ? data : p
      ).concat(prompts.find(p => p.platform === data.platform) ? [] : [data]));

      setFormData({ platform: '', prompt: '' });
      setEditingPrompt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存提示词失败');
    }
  };

  const handleDelete = async (platform: string) => {
    try {
      const response = await fetch(`/api/platforms/prompts?platform=${platform}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除提示词失败');
      }

      setPrompts(prompts.filter(p => p.platform !== platform));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除提示词失败');
    }
  };

  const handleEdit = (prompt: PlatformPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      platform: prompt.platform,
      prompt: prompt.prompt,
    });
  };

  if (loading) {
    return <div className="text-center">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">平台提示词管理</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <Label htmlFor="prompt">提示词</Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, prompt: e.target.value })}
              placeholder="请输入平台特定的提示词"
              required
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <Button type="submit">
            {editingPrompt ? '更新' : '保存'}
          </Button>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">已保存的提示词</h3>
        <div className="space-y-4">
          {prompts.map(prompt => (
            <div key={prompt.id} className="p-4 border rounded">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">
                    {PLATFORMS.find(p => p.id === prompt.platform)?.name || prompt.platform}
                  </h4>
                  <p className="mt-2 text-gray-600 whitespace-pre-wrap">{prompt.prompt}</p>
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(prompt)}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(prompt.platform)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {prompts.length === 0 && (
            <p className="text-gray-500">暂无保存的提示词</p>
          )}
        </div>
      </div>
    </div>
  );
} 