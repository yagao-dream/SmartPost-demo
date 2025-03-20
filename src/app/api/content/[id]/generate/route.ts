import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 获取认证信息
    const authHeader = request.headers.get('authorization');
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
    
    // 获取内容记录ID
    const contentId = params.id;
    if (!contentId) {
      return NextResponse.json(
        { error: '未指定内容ID' },
        { status: 400 }
      );
    }
    
    // 检查内容记录所有权
    const contentRecord = await prisma.contentRecord.findUnique({
      where: {
        id: contentId,
        userId
      }
    });
    
    if (!contentRecord) {
      return NextResponse.json(
        { error: '内容记录不存在或无权访问' },
        { status: 404 }
      );
    }
    
    // 获取请求数据
    const body = await request.json();
    const { platform, content: generatedContent, customPromptId } = body;
    
    if (!platform || !generatedContent) {
      return NextResponse.json(
        { error: '平台和生成内容为必填项' },
        { status: 400 }
      );
    }
    
    // 检查是否已经存在该平台的生成内容
    const existingContent = await prisma.generatedContent.findFirst({
      where: {
        contentRecordId: contentId,
        userId,
        platform
      }
    });
    
    let result;
    
    if (existingContent) {
      // 更新已有内容
      result = await prisma.generatedContent.update({
        where: {
          id: existingContent.id
        },
        data: {
          content: generatedContent,
          customPromptId: customPromptId || null
        },
        include: {
          customPrompt: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      console.log(`已更新${platform}平台的生成内容`);
    } else {
      // 创建新内容
      result = await prisma.generatedContent.create({
        data: {
          title: `${contentRecord.title} - ${platform}`, // 添加标题字段
          contentId: contentId,
          contentRecordId: contentId,
          userId,
          platform,
          content: generatedContent,
          customPromptId: customPromptId || null
        },
        include: {
          customPrompt: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      console.log(`已创建${platform}平台的生成内容`);
    }
    
    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: `已为${platform}平台生成内容`,
      generatedContent: {
        id: result.id,
        platform,
        title: result.title,
        content: result.content,
        customPrompt: result.customPrompt
      }
    });
    
  } catch (error) {
    console.error('生成内容失败:', error);
    return NextResponse.json(
      { error: '生成内容失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
} 