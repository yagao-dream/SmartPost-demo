'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/user';

// 认证上下文类型定义
interface AuthContextType {
  currentUser: User | null;
  userProfile: {
    displayName?: string;
    photoURL?: string;
  } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ displayName?: string; photoURL?: string; } | null>(null);
  const [loading, setLoading] = useState(true);

  // 登录函数
  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '登录失败');
      }

      const { user, token } = await response.json();
      
      // 保存令牌到本地存储
      localStorage.setItem('auth_token', token);
      setCurrentUser(user);
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  // 注册函数
  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '注册失败');
      }
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  };

  // 登出函数
  const signOut = async () => {
    try {
      localStorage.removeItem('auth_token');
      setCurrentUser(null);
    } catch (error) {
      console.error('登出失败:', error);
      throw error;
    }
  };

  // 检查用户是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const user = await response.json();
            setCurrentUser(user);
          } else {
            // 令牌无效，清除
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          console.error('验证用户失败:', error);
          localStorage.removeItem('auth_token');
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 自定义钩子，用于获取认证上下文
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 