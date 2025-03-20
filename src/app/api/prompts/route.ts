import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 获取用户的所有自定义提示词
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

    // 构建查询条件
    const where = {
      userId: session.user.id,
      ...(platform ? { platform } : {}),
    };

    // 查询自定义提示词
    const prompts = await prisma.customPrompt.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("获取自定义提示词失败:", error);
    return NextResponse.json(
      { error: "获取自定义提示词失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}

// 创建新的自定义提示词
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
    const { platform, name, systemPrompt, userPrompt } = body;

    // 验证必要字段
    if (!platform || !name || !systemPrompt || !userPrompt) {
      return NextResponse.json(
        { error: "请提供平台、名称、系统提示词和用户提示词" },
        { status: 400 }
      );
    }

    // 创建自定义提示词
    const prompt = await prisma.customPrompt.create({
      data: {
        userId: session.user.id,
        platform,
        name,
        systemPrompt,
        userPrompt,
      },
    });

    return NextResponse.json({
      prompt,
      message: "自定义提示词创建成功",
    });
  } catch (error) {
    console.error("创建自定义提示词失败:", error);
    return NextResponse.json(
      { error: "创建自定义提示词失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
} 