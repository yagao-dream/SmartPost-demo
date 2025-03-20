import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取用户的平台授权列表
export async function GET(request: Request) {
  try {
    // 从请求头中获取 token
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }
    
    // 验证 token 并获取用户信息
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: "无效的凭证" },
        { status: 401 }
      );
    }

    // 查询用户的平台授权记录
    const platforms = await prisma.platformAuth.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        platform: true,
        createdAt: true,
        updatedAt: true,
        expiry: true
      }
    });

    return NextResponse.json({ platforms });
  } catch (error) {
    console.error("获取平台授权列表失败:", error);
    return NextResponse.json(
      { error: "获取平台授权列表失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}

// 模拟保存平台授权信息
export async function POST(request: Request) {
  try {
    // 从请求头中获取 token
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }
    
    // 验证 token 并获取用户信息
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: "无效的凭证" },
        { status: 401 }
      );
    }

    const { platform, accessToken, refreshToken, metadata } = await request.json();

    // 验证必要字段
    if (!platform || !accessToken) {
      return NextResponse.json(
        { error: "平台和访问令牌为必填项" },
        { status: 400 }
      );
    }

    // 计算过期时间（示例：30天后）
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    // 检查是否已存在该平台的授权
    const existingAuth = await prisma.platformAuth.findFirst({
      where: {
        userId: user.id,
        platform
      }
    });

    let platformAuth;
    if (existingAuth) {
      // 更新现有授权
      platformAuth = await prisma.platformAuth.update({
        where: {
          id: existingAuth.id
        },
        data: {
          accessToken,
          refreshToken,
          expiry,
          metadata: metadata ? JSON.stringify(metadata) : null
        }
      });
    } else {
      // 创建新授权
      platformAuth = await prisma.platformAuth.create({
        data: {
          userId: user.id,
          platform,
          accessToken,
          refreshToken,
          expiry,
          metadata: metadata ? JSON.stringify(metadata) : null
        }
      });
    }

    // 返回不包含敏感信息的授权记录
    const { accessToken: _, refreshToken: __, ...safeAuth } = platformAuth;

    return NextResponse.json({
      auth: safeAuth,
      message: `${platform}平台授权${existingAuth ? '更新' : '创建'}成功`
    });
  } catch (error) {
    console.error("保存平台授权失败:", error);
    return NextResponse.json(
      { error: "保存平台授权失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}

// 删除平台授权
export async function DELETE(request: Request) {
  try {
    // 从请求头中获取 token
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }
    
    // 验证 token 并获取用户信息
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: "无效的凭证" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");

    if (!platform) {
      return NextResponse.json(
        { error: "请提供平台名称" },
        { status: 400 }
      );
    }

    // 查找并删除授权
    const existingAuth = await prisma.platformAuth.findFirst({
      where: {
        userId: user.id,
        platform
      }
    });

    if (!existingAuth) {
      return NextResponse.json(
        { error: "未找到该平台的授权记录" },
        { status: 404 }
      );
    }

    await prisma.platformAuth.delete({
      where: {
        id: existingAuth.id
      }
    });

    return NextResponse.json({
      message: `${platform}平台授权已删除`
    });
  } catch (error) {
    console.error("删除平台授权失败:", error);
    return NextResponse.json(
      { error: "删除平台授权失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
} 