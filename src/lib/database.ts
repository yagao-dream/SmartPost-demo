// SQLite数据库配置和初始化
import initSqlJs from 'sql.js';
import { useEffect, useState } from 'react';

// 声明sql.js模块
declare module 'sql.js' {
  interface Database {
    exec: (sql: string) => any[];
    run: (sql: string, params?: any) => void;
    prepare: (sql: string) => Statement;
    export: () => Uint8Array;
  }
  
  interface Statement {
    bind: (params: any) => Statement;
    step: () => boolean;
    get: () => any;
    getAsObject: () => any;
    free: () => void;
    run: (params?: any) => void;
  }
}

// 数据库单例
let _db: any = null;
let dbPromise: Promise<any> | null = null;

// SQLite数据库类型
export interface Database {
  exec: (sql: string) => any[];
  run: (sql: string, params?: any) => void;
  prepare: (sql: string) => Statement;
}

// SQL语句类型
export interface Statement {
  bind: (params: any) => Statement;
  step: () => boolean;
  get: () => any;
  getAsObject: () => any;
  free: () => void;
  run: (params?: any) => void;
}

// 初始化数据库
async function initDatabase(): Promise<any> {
  if (_db) return _db;
  
  if (!dbPromise) {
    dbPromise = new Promise(async (resolve, reject) => {
      try {
        // 初始化sql.js
        const SQL = await initSqlJs({
          locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        
        // 创建新数据库或从localStorage加载
        let db;
        if (typeof window !== 'undefined') {
          const savedDb = localStorage.getItem('smartpost_db');
          if (savedDb) {
            const array = new Uint8Array(JSON.parse(savedDb));
            db = new SQL.Database(array);
          } else {
            db = new SQL.Database();
          }
        } else {
          db = new SQL.Database();
        }
        
        // 创建表结构
        createTables(db);
        
        // 保存数据库实例
        _db = db;
        resolve(db);
      } catch (error) {
        console.error('数据库初始化失败:', error);
        reject(error);
      }
    });
  }
  
  return dbPromise;
}

// 创建表结构
function createTables(db: any) {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      display_name TEXT,
      created_at TIMESTAMP DEFAULT (datetime('now')),
      updated_at TIMESTAMP DEFAULT (datetime('now')),
      last_login TIMESTAMP,
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);
  
  // 自定义提示词表
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      platform_id TEXT NOT NULL,
      name TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      user_prompt TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT (datetime('now')),
      updated_at TIMESTAMP DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  
  // 内容生成记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      original_content TEXT,
      model TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT (datetime('now')),
      updated_at TIMESTAMP DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  
  // 生成内容表
  db.exec(`
    CREATE TABLE IF NOT EXISTS generated_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_record_id INTEGER NOT NULL,
      platform_id TEXT NOT NULL,
      content TEXT NOT NULL,
      custom_prompt_id INTEGER,
      FOREIGN KEY (content_record_id) REFERENCES content_records(id) ON DELETE CASCADE,
      FOREIGN KEY (custom_prompt_id) REFERENCES custom_prompts(id) ON DELETE SET NULL
    );
  `);
  
  // 创建索引优化查询
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_custom_prompts_user_id ON custom_prompts(user_id);
    CREATE INDEX IF NOT EXISTS idx_custom_prompts_platform ON custom_prompts(user_id, platform_id);
    CREATE INDEX IF NOT EXISTS idx_content_records_user_id ON content_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_content_records_user_created ON content_records(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_generated_content_record_id ON generated_content(content_record_id);
  `);
}

// 保存数据库到localStorage
export function saveDatabase() {
  if (!_db || typeof window === 'undefined') return;
  
  try {
    const data = _db.export();
    const buffer = new Uint8Array(data);
    const array = Array.from(buffer);
    localStorage.setItem('smartpost_db', JSON.stringify(array));
  } catch (error) {
    console.error('保存数据库失败:', error);
  }
}

// 定期保存数据库
if (typeof window !== 'undefined') {
  setInterval(saveDatabase, 60000); // 每分钟保存一次
}

// 在组件卸载时保存数据库
export function useDatabaseSave() {
  useEffect(() => {
    return () => {
      saveDatabase();
    };
  }, []);
}

// 用户相关操作
export async function createUser(id: string, email: string, displayName: string = '', avatarUrl: string = '') {
  const db = await initDatabase();
  const stmt = db.prepare(`
    INSERT INTO users (id, email, display_name, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  
  stmt.run([id, email, displayName, avatarUrl]);
  stmt.free();
  
  saveDatabase();
}

export async function getUserById(userId: string) {
  const db = await initDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  stmt.bind([userId]);
  
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  
  return result;
}

export async function updateUserLogin(userId: string) {
  const db = await initDatabase();
  const stmt = db.prepare(`
    UPDATE users 
    SET last_login = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `);
  
  stmt.run([userId]);
  stmt.free();
  
  saveDatabase();
}

// 自定义提示词相关操作
export interface CustomPrompt {
  id?: number;
  userId: string;
  platformId: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function saveCustomPrompt(
  userId: string, 
  platformId: string, 
  name: string, 
  systemPrompt: string, 
  userPrompt: string
): Promise<number> {
  const db = await initDatabase();
  const stmt = db.prepare(`
    INSERT INTO custom_prompts (user_id, platform_id, name, system_prompt, user_prompt)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run([userId, platformId, name, systemPrompt, userPrompt]);
  stmt.free();
  
  // 获取最后插入的ID
  const result = db.exec('SELECT last_insert_rowid() as id');
  const promptId = result[0].values[0][0];
  
  saveDatabase();
  return promptId;
}

export async function getUserCustomPrompts(userId: string): Promise<CustomPrompt[]> {
  const db = await initDatabase();
  const stmt = db.prepare(`
    SELECT 
      id, user_id as userId, platform_id as platformId, 
      name, system_prompt as systemPrompt, user_prompt as userPrompt,
      created_at as createdAt, updated_at as updatedAt
    FROM custom_prompts
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `);
  
  stmt.bind([userId]);
  
  const prompts: CustomPrompt[] = [];
  while (stmt.step()) {
    prompts.push(stmt.getAsObject());
  }
  stmt.free();
  
  return prompts;
}

export async function getPlatformCustomPrompts(userId: string, platformId: string): Promise<CustomPrompt[]> {
  const db = await initDatabase();
  const stmt = db.prepare(`
    SELECT 
      id, user_id as userId, platform_id as platformId, 
      name, system_prompt as systemPrompt, user_prompt as userPrompt,
      created_at as createdAt, updated_at as updatedAt
    FROM custom_prompts
    WHERE user_id = ? AND platform_id = ?
    ORDER BY updated_at DESC
  `);
  
  stmt.bind([userId, platformId]);
  
  const prompts: CustomPrompt[] = [];
  while (stmt.step()) {
    prompts.push(stmt.getAsObject());
  }
  stmt.free();
  
  return prompts;
}

export async function getCustomPromptById(promptId: number): Promise<CustomPrompt | null> {
  const db = await initDatabase();
  const stmt = db.prepare(`
    SELECT 
      id, user_id as userId, platform_id as platformId, 
      name, system_prompt as systemPrompt, user_prompt as userPrompt,
      created_at as createdAt, updated_at as updatedAt
    FROM custom_prompts
    WHERE id = ?
  `);
  
  stmt.bind([promptId]);
  
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  
  return result;
}

export async function updateCustomPrompt(
  promptId: number,
  name: string,
  systemPrompt: string,
  userPrompt: string
): Promise<void> {
  const db = await initDatabase();
  const stmt = db.prepare(`
    UPDATE custom_prompts
    SET name = ?, system_prompt = ?, user_prompt = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  
  stmt.run([name, systemPrompt, userPrompt, promptId]);
  stmt.free();
  
  saveDatabase();
}

export async function deleteCustomPrompt(promptId: number): Promise<void> {
  const db = await initDatabase();
  const stmt = db.prepare('DELETE FROM custom_prompts WHERE id = ?');
  
  stmt.run([promptId]);
  stmt.free();
  
  saveDatabase();
}

// 内容记录相关操作
export interface ContentRecord {
  id?: number;
  userId: string;
  title: string;
  originalContent?: string;
  model: string;
  createdAt?: string;
  updatedAt?: string;
  platforms?: string[];
  generatedContent?: Record<string, string>;
  customPrompts?: Record<string, number | null>;
}

export async function saveContentRecord(contentRecord: ContentRecord): Promise<number> {
  const db = await initDatabase();
  
  // 开始事务
  db.exec('BEGIN TRANSACTION');
  
  try {
    // 保存内容记录
    const stmt = db.prepare(`
      INSERT INTO content_records (user_id, title, original_content, model)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run([
      contentRecord.userId, 
      contentRecord.title, 
      contentRecord.originalContent || '', 
      contentRecord.model
    ]);
    stmt.free();
    
    // 获取最后插入的ID
    const result = db.exec('SELECT last_insert_rowid() as id');
    const recordId = result[0].values[0][0];
    
    // 保存生成的内容
    if (contentRecord.generatedContent) {
      for (const [platformId, content] of Object.entries(contentRecord.generatedContent)) {
        const customPromptId = contentRecord.customPrompts?.[platformId] || null;
        
        const contentStmt = db.prepare(`
          INSERT INTO generated_content (content_record_id, platform_id, content, custom_prompt_id)
          VALUES (?, ?, ?, ?)
        `);
        
        contentStmt.run([recordId, platformId, content, customPromptId]);
        contentStmt.free();
      }
    }
    
    // 提交事务
    db.exec('COMMIT');
    
    saveDatabase();
    return recordId;
  } catch (error) {
    // 发生错误时回滚事务
    db.exec('ROLLBACK');
    console.error('保存内容记录失败:', error);
    throw error;
  }
}

export async function getUserContentRecords(userId: string): Promise<ContentRecord[]> {
  const db = await initDatabase();
  
  // 获取内容记录
  const stmt = db.prepare(`
    SELECT 
      id, user_id as userId, title, original_content as originalContent,
      model, created_at as createdAt, updated_at as updatedAt
    FROM content_records
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  
  stmt.bind([userId]);
  
  const records: ContentRecord[] = [];
  while (stmt.step()) {
    records.push(stmt.getAsObject());
  }
  stmt.free();
  
  // 获取每个记录的生成内容
  for (const record of records) {
    const contentStmt = db.prepare(`
      SELECT platform_id as platformId, content, custom_prompt_id as customPromptId
      FROM generated_content
      WHERE content_record_id = ?
    `);
    
    contentStmt.bind([record.id]);
    
    const generatedContent: Record<string, string> = {};
    const customPrompts: Record<string, number | null> = {};
    const platforms: string[] = [];
    
    while (contentStmt.step()) {
      const row = contentStmt.getAsObject();
      generatedContent[row.platformId] = row.content;
      customPrompts[row.platformId] = row.customPromptId;
      platforms.push(row.platformId);
    }
    
    contentStmt.free();
    
    record.generatedContent = generatedContent;
    record.customPrompts = customPrompts;
    record.platforms = platforms;
  }
  
  return records;
}

export async function getContentRecordById(recordId: number): Promise<ContentRecord | null> {
  const db = await initDatabase();
  
  // 获取内容记录
  const stmt = db.prepare(`
    SELECT 
      id, user_id as userId, title, original_content as originalContent,
      model, created_at as createdAt, updated_at as updatedAt
    FROM content_records
    WHERE id = ?
  `);
  
  stmt.bind([recordId]);
  
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  
  const record = stmt.getAsObject();
  stmt.free();
  
  // 获取生成内容
  const contentStmt = db.prepare(`
    SELECT platform_id as platformId, content, custom_prompt_id as customPromptId
    FROM generated_content
    WHERE content_record_id = ?
  `);
  
  contentStmt.bind([recordId]);
  
  const generatedContent: Record<string, string> = {};
  const customPrompts: Record<string, number | null> = {};
  const platforms: string[] = [];
  
  while (contentStmt.step()) {
    const row = contentStmt.getAsObject();
    generatedContent[row.platformId] = row.content;
    customPrompts[row.platformId] = row.customPromptId;
    platforms.push(row.platformId);
  }
  
  contentStmt.free();
  
  record.generatedContent = generatedContent;
  record.customPrompts = customPrompts;
  record.platforms = platforms;
  
  return record;
}

export async function deleteContentRecord(recordId: number): Promise<void> {
  const db = await initDatabase();
  
  // 开始事务
  db.exec('BEGIN TRANSACTION');
  
  try {
    // 删除生成内容
    const contentStmt = db.prepare('DELETE FROM generated_content WHERE content_record_id = ?');
    contentStmt.run([recordId]);
    contentStmt.free();
    
    // 删除内容记录
    const recordStmt = db.prepare('DELETE FROM content_records WHERE id = ?');
    recordStmt.run([recordId]);
    recordStmt.free();
    
    // 提交事务
    db.exec('COMMIT');
    
    saveDatabase();
  } catch (error) {
    // 发生错误时回滚事务
    db.exec('ROLLBACK');
    console.error('删除内容记录失败:', error);
    throw error;
  }
}

// 导出数据库实例函数
export async function getDatabase() {
  return await initDatabase();
}

// 初始化
if (typeof window !== 'undefined') {
  initDatabase().catch(console.error);
} 