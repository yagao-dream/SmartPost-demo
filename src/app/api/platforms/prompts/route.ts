import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// 获取用户的平台提示词
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    
    if (!platform) {
      return NextResponse.json(
        { error: '平台参数不能为空' },
        { status: 400 }
      );
    }

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

    // 获取平台的提示词
    const prompts = await prisma.customPrompt.findMany({
      where: {
        userId,
        platform: platform
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(prompts);
  } catch (error) {
    console.error('获取提示词失败:', error);
    return NextResponse.json(
      { error: '获取提示词失败' },
      { status: 500 }
    );
  }
}

// 创建或更新平台提示词
export async function POST(request: Request) {
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

    // 解析请求体
    const { name, systemPrompt, userPrompt, platform } = await request.json();
    
    // 验证必填字段
    if (!name || !systemPrompt || !userPrompt || !platform) {
      return NextResponse.json(
        { error: '提示词名称、系统提示词、用户提示词和平台均为必填项' },
        { status: 400 }
      );
    }

    // 创建新的提示词
    const newPrompt = await prisma.customPrompt.create({
      data: {
        userId,
        name,
        systemPrompt,
        userPrompt,
        platform
      }
    });

    return NextResponse.json(newPrompt);
  } catch (error) {
    console.error('创建提示词失败:', error);
    return NextResponse.json(
      { error: '创建提示词失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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

    // 获取提示词ID
    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get('id');
    
    if (!promptId) {
      return NextResponse.json(
        { error: '提示词ID不能为空' },
        { status: 400 }
      );
    }

    // 解析请求体
    const { name, systemPrompt, userPrompt, platform } = await request.json();
    
    // 验证必填字段
    if (!name || !systemPrompt || !userPrompt || !platform) {
      return NextResponse.json(
        { error: '提示词名称、系统提示词、用户提示词和平台均为必填项' },
        { status: 400 }
      );
    }

    // 检查提示词是否存在且属于该用户
    const existingPrompt = await prisma.customPrompt.findFirst({
      where: {
        id: promptId,
        userId
      }
    });

    if (!existingPrompt) {
      return NextResponse.json(
        { error: '提示词不存在或无权访问' },
        { status: 404 }
      );
    }

    // 更新提示词
    const updatedPrompt = await prisma.customPrompt.update({
      where: {
        id: promptId
      },
      data: {
        name,
        systemPrompt,
        userPrompt,
        platform
      }
    });

    return NextResponse.json(updatedPrompt);
  } catch (error) {
    console.error('更新提示词失败:', error);
    return NextResponse.json(
      { error: '更新提示词失败' },
      { status: 500 }
    );
  }
}

// 删除平台提示词
export async function DELETE(request: Request) {
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

    // 获取提示词ID
    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get('id');
    
    if (!promptId) {
      return NextResponse.json(
        { error: '提示词ID不能为空' },
        { status: 400 }
      );
    }

    // 检查提示词是否存在且属于该用户
    const existingPrompt = await prisma.customPrompt.findFirst({
      where: {
        id: promptId,
        userId
      }
    });

    if (!existingPrompt) {
      return NextResponse.json(
        { error: '提示词不存在或无权访问' },
        { status: 404 }
      );
    }

    // 删除提示词
    await prisma.customPrompt.delete({
      where: {
        id: promptId
      }
    });

    return NextResponse.json({ message: '提示词已删除' });
  } catch (error) {
    console.error('删除提示词失败:', error);
    return NextResponse.json(
      { error: '删除提示词失败' },
      { status: 500 }
    );
  }
} 