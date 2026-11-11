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
	/**
	 * 累计摘掉过多少个监听器。
	 *
	 * 「只结算一次」这道守卫**不改变结局**（Promise 只会 resolve 一次，后来的
	 * `resolve` 被引擎忽略），所以它的存在与否从结局上看不出来。它真正保证的是
	 * `settle()` 的**副作用**也只做一次——摘监听、清计时器。这里数摘监听次数，
	 * 就是把那条语义变成可观测的。
	 */
	removalCount(): number;
};

function makeImage(options?: {
	complete?: boolean;
	naturalWidth?: number;
	decode?: "resolve" | "reject" | "absent" | "late";
	/** decode 落定的延迟（毫秒）；`late` 模式下用 */
	decodeDelayMs?: number;
}): FakeImage {
	const listeners = new Map<string, (() => void)[]>();
	let removals = 0;
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
			removals++;
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
		removalCount() {
			return removals;
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

/**
 * 「只结算一次」这道守卫的**可观测形式**。
 *
 * 它不改变结局——Promise 只会 resolve 一次，后来的 `resolve` 被引擎忽略，所以
 * 「有没有这道守卫」从结局上看不出来（删掉它，判据一条也不会红）。它真正保证的
 * 是 `settle()` 的**副作用**也只做一次：摘监听、清计时器。
 *
 * 这条用例数的是「一共摘过几个监听器」：一次结算摘掉 load 与 error 两个；
 * 若守卫没了，迟到的解码会再走一次 `settle()`，把计数推到 4。
 */
test("结算只做一次：迟到信号不得让 module 再摘一次监听", async () => {
	const image = makeImage({ decode: "late", decodeDelayMs: 60 });
	const pending = whenPaintable(asImage(image), { timeoutMs: 10 });

	// load 先到，但解码迟迟不落定 → 上限先到点，按超时收口
	image.complete = true;
	image.naturalWidth = 1920;
	image.fire("load");

	assert.equal(await pending, "timeout", "上限先到点，按超时收口");
	assert.equal(
		image.removalCount(),
		2,
		"一次结算摘掉 load 与 error 两个监听",
	);

	// 迟到的解码落定：它会再走一次判定。没有守卫的话 module 会再摘一次监听
	await new Promise((resolve) => setTimeout(resolve, 120));

	assert.equal(
		image.removalCount(),
		2,
		"结算只做一次：迟到信号不得让 module 再摘一次监听",
	);
});
