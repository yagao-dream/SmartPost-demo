import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

// 初始化OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 平台特定的系统提示词
const platformSystemPrompts: Record<string, string> = {
  twitter: "你是一个专业的Twitter社交媒体经理。你的任务是将用户输入内容转化为引人入胜、符合Twitter特性的推文。推文应简洁有力，字数限制在280字以内，可适当使用emoji和hashtag增强表现力。注重传递核心信息，同时保持专业性与吸引力。",
  
  xiaohongshu: "你是一个专业的小红书内容创作者。你的任务是将用户输入内容转化为符合小红书平台特点的笔记。内容应该生动有趣，使用亲切自然的语气，适当加入emoji表情，分段清晰，标题吸引人。可以使用'#标签'形式添加3-5个相关话题标签增加曝光。重点突出核心内容的实用性和价值感。",
  
  zhihu: "你是一个专业的知乎回答者。你的任务是将用户输入内容转化为专业、有深度的知乎回答。内容应该逻辑清晰，论证有力，语言表达要专业且权威，可以适当引用研究或数据支持观点。回答应该分段有序，使用小标题进行结构化，突出核心观点，同时保持客观中立的立场，展示专业知识和思考深度。",
  
  wechat: "你是一个专业的微信公众号内容编辑。你的任务是将用户输入内容转化为一篇完整的微信公众号文章。文章应该有吸引人的标题，开篇点明主题，内容层次分明，有小标题划分段落，语言风格可以正式也可以轻松，但要保持一致性。适当添加观点和见解，突出内容价值，结尾可以有号召性用语或总结，整体表现出专业性和可读性。"
};

// 生成平台特定内容
async function generatePlatformContent(platform: string, content: string, customPrompt?: { systemPrompt: string, userPrompt: string }): Promise<string> {
  try {
    // 使用默认或自定义提示词
    const systemPrompt = customPrompt?.systemPrompt || platformSystemPrompts[platform] || "请根据用户提供的内容，生成适合社交媒体发布的文案。";
    const userPrompt = customPrompt?.userPrompt
      ? customPrompt.userPrompt.replace('${content}', content)
      : `请根据以下内容生成适合${platform}平台的文案：\n\n${content}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1000
    });

    return completion.choices[0].message.content || "内容生成失败，请重试。";
  } catch (error) {
    console.error(`为平台${platform}生成内容时出错:`, error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    // 验证用户身份
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { platforms, content, title, model = "gpt-3.5-turbo", customPrompts = {}, source = "manual", fileName, fileType } = body;

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: '请提供至少一个目标平台' },
        { status: 400 }
      );
    }

    if (!content && !title) {
      return NextResponse.json(
        { error: '请提供内容或标题' },
        { status: 400 }
      );
    }

    // 创建内容记录
    const contentRecord = await prisma.contentRecord.create({
      data: {
        userId: session.user.id,
        title: title || '未命名内容',
        originalContent: content || '',
        model,
        source,
        fileName,
        fileType
      }
    });

    // 为每个平台生成内容
    const results: Record<string, string> = {};
    const generatedContents = [];

    for (const platform of platforms) {
      try {
        // 检查是否有自定义提示词
        let customPrompt;
        if (customPrompts[platform]) {
          const promptId = customPrompts[platform];
          const prompt = await prisma.customPrompt.findUnique({
            where: { id: promptId }
          });
          if (prompt) {
            customPrompt = {
              systemPrompt: prompt.systemPrompt,
              userPrompt: prompt.userPrompt
            };
          }
        }

        // 生成内容
        const generatedContent = await generatePlatformContent(platform, content || title, customPrompt);
        results[platform] = generatedContent;

        // 保存生成的内容
        generatedContents.push({
          contentRecordId: contentRecord.id,
          platform,
          content: generatedContent,
          customPromptId: customPrompts[platform] || null
        });
      } catch (error) {
        console.error(`为平台${platform}生成内容时出错:`, error);
        results[platform] = `生成失败: ${error instanceof Error ? error.message : '未知错误'}`;
      }
    }

    // 批量保存生成的内容
    if (generatedContents.length > 0) {
      await prisma.generatedContent.createMany({
        data: generatedContents
      });
    }

    return NextResponse.json({ 
      success: true, 
      results,
      contentId: contentRecord.id,
      message: '内容生成成功'
    });
  } catch (error) {
    console.error('生成内容时出错:', error);
    return NextResponse.json(
      { error: '内容生成失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
} 