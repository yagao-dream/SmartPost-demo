import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 删除特定的自定义提示词
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "未提供认证令牌" },
        { status: 401 }
      );
    }

    const promptId = params.id;
    if (!promptId) {
      return NextResponse.json(
        { error: "未提供提示词ID" },
        { status: 400 }
      );
    }

    // 查找提示词确认所有权
    const prompt = await prisma.customPrompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: "提示词不存在" },
        { status: 404 }
      );
    }

    if (prompt.userId !== session.user.id) {
      return NextResponse.json(
        { error: "无权删除此提示词" },
        { status: 403 }
      );
    }

    // 删除提示词
    await prisma.customPrompt.delete({
      where: { id: promptId },
    });

    return NextResponse.json({
      message: "提示词删除成功",
    });
  } catch (error) {
    console.error("删除提示词失败:", error);
    return NextResponse.json(
      { error: "删除提示词失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
} 