import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fauxAssistantMessage, getCurrentSystemPrompt, getCurrentTools } from "@earendil-works/pi-ai";
import { getEnvApiKey, registerFauxProvider } from "@earendil-works/pi-ai/compat";
import { Agent, getModel, streamSimple, streamAnthropic } from "../src/index.js";
import { completeSimple, getModels, getProviders, parseReasoningLevel } from "../src/provider/index.js";

test("reasoning configuration accepts none and rejects invalid values", () => {
  assert.equal(parseReasoningLevel(undefined), undefined);
  for (const level of ["none", "minimal", "low", "medium", "high", "xhigh"]) {
    assert.equal(parseReasoningLevel(level), level);
  }
  assert.throws(() => parseReasoningLevel("invalid"), /Invalid reasoning level/);
});

test("provider compatibility exports support model lookup and environment keys", () => {
  const models = getModels("anthropic");
  assert.ok(models.length > 0);
  assert.deepEqual(getModel("anthropic", models[0].id), models[0]);
  assert.ok(getProviders().includes("anthropic"));
  assert.equal(typeof streamSimple, "function");
  assert.equal(typeof streamAnthropic, "function");
  assert.equal(getEnvApiKey("openai", { OPENAI_API_KEY: "test-key" }), "test-key");
});

test("compat completeSimple works with a registered provider without network access", async () => {
  const faux = registerFauxProvider();
  try {
    faux.setResponses([fauxAssistantMessage("summary")]);
    const response = await completeSimple(faux.getModel(), {
      systemPrompt: "Summarize",
      messages: [{ role: "user", content: "hello", timestamp: 1 }],
    });
    assert.deepEqual(response.content, [{ type: "text", text: "summary" }]);
    assert.equal(faux.state.callCount, 1);
  } finally {
    faux.unregister();
  }
});

test("Agent normalizes prompt and tools before calling the provider stream", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-mini-provider-"));
  const faux = registerFauxProvider();
  try {
    faux.setResponses([
      (context, options) => {
        assert.equal(options?.reasoning, undefined);
        assert.equal(getCurrentSystemPrompt(context.messages), "Test system prompt");
        assert.deepEqual(getCurrentTools(context.messages).map((tool) => tool.name), ["test_tool"]);
        assert.ok(context.messages.some((message) => message.role === "user"));
        return fauxAssistantMessage("hello from faux");
      },
    ]);
    const agent = new Agent({
      modelDef: faux.getModel(),
      systemPrompt: "Test system prompt",
      reasoning: "none",
      sessionDir: path.join(baseDir, "sessions"),
      memoryDir: path.join(baseDir, "memory"),
      workspaceDir: baseDir,
      enableMemory: false,
      enableContext: false,
      enableSkills: false,
      enableHeartbeat: false,
      tools: [{
        name: "test_tool",
        description: "Test tool",
        inputSchema: { type: "object", properties: {} },
        execute: async () => "done",
      }],
    });
    const result = await agent.run("provider-test", "hello");
    assert.equal(result.text, "hello from faux");
    assert.equal(result.turns, 1);
    assert.equal(faux.state.callCount, 1);
  } finally {
    faux.unregister();
    await fs.rm(baseDir, { recursive: true, force: true });
  }
});
