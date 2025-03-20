import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: Request) {
  try {
    // 从请求头中获取令牌
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // 验证令牌
      const decoded = verify(token, JWT_SECRET) as { userId: string };
      
      // 获取用户数据
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: "用户不存在" },
          { status: 404 }
        );
      }

      // 返回用户信息（不包含密码）
      const { password, ...userWithoutPassword } = user;
      return NextResponse.json(userWithoutPassword);
    } catch (error) {
      return NextResponse.json(
        { error: "令牌无效" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("获取用户信息错误:", error);
    return NextResponse.json(
      { error: "获取用户信息失败" },
      { status: 500 }
    );
  }
} 