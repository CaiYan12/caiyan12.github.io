/**
 * 点击特效 2：Canvas 粒子爆炸（移植自 https://eco.krt.moe/posts/effect-click/
 * 的 cursor-effects.js）。T7 #122 从 theme-script.ts 迁入，行为逐项保持：
 *
 * - `prefersReducedMotion()` 为真时整体短路（单一判定点见 ./reduced-motion）；
 * - `document.getElementById("click-boom-canvas")` 已存在则短路（dataset/id 守卫，
 *   防同文档重复建 canvas）；
 * - 每次 `window.mousedown` 生成一组 10 个粒子（半径 2、六位十六进制随机色、
 *   初速 1..6 的随机值、角度 π-1..π+1），速度与重力项各减半保持轨迹形状；
 * - `pagehide` **只清空粒子数组**（`booms.length = 0`）。这是既有语义：清数组不等于
 *   停止动画帧（`running` 与已排的 rAF 照旧走完当帧再因空数组自然退出）。基线并
 *   不保证「无动画帧残留」，本票不把它当新增修复项。
 */
import { prefersReducedMotion } from "./reduced-motion";

/** 每组爆炸的粒子数（基线默认值，不对外暴露为可调项） */
const CIRCLE_COUNT = 10;
/** 粒子半径（px），固定值 */
const CIRCLE_RADIUS = 2;

export function initCanvasBoomEffect() {
	if (prefersReducedMotion()) return;
	if (document.getElementById("click-boom-canvas")) return;

	class BoomCircle {
		position: { x: number; y: number };
		renderCount = 0;
		constructor(
			origin: { x: number; y: number },
			private speed: number,
			private color: string,
			private angle: number,
			private context: CanvasRenderingContext2D,
		) {
			this.position = { ...origin };
		}
		draw() {
			this.context.fillStyle = this.color;
			this.context.beginPath();
			this.context.arc(
				this.position.x,
				this.position.y,
				CIRCLE_RADIUS,
				0,
				Math.PI * 2,
			);
			this.context.fill();
		}
		move() {
			// 速度取原版一半（用户要求慢 0.5 倍），重力项同步减半保持轨迹形状
			this.position.x += (Math.sin(this.angle) * this.speed) / 2;
			this.position.y +=
				(Math.cos(this.angle) * this.speed) / 2 +
				this.renderCount * 0.15;
			this.renderCount++;
		}
	}

	class Boom {
		circles: BoomCircle[] = [];
		stop = false;
		constructor(
			private origin: { x: number; y: number },
			private context: CanvasRenderingContext2D,
			private circleCount = CIRCLE_COUNT,
			private area = {
				width: window.innerWidth,
				height: window.innerHeight,
			},
		) {}
		private randomArray(range: string[]) {
			return range[Math.floor(range.length * Math.random())];
		}
		private randomColor() {
			const range = ["8", "9", "A", "B", "C", "D", "E", "F"];
			return (
				"#" +
				Array.from({ length: 6 }, () => this.randomArray(range)).join(
					"",
				)
			);
		}
		private randomRange(start: number, end: number) {
			return (end - start) * Math.random() + start;
		}
		init() {
			for (let i = 0; i < this.circleCount; i++) {
				this.circles.push(
					new BoomCircle(
						this.origin,
						this.randomRange(1, 6),
						this.randomColor(),
						this.randomRange(Math.PI - 1, Math.PI + 1),
						this.context,
					),
				);
			}
		}
		move() {
			// 倒序遍历移除越界粒子：正序 forEach 中 splice 会使后续元素左移被跳过
			for (let index = this.circles.length - 1; index >= 0; index -= 1) {
				const circle = this.circles[index];
				if (
					circle.position.x > this.area.width ||
					circle.position.y > this.area.height
				) {
					this.circles.splice(index, 1);
					continue;
				}
				circle.move();
			}
			if (this.circles.length === 0) {
				this.stop = true;
			}
		}
		draw() {
			this.circles.forEach((circle) => circle.draw());
		}
	}

	const canvas = document.createElement("canvas");
	canvas.id = "click-boom-canvas";
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const style = canvas.style;
	style.position = "fixed";
	style.top = "0";
	style.left = "0";
	style.zIndex = "2147483647";
	style.pointerEvents = "none";
	style.width = `${window.innerWidth}px`;
	style.height = `${window.innerHeight}px`;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	document.body.appendChild(canvas);

	const booms: Boom[] = [];
	let running = false;
	const run = () => {
		running = true;
		if (booms.length === 0) {
			running = false;
			return;
		}
		requestAnimationFrame(run);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// 倒序遍历移除已停止的爆炸，避免正序 splice 跳过元素
		for (let index = booms.length - 1; index >= 0; index -= 1) {
			const boom = booms[index];
			if (boom.stop) {
				booms.splice(index, 1);
				continue;
			}
			boom.move();
			boom.draw();
		}
	};
	window.addEventListener("mousedown", (e) => {
		const boom = new Boom({ x: e.clientX, y: e.clientY }, ctx);
		boom.init();
		booms.push(boom);
		if (!running) run();
	});
	window.addEventListener("pagehide", () => {
		// 既有语义：只清空数组，不停帧。见文件头注释，勿改。
		booms.length = 0;
	});
}
