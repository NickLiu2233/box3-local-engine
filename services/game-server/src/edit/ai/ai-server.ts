import { MuRemoteClient, MuServer, MuServerProtocol } from '@box-local/mudb/server';
import { AiProtocol } from '@box-local/schema/ai/ai-protocol.schema';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { FeatureFlag } from '@box-local/env/constants';
import {
  Experimental_Agent as Agent,
  convertToModelMessages,
  ModelMessage,
  stepCountIs,
  UIMessage,
} from 'ai';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from 'pino';
import { apis } from '../../apis';
import { CodeEditorServerController } from '../code-editor/code-editor-server-controller';
import { EditServerState } from '../edit-server-schema';
import { EditReplicaServer } from '../replica/replica-server';
import { createEntityTools, createScriptTools } from './entity-tools';

/**
 * LLM 生成选项
 */
export interface LlmGenerateOptions {
  /** 模型名称，如不指定则使用默认模型 */
  model: string;
  /** 最大 token 数，控制生成内容的长度上限 */
  maxTokens?: number;
}

/**
 * AI 服务器类
 * 负责处理通过 MuDB 协议的 AI 对话请求，集成 Vercel AI SDK
 * 参考 DebuggerServer 的设计模式，提供实时的 LLM 交互能力
 */
export class AiServer {
  private logger: Logger;
  private protocol: MuServerProtocol<typeof AiProtocol>;
  private state: EditServerState;
  private replica: EditReplicaServer;
  private tools: ReturnType<typeof createEntityTools> &
    ReturnType<typeof createScriptTools>;
  private abortControllers = new Map<string, AbortController>();
  private openRouter: ReturnType<typeof createOpenRouter>;
  /**
   * 临时处理
   */
  private openAiRouter: any;
  private featureFlags?: string[];

  private apiContext: string;
  private modelMapping: Record<string, string[]>;

  private getSystemPrompt(mapSize: { x: number; y: number; z: number }) {
    return `
You are an expert game developer using the Box Engine. Box Engine is a Minecraft-like game engine where terrain can be edited via voxels.
Here are the API definitions you can use in scripts:
\`\`\`typescript
${this.apiContext}
\`\`\`

Game System Mechanics:
- Map Size: ${mapSize.x}x${mapSize.y}x${mapSize.z}
- Coordinate System: Origin (0, 0, 0) is at the bottom-left corner.
- Default Ground Height: 8
- Basic Controls: The engine automatically handles player movement, jumping, and physics. You do not need to implement these. Focus on game logic.

Scripting Rules:
- Server Scripts: Use CommonJS format. The entry file is 'index.js'.
- Client Scripts: The entry file is 'clientIndex.js'. Do NOT generate client scripts. The client API is currently not supported.
- Models: You must only use models that are already added to the project.
- Public Models: Before using a public model, you must add it to the project first.

When writing scripts, strictly follow these API definitions.
`;
  }

  /**
   * 检查用户是否有权限使用 AI 功能
   */
  private canUseAI(sessionId: string): boolean {
    const permissions = this.state.replica.sessionPermission[sessionId];
    return !!(permissions && permissions.owner);
  }

  /**
   * 使用 Vercel AI SDK 执行 LLM 调用 (流式)
   * @param messages 客户端发送过来的完整对话
   */
  private async generateStream(
    client: MuRemoteClient<typeof AiProtocol.client>,
    requestId: string,
    messages: ModelMessage[],
    candidateModels: string[],
    options: LlmGenerateOptions,
  ): Promise<void> {
    const sessionId = client.sessionId;
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    let lastError: any;

    // Check if silconFlow feature flag is enabled before selecting provider
    const useSilconFlow = this.featureFlags?.includes(FeatureFlag.SilconFlow);

    for (const model of candidateModels) {
      try {
        if (abortController.signal.aborted) return;

        const aiModel = useSilconFlow
          ? this.openAiRouter
          : this.openRouter.chat(model, {
              reasoning: { enabled: true, effort: 'medium' },
            });

        this.logger.debug(
          {
            sessionId,
            model,
            provider: useSilconFlow ? 'silconflow' : 'openrouter',
          },
          'Selected AI provider and model',
        );

        this.logger.info(
          { sessionId, messages, model },
          'Sending messages to LLM',
        );

        const shape = this.state.replica.project.voxels.shape;
        const systemPrompt = this.getSystemPrompt(shape);

        // 调用 Vercel AI SDK Agent
        const agent = new Agent({
          model: aiModel,
          tools: this.tools,
          system: systemPrompt,
          stopWhen: stepCountIs(100), // TODO move into config
        });

        const result = agent.stream({
          messages,
          providerOptions: useSilconFlow
            ? undefined
            : {
                openrouter: {
                  reasoning: {
                    max_tokens: 100000,
                  },
                },
              },
        });

        const uiStream = result.toUIMessageStream();

        // 处理流式文本
        for await (const part of uiStream) {
          this.logger.debug(
            { sessionId, part },
            'Received stream part from LLM',
          );

          // Check for error in stream part
          if (part.type === 'error') {
            throw new Error(part.errorText);
          }

          if (abortController.signal.aborted) {
            break;
          }
          // 发送流式块到客户端
          client.message.streamChunk({
            requestId,
            chunk: JSON.stringify(part),
            done: false,
          });
        }

        if (abortController.signal.aborted) {
          this.logger.info({ sessionId, requestId }, 'AI generation aborted');
          return;
        }

        client.message.streamChunk({
          requestId,
          chunk: '',
          done: true,
        });

        const fullContent = await result.text;
        const toolCalls = await result.toolCalls;
        const toolResults = await result.toolResults;
        const reasoning = await result.reasoning;
        const usage = await result.usage;

        this.logger.info(
          {
            sessionId,
            fullContent,
            toolCalls,
            toolResults,
            reasoning,
            usage,
          },
          'LLM Full Response',
        );

        // Record credit usage
        if (usage) {
          try {
            const userId =
              this.state.replica.sessionPermission[sessionId]?.userId;
            if (userId) {
              const result = await apis.boxApi.recordUsage({
                userId: userId.toString(),
                model: model,
                inputTokens: usage.inputTokens || 0,
                outputTokens: usage.outputTokens || 0,
              });
              this.logger.info(
                { sessionId, userId, usage },
                'Credit usage recorded',
              );

              // Send updated balance to client
              client.message.creditUpdate({
                balance: result.remainingBalance,
              });
            } else {
              this.logger.warn(
                { sessionId },
                'User ID not found for credit deduction',
              );
            }
          } catch (err) {
            this.logger.error(
              { sessionId, err },
              'Failed to record credit usage',
            );
          }
        }

        // Success, return
        return;
      } catch (err: any) {
        lastError = err;
        if (abortController.signal.aborted) return;

        this.logger.error(
          { sessionId, model, err },
          'Model generation failed, trying next model if available',
        );
        continue;
      }
    }

    // If we exhausted all models or hit a non-retriable error
    if (lastError) {
      if (abortController.signal.aborted) {
        this.logger.info(
          { sessionId, requestId },
          'AI generation aborted (catch)',
        );
      } else {
        this.logger.error(
          { sessionId, error: lastError },
          'AI generation failed',
        );

        client.message.error({
          requestId,
          message: `AI generation failed.`,
        });
      }
    }

    this.abortControllers.delete(requestId);
  }

  constructor(spec: {
    server: MuServer;
    state: EditServerState;
    replica: EditReplicaServer;
    logger: Logger;
    gameId: number;
    codeEditorController: CodeEditorServerController;
    openRouterApiKey: string;
    featureFlags?: string[];
    aiModelMapping: Record<string, string[]>;
  }) {
    this.logger = spec.logger;
    this.state = spec.state;
    this.replica = spec.replica;
    this.protocol = spec.server.protocol(AiProtocol);
    this.modelMapping = spec.aiModelMapping;
    this.featureFlags = spec.featureFlags;

    this.openRouter = createOpenRouter({
      apiKey: spec.openRouterApiKey,
    });
    this.openAiRouter = createOpenAICompatible({
      baseURL: 'https://api.siliconflow.cn/v1',
      name: 'silconflow',
      apiKey: spec.openRouterApiKey,
    }).chatModel('deepseek-ai/DeepSeek-R1-Distill-Qwen-7B');

    try {
      this.apiContext = fs.readFileSync(
        path.join(__dirname, 'llm-context.d.ts'),
        'utf-8',
      );
    } catch (error) {
      this.logger.error({ error }, 'Failed to load llm-context.d.ts');
      this.apiContext = '// API definitions not available';
    }

    // Initialize Box API Client
    // const boxApiUrl = process.env.BOX_API_URL || 'http://localhost:3003';
    // const serviceSecret = process.env.INTERNAL_SERVICE_SECRET || 'dev-secret';
    // this.boxApiClient = new BoxApiClient({
    //   baseUrl: boxApiUrl,
    //   headers: {
    //     'x-service-secret': serviceSecret,
    //   },
    // });

    const entityTools = createEntityTools(
      this.replica,
      this.state,
      spec.gameId,
      this.logger,
    );
    const scriptTools = createScriptTools(
      this.state,
      spec.codeEditorController,
      this.logger,
    );

    this.tools = {
      ...entityTools,
      ...scriptTools,
    };

    // 配置协议消息处理器
    this.protocol.configure({
      message: {
        sendMessage: async (client, { requestId, messages, model }) => {
          // 验证权限
          if (!this.canUseAI(client.sessionId)) {
            client.message.error({
              requestId,
              message: 'AI 功能未获授权',
            });
            return;
          }

          const sessionId = client.sessionId;

          // 检查余额
          try {
            const userId =
              this.state.replica.sessionPermission[sessionId]?.userId;
            if (userId) {
              const balance = await apis.boxApi.getInternalBalance(
                userId.toString(),
              );

              if (balance.creditBalance <= 0) {
                client.message.error({
                  requestId,
                  message: 'Credit balance is insufficient to use AI features.',
                });
                return;
              }
            }
          } catch (err) {
            this.logger.error(
              { sessionId, err },
              'Failed to check credit balance',
            );
            client.message.error({
              requestId,
              message: '无法验证积分余额，请稍后重试',
            });
            return;
          }

          this.logger.info(
            { sessionId, model },
            'Received message from client',
          );

          // 解析消息历史
          let modelMessages: ModelMessage[] = [];
          try {
            const uiMessages: UIMessage[] = JSON.parse(messages);
            modelMessages = convertToModelMessages(uiMessages);
          } catch (e) {
            this.logger.error(
              { sessionId, error: e },
              'Failed to parse messages',
            );
            client.message.error({
              requestId,
              message: '消息格式错误',
            });
            return;
          }

          // 解析选项
          let candidateModels: string[] = [];
          if (this.modelMapping[model]) {
            candidateModels = this.modelMapping[model];
          } else {
            throw new Error(`Unsupported model selection: ${model}`);
          }

          const options: LlmGenerateOptions = {
            model: candidateModels[0],
          };

          // 执行 LLM 调用
          await this.generateStream(
            client,
            requestId,
            modelMessages,
            candidateModels,
            options,
          );
        },

        abort: (client, { requestId }) => {
          const controller = this.abortControllers.get(requestId);
          if (controller) {
            controller.abort();
            this.logger.info({ requestId }, 'Aborted AI generation');
          }
        },
      },
    });
  }

  /**
   * 清理资源，移除已断开连接的会话
   */
  public cleanup(): void {
    // 无状态模式下无需清理会话
  }
}
