/**
 * 文件处理工具函数
 */
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import axios from 'axios';
import { createWorker } from 'tesseract.js';

// 配置PDF.js worker
if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
  // 在浏览器环境中加载worker
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';
}

/**
 * 从文件中提取文本内容
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  // 处理纯文本文件
  if (fileType === 'text/plain') {
    return readTextFile(file);
  }
  
  // 处理 Markdown 文件
  if (fileType === 'text/markdown' || fileName.endsWith('.md')) {
    return readTextFile(file);
  }
  
  // 处理PDF文件
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    try {
      return await extractPdfText(file);
    } catch (error) {
      console.error('PDF文件解析错误:', error);
      return `解析PDF文件时出错: ${fileName}，错误信息: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }
  
  // 处理 Word 文档
  if (fileType === 'application/msword' || 
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.doc') || 
      fileName.endsWith('.docx')) {
    try {
      return await extractWordText(file);
    } catch (error) {
      console.error('Word文档解析错误:', error);
      return `无法解析Word文档: ${fileName}，错误信息: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }
  
  // 处理 HTML 文件
  if (fileType === 'text/html' || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    try {
      const htmlContent = await readTextFile(file);
      return extractTextFromHtml(htmlContent);
    } catch (error) {
      console.error('HTML解析错误:', error);
      return `无法解析HTML文件: ${fileName}，错误信息: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }
  
  // 处理图片文件
  if (fileType.startsWith('image/') || 
      fileName.endsWith('.png') || 
      fileName.endsWith('.jpg') || 
      fileName.endsWith('.jpeg')) {
    try {
      return await extractTextFromImage(file);
    } catch (error) {
      console.error('图片OCR解析错误:', error);
      return `解析图片文本时出错: ${fileName}，错误信息: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }
  
  return `不支持的文件类型: ${fileType}。请上传文本、Markdown、PDF、Word文档或图片。`;
}

/**
 * 从URL中抓取内容
 */
export async function fetchContentFromUrl(url: string): Promise<string> {
  try {
    // 发送请求获取URL内容
    const response = await axios.get('/api/fetch-url', { 
      params: { url } 
    });
    
    if (response.data && response.data.content) {
      return response.data.content;
    } else {
      throw new Error('无法获取页面内容');
    }
  } catch (error) {
    console.error('URL内容抓取错误:', error);
    throw new Error(`无法从URL获取内容: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 从图片中提取文本 (OCR)
 */
async function extractTextFromImage(file: File): Promise<string> {
  try {
    // 将图片转换为base64格式
    const base64Image = await readFileAsBase64(file);
    
    // 创建OCR worker
    const worker = await createWorker('chi_sim+eng');
    
    // 识别图片文本
    const { data } = await worker.recognize(base64Image);
    await worker.terminate();
    
    if (data.text && data.text.trim()) {
      return data.text;
    } else {
      return '图片中未检测到文本内容。';
    }
  } catch (error) {
    console.error('图片OCR处理错误:', error);
    throw error;
  }
}

/**
 * 读取文件为Base64格式
 */
async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('读取文件失败'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件时发生错误'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * 读取文本文件内容
 */
async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('读取文件失败'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件时发生错误'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * 读取文件为ArrayBuffer
 */
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as ArrayBuffer);
      } else {
        reject(new Error('读取文件失败'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件时发生错误'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 从PDF文件中提取文本
 * 使用PDF.js库解析PDF文件内容
 */
async function extractPdfText(file: File): Promise<string> {
  try {
    // 读取文件为ArrayBuffer
    const arrayBuffer = await readFileAsArrayBuffer(file);
    
    // 加载PDF文档
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    let extractedText = '';
    
    // 提取每一页的文本
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ');
      
      // 添加页码标记
      extractedText += `\n--- 第 ${i} 页 ---\n${pageText}\n`;
    }
    
    return extractedText.trim() || `PDF文件中未检测到文本内容。`;
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw error;
  }
}

/**
 * 从Word文档中提取文本
 * 使用mammoth.js解析Word文档内容
 */
async function extractWordText(file: File): Promise<string> {
  try {
    // 读取文件为ArrayBuffer
    const arrayBuffer = await readFileAsArrayBuffer(file);
    
    // 使用mammoth.js提取文本
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || `无法从Word文档提取文本。`;
  } catch (error) {
    console.error('Word文档解析错误:', error);
    throw error;
  }
}

/**
 * 从HTML中提取纯文本
 */
function extractTextFromHtml(htmlContent: string): string {
  // 在浏览器环境下
  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
  
  // 在服务器环境下（简化版）
  return htmlContent.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 将内容导出为文本文件
 */
export const exportAsText = async (content: string, title: string): Promise<void> => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${title.replace(/\s+/g, '_')}.txt`);
};

/**
 * 将内容导出为PDF文件
 */
export const exportAsPDF = async (content: string, title: string): Promise<void> => {
  try {
    // 创建一个iframe用于打印
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'absolute';
    printIframe.style.top = '-9999px';
    printIframe.style.left = '-9999px';
    document.body.appendChild(printIframe);
    
    // 等待iframe加载完成
    await new Promise(resolve => {
      printIframe.onload = resolve;
      
      // 设置iframe内容
      const printDocument = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (!printDocument) {
        throw new Error('无法创建打印文档');
      }
      
      printDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              @media print {
                body {
                  font-family: Arial, sans-serif;
                  margin: 20mm;
                  font-size: 12pt;
                  line-height: 1.6;
                }
                h1 {
                  font-size: 18pt;
                  margin-bottom: 20px;
                  color: #333;
                }
                .content {
                  white-space: pre-wrap;
                }
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <div class="content">${content.replace(/\n/g, '<br/>')}</div>
          </body>
        </html>
      `);
      printDocument.close();
    });
    
    // 调用打印功能
    const contentWindow = printIframe.contentWindow;
    if (contentWindow) {
      contentWindow.focus();
      contentWindow.print();
    } else {
      throw new Error('无法访问打印窗口');
    }
    
    // 打印完成后删除iframe
    setTimeout(() => {
      document.body.removeChild(printIframe);
    }, 1000);
  } catch (error) {
    console.error('PDF导出错误:', error);
    alert('PDF导出失败，请尝试使用文本格式导出');
  }
};

/**
 * 将内容导出为Markdown文件
 */
export const exportAsMarkdown = async (content: string, title: string): Promise<void> => {
  // 将内容转换为Markdown格式
  const markdownContent = `# ${title}\n\n${content}`;
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${title.replace(/\s+/g, '_')}.md`);
};

/**
 * 保存Blob为文件并下载
 */
function saveAs(blob: Blob, filename: string) {
  // 创建下载链接
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  
  // 添加到文档并点击以触发下载
  document.body.appendChild(link);
  link.click();
  
  // 清理
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 100);
} 