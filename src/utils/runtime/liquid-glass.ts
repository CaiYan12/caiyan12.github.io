/**
 * 液态玻璃运行时模块：导航条与它的每个下拉面板做成同一块玻璃。
 *
 * 横条一条滤镜，每个面板按自己的尺寸/圆角克隆一条（贴图不通用）。两者都在 Swup
 * 容器之外、切页不重建，所以随装配表初始化一次；横条 ≤1100 是流式宽度，
 * 尺寸变化用 ResizeObserver 重算。import 无副作用：DOM 读取全在 init 内。
 */

/** 液态玻璃的折射比例：透镜带宽与位移强度都按元素**短边**等比取，
 *  这样 1100×55 的横条与 108×126 的下拉面板看起来是同一块玻璃 ——
 *  写死 9px/28px 的话，横条上占短边的 16%/51%（视觉上很抢眼），
 *  到 108px 宽的面板上只剩 8%，就读成一块白板。
 *  比例按横条反推：55×0.16≈9、55×0.51≈28，即 testpics/glass.html 选定的那组 */
const LIQUID_GLASS = { bandRatio: 0.16, strengthRatio: 0.51 };

/** 四角半径：左上、右上、右下、左下（下拉面板只有下两角是圆的） */
type Radii = [number, number, number, number];

function readRadii(cs: CSSStyleDeclaration): Radii {
	return [
		parseFloat(cs.borderTopLeftRadius) || 0,
		parseFloat(cs.borderTopRightRadius) || 0,
		parseFloat(cs.borderBottomRightRadius) || 0,
		parseFloat(cs.borderBottomLeftRadius) || 0,
	];
}

/** 圆角矩形 SDF（四角可不同半径），带符号距离，内部为负 */
function sdRoundRect(
	px: number,
	py: number,
	hw: number,
	hh: number,
	radii: Radii,
) {
	const [tl, tr, br, bl] = radii;
	const r = Math.min(px < 0 ? (py < 0 ? tl : bl) : py < 0 ? tr : br, hw, hh);
	const qx = Math.abs(px) - hw + r;
	const qy = Math.abs(py) - hh + r;
	return (
		Math.min(Math.max(qx, qy), 0) +
		Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
		r
	);
}

/** 生成位移贴图：沿 SDF 内法线、按到边缘距离衰减的透镜位移，编进 R/G 两通道。
 *  参考 github.com/shuding/liquid-glass，但位移在像素空间算：
 *  参考实现用归一化 uv，1100×55 的横条会让横向位移放大 20 倍、纵向几乎为零。
 *  每个目标（横条 / 每个下拉面板）都得按自己的宽高与四角半径单独生成一张 */
function liquidGlassMap(width: number, height: number, radii: Radii) {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	const hw = width / 2;
	const hh = height / 2;
	const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
	const smoothstep = (a: number, b: number, x: number) => {
		const t = clamp01((x - a) / (b - a));
		return t * t * (3 - 2 * t);
	};
	const sd = (px: number, py: number) => sdRoundRect(px, py, hw, hh, radii);
	const band = Math.max(
		2,
		Math.round(Math.min(width, height) * LIQUID_GLASS.bandRatio),
	);
	const strength = Math.round(
		Math.min(width, height) * LIQUID_GLASS.strengthRatio,
	);

	const offsets = new Float32Array(width * height * 2);
	let max = 0;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 2;
			const cx = x + 0.5 - hw;
			const cy = y + 0.5 - hh;
			const d0 = sd(cx, cy);
			// 边缘=1，向内 band 处衰减到 0；圆角外与直边外都压到 0
			const profile =
				smoothstep(-band, 0, d0) * smoothstep(1.5, -1.5, d0);
			const gx = sd(cx + 1, cy) - sd(cx - 1, cy);
			const gy = sd(cx, cy + 1) - sd(cx, cy - 1);
			const len = Math.hypot(gx, gy) || 1;
			offsets[i] = (-gx / len) * profile * strength;
			offsets[i + 1] = (-gy / len) * profile * strength;
			max = Math.max(max, Math.abs(offsets[i]), Math.abs(offsets[i + 1]));
		}
	}

	const scale = Math.max(max * 0.5, 0.0001);
	const image = ctx.createImageData(width, height);
	const data = image.data;
	for (let p = 0, q = 0; p < data.length; p += 4, q += 2) {
		data[p] = (offsets[q] / scale + 0.5) * 255;
		data[p + 1] = (offsets[q + 1] / scale + 0.5) * 255;
		data[p + 2] = 0;
		data[p + 3] = 255;
	}
	ctx.putImageData(image, 0, 0);
	return { href: canvas.toDataURL("image/png"), scale };
}

/** 把一张贴图灌进某条滤镜，并让目标元素指向它（CSS 侧读 --lg-filter） */
function installGlassMap(
	el: HTMLElement,
	filter: Element,
	width: number,
	height: number,
	radii: Radii,
) {
	const feImage = filter.querySelector("feImage");
	const displacement = filter.querySelector("feDisplacementMap");
	if (!feImage || !displacement || width < 1 || height < 1) return false;
	const map = liquidGlassMap(width, height, radii);
	if (!map) return false;
	for (const node of [filter, feImage]) {
		node.setAttribute("width", String(width));
		node.setAttribute("height", String(height));
	}
	feImage.setAttribute("href", map.href);
	feImage.setAttributeNS(
		"http://www.w3.org/1999/xlink",
		"xlink:href",
		map.href,
	);
	displacement.setAttribute("scale", map.scale.toFixed(2));
	el.style.setProperty("--lg-filter", `url(#${filter.id})`);
	return true;
}

/** 量一个平时 display:none 的盒子（下拉面板）：临时显形取尺寸与圆角再还原。
 *  必须赶在置 data-liquid-glass 之前完成，否则面板会先以无贴图状态出现一帧 */
function measureHidden(el: HTMLElement) {
	const prev = el.style.cssText;
	el.style.display = "block";
	el.style.visibility = "hidden";
	const rect = el.getBoundingClientRect();
	const radii = readRadii(getComputedStyle(el));
	el.style.cssText = prev;
	return {
		// 向上取整：滤镜区域小于元素会在右缘/下缘留一条未折射的缝
		width: Math.max(1, Math.ceil(rect.width)),
		height: Math.max(1, Math.ceil(rect.height)),
		radii,
	};
}

export function initLiquidGlass() {
	const nav = document.getElementById("head-nav");
	const baseFilter = document.getElementById("lg-nav-filter");
	const defs = baseFilter?.parentElement;
	if (!nav || !baseFilter || !defs) return;
	// Safari 系不支持 backdrop-filter: url()，留在 CSS 里的纯 blur 回落
	if (!CSS.supports("backdrop-filter", "url(#lg-nav-filter) blur(1px)"))
		return;

	const panels = [...document.querySelectorAll<HTMLElement>("#nav li ul")];
	const targets = panels.map((panel, index) => {
		const filter = baseFilter.cloneNode(true) as Element;
		const feImage = filter.querySelector("feImage");
		const displacement = filter.querySelector("feDisplacementMap");
		if (!feImage || !displacement) return null;
		filter.id = `lg-nav-filter-${index + 1}`;
		feImage.id = `lg-nav-map-${index + 1}`;
		displacement.setAttribute("in2", feImage.id);
		defs.appendChild(filter);
		return { el: panel, filter };
	});

	const applyAll = () => {
		const cs = getComputedStyle(nav);
		const box = nav.getBoundingClientRect();
		let installed = installGlassMap(
			nav,
			baseFilter,
			Math.ceil(box.width),
			Math.ceil(box.height),
			readRadii(cs),
		);
		for (const target of targets) {
			if (!target) continue;
			const size = measureHidden(target.el);
			installed =
				installGlassMap(
					target.el,
					target.filter,
					size.width,
					size.height,
					size.radii,
				) || installed;
		}
		if (installed) document.documentElement.dataset.liquidGlass = "on";
	};

	let frame = 0;
	applyAll();
	new ResizeObserver(() => {
		if (frame) cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			frame = 0;
			applyAll();
		});
	}).observe(nav);
}
