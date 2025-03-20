import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ContentTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  maxLength?: number;
  showCount?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

export function ContentTextarea({
  className,
  label,
  maxLength,
  showCount = true,
  value = '',
  onChange,
  ...props
}: ContentTextareaProps) {
  const [text, setText] = useState(value);
  
  useEffect(() => {
    setText(value);
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setText(newValue);
    onChange?.(newValue);
  };
  
  const charCount = text.length;
  const isOverLimit = maxLength ? charCount > maxLength : false;
  
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium block">{label}</label>}
      <div className="relative">
        <textarea
          className={cn(
            "w-full min-h-[200px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
            isOverLimit && "border-red-500 focus:ring-red-500",
            className
          )}
          value={text}
          onChange={handleChange}
          maxLength={maxLength}
          {...props}
        />
        {showCount && (
          <div 
            className={cn(
              "absolute bottom-2 right-2 text-xs",
              isOverLimit ? "text-red-500" : "text-gray-400"
            )}
          >
            {charCount}{maxLength && ` / ${maxLength}`}
          </div>
        )}
      </div>
    </div>
  );
} 