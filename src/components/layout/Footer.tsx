import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">SmartPost</h3>
            <p className="text-sm text-gray-600">
              AI驱动的内容优化平台，让你在不同社交媒体上轻松传播优质内容。
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">快速链接</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-primary">
                  控制台
                </Link>
              </li>
              <li>
                <Link href="/content" className="text-sm text-gray-600 hover:text-primary">
                  创建文案
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">联系我们</h4>
            <ul className="space-y-2">
              <li className="text-sm text-gray-600">
                邮箱: contact@smartpost.com
              </li>
              <li className="text-sm text-gray-600">
                微信公众号: SmartPost官方
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} SmartPost. 保留所有权利。</p>
        </div>
      </div>
    </footer>
  );
} 