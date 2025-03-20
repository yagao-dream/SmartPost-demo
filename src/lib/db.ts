import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';

// 确保数据库目录存在
const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'smartpost.db');

// 创建数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('数据库连接失败:', err);
  } else {
    console.log('数据库连接成功');
    initDatabase();
  }
});

// 初始化数据库表
function initDatabase() {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      display_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP,
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);

  // 自定义提示词表
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      platform_id TEXT NOT NULL,
      name TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      user_prompt TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 内容生成记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS content_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      original_content TEXT,
      model TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 生成内容表
  db.run(`
    CREATE TABLE IF NOT EXISTS generated_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_record_id INTEGER NOT NULL,
      platform_id TEXT NOT NULL,
      content TEXT NOT NULL,
      custom_prompt_id INTEGER,
      FOREIGN KEY (content_record_id) REFERENCES content_records(id) ON DELETE CASCADE,
      FOREIGN KEY (custom_prompt_id) REFERENCES custom_prompts(id) ON DELETE SET NULL
    )
  `);

  // 创建索引
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  db.run('CREATE INDEX IF NOT EXISTS idx_custom_prompts_user_id ON custom_prompts(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_custom_prompts_platform ON custom_prompts(user_id, platform_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_content_records_user_id ON content_records(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_content_records_user_created ON content_records(user_id, created_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_generated_content_record_id ON generated_content(content_record_id)');
}

// 用户相关操作
export async function createUser(user: {
  id: string;
  email: string;
  password_hash: string;
  display_name?: string;
  avatar_url?: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, avatar_url) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(
      [user.id, user.email, user.password_hash, user.display_name, user.avatar_url],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
    stmt.finalize();
  });
}

export async function getUserById(id: string) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export async function getUserByEmail(email: string) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// 提示词相关操作
export async function createCustomPrompt(prompt: {
  user_id: string;
  platform_id: string;
  name: string;
  system_prompt: string;
  user_prompt: string;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT INTO custom_prompts (user_id, platform_id, name, system_prompt, user_prompt) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(
      [prompt.user_id, prompt.platform_id, prompt.name, prompt.system_prompt, prompt.user_prompt],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    stmt.finalize();
  });
}

export async function getCustomPromptsByUserId(user_id: string) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM custom_prompts WHERE user_id = ? ORDER BY updated_at DESC', [user_id], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export async function getCustomPromptsByPlatform(user_id: string, platform_id: string) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM custom_prompts WHERE user_id = ? AND platform_id = ? ORDER BY updated_at DESC',
      [user_id, platform_id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// 内容生成记录相关操作
export async function createContentRecord(record: {
  user_id: string;
  title: string;
  original_content: string;
  model: string;
  generated_contents: Array<{
    platform_id: string;
    content: string;
    custom_prompt_id?: number;
  }>;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      const stmt1 = db.prepare(
        'INSERT INTO content_records (user_id, title, original_content, model) VALUES (?, ?, ?, ?)'
      );
      
      stmt1.run([record.user_id, record.title, record.original_content, record.model], function(err) {
        if (err) {
          db.run('ROLLBACK');
          reject(err);
          return;
        }

        const content_record_id = this.lastID;
        const stmt2 = db.prepare(
          'INSERT INTO generated_content (content_record_id, platform_id, content, custom_prompt_id) VALUES (?, ?, ?, ?)'
        );

        let completed = 0;
        record.generated_contents.forEach((content) => {
          stmt2.run(
            [content_record_id, content.platform_id, content.content, content.custom_prompt_id],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              completed++;
              if (completed === record.generated_contents.length) {
                db.run('COMMIT');
                resolve(content_record_id);
              }
            }
          );
        });

        stmt2.finalize();
      });

      stmt1.finalize();
    });
  });
}

export async function getContentRecordsByUserId(user_id: string) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        cr.*,
        json_group_array(
          json_object(
            'platform_id', gc.platform_id,
            'content', gc.content,
            'custom_prompt_id', gc.custom_prompt_id
          )
        ) as generated_contents
      FROM content_records cr
      LEFT JOIN generated_content gc ON cr.id = gc.content_record_id
      WHERE cr.user_id = ?
      GROUP BY cr.id
      ORDER BY cr.created_at DESC`,
      [user_id],
      (err, rows) => {
        if (err) reject(err);
        else {
          // 解析生成内容的JSON字符串
          const records = rows.map(row => ({
            ...row,
            generated_contents: JSON.parse(row.generated_contents)
          }));
          resolve(records);
        }
      }
    );
  });
}

export default db; 