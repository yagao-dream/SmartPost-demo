import { createUser, getUserByEmail, getUserById } from './db';
import db from './db';
import { hash, compare } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export async function registerUser(email: string, password: string, display_name?: string): Promise<User> {
  try {
    // 检查邮箱是否已存在
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      throw new Error('邮箱已被注册');
    }

    // 生成密码哈希
    const password_hash = await hash(password, SALT_ROUNDS);

    // 生成用户ID
    const id = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);

    // 创建用户
    await createUser({
      id,
      email,
      password_hash,
      display_name
    });

    // 获取创建的用户
    const user = await getUserById(id) as User;
    if (!user) {
      throw new Error('用户创建失败');
    }

    return user;
  } catch (error) {
    console.error('注册用户失败:', error);
    throw error;
  }
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  try {
    // 获取用户
    const user = await getUserByEmail(email) as any;
    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证密码
    const isValid = await compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('密码错误');
    }

    // 生成JWT令牌
    const token = sign(
      { 
        userId: user.id,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 更新最后登录时间
    await updateLastLogin(user.id);

    // 返回用户信息（不包含密码）和令牌
    const { password_hash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword as User,
      token
    };
  } catch (error) {
    console.error('用户登录失败:', error);
    throw error;
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const decoded = verify(token, JWT_SECRET) as { userId: string };
    const user = await getUserById(decoded.userId) as any;
    
    if (!user) {
      return null;
    }

    // 返回用户信息（不包含密码）
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('验证令牌失败:', error);
    return null;
  }
}

async function updateLastLogin(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [userId],
      (error: Error | null) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}

export async function verifyAuth(token: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    console.error('验证令牌失败:', error);
    return null;
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
} 