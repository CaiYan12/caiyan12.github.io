# 归档：和风天气代理试验（已搁置）

- 归档日期：2026-09-29（Asia/Shanghai）
- 原位置：`weather-proxy/`、`scripts/qweather-proxy-local.ps1`、`scripts/weather-local-acceptance.mjs`
- 裁决：站长决定**搁置和风天气，天气元件全盘使用 wttr.in 单源**。本目录是搁置留档，不参与 `pnpm build`、`pnpm check`、`pnpm test:weather`、`prettier --check ./src ./scripts`，也不被站点任何代码引用。
- 决策过程原始记录：[`../qweather-settingup-history-sessions.md`](../qweather-settingup-history-sessions.md)（grill-with-docs Q1–Q62 全文）

## 为什么搁置

引入和风的唯一动机是「大陆访客加载更快」（Q46 重开数据源的原因）。要兑现它需要先满足两个前置条件，而两者都不成立且短期无法补齐：

1. **GitHub Pages 是纯静态托管**，没有服务端也没有 secret 机制，API KEY 无处安放 → 必须有一个站外代理。
2. 站长当前**没有 Cloudflare 账号、没有服务器、没有已备案域名**（Q52/Q53 记录）。唯一可行的免费档 `workers.dev` 默认域名**不在 Cloudflare 中国大陆网络上**，其大陆可达性从未实测；PLAN 票 02 的判据明确禁止「以 `workers.dev` 存在或供应商宣传替代大陆可达性」。

也就是说：换源的成本是确定的（多一条独立发布通道、多一份账号与配额运维、把粗化坐标发给一个自己控制的公网端点），收益是**未证实的**。同时 wttr.in 侧同样没有大陆实测数据，所以「和风更快」这个前提两侧都缺证据。搁置而不是删除，是为了在真的拿到大陆测点时不必重写这套东西。

## 本目录内容

| 文件                                                                    | 作用                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wrangler.jsonc`                                                        | Cloudflare Worker 配置：`workers_dev: true`、`WEATHER_ALLOWED_ORIGINS`（含 `https://caiyan12.github.io` 与本地 4321/4322）、`WEATHER_QUOTA` Durable Object 绑定与 `new_sqlite_classes` 迁移                                                             |
| `src/handler.js`                                                        | 代理主体：来源与频率限制、粗化坐标校验、和风城市搜索＋实时天气两次上游调用、规范化响应、通用错误不回传上游细节；**45,000 次/月硬截流**（免费档 50,000 之内的安全阈值），计数器是 SQLite 后端的 Durable Object（Workers 免费档只支持这一种 DO 存储后端） |
| `src/index.js`、`src/node-cloudflare-workers.mjs`、`src/test-hooks.mjs` | 入口与测试期的 `cloudflare:workers` 桩                                                                                                                                                                                                                  |
| `src/index.test.js`                                                     | 离线合同测试 16 项（配额并发不能超发、账期或共享用量不明时 fail closed）                                                                                                                                                                                |
| `src/miniflare-persistence.test.mjs`                                    | Miniflare 重启后计数器持久性 1 项（经 `pnpm dlx wrangler@4.142.0` 跑）                                                                                                                                                                                  |
| `src/local-trial.mjs`                                                   | 本机 Miniflare 试跑装配                                                                                                                                                                                                                                 |
| `qweather-proxy-local.ps1`                                              | DPAPI 启动器：从本机加密凭据读取 API Host/KEY 注入 Miniflare 进程，**不把密钥放进命令行参数、环境变量导出或文件**；`-Mode live` 需 `-ConfirmQWeatherUsage` 并显式传入账期与「本月代理外已调用数」                                                       |
| `weather-local-acceptance.mjs`                                          | 真实浏览器 Live 验收 20 项：构建产物无凭据标记、代理健康入口、假定位北京公开坐标下 `/domain/`＋桌面卡＋手机卡的来源与署名、浏览器网络请求只到 `127.0.0.1:8787`                                                                                          |

## 搁置时已验证到什么程度

- 和风账号、专属 API Host、API KEY 的本机只读鉴权通过：城市搜索与实时天气均 HTTP 200，本机耗时约 441ms / 178ms。**这不是大陆链路数据。**
- 代理离线合同 16/16、Miniflare SQLite 重启 1/1、Wrangler dry-run、本机 HTTP 200/405/404 通过。
- 真实浏览器 Live 链路 20/20 通过（DPAPI → 本地代理 → 和风 → Chromium），构建产物 316 个文本资产扫描无服务端凭据标记。
- **从未做过**：公网部署、Cloudflare 账号计费核验、大陆直连可达性测量。这三项是当初定的发布门，一个都没通过，所以和风从未成为生产主源。

## 归档时的配额账本终值

从 `.wrangler/miniflare-live/do/weather-proxy-QuotaDO/` 的 SQLite 读出并留档后，该目录（1.1MB 生成态）已删除：

```
weather_monthly_usage: billing_month=2026-09, total_calls=38, initial_calls=2
```

`initial_calls=2` 是启动时人工传入的「本月代理外调用数」基线，`total_calls=38` 是代理累计观测值；两者都不能反推单次运行的消耗。

## 凭据处置

- `%LOCALAPPDATA%\WindowsIt\QWeather\api-test.credential.xml`（DPAPI 加密，仅本机同用户可解）与 `output/` 下的录入、测试脚本已按站长指示**删除**。KEY 从未进入聊天、仓库、命令行或浏览器请求。
- 和风账号本身仍然存在；**API KEY 已于 2026-09-29 由站长在控制台删除凭据**（`console.qweather.com` → 项目管理 → 该项目 → 凭据区域）。此条为**站长自述**：受控浏览器当时停在 `id.qweather.com` 登录页、会话属于站长本人，agent 侧无法进入控制台独立复核，故这里记录的是处置声明而非第二方证据。本目录的任何留档都不含 KEY 或 Host 值。
- 重启试验时**必须新建凭据**（旧 KEY 已失效）：先撤销本目录 `handler.js` 需要的两个 secret 的旧值，再按下节重新录入。

## 若要重启试验

1. 在和风控制台重新录入专属 API Host 与 API KEY（建议同时轮换 KEY），用 `qweather-proxy-local.ps1` 的思路重新做本机 DPAPI 保存；仓库仍不得出现明文。
2. 前端需要恢复被摘掉的分支：`public/weather/weather-service.js` 里的 `LOCAL_PROXY_URL`、`isLocalHostname()` 门控、`normalizeQWeather()`、和风署名与 `PRIMARY_TIMEOUT_MS`（当时主源 6 秒＋兜底 6 秒、总 12 秒）。**注意**：单源收敛已把总超时改回 8 秒，重启双源时要一并改回，否则主源还没失败就已经超时。
3. 公网部署需要 Cloudflare 账号：`wrangler secret put QWEATHER_API_KEY`、`wrangler secret put QWEATHER_API_HOST`，并设 `QWEATHER_ACCOUNT_USAGE_CONFIRMED=true`、`QWEATHER_BILLING_MONTH_ALIGNED=true`、`QWEATHER_BILLING_MONTH`、`QWEATHER_ACCOUNT_CALLS_USED`——`handler.js` 缺任一即 fail closed，这是防账单的承重结构，不得为了跑通而放宽。
4. 先只部署**无密钥**的 `/healthz`，用中国大陆直连网络（多运营商、多时段）实测可达性与耗时，按 PLAN 票 02 的口径记 PASS 或 RED；RED 就停在这里，不要把本机成功当通行证。
5. 恢复 `package.json` 里 `test:weather` 的代理与 Miniflare 两段，以及 Live 验收脚本的调用路径。
