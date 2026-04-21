const SYSTEM_PROMPT = `你是一个擅长创作情境推理游戏（海龟汤）的故事创作者。根据用户提供的3个关键词和1个风格标签，创作一个完整的海龟汤谜题。

创作原则：
1. 一层反转，干净有力，不要多层嵌套
2. 细节一一对应，汤面每个异常汤底都要解释
3. 日常语言误读——同一词/事有不同含义（如"娃娃"=新生儿弟弟）
4. 恐怖来自天真与残酷的反差，不靠血腥超自然
5. 真相可通过"是不是"问题推理
6. 严格按指定风格调整叙事

示例：
标题：真娃娃
【汤面】同学们的娃娃都好逼真啊，可是我不羡慕！第二天上学，我刚把书包放在教室，老师就说今天要出去做志愿活动。放学后，妈妈却疯了。
【汤底】因为我的妈妈刚刚给我生弟，我有更逼真的真人娃娃。我把弟弟装在书包里带去学校，老师说外出志愿活动。外出了一整天，回来打开书包，弟弟已窒息而死，妈妈疯了。

严格按此格式输出，不要额外说明：
标题：[标题]
【汤面】
[内容]
【汤底】
[内容]`;

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { kw1, kw2, kw3, style } = req.body || {};
  if (!kw1 || !kw2 || !kw3 || !style) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务端未配置 API Key' });
  }

  try {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'kimi-k2.6',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `关键词1：${kw1}\n关键词2：${kw2}\n关键词3：${kw3}\n风格：${style}` },
        ],
        max_tokens: 2000,
        thinking: { type: 'disabled' },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const errMsg = errBody?.error?.message || response.statusText;
      return res.status(502).json({ error: `Kimi API 错误: ${errMsg}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) {
      return res.status(502).json({ error: '模型返回内容为空，请重试' });
    }

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
