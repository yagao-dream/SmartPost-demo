import { useState, useEffect } from 'react';
import { platforms } from '@/lib/utils';

interface PlatformSelectProps {
  onPlatformChange: (selectedPlatforms: string[]) => void;
  initialSelected?: string[];
  multiSelect?: boolean;
}

export function PlatformSelect({ onPlatformChange, initialSelected = [], multiSelect = true }: PlatformSelectProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialSelected);
  
  // 初始化选中平台
  useEffect(() => {
    if (initialSelected.length > 0) {
      setSelectedPlatforms(initialSelected);
    }
  }, [initialSelected]);
  
  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) => {
      const isSelected = prev.includes(platformId);
      
      // 如果不是多选模式，只允许选择一个平台
      if (!multiSelect && !isSelected) {
        const newSelection = [platformId];
        // 外部更新状态放在setSelectedPlatforms的回调之后执行
        setTimeout(() => onPlatformChange(newSelection), 0);
        return newSelection;
      }
      
      // 多选模式或取消选中
      const newSelection = isSelected
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId];
      
      // 外部更新状态放在setSelectedPlatforms的回调之后执行
      setTimeout(() => onPlatformChange(newSelection), 0);
      return newSelection;
    });
  };
  
  const getPlatformIcon = (platformId: string) => {
    switch(platformId) {
      case 'twitter':
        return '𝕏'; // Twitter图标(X)
      case 'xiaohongshu':
        return '📕'; // 小红书图标
      case 'zhihu':
        return '📘'; // 知乎图标
      case 'weibo':
        return '🔖'; // 微博图标
      default:
        return '';
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {platforms.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          return (
            <button
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center
                ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <span className="mr-2">{getPlatformIcon(platform.id)}</span>
              {platform.name}
              {isSelected && (
                <span className="ml-2 text-xs bg-purple-500 px-2 py-0.5 rounded-full">
                  {platform.maxLength}字
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selectedPlatforms.length === 0 && (
        <p className="text-xs text-amber-600 mt-1">请至少选择一个目标平台</p>
      )}
    </div>
  );
} 