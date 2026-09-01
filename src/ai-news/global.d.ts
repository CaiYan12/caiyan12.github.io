import type { JSX as ReactJSX } from "react";

/** React 19 的 @types/react 不再声明全局 JSX 命名空间（JSX 只作为 react 模块的导出存在）。
 *  项目沿用桌面端的 `JSX.Element` 返回类型写法，故在此重新挂回全局，避免每个文件都改 import。 */
declare global {
	namespace JSX {
		type Element = ReactJSX.Element;
		interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
		type ElementClass = ReactJSX.ElementClass;
	}
}
