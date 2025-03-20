import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

interface GeneratedContent {
  id: string;
  platform: string;
  content: string;
  customPrompt?: {
    id: string;
    name: string;
  } | null;
}

interface ContentRecord {
  id: string;
  title: string;
  createdAt: Date;
  generatedContents: GeneratedContent[];
}

export async function GET(request: Request) {
  try {
    // 验证用户身份
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const userId = await verifyAuth(token);
    if (!userId) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';

    // 查询内容记录
    const contents = await prisma.contentRecord.findMany({
      where: {
        userId,
        title: {
          contains: query
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        generatedContents: {
          include: {
            customPrompt: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // 格式化返回数据
    const formattedContents = contents.map((content: ContentRecord) => {
      // 从生成内容中提取平台信息
      const platforms = content.generatedContents
        .map((gc: GeneratedContent) => gc.platform)
        .filter((p: string, i: number, arr: string[]) => arr.indexOf(p) === i); // 去重

      return {
        id: content.id,
        title: content.title,
        platforms: platforms,
        createdAt: content.createdAt,
        size: content.generatedContents.reduce((total: number, gc: GeneratedContent) => total + gc.content.length, 0)
      };
    });

    return NextResponse.json(formattedContents);
  } catch (error) {
    console.error('搜索内容失败:', error);
    return NextResponse.json(
      { error: '搜索内容失败' },
      { status: 500 }
    );
  }
} 