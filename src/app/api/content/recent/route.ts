import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

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

    // 查询所有内容记录，按创建时间倒序排列
    const recentContents = await prisma.contentRecord.findMany({
      where: {
        userId
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
    const formattedContents = recentContents.map(content => {
      // 从生成内容中提取平台信息
      const platforms = content.generatedContents
        .map(gc => gc.platform)
        .filter((p, i, arr) => arr.indexOf(p) === i); // 去重

      return {
        id: content.id,
        title: content.title,
        originalContent: content.originalContent || "",
        platforms: platforms,
        createdAt: content.createdAt,
        model: content.model || "",
        generatedContents: content.generatedContents.map(gc => ({
          id: gc.id,
          platform: gc.platform,
          content: gc.content,
          customPrompt: gc.customPrompt
        }))
      };
    });

    return NextResponse.json(formattedContents);
  } catch (error) {
    console.error('获取内容历史失败:', error);
    return NextResponse.json(
      { error: '获取内容历史失败' },
      { status: 500 }
    );
  }
} 