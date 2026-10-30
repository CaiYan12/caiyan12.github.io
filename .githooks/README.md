# .githooks/ — 提交前 prettier 门禁

`pre-commit`：只对**暂存内容**（索引）用 Prettier 官方 Node API 做 `check`，范围与 CI 一致（`src/` + `docs/`，见 `.github/workflows/lint.yml`）。只读——不改动索引、工作区或任何受控文件。

## 行为

- 索引内容经 `git show :<path>` 逐文件读出暂存 blob，用 `prettier.check(content, { filepath })` 判定——**文件无需存在于磁盘**（官方 API 声明）；部分暂存的文件按**索引里**的版本判定。
- 忽略规则经 `prettier.getFileInfo(path, { ignorePath: <repo>/.prettierignore })` 判定——**完整 glob 语义**，与 CLI/CI 同一实现；不维护扩展名清单（`inferredParser` 为 null 的类型跳过）。
- **配置来源：暂存内容 × 工作区配置**（`resolveConfig` 按文件位置向上搜索，与本机编辑器/CI 看到的配置同源）。若生效的配置文件本身就在本次提交中，检查结果可能与提交内容所用配置不一致——hook 会打印 NOTE 声明这一点，提交后可复核；不为此构建虚拟文件系统。
- prettier 无法解析的暂存内容（语法错误等）按**处理失败**列出原因并阻止提交，不静默放过；原因来自 API 异常或索引读取失败，不解析 CLI `[error]` 文本。
- **prettier 缺失或损坏 = 阻止提交**（明确报错 + `pnpm install` 提示）——门禁语义。区别于 `scripts/enable-hooks.mjs`（安装期配置器）：后者在无 Git 元数据等场景跳过是合法行为，两者不是同一场景。

## 启用与冲突

`pnpm install` 经 `prepare` script 跑 `scripts/enable-hooks.mjs`（pnpm 官方 Scripts 文档：install 依序运行 root 的 `preinstall`/`install`/`postinstall`/`preprepare`/`prepare`/`postprepare`；`--ignore-scripts` 可整体禁用）：`core.hooksPath` 未设时设为 `.githooks`；已设为其他值时**打印冲突、不覆盖**；同时给 hook 文件补执行位（`chmod +x`，Windows 上为 no-op）——新检出的 Linux/macOS clone 依赖这一步，否则 git 忽略无执行位的 hook（githooks 文档明文）。手动启用 `git config core.hooksPath .githooks`；手动关闭 `git config --unset core.hooksPath`。

`core.hooksPath` 写在**共享的 `.git/config`**，作用于本仓库全部 linked worktree（git-worktree 文档原文）；相对路径按「hook 运行目录 = 该 worktree 根」解析（git-config 文档原文）——不含 `.githooks/` 的 worktree（如旧提交的 checkout）找不到 hook 文件，等同于无门禁（不报错）。

## 绕过与边界

- 显式单次绕过：`git commit --no-verify`。
- hook 只查本次暂存文件，是本地快反馈；**push 后 CI 对全量 `./src ./docs` 的检查才是权威门禁**，绕过会在 CI 暴露。
- 修复建议是单文件 `pnpm exec prettier --write <file>` 后由作者审阅、重新暂存；hook 不自动改写，也不建议以整仓 `pnpm format` 作为默认修复动作。
