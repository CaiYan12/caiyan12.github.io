// 共享 module「图片何时可画」的定向单测（Phase F5.2）。
//
// 这个 module 是两条壁纸事务（预载 / 提交）共同的判定与结算内核，它自己的
// 不变量必须被单独钉住——否则「事务变了」和「内核变了」分不开：
//
//   1. 第一个信号定案：load 与 error 谁先到谁说了算，后到的信号不许翻案；
//   2. 可画判定一律「加载完成且具有固有尺寸」，decode 的兑现与被拒同路；
//   3. 结算即清理：监听摘掉、计时器清掉，迟到的事件打不到已定案的结局；
//   4. 超时独立成档（`timeout`），让调用方能留证据。
//
// 桩是自己写的最小 `<img>`：只需要 complete / naturalWidth / decode 与监听。
// 不复用 `wallpaper-scenario.ts`——那个 adapter 服务的是两条事务的整体场景，
// 这里要的是「一个图像 + 一组事件」，两者粒度不同，混用会让本文件依赖
// 事务层的 setup。
import test from "node:test";
import assert from "node:assert/strict";
import { whenPaintable } from "./image-readiness";

/** 最小图像桩：与真实 `<img>` 同形（complete / naturalWidth / decode / 监听） */
type FakeImage = {
	complete: boolean;
	naturalWidth: number;
	decode: () => Promise<void>;
	addEventListener(type: string, listener: () => void): void;
	removeEventListener(type: string, listener: () => void): void;
	/** 派发一次事件；没有监听器时静默空跑（迟到事件本就该被吞掉） */
	fire(type: "load" | "error"): void;
	/** 仍挂着的监听器数（按类型） */
	listenerCount(type: "load" | "error"): number;
};

function makeImage(options?: {
	complete?: boolean;
	naturalWidth?: number;
	decode?: "resolve" | "reject" | "absent" | "late";
	/** decode 落定的延迟（毫秒）；`late` 模式下用 */
	decodeDelayMs?: number;
}): FakeImage {
	const listeners = new Map<string, (() => void)[]>();
	const image: FakeImage = {
		complete: options?.complete ?? false,
		naturalWidth: options?.naturalWidth ?? 0,
		decode: () => Promise.resolve(),
		addEventListener(type, listener) {
			const list = listeners.get(type) ?? [];
			list.push(listener);
			listeners.set(type, list);
		},
		removeEventListener(type, listener) {
			listeners.set(
				type,
				(listeners.get(type) ?? []).filter((item) => item !== listener),
			);
		},
		fire(type) {
			for (const listener of [...(listeners.get(type) ?? [])]) listener();
		},
		listenerCount(type) {
			return (listeners.get(type) ?? []).length;
		},
	};
	if (options?.decode === "resolve") {
		image.decode = () => Promise.resolve();
	} else if (options?.decode === "reject") {
		image.decode = () => Promise.reject(new Error("decode rejected"));
	} else if (options?.decode === "late") {
		const delay = options.decodeDelayMs ?? 50;
		image.decode = () =>
			new Promise((resolve) => {
				setTimeout(resolve, delay);
			});
	}
	if (options?.decode === "absent") {
		(image as { decode?: () => Promise<void> }).decode = undefined as never;
	}
	return image;
}

/** 把桩塞进 module 的参数位（module 只用这四个能力） */
const asImage = (image: FakeImage) => image as unknown as HTMLImageElement;

/** 清空微任务与一个宏任务（不 sleep 固定毫秒） */
async function flush(): Promise<void> {
	for (let i = 0; i < 8; i++) await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	for (let i = 0; i < 8; i++) await Promise.resolve();
}

// ---- 判定口径 ----

test("已经可画就早退：不等信号，也不挂监听", async () => {
	const image = makeImage({ complete: true, naturalWidth: 1920 });

	const result = await whenPaintable(asImage(image), { timeoutMs: 1000 });

	assert.equal(result, "ok");
	assert.equal(image.listenerCount("load"), 0, "早退不得留下监听");
	assert.equal(image.listenerCount("error"), 0);
});

test("load 兑现且有固有尺寸 → ok", async () => {
	const image = makeImage({ decode: "resolve" });
	const pending = whenPaintable(asImage(image), { timeoutMs: 1000 });

	image.complete = true;
	image.naturalWidth = 1920;
	image.fire("load");
	await flush();

	assert.equal(await pending, "ok");
});

test("load 被拒但有固有尺寸 → 仍然 ok（decode 被拒不等于失败）", async () => {
	const image = makeImage({ decode: "reject" });
	const pending = whenPaintable(asImage(image), { timeoutMs: 1000 });

	image.complete = true;
	image.naturalWidth = 1920;
	image.fire("load");
	await flush();

	assert.equal(await pending, "ok");
});

test("load 兑现但没有固有尺寸 → failed", async () => {
	const image = makeImage({ decode: "resolve" });
	const pending = whenPaintable(asImage(image), { timeoutMs: 1000 });

	image.complete = true;
	image.naturalWidth = 0;
	image.fire("load");
	await flush();

	assert.equal(await pending, "failed");
});

test("没有 decode 方法时按「加载完成 + 固有尺寸」判定", async () => {
	const image = makeImage({ decode: "absent" });
	const pending = whenPaintable(asImage(image), { timeoutMs: 1000 });

	image.complete = true;
	image.naturalWidth = 1200;
	image.fire("load");
	await flush();

	assert.equal(await pending, "ok");
});

test("error → failed", async () => {
	const image = makeImage();
	const pending = whenPaintable(asImage(image), { timeoutMs: 1000 });

	image.complete = true;
	image.naturalWidth = 0;
	image.fire("error");
	await flush();

	assert.equal(await pending, "failed");
});

// ---- 超时独立成档 ----

test("什么都不来 → timeout（独立成档，不与 failed 混同）", async () => {
	const image = makeImage();
	const pending = whenPaintable(asImage(image), { timeoutMs: 10 });

	const result = await pending;

	assert.equal(result, "timeout");
});

// ---- 第一个信号定案 ----

test("第一个信号定案：load 先到，后到的 error 不许翻案", async () => {
	const image = makeImage({ decode: "reject" });
	const pending = whenPaintable(asImage(image), { timeoutMs: 1000 });

	image.complete = true;
	image.naturalWidth = 1920;
	image.fire("load");
	// load 分支正在等 decode 落定，此刻 error 到达
	image.complete = true;
	image.naturalWidth = 0;
	image.fire("error");
	await flush();

	assert.equal(await pending, "ok", "load 先到就由 load 定案");
});

test("第一个信号定案：error 先到，后到的 load 不许翻案", async () => {
	const image = makeImage({ decode: "resolve" });
	const pending = whenPaintable(asImage(image), { timeoutMs: 1000 });

	image.fire("error");
	image.complete = true;
	image.naturalWidth = 1920;
	image.fire("load");
	await flush();

	assert.equal(await pending, "failed", "error 先到就由 error 定案");
});

test("decode 迟到时由超时收口（timeout 独立成档）", async () => {
	const image = makeImage({ decode: "late", decodeDelayMs: 200 });
	const pending = whenPaintable(asImage(image), { timeoutMs: 20 });

	image.complete = true;
	image.naturalWidth = 1920;
	image.fire("load");

	assert.equal(await pending, "timeout", "解码迟迟不落定就按超时收口");
});

// ---- 结算即清理 ----

test("结算之后 load / error 监听被摘掉", async () => {
	const image = makeImage({ decode: "resolve" });
	const pending = whenPaintable(asImage(image), { timeoutMs: 1000 });

	assert.equal(
		image.listenerCount("load"),
		1,
		"等信号期间应当挂着 load 监听",
	);
	assert.equal(image.listenerCount("error"), 1);

	image.complete = true;
	image.naturalWidth = 1920;
	image.fire("load");
	await flush();
	await pending;

	assert.equal(image.listenerCount("load"), 0, "结算后不得再留着监听");
	assert.equal(image.listenerCount("error"), 0);
});

test("结算之后迟到的信号打不到已定案的结局上", async () => {
	const image = makeImage({ decode: "resolve" });
	const pending = whenPaintable(asImage(image), { timeoutMs: 1000 });

	image.complete = true;
	image.naturalWidth = 1920;
	image.fire("load");
	await flush();
	assert.equal(await pending, "ok");

	// 迟到的 error：监听已摘掉，什么都不该发生
	image.complete = true;
	image.naturalWidth = 0;
	image.fire("error");
	await flush();

	assert.equal(await pending, "ok", "迟到的 error 不得翻案");
});

test("结算之后计时器被清掉（不会再触发第二次结算）", async () => {
	const image = makeImage();
	const pending = whenPaintable(asImage(image), { timeoutMs: 10 });

	await pending;
	// 上限到点后结算过一次；再等一会儿确认没有第二次结算的副作用
	await new Promise((resolve) => setTimeout(resolve, 30));

	assert.equal(await pending, "timeout");
});
