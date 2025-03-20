import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// 获取用户的所有内容记录
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // 查询内容记录及其生成的内容
    const [records, total] = await Promise.all([
      prisma.contentRecord.findMany({
        where: {
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
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.contentRecord.count({
        where: {
          userId
        }
      })
    ]);

    // 格式化返回数据
    const formattedContents = records.map((content: any) => {
      // 从生成内容中提取平台信息
      const platforms = content.generatedContents
        .map((gc: any) => gc.platform)
        .filter((p: string, i: number, arr: string[]) => arr.indexOf(p) === i); // 去重
        
      return {
        id: content.id,
        title: content.title,
        originalContent: content.originalContent,
        platforms: platforms,
        createdAt: content.createdAt,
        generatedContents: content.generatedContents
      };
    });

    return NextResponse.json({
      records: formattedContents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户内容失败:', error);
    return NextResponse.json(
      { error: '获取用户内容失败' },
      { status: 500 }
    );
  }
}

// 创建新的内容记录
export async function POST(request: Request) {
  try {
    // 验证用户身份
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      console.log('未提供认证令牌');
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const userId = await verifyAuth(token);
    if (!userId) {
      console.log('无效的认证令牌');
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { title, originalContent, platforms, model, generatedContent, customPrompts } = body;

    console.log('收到内容保存请求:', {
      title,
      platformsCount: platforms?.length,
      platforms,
      originalContentLength: originalContent?.length,
      generatedContentKeys: Object.keys(generatedContent || {}),
      customPromptsKeys: Object.keys(customPrompts || {})
    });

    if (!title || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      console.log('标题或平台未提供', { title, platforms });
      return NextResponse.json(
        { error: "请提供标题和至少一个平台" },
        { status: 400 }
      );
    }

    // 验证生成内容
    if (!generatedContent || Object.keys(generatedContent).length === 0) {
      console.log('未提供生成内容');
      return NextResponse.json(
        { error: "请生成内容后再保存" },
        { status: 400 }
      );
    }

    // 创建内容记录
    const contentRecord = await prisma.contentRecord.create({
      data: {
        userId,
        title,
        originalContent: originalContent || '',
        model: model || ''
      }
    });

    console.log('创建内容记录成功:', contentRecord.id);

    // 创建生成内容记录
    let createdCount = 0;
    const generatedContentsPromises = platforms.map(async (platform: string) => {
      const content = generatedContent[platform];
      const promptId = customPrompts?.[platform] || null;

      if (!content) {
        console.log(`平台 ${platform} 没有生成内容，跳过`);
        return null;
      }

      try {
        // 获取选择的提示词信息
        let promptInfo = null;
        if (promptId) {
          const customPrompt = await prisma.customPrompt.findUnique({
            where: { id: promptId },
            select: { id: true, name: true }
          });
          promptInfo = customPrompt;
        }

        console.log(`为平台 ${platform} 创建生成内容, 提示词ID: ${promptId}`);
        
        const result = await prisma.generatedContent.create({
          data: {
            title: `${title} - ${platform}`,
            contentId: contentRecord.id,
            contentRecordId: contentRecord.id,
            userId,
            platform,
            content,
            customPromptId: promptId
          }
        });
        createdCount++;
        return {
          ...result,
          customPrompt: promptInfo
        };
      } catch (error) {
        console.error(`为平台 ${platform} 创建生成内容失败:`, error);
        return null;
      }
    });

    const results = await Promise.all(generatedContentsPromises);
    const validResults = results.filter(Boolean);

    console.log(`生成内容记录创建成功: ${validResults.length}/${platforms.length}`);

    return NextResponse.json({
      message: "内容已保存",
      contentId: contentRecord.id,
      generatedCount: validResults.length
    });
  } catch (error) {
    console.error("保存内容失败:", error);
    return NextResponse.json(
      { error: "保存内容失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}

// 更新内容记录
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

    // 获取查询参数和请求数据
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "请提供内容ID" },
        { status: 400 }
      );
    }

    // 检查记录是否存在且属于该用户
    const record = await prisma.contentRecord.findUnique({
      where: {
        id,
        userId
      }
    });

    if (!record) {
      return NextResponse.json(
        { error: "内容不存在或无权修改" },
        { status: 404 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { title, originalContent, platforms, generatedContents } = body;

    if (!title || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: "请提供标题和至少一个平台" },
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
      message: "内容已更新",
      contentId: id
    });
  } catch (error) {
    console.error("更新内容失败:", error);
    return NextResponse.json(
      { error: "更新内容失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}

// 删除内容记录
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "请提供内容ID" },
        { status: 400 }
      );
    }

    // 检查记录是否存在且属于该用户
    const record = await prisma.contentRecord.findUnique({
      where: {
        id,
        userId
      }
    });

    if (!record) {
      return NextResponse.json(
        { error: "内容不存在或无权删除" },
        { status: 404 }
      );
    }

    // 删除内容记录（关联的生成内容会通过级联删除自动删除）
    await prisma.contentRecord.delete({
      where: {
        id
      }
    });

    return NextResponse.json({
      message: "内容已删除"
    });
  } catch (error) {
    console.error("删除内容失败:", error);
    return NextResponse.json(
      { error: "删除内容失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}

// 获取用户生成的内容列表
export async function GET_generated_contents(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const platform = searchParams.get('platform');

    const where = {
      userId: session.user.id,
      ...(platform ? { platform } : {}),
    };

    const [contents, total] = await Promise.all([
      prisma.generatedContent.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.generatedContent.count({ where }),
    ]);

    return NextResponse.json({
      contents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取内容列表错误:', error);
    return NextResponse.json(
      { error: '获取内容列表失败' },
      { status: 500 }
    );
  }
}

// 创建新的生成内容
export async function POST_generated_contents(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { title, content, platform } = await request.json();

    if (!title || !content || !platform) {
      return NextResponse.json(
        { error: '标题、内容和平台为必填项' },
        { status: 400 }
      );
    }

    const generatedContent = await prisma.generatedContent.create({
      data: {
        title,
        content,
        platform,
        userId: session.user.id,
      },
    });

    return NextResponse.json(generatedContent);
  } catch (error) {
    console.error('创建内容错误:', error);
    return NextResponse.json(
      { error: '创建内容失败' },
      { status: 500 }
    );
  }
}

// 更新生成内容
export async function PUT_generated_contents(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id, title, content } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: '内容ID为必填项' },
        { status: 400 }
      );
    }

    // 检查内容是否属于当前用户
    const existingContent = await prisma.generatedContent.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingContent) {
      return NextResponse.json(
        { error: '内容不存在或无权限修改' },
        { status: 403 }
      );
    }

    const updatedContent = await prisma.generatedContent.update({
      where: { id },
      data: {
        title: title || existingContent.title,
        content: content || existingContent.content,
      },
    });

    return NextResponse.json(updatedContent);
  } catch (error) {
    console.error('更新内容错误:', error);
    return NextResponse.json(
      { error: '更新内容失败' },
      { status: 500 }
    );
  }
}

// 删除生成内容
export async function DELETE_generated_contents(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '内容ID为必填项' },
        { status: 400 }
      );
    }

    // 检查内容是否属于当前用户
    const existingContent = await prisma.generatedContent.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingContent) {
      return NextResponse.json(
        { error: '内容不存在或无权限删除' },
        { status: 403 }
      );
    }

    await prisma.generatedContent.delete({
      where: { id },
    });

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除内容错误:', error);
    return NextResponse.json(
      { error: '删除内容失败' },
      { status: 500 }
    );
  }
} 