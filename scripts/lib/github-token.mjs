// GitHub 令牌解析（三个构建期脚本的共享契约）：
// 解析顺序：GITHUB_TOKEN → GH_TOKEN 环境变量 → `gh auth token`（本机已登录 gh CLI）。
// 令牌绝不打印（gh 调用 stdio 全忽略）。失败语义由调用方决定：
// fail-open 场景（fetch-github-repos / fetch-github-contributions）取返回值 null，
// fail-closed 场景（sync-site-stats）由调用方对 null 抛错。
import { execSync } from "node:child_process";

export function resolveGitHubToken({
	env = process.env,
	execImpl = execSync,
} = {}) {
	if (env.GITHUB_TOKEN) return env.GITHUB_TOKEN;
	if (env.GH_TOKEN) return env.GH_TOKEN;
	try {
		return (
			execImpl("gh auth token", {
				encoding: "utf-8",
				stdio: ["ignore", "pipe", "ignore"],
			}).trim() || null
		);
	} catch {
		return null;
	}
}
