'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, ArrowLeftOnRectangleIcon, UserIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/AuthContext';
import { User } from '@/types/user';

export function Header() {
  const { currentUser, userProfile, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-transparent bg-clip-text">
            AIPost
          </span>
        </Link>
        
        <div className="flex items-center space-x-3">
          {currentUser ? (
            <div className="flex items-center space-x-3">
              {userProfile?.photoURL ? (
                <img 
                  src={userProfile.photoURL} 
                  alt="用户头像" 
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-purple-500" />
                </div>
              )}
              <span className="text-sm font-medium hidden md:inline-block">
                {currentUser.name || '用户'}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="flex items-center"
              >
                <ArrowLeftOnRectangleIcon className="h-4 w-4 mr-1" />
                <span className="hidden md:inline-block">退出</span>
              </Button>
            </div>
          ) : (
            <>
              <Link href="/signup">
                <Button variant="outline" size="sm">
                  注册
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">
                  登录
                  <ArrowRightIcon className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
} 