// node --test 的解析钩子：让 src/utils 下的 TS 纯函数可在裸 node 测试中导入。
// - astro:content 是 Astro 虚拟模块：被测代码只用其类型（运行时擦除），此处桩化保证可解析
// - 无扩展名相对导入补 .ts（Astro/TS 惯例；node ESM 要求显式扩展名）
// 由 package.json 的 test:utils 经 --import 注入，对 node --test 的子进程同样生效。
import { registerHooks } from "node:module";

const ASTRO_CONTENT_STUB =
	"data:text/javascript,export const getCollection = async () => [];";

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "astro:content") {
			return { url: ASTRO_CONTENT_STUB, shortCircuit: true };
		}
		if (
			(specifier.startsWith("./") || specifier.startsWith("../")) &&
			context.parentURL?.startsWith("file:")
		) {
			try {
				return nextResolve(
					new URL(`${specifier}.ts`, context.parentURL).href,
					context,
				);
			} catch {
				// 非 .ts 相对导入交回默认解析
			}
		}
		return nextResolve(specifier, context);
	},
});
