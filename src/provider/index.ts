/**
 * Provider 抽象层 — 基于 @earendil-works/pi-ai
 *
 * 设计决策:
 * - LLM SDK 适配（Anthropic/OpenAI/Gemini）交给 pi-ai 处理
 * - Agent 层只依赖 pi-ai 的统一接口: StreamFunction, Model, Context, AssistantMessageEvent
 * - 错误分类与重试是 Agent 层逻辑，保留在 errors.ts
 */

import type { ThinkingLevel } from "@earendil-works/pi-ai";

export function parseReasoningLevel(value: string | undefined): ThinkingLevel | "none" | undefined {
  switch (value) {
    case undefined:
    case "none":
    case "minimal":
    case "low":
    case "medium":
    case "high":
    case "xhigh":
      return value;
    default:
      throw new Error(`Invalid reasoning level: ${value}`);
  }
}

// pi-ai 核心类型
export type {
  Api,
  KnownApi,
  Provider,
  KnownProvider,
  Model,
  StreamFunction,
  StreamOptions,
  SimpleStreamOptions,
  Context,
  AssistantMessage,
  AssistantMessageEvent,
  AssistantMessageEventStream,
  TextContent,
  ThinkingContent,
  ToolCall,
  Usage,
  StopReason,
  ThinkingLevel,
  Message as PiMessage,
  UserMessage as PiUserMessage,
  ToolResultMessage as PiToolResultMessage,
  Tool as PiTool,
} from "@earendil-works/pi-ai";

// pi-ai 1.x 将旧版全局调用接口保留在 compat 入口
export {
  stream,
  streamSimple,
  complete,
  completeSimple,
} from "@earendil-works/pi-ai/compat";

// pi-ai provider 适配器
export { streamAnthropic, streamSimpleAnthropic } from "@earendil-works/pi-ai/compat";

// pi-ai 模型注册表
export { getModel, getModels, getProviders } from "@earendil-works/pi-ai/compat";

// pi-ai EventStream
export {
  createAssistantMessageEventStream,
  type EventStream,
  AssistantMessageEventStream as AssistantMessageEventStreamClass,
} from "@earendil-works/pi-ai";

// pi-ai context overflow 检测
export { isContextOverflow } from "@earendil-works/pi-ai";

// Agent 层: 错误分类与重试（pi-ai 不包含）
export {
  FailoverError,
  isFailoverError,
  type FailoverReason,
  type RetryOptions,
  retryAsync,
  isContextOverflowError,
  isRateLimitError,
  isTimeoutError,
  isAuthError,
  classifyFailoverReason,
  describeError,
} from "./errors.js";
