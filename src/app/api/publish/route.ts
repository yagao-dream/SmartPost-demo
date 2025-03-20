import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 发布内容到社交媒体平台
export async function POST(request: Request) {
  try {
    // 验证用户身份
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { contentId, platforms } = body;

    if (!contentId) {
      return NextResponse.json(
        { error: "请提供内容ID" },
        { status: 400 }
      );
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: "请提供至少一个发布平台" },
        { status: 400 }
      );
    }

    // 查询要发布的内容
    const contents = await prisma.generatedContent.findMany({
      where: {
        contentRecordId: contentId,
        platform: {
          in: platforms
        }
      },
      include: {
        contentRecord: {
          select: {
            userId: true,
            title: true
          }
        }
      }
    });

    // 检查是否找到内容
    if (contents.length === 0) {
      return NextResponse.json(
        { error: "未找到指定平台的内容" },
        { status: 404 }
      );
    }

    // 检查内容所有权
    if (contents.some(content => content.contentRecord.userId !== session.user.id)) {
      return NextResponse.json(
        { error: "无权发布该内容" },
        { status: 403 }
      );
    }

    // 检查用户平台授权
    const auths = await prisma.platformAuth.findMany({
      where: {
        userId: session.user.id,
        platform: {
          in: platforms
        }
      }
    });

    // 获取已授权的平台
    const authorizedPlatforms = auths.map(auth => auth.platform);
    
    // 找出未授权的平台
    const unauthorizedPlatforms = platforms.filter(
      platform => !authorizedPlatforms.includes(platform)
    );

    // 如果有未授权的平台，返回错误信息
    if (unauthorizedPlatforms.length > 0) {
      return NextResponse.json({
        error: "需要平台授权",
        unauthorizedPlatforms,
        message: "请先授权相关平台后再发布"
      }, { status: 403 });
    }

    // 发布内容到各平台（在实际实现中，这里需要调用各平台的API）
    const results = [];
    const now = new Date();

    for (const content of contents) {
      try {
        // 实际项目中，这里应该调用平台特定的API发布内容
        // 这里仅进行模拟
        
        // 随机模拟一个发布ID和URL
        const platformPostId = `post_${Math.random().toString(36).substring(2, 15)}`;
        const platformPostUrl = `https://${content.platform}.example.com/posts/${platformPostId}`;

        // 更新内容的发布状态
        await prisma.generatedContent.update({
          where: {
            id: content.id
          },
          data: {
            publishStatus: "已发布",
            publishedAt: now
          }
        });

        // 创建发布记录
        const publishRecord = await prisma.publishRecord.create({
          data: {
            userId: session.user.id,
            platform: content.platform,
            contentId: content.id,
            status: "成功",
            platformPostId,
            platformPostUrl
          }
        });

        results.push({
          platform: content.platform,
          status: "success",
          publishRecord
        });
      } catch (error) {
        console.error(`发布内容到${content.platform}失败:`, error);

        // 更新内容的发布状态为失败
        await prisma.generatedContent.update({
          where: {
            id: content.id
          },
          data: {
            publishStatus: "失败",
            publishError: error instanceof Error ? error.message : '未知错误'
          }
        });

        // 创建失败的发布记录
        const publishRecord = await prisma.publishRecord.create({
          data: {
            userId: session.user.id,
            platform: content.platform,
            contentId: content.id,
            status: "失败",
            error: error instanceof Error ? error.message : '未知错误'
          }
        });

        results.push({
          platform: content.platform,
          status: "failed",
          error: error instanceof Error ? error.message : '未知错误',
          publishRecord
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: "内容发布处理完成"
    });
  } catch (error) {
    console.error("发布内容失败:", error);
    return NextResponse.json(
      { error: "发布内容失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}

// 获取发布历史
export async function GET(request: Request) {
  try {
    // 验证用户身份
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where = {
      userId: session.user.id,
      ...(platform ? { platform } : {})
    };

    // 查询发布记录
    const [records, total] = await Promise.all([
      prisma.publishRecord.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma.publishRecord.count({
        where
      })
    ]);

    return NextResponse.json({
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("获取发布历史失败:", error);
    return NextResponse.json(
      { error: "获取发布历史失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
} 