import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { runConsoleSmoke } from "./console-smoke.mjs";

let fixturePort = 49152;
async function fixture(run, handler) {
	const server = createServer((request, response) => {
		if (handler) return handler(request, response);
		response.setHeader("Content-Type", "text/html; charset=utf-8");
		response.end(
			request.url === "/broken/"
				? '<script>console.error("second-page-error")</script>'
				: "<!doctype html><title>Fixture</title><p>OK</p>",
		);
	});
	// Windows may allocate port 6668 for listen(0); Chromium rejects it as unsafe.
	for (;;) {
		try {
			await new Promise((resolve, reject) => {
				server.once("error", reject);
				server.listen(fixturePort++, "localhost", resolve);
			});
			server.removeAllListeners("error");
			break;
		} catch (error) {
			server.removeAllListeners("error");
			if (error.code !== "EADDRINUSE" || fixturePort >= 65535)
				throw error;
		}
	}
	try {
		await run(`http://localhost:${server.address().port}`);
	} finally {
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
	}
}

const timing = {
	navigationTimeout: 1500,
	observeMs: 150,
	settleTimeout: 800,
	quietMs: 50,
};

test("正常多页全部完成且通过", async () => {
	await fixture(async (base) => {
		const report = await runConsoleSmoke({
			base,
			paths: ["/", "/other/"],
			timing,
		});
		assert.equal(report.ok, true);
		assert.equal(report.completed, 2);
		assert.equal(report.pages.length, 2);
	});
});

test("未捕获异常即使没有 console.error 也必须阻断", async () => {
	await fixture(
		async (base) => {
			const report = await runConsoleSmoke({
				base,
				paths: ["/"],
				timing,
			});
			assert.equal(report.ok, false);
			assert.equal(report.pages[0].failures[0].kind, "pageerror");
			assert.match(report.pages[0].failures[0].text, /uncaught-fixture/);
		},
		(_request, response) => {
			response.setHeader("Content-Type", "text/html");
			response.end(
				'<script>throw new Error("uncaught-fixture")</script>',
			);
		},
	);
});

test("只有第二页发生的 console.error 仍阻断且保留全文", async () => {
	await fixture(async (base) => {
		const report = await runConsoleSmoke({
			base,
			paths: ["/", "/broken/"],
			timing,
		});
		assert.equal(report.ok, false);
		assert.equal(report.completed, 2);
		assert.equal(report.pages[0].failures.length, 0);
		assert.match(report.pages[1].failures[0].text, /second-page-error/);
	});
});

test("本站 HTTP 404/503 与连接中断均有资源级失败证据", async () => {
	for (const status of [404, 503, "abort"]) {
		await fixture(
			async (base) => {
				const report = await runConsoleSmoke({
					base,
					paths: ["/"],
					timing,
				});
				assert.equal(report.ok, false);
				assert.ok(
					report.pages[0].failures.some((event) =>
						status === "abort"
							? event.kind === "requestfailed"
							: event.kind === "response" &&
								event.status === status,
					),
				);
			},
			(request, response) => {
				if (request.url === "/bad") {
					if (status === "abort") return response.destroy();
					response.writeHead(status).end("fixture error");
				} else {
					response.setHeader("Content-Type", "text/html");
					response.end(
						'<script>fetch("/bad").catch(()=>{})</script>',
					);
				}
			},
		);
	}
});

test("哨兵仅允许自身 document/fetch 的 404；其他缺图和主动错误仍阻断", async () => {
	for (const extra of [
		"",
		'<img src="/missing.png">',
		'<script>console.error("sentinel-error")</script>',
	]) {
		await fixture(
			async (base) => {
				const report = await runConsoleSmoke({
					base,
					paths: ["/this-page-should-404/"],
					timing,
				});
				assert.equal(report.ok, extra === "");
				assert.ok(report.pages[0].expected.length >= 2);
			},
			(request, response) => {
				response.writeHead(404, { "Content-Type": "text/html" });
				response.end(
					request.url === "/missing.png"
						? "missing"
						: "<script>fetch(location.href)</script>" + extra,
				);
			},
		);
	}
});

test("外域纯网络错误单列，但外域脚本主动 console.error / pageerror 均阻断", async () => {
	for (const behavior of ["network", "console", "throw"]) {
		await fixture(
			async (externalBase) => {
				await fixture(
					async (base) => {
						const report = await runConsoleSmoke({
							base,
							paths: ["/"],
							timing,
						});
						assert.equal(report.ok, false);
						assert.equal(
							report.verdict,
							behavior === "network" ? "REVIEW" : "FAIL",
						);
						assert.equal(
							report.exitCode,
							behavior === "network" ? 2 : 1,
						);
						if (behavior === "network")
							assert.ok(report.pages[0].review.length > 0);
					},
					(_request, response) => {
						response.setHeader("Content-Type", "text/html");
						response.end(
							`<script src="${externalBase}/external.js"></script>`,
						);
					},
				);
			},
			(_request, response) => {
				response.setHeader("Content-Type", "application/javascript");
				if (behavior === "network")
					response.writeHead(503).end("unavailable");
				else
					response.end(
						behavior === "console"
							? 'console.error("external-custom")'
							: 'throw new Error("external-throw")',
					);
			},
		);
	}
});

test("Giscus 例外须核实正文；其余响应只能记录为外部问题", async () => {
	for (const [status, body, expected] of [
		[404, '{"error":"Discussion not found"}', true],
		[404, '{"error":"Other error"}', false],
		[503, '{"error":"Discussion not found"}', false],
	]) {
		await fixture(
			async (base) => {
				const report = await runConsoleSmoke({
					base,
					paths: ["/"],
					timing,
					configureContext: async (context) => {
						await context.route(
							"https://giscus.app/api/discussions?*",
							(route) =>
								route.fulfill({
									status,
									contentType: "application/json",
									body,
									headers: {
										"Access-Control-Allow-Origin": "*",
									},
								}),
						);
					},
				});
				assert.equal(report.ok, expected);
				assert.equal(report.verdict, expected ? "PASS" : "REVIEW");
				assert.equal(report.exitCode, expected ? 0 : 2);
				assert.equal(
					report.pages[0].expected.some((event) =>
						event.classification.reason.includes("Giscus"),
					),
					expected,
				);
				if (!expected) assert.ok(report.pages[0].review.length > 0);
			},
			(_request, response) => {
				response.setHeader("Content-Type", "text/html");
				response.end(
					'<script>fetch("https://giscus.app/api/discussions?term=fixture")</script>',
				);
			},
		);
	}
});

test("本站请求挂起与导航超时均失败并保留页面报告", async () => {
	for (const navigationHang of [false, true]) {
		await fixture(
			async (base) => {
				const report = await runConsoleSmoke({
					base,
					paths: ["/"],
					timing: {
						...timing,
						navigationTimeout: 300,
						settleTimeout: 300,
					},
				});
				assert.equal(report.ok, false);
				assert.equal(report.completed, 0);
				assert.equal(report.pages.length, 1);
				assert.ok(
					report.pages[0].failures.some((event) =>
						["navigation", "incomplete"].includes(event.kind),
					),
				);
			},
			(request, response) => {
				if (navigationHang || request.url === "/hanging") return;
				response.setHeader("Content-Type", "text/html");
				response.end('<script>fetch("/hanging")</script>');
			},
		);
	}
});

test("哨兵错误状态与另一个不存在地址不能借例外通过", async () => {
	await fixture(
		async (base) => {
			const report = await runConsoleSmoke({
				base,
				paths: ["/this-page-should-404/", "/another-dead/"],
				timing,
			});
			assert.equal(report.ok, false);
			assert.equal(report.pages[0].failures[0].kind, "navigation");
			assert.ok(
				report.pages[1].failures.some(
					(event) => event.kind === "response",
				),
			);
		},
		(request, response) => {
			response.writeHead(request.url === "/another-dead/" ? 404 : 200, {
				"Content-Type": "text/html",
			});
			response.end("<!doctype html><p>fixture</p>");
		},
	);
});

test("空清单与无效观察窗口不能得到全绿结果", async () => {
	await fixture(async (base) => {
		await assert.rejects(
			runConsoleSmoke({ base, paths: [], timing }),
			/empty/i,
		);
		await assert.rejects(
			runConsoleSmoke({
				base,
				paths: ["/"],
				timing: { ...timing, observeMs: 900 },
			}),
			/timing/i,
		);
	});
});

test("主动输出与浏览器404完全相同的文本仍必须阻断", async () => {
	await fixture(
		async (base) => {
			const report = await runConsoleSmoke({
				base,
				paths: ["/this-page-should-404/"],
				timing,
			});
			assert.equal(report.ok, false);
			assert.ok(
				report.pages[0].failures.some(
					(event) => event.kind === "console",
				),
			);
		},
		(_request, response) => {
			response.writeHead(404, { "Content-Type": "text/html" });
			response.end(
				'<script>console.error("Failed to load resource: the server responded with a status of 404 (Not Found)")</script>',
			);
		},
	);
});

test("待裁定的外站错误不能掩盖同页本站失败", async () => {
	await fixture(
		async (externalBase) => {
			await fixture(
				async (base) => {
					const report = await runConsoleSmoke({
						base,
						paths: ["/"],
						timing,
					});
					assert.equal(report.ok, false);
					assert.equal(report.verdict, "FAIL");
					assert.equal(report.exitCode, 1);
					assert.ok(report.pages[0].review.length > 0);
					assert.ok(
						report.pages[0].failures.some((event) =>
							event.text.includes("local-with-pending"),
						),
					);
				},
				(_request, response) => {
					response.setHeader("Content-Type", "text/html");
					response.end(
						`<script src="${externalBase}/failed.js"></script><script>console.error("local-with-pending")</script>`,
					);
				},
			);
		},
		(_request, response) => {
			response
				.writeHead(503, { "Content-Type": "application/javascript" })
				.end("unavailable");
		},
	);
});

test("已确认的 Iconify 冒号拼接 SVG 404 必须判为缺陷", async () => {
	await fixture(
		async (base) => {
			const report = await runConsoleSmoke({
				base,
				paths: ["/"],
				timing,
				configureContext: async (context) => {
					await context.route(
						"https://api.iconify.design/logos:astro.svg",
						(route) => route.fulfill({ status: 404, body: "" }),
					);
				},
			});
			assert.equal(report.verdict, "FAIL");
			assert.equal(report.exitCode, 1);
			assert.ok(
				report.pages[0].failures.some((event) =>
					event.classification.reason.includes("Iconify"),
				),
			);
		},
		(_request, response) => {
			response.setHeader("Content-Type", "text/html");
			response.end(
				'<img src="https://api.iconify.design/logos:astro.svg">',
			);
		},
	);
});

// A real PCM WAV fixture makes Chromium report actual media readiness; no media properties are mocked.
function silentWav() {
	const dataSize = 16000;
	const buffer = Buffer.alloc(44 + dataSize);
	buffer.write("RIFF");
	buffer.writeUInt32LE(36 + dataSize, 4);
	buffer.write("WAVEfmt ", 8);
	buffer.writeUInt32LE(16, 16);
	buffer.writeUInt16LE(1, 20);
	buffer.writeUInt16LE(1, 22);
	buffer.writeUInt32LE(8000, 24);
	buffer.writeUInt32LE(16000, 28);
	buffer.writeUInt16LE(2, 32);
	buffer.writeUInt16LE(16, 34);
	buffer.write("data", 36);
	buffer.writeUInt32LE(dataSize, 40);
	return buffer;
}

async function playerCase({
	notice = true,
	source = "https://myhkw.cn/api/tts",
	ready = true,
	errorCode = "aborted",
	resource = "media",
	production = false,
	extra = "",
	noticeStyle = "",
	closeAfterMs = 0,
} = {}) {
	let result;
	await fixture(async (localBase) => {
		const base = production ? "https://a8-production.example" : localBase;
		const html = `${notice ? `<div style="${noticeStyle}">网站音乐播放器请前往myhkw.cn免费注册授权后使用！</div>` : ""}<audio id="myhkaudio" preload="auto" src="${source}"></audio>${resource === "media" ? '<audio preload="auto" src="https://myhkw.cn/player/err.mp3"></audio>' : '<script>fetch("https://myhkw.cn/player/err.mp3").catch(()=>{})</script>'}${extra}`;
		result = await runConsoleSmoke({
			base,
			paths: ["/"],
			timing: { ...timing, observeMs: 350, settleTimeout: 1500 },
			configureContext: async (context) => {
				if (closeAfterMs)
					setTimeout(
						() => context.close().catch(() => {}),
						closeAfterMs,
					).unref();
				await context.route("https://myhkw.cn/**", (route) =>
					route.request().url() === "https://myhkw.cn/player/err.mp3"
						? route.abort(errorCode)
						: route.fulfill({
								status: 200,
								contentType: "audio/wav",
								body: ready
									? silentWav()
									: Buffer.from("not a wave"),
							}),
				);
				await context.route(base + "/", (route) =>
					route.fulfill({
						status: 200,
						contentType: "text/html; charset=utf-8",
						body: html,
					}),
				);
			},
		});
	});
	return result;
}

test("本地提示音只有授权提示与真实就绪媒体均满足才作为预期", async () => {
	const report = await playerCase();
	assert.equal(
		report.verdict,
		"PASS",
		JSON.stringify(report.pages[0], null, 2),
	);
	assert.ok(
		report.pages[0].expected.some(
			(e) => e.url === "https://myhkw.cn/player/err.mp3",
		),
	);
	assert.ok(report.pages[0].playerState.readyState >= 2);
});

test("播放器精确例外不得扩展到生产、缺提示、错误媒体或其他资源类型", async () => {
	for (const options of [
		{ production: true },
		{ notice: false },
		{ source: "https://myhkw.cn/other.wav" },
		{ ready: false },
		{ errorCode: "connectionclosed" },
		{ resource: "fetch" },
	]) {
		const report = await playerCase(options);
		assert.equal(report.ok, false, JSON.stringify(options));
		assert.ok(
			!report.pages[0].expected.some((e) =>
				e.classification.reason.includes("MyHK"),
			),
			JSON.stringify(options),
		);
	}
});

test("符合本地提示音例外也不得放行主动 console.error 或 pageerror", async () => {
	for (const extra of [
		'<script>console.error("player-active-error")</script>',
		'<script>throw new Error("player-active-error")</script>',
	]) {
		const report = await playerCase({ extra });
		assert.equal(report.verdict, "FAIL");
		assert.ok(
			report.pages[0].expected.some((e) =>
				e.classification.reason.includes("MyHK"),
			),
		);
		assert.ok(
			report.pages[0].failures.some((e) =>
				e.text.includes("player-active-error"),
			),
		);
	}
});

async function adCase({
	frameOrigin = "https://www.youtube.com",
	embedded = true,
	scriptPath = "/instream/ad_status.js",
	errorCode = "connectionclosed",
	extra = "",
} = {}) {
	let result;
	await fixture(async (base) => {
		const frameUrl = frameOrigin + "/embed/a8-fixture";
		const src = "https://static.doubleclick.net" + scriptPath;
		const child = `<script src="${src}"></script>${extra}`;
		result = await runConsoleSmoke({
			base,
			paths: ["/"],
			timing: { ...timing, observeMs: 350, settleTimeout: 1500 },
			configureContext: async (context) => {
				await context.route(src, (route) => route.abort(errorCode));
				await context.route(frameUrl, (route) =>
					route.fulfill({
						status: 200,
						contentType: "text/html; charset=utf-8",
						body: child,
					}),
				);
				await context.route(base + "/", (route) =>
					route.fulfill({
						status: 200,
						contentType: "text/html; charset=utf-8",
						body: embedded
							? `<iframe src="${frameUrl}"></iframe>`
							: child,
					}),
				);
			},
		});
	});
	return result;
}

test("仅 YouTube 子帧的精确广告脚本断连可作为预期", async () => {
	const report = await adCase();
	assert.equal(report.verdict, "PASS");
	assert.ok(
		report.pages[0].expected.some(
			(e) =>
				e.url ===
				"https://static.doubleclick.net/instream/ad_status.js",
		),
	);
});

test("广告例外不扩展到主文档、其他域、其他路径或其他错误", async () => {
	for (const options of [
		{ embedded: false },
		{ frameOrigin: "https://video.example" },
		{ frameOrigin: "https://www.youtube.com.bad.example" },
		{ scriptPath: "/instream/other.js" },
		{ scriptPath: "/instream/ad_status.js?other=1" },
		{ errorCode: "failed" },
	]) {
		const report = await adCase(options);
		assert.equal(report.verdict, "REVIEW", JSON.stringify(options));
		assert.ok(
			!report.pages[0].expected.some((e) =>
				e.classification.reason.includes("YouTube"),
			),
			JSON.stringify(options),
		);
	}
});

test("广告例外不吞主动 console.error 或未捕获异常", async () => {
	for (const extra of [
		'<script>console.error("Failed to load resource: net::ERR_CONNECTION_CLOSED")</script>',
		'<script>throw new Error("embed-uncaught")</script>',
	]) {
		const report = await adCase({ extra });
		assert.equal(report.verdict, "FAIL");
		assert.ok(
			report.pages[0].expected.some((e) =>
				e.classification.reason.includes("YouTube"),
			),
		);
		assert.ok(
			report.pages[0].failures.some((e) =>
				["console", "pageerror"].includes(e.kind),
			),
		);
	}
});

test("透明或隐藏的授权文字不得触发播放器例外", async () => {
	for (const noticeStyle of [
		"opacity:0",
		"visibility:hidden",
		"display:none",
	]) {
		const report = await playerCase({ noticeStyle });
		assert.equal(report.verdict, "REVIEW", noticeStyle);
		assert.equal(
			report.pages[0].playerState.authorizationNotice,
			false,
			noticeStyle,
		);
	}
});

test("正常渲染的授权提示不额外要求位于首屏", async () => {
	const report = await playerCase({
		noticeStyle: "position:absolute;left:-99999px",
	});
	assert.equal(report.verdict, "PASS");
	assert.equal(report.pages[0].playerState.authorizationNotice, true);
});

test(
	"主线程阻塞时媒体状态采集须超时，非媒体候选不进入状态采集",
	{ timeout: 12000 },
	async () => {
		const extra =
			'<script>document.getElementById("myhkaudio").addEventListener("canplay",()=>{const block=()=>setTimeout(()=>{while(true){}},0);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",block,{once:true});else block();},{once:true});</script>';
		for (const resource of ["media", "fetch"]) {
			const report = await playerCase({
				extra,
				resource,
				closeAfterMs: 5000,
			});
			assert.equal(report.verdict, "REVIEW");
			if (resource === "media")
				assert.match(
					report.pages[0].playerStateError,
					/snapshot timed out/,
				);
			else assert.equal(report.pages[0].playerStateError, undefined);
		}
	},
);
