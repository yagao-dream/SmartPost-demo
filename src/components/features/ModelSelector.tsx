'use client';

import { useState } from 'react';
import { modelOptions, ModelOption } from '@/lib/openrouter';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // 获取当前选中的模型
  const currentModel = modelOptions.find(model => model.id === selectedModel) || modelOptions[0];
  
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  const handleSelectModel = (model: ModelOption) => {
    onSelectModel(model.id);
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <span className="flex items-center">
          <span className="block truncate">{currentModel.name}</span>
        </span>
        <ChevronDownIcon className="w-4 h-4 ml-2" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-10 w-64 mt-1 origin-top-right bg-white border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {modelOptions.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelectModel(model)}
                className={`
                  flex flex-col w-full px-4 py-2 text-sm text-left hover:bg-gray-100
                  ${model.id === selectedModel ? 'bg-purple-50 text-purple-700' : 'text-gray-700'}
                `}
              >
                <span className="font-medium">{model.name}</span>
                <span className="text-xs text-gray-500 mt-1">{model.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 