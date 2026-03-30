#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  InitializeRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { GeminiClient } from './gemini-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Same source of truth as backend: load ../../backend/.env when MCP env omits keys.
 * Cursor mcp.json env vars always win (we only set missing keys).
 */
function loadBackendDotEnv() {
  const envPath = path.resolve(__dirname, '..', '..', 'backend', '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#') || !s.includes('=')) continue;
    const i = s.indexOf('=');
    const k = s.slice(0, i).trim();
    let v = s.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
}

const ChatCompletionSchema = z.object({
  model: z.string().optional().default('gemini-2.5-pro'),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
  temperature: z.number().min(0).max(2).optional().default(1.0),
  maxTokens: z.number().positive().optional().default(8192),
  systemInstruction: z.string().optional(),
  stream: z.boolean().optional().default(false),
});

const CountTokensSchema = z.object({
  model: z.string().optional().default('gemini-2.5-pro'),
  text: z.string(),
});

const ListModelsSchema = z.object({});

const ASPECT_RATIOS = [
  '1:1',
  '1:4',
  '1:8',
  '2:3',
  '3:2',
  '3:4',
  '4:1',
  '4:3',
  '4:5',
  '5:4',
  '8:1',
  '9:16',
  '16:9',
  '21:9',
];

const IMAGE_SIZES = ['512', '1K', '2K', '4K'];

const AspectRatioEnum = z.enum(ASPECT_RATIOS);
const ImageSizeEnum = z.enum(IMAGE_SIZES);

const GenerateImageSchema = z.object({
  prompt: z.string().min(1).describe('Image description (text-to-image)'),
  model: z
    .string()
    .optional()
    .default('gemini-3.1-flash-image-preview')
    .describe('Gemini image-capable model id'),
  aspectRatio: AspectRatioEnum.optional().default('1:1'),
  imageSize: ImageSizeEnum.optional().default('1K'),
  negativePrompt: z.string().optional().default(''),
  timeoutSeconds: z.number().min(10).max(600).optional().default(120),
});

class GeminiMCPPlusServer {
  server;
  geminiClient;

  constructor(apiKey) {
    this.server = new Server(
      {
        name: 'aaaflow-gemini-mcp-plus',
        version: '1.2.0',
      },
      { capabilities: { tools: {} } },
    );
    this.geminiClient = new GeminiClient(apiKey);
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(InitializeRequestSchema, async () => ({
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'aaaflow-gemini-mcp-plus',
        version: '1.2.0',
      },
      capabilities: { tools: {} },
    }));

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'gemini_generate_image',
          description:
            'Official REST generateContent (same as backend/scripts/gemini_image_cli.py): TEXT+IMAGE modalities, imageConfig then fallback without it. Models: gemini-3.1-flash-image-preview (Nano Banana 2), gemini-3-pro-image-preview, gemini-2.5-flash-image. Uses GEMINI_API_KEY from MCP env or backend/.env. Returns image (base64) + JSON meta.',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'What to draw' },
              model: {
                type: 'string',
                description: 'Model id',
                default: 'gemini-3.1-flash-image-preview',
                enum: [
                  'gemini-3.1-flash-image-preview',
                  'gemini-3-pro-image-preview',
                  'gemini-2.5-flash-image',
                ],
              },
              aspectRatio: {
                type: 'string',
                enum: ASPECT_RATIOS,
                default: '1:1',
              },
              imageSize: {
                type: 'string',
                enum: IMAGE_SIZES,
                default: '1K',
              },
              negativePrompt: { type: 'string', description: 'Things to avoid', default: '' },
              timeoutSeconds: {
                type: 'number',
                description: 'HTTP timeout per attempt (default 120, max 600)',
                default: 120,
              },
            },
            required: ['prompt'],
          },
        },
        {
          name: 'gemini_chat_completion',
          description: 'Generate text using Google Gemini with conversation history',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                default: 'gemini-2.5-pro',
                enum: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
              },
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                    content: { type: 'string' },
                  },
                  required: ['role', 'content'],
                },
              },
              temperature: { type: 'number', minimum: 0, maximum: 2, default: 1.0 },
              maxTokens: { type: 'number', minimum: 1, default: 8192 },
              systemInstruction: { type: 'string' },
              stream: { type: 'boolean', default: false },
            },
            required: ['messages'],
          },
        },
        {
          name: 'gemini_count_tokens',
          description: 'Count tokens in text using Gemini tokenizer',
          inputSchema: {
            type: 'object',
            properties: {
              model: { type: 'string', default: 'gemini-2.5-pro' },
              text: { type: 'string' },
            },
            required: ['text'],
          },
        },
        {
          name: 'gemini_list_models',
          description: 'List available Gemini models',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        switch (name) {
          case 'gemini_generate_image':
            return await this.handleGenerateImage(args);
          case 'gemini_chat_completion':
            return await this.handleChatCompletion(args);
          case 'gemini_count_tokens':
            return await this.handleCountTokens(args);
          case 'gemini_list_models':
            return await this.handleListModels(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${msg}`);
      }
    });
  }

  async handleGenerateImage(args) {
    const params = GenerateImageSchema.parse(args);
    const result = await this.geminiClient.generateNativeImage(params);
    const meta = JSON.stringify(
      {
        model: result.model,
        aspectRatio: result.aspectRatio,
        imageSize: result.imageSize,
        text: result.text || undefined,
      },
      null,
      2,
    );
    return {
      content: [
        { type: 'text', text: meta },
        {
          type: 'image',
          data: result.imageBase64,
          mimeType: result.mimeType,
        },
      ],
    };
  }

  async handleChatCompletion(args) {
    const params = ChatCompletionSchema.parse(args);
    const response = await this.geminiClient.chatCompletion(params);
    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    };
  }

  async handleCountTokens(args) {
    const params = CountTokensSchema.parse(args);
    const result = await this.geminiClient.countTokens(params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  async handleListModels(args) {
    ListModelsSchema.parse(args);
    const models = await this.geminiClient.listModels();
    return {
      content: [{ type: 'text', text: JSON.stringify(models, null, 2) }],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }
}

async function main() {
  loadBackendDotEnv();
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY or GOOGLE_API_KEY is required');
    process.exit(1);
  }
  const server = new GeminiMCPPlusServer(apiKey);
  await server.run();
}

main().catch(() => process.exit(1));
