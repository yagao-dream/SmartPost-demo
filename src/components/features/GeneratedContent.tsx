'use client';

import React, { useState, useRef } from 'react';
import { 
  ArrowPathIcon, 
  ClipboardIcon, 
  CheckIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  DocumentTextIcon,
  DocumentIcon,
  PhotoIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface GeneratedContentProps {
  platform: {
    id: string;
    name: string;
  };
  content: string;
  isLoading?: boolean;
  onRegenerateClick: (platformId: string) => void;
  onCopy: (content: string) => void;
  onContentUpdate?: (content: string) => void;
}

const exportAsText = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportAsMarkdown = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportAsPDF = async (content: string, filename: string) => {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 15, 20);
    
    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('导出PDF失败:', error);
    alert('导出PDF失败，请稍后重试');
  }
};

const exportAsImage = async (content: string, filename: string) => {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '20px';
    tempDiv.style.width = '600px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.innerText = content;
    
    document.body.appendChild(tempDiv);
    
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(tempDiv);
    
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
    
    document.body.removeChild(tempDiv);
  } catch (error) {
    console.error('导出图片失败:', error);
    alert('导出图片失败，请稍后重试');
  }
};

export function GeneratedContent({
  platform,
  content,
  isLoading = false,
  onRegenerateClick,
  onCopy,
  onContentUpdate
}: GeneratedContentProps) {
  const [copying, setCopying] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = () => {
    setCopying(true);
    onCopy(content);
    setTimeout(() => setCopying(false), 1500);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onContentUpdate) {
      onContentUpdate(e.target.value);
    }
  };

  const handleExport = (format: 'text' | 'pdf' | 'markdown' | 'image') => {
    const title = `${platform.name}_内容_${new Date().toLocaleDateString('zh-CN')}`;
    
    switch (format) {
      case 'text':
        exportAsText(content, title);
        break;
      case 'pdf':
        exportAsPDF(content, title);
        break;
      case 'markdown':
        exportAsMarkdown(content, title);
        break;
      case 'image':
        exportAsImage(content, title);
        break;
    }
    
    setExportMenuOpen(false);
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center">
          <span className="font-medium mr-2">{platform.name}</span>
          {isLoading && <ArrowPathIcon className="h-4 w-4 animate-spin text-gray-500" />}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-gray-500 hover:text-gray-700"
            title="复制内容"
          >
            {copying ? (
              <CheckIcon className="h-4 w-4 text-green-500" />
            ) : (
              <ClipboardIcon className="h-4 w-4" />
            )}
          </Button>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="text-gray-500 hover:text-gray-700"
              title="导出内容"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </Button>
            
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleExport('text')}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    导出为文本文件 (.txt)
                  </button>
                  <button
                    onClick={() => handleExport('markdown')}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <CodeBracketIcon className="h-4 w-4 mr-2" />
                    导出为Markdown (.md)
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <DocumentIcon className="h-4 w-4 mr-2" />
                    导出为PDF (.pdf)
                  </button>
                  <button
                    onClick={() => handleExport('image')}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <PhotoIcon className="h-4 w-4 mr-2" />
                    导出为图片 (.png)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <textarea
          ref={contentRef}
          className="w-full min-h-[200px] border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          value={content}
          onChange={handleContentChange}
          placeholder={isLoading ? "生成内容中..." : "生成的内容将显示在这里"}
          disabled={isLoading}
        />
        
        <div className="flex justify-end mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRegenerateClick(platform.id)}
            disabled={isLoading}
            className="text-sm"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                重新生成
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 