import assert from "node:assert/strict";
import test from "node:test";
import { convertMessagesToPi } from "../src/message-convert.js";
import type { Message } from "../src/session.js";

const modelInfo = { api: "anthropic-messages", provider: "anthropic", id: "test-model" };

function toolMessage(input?: Record<string, unknown>): Message {
  return {
    role: "assistant",
    timestamp: 1,
    content: [{ type: "tool_use", id: "call-1", name: "test_tool", input }],
  };
}

test("message conversion preserves JSON tool arguments and thinking signatures", () => {
  const shared = { enabled: true };
  const input = { text: "hello", count: 2, nested: [null, shared], shared };
  const message = toolMessage(input);
  assert.ok(Array.isArray(message.content));
  message.content.unshift({ type: "thinking", thinking: "plan", thinkingSignature: "signature" });

  const [converted] = convertMessagesToPi([message], modelInfo);
  assert.equal(converted.role, "assistant");
  if (converted.role !== "assistant") assert.fail("Expected assistant message");
  assert.deepEqual(converted.content, [
    { type: "thinking", thinking: "plan", thinkingSignature: "signature" },
    { type: "toolCall", id: "call-1", name: "test_tool", arguments: input },
  ]);
});

test("message conversion defaults missing tool arguments to an empty object", () => {
  const [converted] = convertMessagesToPi([toolMessage()], modelInfo);
  if (converted.role !== "assistant") assert.fail("Expected assistant message");
  assert.deepEqual(converted.content[0], {
    type: "toolCall", id: "call-1", name: "test_tool", arguments: {},
  });
});

test("message conversion rejects non-JSON and circular tool arguments explicitly", () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  for (const input of [
    { value: undefined },
    { value: NaN },
    { value: Infinity },
    { value: 1n },
    { value: () => "invalid" },
    { value: new Date() },
    circular,
  ]) {
    assert.throws(
      () => convertMessagesToPi([toolMessage(input)], modelInfo),
      /Invalid JSON arguments for tool call: test_tool/,
    );
  }
});
