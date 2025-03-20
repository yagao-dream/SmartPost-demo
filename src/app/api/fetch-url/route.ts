import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * API路由处理URL内容抓取
 */
export async function GET(req: NextRequest) {
  try {
    // 获取URL参数
    const url = req.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: '请提供有效的URL参数' },
        { status: 400 }
      );
    }

    // 使用axios发送HTTP请求获取页面内容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    // 使用cheerio解析HTML
    const $ = cheerio.load(response.data);
    
    // 获取页面标题
    const title = $('title').text().trim();
    
    // 尝试获取文章主体内容
    let content = '';
    
    // 尝试常见的文章内容容器
    const contentSelectors = [
      'article', 
      '.post-content', 
      '.entry-content', 
      '.content', 
      '.article-content',
      '#content',
      'main',
    ];
    
    // 遍历选择器直到找到内容
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length) {
        // 移除脚本和样式标签
        element.find('script, style').remove();
        content = element.text().trim();
        
        // 如果找到了足够的文本内容，就退出循环
        if (content.length > 100) {
          break;
        }
      }
    }
    
    // 如果没有找到合适的内容，则获取body中的文本
    if (!content || content.length < 50) {
      // 移除页面中的脚本、样式和导航等无关内容
      $('script, style, nav, header, footer, aside').remove();
      content = $('body').text().trim();
      
      // 将连续的空白符替换为单个空格
      content = content.replace(/\s+/g, ' ');
    }
    
    // 返回页面内容
    return NextResponse.json({
      title,
      content,
      url,
    });
    
  } catch (error) {
    console.error('URL抓取错误:', error);
    let errorMessage = '抓取URL内容时出错';
    
    if (axios.isAxiosError(error)) {
      errorMessage = `请求失败: ${error.message}`;
      if (error.response) {
        errorMessage += ` (状态码: ${error.response.status})`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 