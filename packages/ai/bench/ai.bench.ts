import { bench, describe } from "vitest";
import { calculateCost, clampThinkingLevel, getModel, getModels, getProviders, getSupportedThinkingLevels } from "../src/models.ts";
import type { Api, AssistantMessage, Model, ModelThinkingLevel, Usage } from "../src/types.ts";
import { parseStreamingJson, repairJson } from "../src/utils/json-parse.ts";
import { isContextOverflow } from "../src/utils/overflow.ts";

// --- Model registry lookups ---

const providers = getProviders();

describe("model registry", () => {
	bench("getProviders", () => {
		getProviders();
	});

	bench("getModels (all providers)", () => {
		for (const provider of providers) {
			getModels(provider);
		}
	});

	bench("getModel (anthropic claude)", () => {
		getModel("anthropic", "claude-sonnet-4-5");
	});
});

// --- Cost / thinking-level helpers ---

const sampleModel = getModels("anthropic")[0] as Model<Api>;

function freshUsage(): Usage {
	return {
		input: 12000,
		output: 3400,
		cacheRead: 8000,
		cacheWrite: 2000,
		cacheWrite1h: 500,
		totalTokens: 25400,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	} as unknown as Usage;
}

describe("cost and thinking levels", () => {
	bench("calculateCost", () => {
		calculateCost(sampleModel, freshUsage());
	});

	bench("getSupportedThinkingLevels", () => {
		getSupportedThinkingLevels(sampleModel);
	});

	bench("clampThinkingLevel (xhigh)", () => {
		clampThinkingLevel(sampleModel, "xhigh" as ModelThinkingLevel);
	});
});

// --- JSON repair / streaming parse ---

const validJson = JSON.stringify({
	tool: "edit_file",
	path: "/src/components/app.tsx",
	content: "export const App = () => <div>Hello, world!</div>;",
	options: { dryRun: false, encoding: "utf-8", retries: 3 },
	tags: ["frontend", "react", "typescript"],
});

const brokenJson = '{"message": "line one\nline two\twith tabs", "path": "C:\\Users\\test", "note": "needs repair"}';

const partialJson = '{"tool": "search", "query": "performance optimization", "results": [{"id": 1, "title": "fast';

describe("json parsing", () => {
	bench("repairJson (already valid)", () => {
		repairJson(validJson);
	});

	bench("repairJson (broken control chars)", () => {
		repairJson(brokenJson);
	});

	bench("parseStreamingJson (complete)", () => {
		parseStreamingJson(validJson);
	});

	bench("parseStreamingJson (partial)", () => {
		parseStreamingJson(partialJson);
	});
});

// --- Context overflow detection ---

function overflowMessage(errorMessage: string): AssistantMessage {
	return {
		role: "assistant",
		content: [],
		stopReason: "error",
		errorMessage,
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
	} as unknown as AssistantMessage;
}

const overflowMessages = [
	overflowMessage("prompt is too long: 213462 tokens > 200000 maximum"),
	overflowMessage("Your input exceeds the context window of this model"),
	overflowMessage("ThrottlingException: Too many requests, please wait before trying again."),
	overflowMessage("This model's maximum prompt length is 131072 but the request contains 537812 tokens"),
];

describe("context overflow detection", () => {
	bench("isContextOverflow (mixed messages)", () => {
		for (const message of overflowMessages) {
			isContextOverflow(message, 200000);
		}
	});
});
