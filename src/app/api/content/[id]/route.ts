import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// 获取特定内容记录
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 从请求头获取认证令牌
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // 验证用户
    const userId = await verifyAuth(token);
    if (!userId) {
      return NextResponse.json(
        { error: '认证失败' },
        { status: 401 }
      );
    }
    
    // 获取内容ID
    const contentId = params.id;
    if (!contentId) {
      return NextResponse.json(
        { error: '未指定内容ID' },
        { status: 400 }
      );
    }
    
    // 查询内容记录
    const record = await prisma.contentRecord.findUnique({
      where: {
        id: contentId,
        userId
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
    
    if (!record) {
      return NextResponse.json(
        { error: '内容记录不存在或无权访问' },
        { status: 404 }
      );
    }
    
    // 提取平台
    const platforms = Array.from(new Set(record.generatedContents.map((gc: any) => gc.platform)));
    
    // 构造响应
    return NextResponse.json({
      record: {
        id: record.id,
        title: record.title,
        originalContent: record.originalContent || '',
        model: record.model,
        createdAt: record.createdAt.toISOString(),
        platforms,
        generatedContents: record.generatedContents.map((gc: any) => ({
          id: gc.id,
          platform: gc.platform,
          content: gc.content,
          title: gc.title,
          customPrompt: gc.customPrompt ? {
            id: gc.customPrompt.id,
            name: gc.customPrompt.name
          } : null
        }))
      }
    });
  } catch (error) {
    console.error('获取内容记录失败:', error);
    return NextResponse.json(
      { error: '获取内容记录失败' },
      { status: 500 }
    );
  }
}

// 更新内容记录
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 安全地访问params
    const id = params?.id;
    
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

    // 获取内容ID和请求数据
    if (!id) {
      return NextResponse.json(
        { error: '请提供内容ID' },
        { status: 400 }
      );
    }

    // 检查内容记录是否存在且属于该用户
    const existingRecord = await prisma.contentRecord.findUnique({
      where: {
        id,
        userId
      },
      include: {
        generatedContents: true
      }
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: '内容不存在或无权修改' },
        { status: 404 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { title, originalContent, platforms, generatedContents } = body;

    if (!title || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: '请提供标题和至少一个平台' },
        { status: 400 }
      );
    }

    // 更新内容记录
    const updatedRecord = await prisma.contentRecord.update({
      where: {
        id
      },
      data: {
        title,
        originalContent: originalContent || ''
      }
    });

    // 处理生成内容更新
    if (generatedContents && Array.isArray(generatedContents)) {
      // 先删除所有现有的生成内容
      await prisma.generatedContent.deleteMany({
        where: {
          contentRecordId: id
        }
      });

      // 创建新的生成内容记录
      const createPromises = generatedContents.map(async (content: any) => {
        return prisma.generatedContent.create({
          data: {
            title: `${updatedRecord.title} - ${content.platform}`,
            contentId: id,
            contentRecordId: id,
            userId,
            platform: content.platform,
            content: content.content,
            customPromptId: content.customPrompt?.id || null
          }
        });
      });

      await Promise.all(createPromises);
    }

    return NextResponse.json({
      message: '内容已更新',
      contentId: id
    });
  } catch (error) {
    console.error('更新内容失败:', error);
    return NextResponse.json(
      { error: '更新内容失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
} 