'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileUpload } from '@/components/features/FileUpload';
import { PlatformSelect } from '@/components/features/PlatformSelect';
import { ContentTextarea } from '@/components/features/ContentTextarea';
import { GeneratedContent } from '@/components/features/GeneratedContent';
import { Button } from '@/components/ui/Button';
import { platforms } from '@/lib/utils';
import { modelOptions, generateOptimizedContent } from '@/lib/openrouter';
import { extractTextFromFile } from '@/lib/fileProcessing';
import { ChatInterface } from '@/components/features/ChatInterface';
import { useAuth } from '@/lib/AuthContext';
import { db, collection, addDoc, serverTimestamp } from '@/lib/firebase';
import { 
  ArrowRightIcon, 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  DocumentIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  DocumentTextIcon,
  LinkIcon,
  ArrowUpTrayIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

type InputType = 'sentence' | 'longtext' | 'document' | 'link' | null;

export default function CreateRedirectPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login');
      } else {
        router.push('/content');
      }
    }
  }, [currentUser, authLoading, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  );
} 