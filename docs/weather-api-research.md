# 天气 API 选型研究

## 研究范围与时间

- 研究日期：2026-09-01（Asia/Shanghai）。
- 研究范围：只核对 `public-apis/public-apis` 的当前 Weather 条目、Open-Meteo 官方文档/API、wttr.in 官方文档/API，以及 GitHub Pages 官方说明。
- 目标：比较免费性、API key、浏览器跨域/CORS、经纬度要求、GitHub Pages 静态站适配性和服务限制。
- 说明：`public-apis` 是目录索引，不替代服务提供方的价格、授权、配额或可用性条款；下面优先采用服务提供方自己的资料。网页内容与服务端响应会变化，实时响应部分是本次检索时的快照。

## 先给结论

1. **Open-Meteo 更适合“浏览器直接请求 + 已有明确经纬度 + 个人/非商业静态站”的路径。** 官方明确说明免费接口不需要 API key、支持 CORS；Forecast API 又明确要求 `latitude` 和 `longitude`。免费层有公开配额，且免费使用限定为非商业用途，并要求遵守 CC BY 4.0 署名条件。[Open-Meteo README](https://github.com/open-meteo/open-meteo#readme) · [Forecast API 文档](https://open-meteo.com/en/docs) · [Pricing](https://open-meteo.com/en/pricing) · [Terms & Privacy](https://open-meteo.com/en/terms)
2. **wttr.in 更适合“按城市/地点直接查当前天气、尽量不维护经纬度”的路径。** 官方用法支持城市名、机场三字码、IP、域名，也支持省略地点后按 IP 定位；JSON 通过 `?format=j1` 获取。它的公开资料没有给出与 Open-Meteo 同等完整的价格、商业授权或固定 SLA 说明，官方错误页还明确展示过数据源容量耗尽场景。[wttr.in README](https://github.com/chubin/wttr.in#readme) · [wttr.in `:help`](https://wttr.in/:help) · [官方容量错误页](https://github.com/chubin/wttr.in/blob/master/share/static/malformed-response.html)
3. **两者都具备当前可用的 HTTPS + CORS 条件，能被 GitHub Pages 上的前端以简单 GET 直接请求。** 这是基于 `public-apis` 的条目和 2026-09-01 实际响应头得出的适配判断；它不等于服务稳定性承诺。[public-apis Weather 条目](https://github.com/public-apis/public-apis/blob/master/README.md#L2098-L2137) · [GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

## `public-apis/public-apis` 当前 Weather 条目

当前仓库 Weather 表直接给出的两行如下；表中 `Auth`、`HTTPS`、`CORS` 是目录字段，不是服务方完整条款。

| 条目 | Description | Auth | HTTPS | CORS | 官方目录来源 |
|:---|:---|:---:|:---:|:---:|:---|
| Open-Meteo | Global weather forecast API for non-commercial use | No | Yes | Yes | [Weather 表](https://github.com/public-apis/public-apis/blob/master/README.md#L2098-L2137) |
| wttr.in | Weather in your terminal, supports JSON output | No | Yes | Yes | [Weather 表](https://github.com/public-apis/public-apis/blob/master/README.md#L2098-L2137) |

该仓库的 README 将自身定位为免费公共 API 目录，但目录的“免费”定位不能推导出每个服务的商业授权、可用性保证或稳定配额；这些项目必须回到服务提供方资料核对。[public-apis README](https://github.com/public-apis/public-apis#try-public-apis-for-free)

## Open-Meteo

### 免费性、API key 与授权

- 官方 README 明确写明 Open-Meteo 对非商业用途免费，公共 API 不需要 API key，并支持 CORS。[Open-Meteo README](https://github.com/open-meteo/open-meteo#readme)
- 官方 Pricing 将免费/开放层与商业 API 分开：免费层的 `Commercial use` 为否；商业订阅提供专用的 `customer-api.open-meteo.com` 端点和 API key。[Pricing](https://open-meteo.com/en/pricing)
- Terms 将带广告或订阅的网站/应用列为商业使用示例。因此，若站点未来属于该定义，不能把免费层的“非商业”条件当作已满足。[Terms & Privacy](https://open-meteo.com/en/terms)
- API 数据使用 CC BY 4.0；官方要求在展示数据的位置提供适当署名并链接许可。[Open-Meteo README](https://github.com/open-meteo/open-meteo#readme) · [Pricing FAQ](https://open-meteo.com/en/pricing)

### 经纬度要求与地点搜索

- `/v1/forecast` 的 `latitude, longitude` 参数在官方文档中标记为必填，格式是地理 WGS84 坐标；Forecast API 本身不是“输入城市名即可查询”的接口。[Forecast API 文档](https://open-meteo.com/en/docs)
- 如果产品入口只有城市名，需要先调用独立的 Geocoding API。该 API 的 `name` 参数必填，会返回地点列表及对应 `latitude`、`longitude`；官方文档将 `apikey` 标为仅商业客户访问保留资源时需要。[Geocoding API 文档](https://open-meteo.com/en/docs/geocoding-api)
- 这意味着固定地点可以只保留一组经纬度；城市搜索则至少涉及一次地点解析，再调用天气 Forecast API。[Forecast API 文档](https://open-meteo.com/en/docs) · [Geocoding API 文档](https://open-meteo.com/en/docs/geocoding-api)

### CORS、HTTPS 与静态站适配

- `public-apis` 将 Open-Meteo 记录为 `HTTPS: Yes`、`CORS: Yes`；官方 README 也明确写明支持 CORS。[public-apis Weather 条目](https://github.com/public-apis/public-apis/blob/master/README.md#L2098-L2137) · [Open-Meteo README](https://github.com/open-meteo/open-meteo#readme)
- 本次对官方 Forecast 端点使用 `Origin: https://example.github.io` 发送 GET，2026-09-01 09:31:39（Asia/Shanghai）对应响应为 `200 OK`，并返回 `access-control-allow-origin: *`；同一端点的 OPTIONS 请求也返回 `200 OK`，并返回 `access-control-allow-methods: GET, POST, OPTIONS`。这是实时快照，不是永久承诺。[本次 GET 端点](https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&current=temperature_2m)
- GitHub Pages 官方说明其托管的是仓库中的 HTML、CSS、JavaScript 静态站点。因此，在不需要隐藏密钥的前提下，Open-Meteo 的 HTTPS、CORS、无 key 公共接口组合与 GitHub Pages 的前端直连模型相容；这是基于两份官方资料的工程推论。[GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) · [Open-Meteo README](https://github.com/open-meteo/open-meteo#readme)
- 如果使用商业 `customer-api`，key 会进入浏览器请求路径或公开前端资源；纯静态站没有服务端位置来保管该 key。要避免把 key 暴露给访客，需要服务端代理或其他受控后端，这已经超出纯静态直连范围。[Pricing](https://open-meteo.com/en/pricing) · [GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

### 服务限制

官方 Pricing 的免费/开放层列出以下限制：

| 限制 | 免费/开放层 | 官方来源 |
|:---|:---:|:---|
| 每分钟 | 600 calls/min | [Pricing](https://open-meteo.com/en/pricing) |
| 每小时 | 5,000 calls/hour | [Pricing](https://open-meteo.com/en/pricing) |
| 每天 | 10,000 calls/day | [Pricing](https://open-meteo.com/en/pricing) · [Terms & Privacy](https://open-meteo.com/en/terms) |
| 每月 | 300,000 calls/month | [Pricing](https://open-meteo.com/en/pricing) |
| 免费层可用性 | 无 uptime guarantee | [Pricing](https://open-meteo.com/en/pricing) |

此外，官方说明一次请求的计费/调用量会随变量数量和时间范围增加；超过 10 个天气变量或单地点超过两周的数据范围会按多次 API call 计算。[Pricing FAQ](https://open-meteo.com/en/pricing)

## wttr.in

### 免费性、API key 与地点输入

- `public-apis` 当前 Weather 条目将 wttr.in 标为 `Auth: No`、`HTTPS: Yes`、`CORS: Yes`；目录本身属于免费公共 API 列表。[public-apis Weather 条目](https://github.com/public-apis/public-apis/blob/master/README.md#L2098-L2137) · [public-apis README](https://github.com/public-apis/public-apis#try-public-apis-for-free)
- 官方 README 的公开调用示例直接使用 `curl wttr.in`、`curl wttr.in/London`，没有注册或 API key 参数；因此，公开接口的文档化使用路径不要求 API key。[wttr.in README](https://github.com/chubin/wttr.in#readme)
- 官方 README 没有列出价格表或商业使用授权条款。可以确认公开接口的无 key 调用路径，不能仅凭 README 把它扩展为商业免费许可或 SLA。[wttr.in README](https://github.com/chubin/wttr.in#readme)
- 地点参数不要求显式经纬度：可使用城市/地点名、机场三字码、IP 地址或以 `@` 开头的域名；省略地点时，官方说明会按请求 IP 获取当前地点。[wttr.in README](https://github.com/chubin/wttr.in#readme)

### JSON、CORS 与 GitHub Pages 适配

- 官方 README 提供 JSON 模式 `?format=j1`，并说明 `format=j2` 是不带逐小时数据的较小版本；这比解析终端 ANSI 文本更适合前端数据读取。[wttr.in JSON 文档](https://github.com/chubin/wttr.in/blob/master/README.md#L406-L453)
- 本次对 `https://wttr.in/Beijing?format=j1` 使用 `Origin: https://example.github.io` 发送 GET，2026-09-01 09:31:39（Asia/Shanghai）对应响应为 `200 OK`，返回 `Access-Control-Allow-Origin: *`、`Cache-Control: public, max-age=600`。这是本次服务端响应快照。[本次 wttr.in JSON 端点](https://wttr.in/Beijing?format=j1)
- 同一端点的 OPTIONS 请求返回 `200 OK` 和 `Access-Control-Allow-Origin: *`，本次响应没有出现 `Access-Control-Allow-Methods` 或 `Access-Control-Allow-Headers`。因此，本次证据覆盖的是不带自定义请求头的简单 GET；不要从该结果扩展推断带自定义请求头的预检请求一定可用。[本次 wttr.in JSON 端点](https://wttr.in/Beijing?format=j1)
- 本次 JSON 端点响应头的 `Content-Type` 是 `text/plain; charset=utf-8`，但响应路径和内容格式仍按官方 README 的 `format=j1` JSON 文档提供。前端接入时应把“官方格式为 JSON”和“当前 Content-Type 为 text/plain”分别作为数据格式与传输头部事实处理。[wttr.in JSON 文档](https://github.com/chubin/wttr.in/blob/master/README.md#L406-L453) · [本次 wttr.in JSON 端点](https://wttr.in/Beijing?format=j1)
- GitHub Pages 是静态 HTML/CSS/JavaScript 托管；结合 `public-apis` 的 HTTPS/CORS 标记和本次 `Access-Control-Allow-Origin: *` 响应，wttr.in 的简单 GET 路径可以在 GitHub Pages 前端直连。这是适配判断，不是 wttr.in 的稳定性保证。[GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) · [public-apis Weather 条目](https://github.com/public-apis/public-apis/blob/master/README.md#L2098-L2137) · [本次 wttr.in JSON 端点](https://wttr.in/Beijing?format=j1)

### 服务限制与可靠性信号

- 官方仓库的 `malformed-response.html` 明确写出：当天处理量超过 1M requests 后，可能出现数据源容量耗尽。这是服务仓库中的错误页条件，不应被解释为每个站点都可稳定使用的正式配额或 SLA。[官方容量错误页](https://github.com/chubin/wttr.in/blob/master/share/static/malformed-response.html)
- 官方 README 对自动查询程序建议使用合理的更新间隔，并展示了 `period=` 参数；这支持“主动降频、利用缓存”的接入策略。[wttr.in README：自动查询示例](https://github.com/chubin/wttr.in/blob/master/README.md#L196-L234)
- README 还报告截至 2026 年 4 月约 100 million queries/day，这是服务整体访问统计，不是单个站点的配额，也不是 uptime guarantee。[wttr.in README：usage stats](https://github.com/chubin/wttr.in/blob/master/README.md#L660-L664)
- 本次响应的 `Cache-Control: public, max-age=600` 表明该次响应允许公共缓存 600 秒；这是实时响应头观察值，不替代服务方固定缓存政策。[本次 wttr.in JSON 端点](https://wttr.in/Beijing?format=j1)

## 面向 GitHub Pages 的选型判断

| 需求 | 更直接的路径 | 依据与边界 |
|:---|:---|:---|
| 已有固定经纬度，取 current/hourly/daily 结构化数据 | Open-Meteo | Forecast API 明确要求经纬度；免费层无 key、支持 CORS；需遵守非商业、配额和署名条件。[Forecast API](https://open-meteo.com/en/docs) · [README](https://github.com/open-meteo/open-meteo#readme) · [Terms](https://open-meteo.com/en/terms) |
| 只有城市名，希望服务端完成地点解析 | wttr.in | 官方 README 文档化支持城市/地点名和 IP 定位；但公开资料对价格、商业授权、配额和 SLA 的说明较少。[wttr.in README](https://github.com/chubin/wttr.in#readme) · [官方容量错误页](https://github.com/chubin/wttr.in/blob/master/share/static/malformed-response.html) |
| 纯静态前端不能暴露私密 key | 两者的无 key 公共路径 | Open-Meteo 免费层明确无 key；wttr.in 的目录条目为 Auth No，官方示例也无 key。Open-Meteo 商业端点例外，需要后端代理来隐藏 key。[Open-Meteo Pricing](https://open-meteo.com/en/pricing) · [public-apis Weather 条目](https://github.com/public-apis/public-apis/blob/master/README.md#L2098-L2137) · [wttr.in README](https://github.com/chubin/wttr.in#readme) |
| 需要可审计的配额与授权边界 | Open-Meteo 的免费层资料更明确 | Open-Meteo 公开列出分钟/小时/日/月限制、非商业条件和无 uptime guarantee；wttr.in 资料显示容量风险，但没有同等完整的正式配额表。[Open-Meteo Pricing](https://open-meteo.com/en/pricing) · [Open-Meteo Terms](https://open-meteo.com/en/terms) · [wttr.in 官方容量错误页](https://github.com/chubin/wttr.in/blob/master/share/static/malformed-response.html) |

## 本次 CORS 核对记录

测试仅发送只读请求，没有修改仓库或远端服务：

```text
Origin: https://example.github.io

Open-Meteo GET:
https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&current=temperature_2m
200 OK
access-control-allow-origin: *

Open-Meteo OPTIONS:
https://api.open-meteo.com/v1/forecast
200 OK
access-control-allow-origin: *
access-control-allow-methods: GET, POST, OPTIONS

wttr.in GET:
https://wttr.in/Beijing?format=j1
200 OK
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=600
Content-Type: text/plain; charset=utf-8

wttr.in OPTIONS:
https://wttr.in/Beijing?format=j1
200 OK
Access-Control-Allow-Origin: *
```

以上结果只说明 2026-09-01 09:31:39（Asia/Shanghai）这次请求的服务端表现；不能替代后续上线前的实机浏览器验证，也不能承诺未来响应、跨域头、缓存或容量保持不变。

## 官方来源索引

- [public-apis/public-apis：Weather](https://github.com/public-apis/public-apis/blob/master/README.md#L2098-L2137)
- [Open-Meteo README](https://github.com/open-meteo/open-meteo#readme)
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- [Open-Meteo Pricing](https://open-meteo.com/en/pricing)
- [Open-Meteo Terms & Privacy](https://open-meteo.com/en/terms)
- [wttr.in README](https://github.com/chubin/wttr.in#readme)
- [wttr.in `:help`](https://wttr.in/:help)
- [wttr.in 官方容量错误页](https://github.com/chubin/wttr.in/blob/master/share/static/malformed-response.html)
- [GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
