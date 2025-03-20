'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { exportAsText, exportAsPDF, exportAsMarkdown } from '@/lib/fileProcessing';

interface ExportOptionsProps {
  content: string;
  title: string;
}

export function ExportOptions({ content, title }: ExportOptionsProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'text' | 'pdf' | 'markdown') => {
    setExporting(true);
    try {
      switch (format) {
        case 'text':
          await exportAsText(content, title);
          break;
        case 'pdf':
          await exportAsPDF(content, title);
          break;
        case 'markdown':
          await exportAsMarkdown(content, title);
          break;
      }
    } catch (error) {
      console.error('导出失败', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('text')}
        disabled={exporting}
      >
        导出文本
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('pdf')}
        disabled={exporting}
      >
        导出PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('markdown')}
        disabled={exporting}
      >
        导出Markdown
      </Button>
    </div>
  );
} 