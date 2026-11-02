// 技能图标的脱网回归；只判本地来源和图像解码，外部服务错误由 smoke:console 单独把关。
import { makeHarness } from "./lib/smoke-harness.mjs";

const harness = makeHarness({
	envVar: "SKILLS_BASE_URL",
	defaultBase: "http://localhost:4322",
});
const browser = await harness.browser.launch(harness.launch);
for (const width of [1280, 390]) {
	const context = await browser.newContext({
		viewport: { width, height: 900 },
	});
	await context.route("**/*", (route) =>
		new URL(route.request().url()).origin === new URL(harness.base).origin
			? route.continue()
			: route.abort(),
	);
	const page = await context.newPage();
	await page.goto(`${harness.base}/skills/`, { waitUntil: "networkidle" });
	const icons = await page
		.locator("img[data-skill-icon]")
		.evaluateAll(async (images) =>
			Promise.all(
				images.map(async (image) => {
					image.loading = "eager";
					await image.decode().catch(() => {});
					return {
						name: image.dataset.skillIcon,
						local: new URL(image.src).origin === location.origin,
						decoded: image.complete && image.naturalWidth > 0,
						visible: getComputedStyle(image).display !== "none",
					};
				}),
			),
		);
	harness.check(
		`${width}：技能图标存在并全部来自本站`,
		icons.length > 0 && icons.every((icon) => icon.local),
		`${icons.length} icons`,
	);
	harness.check(
		`${width}：外网不可用仍全部解码，不触发首字回退`,
		icons.every((icon) => icon.decoded && icon.visible),
		icons
			.filter((icon) => !icon.decoded || !icon.visible)
			.map((icon) => icon.name)
			.join(", "),
	);
	await context.close();
}
await browser.close();
harness.finish();
