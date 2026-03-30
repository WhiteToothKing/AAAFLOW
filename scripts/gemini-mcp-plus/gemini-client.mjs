import { GoogleGenAI } from '@google/genai';

export class GeminiClient {
  client;
  apiKey;
  conversationHistory = new Map();

  constructor(apiKey) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required');
    }
    this.apiKey = key;
    this.client = new GoogleGenAI({ apiKey: key });
  }

  getConversationId(messages) {
    const firstMessage = messages[0]?.content || '';
    return `conv_${Buffer.from(firstMessage).toString('base64').slice(0, 16)}`;
  }

  updateConversationHistory(conversationId, messages) {
    this.conversationHistory.set(conversationId, [...messages]);
  }

  getStoredConversationHistory(conversationId) {
    return this.conversationHistory.get(conversationId) || [];
  }

  convertMessagesToContents(messages) {
    const contents = [];
    for (const message of messages) {
      if (message.role === 'system') continue;
      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      });
    }
    return contents;
  }

  async chatCompletion(params) {
    const conversationId = this.getConversationId(params.messages);
    const storedHistory = this.getStoredConversationHistory(conversationId);
    const allMessages = [...storedHistory];
    for (const newMessage of params.messages) {
      if (
        !storedHistory.some(
          (existing) => existing.role === newMessage.role && existing.content === newMessage.content,
        )
      ) {
        allMessages.push(newMessage);
      }
    }
    const systemMessages = allMessages.filter((m) => m.role === 'system');
    const systemInstruction =
      params.systemInstruction || systemMessages.map((m) => m.content).join('\n') || undefined;
    const conversationMessages = allMessages.filter((m) => m.role !== 'system');
    const contents = this.convertMessagesToContents(conversationMessages);
    const generationConfig = {
      temperature: params.temperature || 1.0,
      maxOutputTokens: params.maxTokens || 8192,
      candidateCount: 1,
    };
    const config = { ...generationConfig };
    if (systemInstruction) {
      config.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    const result = await this.client.models.generateContent({
      model: `models/${params.model}`,
      contents,
      config,
    });
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const updatedMessages = [...conversationMessages, { role: 'assistant', content: responseText }];
    this.updateConversationHistory(conversationId, updatedMessages);
    return {
      id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: params.model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: responseText },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: result.usageMetadata?.promptTokenCount || 0,
        completion_tokens: result.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: result.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  async countTokens(params) {
    const result = await this.client.models.countTokens({
      model: `models/${params.model}`,
      contents: [{ parts: [{ text: params.text }] }],
    });
    return { totalTokens: result.totalTokens || 0 };
  }

  async listModels() {
    const result = await this.client.models.list();
    const models = [];
    for await (const model of result) {
      models.push({
        name: model.name || '',
        displayName: model.displayName || '',
        description: model.description || '',
        inputTokenLimit: model.inputTokenLimit || 0,
        outputTokenLimit: model.outputTokenLimit || 0,
      });
    }
    return models;
  }

  /**
   * Native image (Nano Banana 2 / 3 Pro Image, etc.) via REST generateContent.
   */
  async generateNativeImage(params) {
    let full = params.prompt;
    if (params.negativePrompt) {
      full += `. Avoid: ${params.negativePrompt}`;
    }
    const model = params.model || 'gemini-3.1-flash-image-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const timeoutMs = Math.min(Math.max((params.timeoutSeconds ?? 120) * 1000, 10_000), 600_000);
    const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout
      ? AbortSignal.timeout(timeoutMs)
      : undefined;

    const bodyWithImageConfig = {
      contents: [{ role: 'user', parts: [{ text: full }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: params.aspectRatio || '1:1',
          imageSize: params.imageSize || '1K',
        },
      },
    };

    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithImageConfig),
      signal,
    });
    let data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const bodyFallback = {
        contents: [{ role: 'user', parts: [{ text: full }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      };
      const signal2 =
        typeof AbortSignal !== 'undefined' && AbortSignal.timeout
          ? AbortSignal.timeout(timeoutMs)
          : undefined;
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyFallback),
        signal: signal2,
      });
      data = await res.json().catch(() => ({}));
    }

    if (!res.ok) {
      throw new Error(
        typeof data === 'object' && data.error?.message
          ? data.error.message
          : `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 800)}`,
      );
    }

    const textParts = [];
    let imageBase64 = null;
    let mimeType = 'image/png';

    for (const c of data.candidates || []) {
      for (const part of c.content?.parts || []) {
        if (part.text) textParts.push(part.text);
        const inline = part.inlineData || part.inline_data;
        if (inline?.data) {
          imageBase64 = inline.data;
          if (inline.mimeType || inline.mime_type) {
            mimeType = inline.mimeType || inline.mime_type;
          }
        }
      }
    }

    if (!imageBase64) {
      throw new Error(
        `No image in response. Model: ${model}. Texts: ${textParts.join(' ').slice(0, 200)}`,
      );
    }

    return {
      model,
      aspectRatio: params.aspectRatio || '1:1',
      imageSize: params.imageSize || '1K',
      text: textParts.join('\n').trim(),
      imageBase64,
      mimeType,
    };
  }
}
