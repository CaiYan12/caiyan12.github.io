import type { FeedSource } from "../shared/types";

/**
 * ============================================================================
 * 默认订阅源配置 —— 改订阅源只需要动这个文件
 * ============================================================================
 *
 * 本页是单源阅读器：整站只服务 `DEFAULT_SOURCE` 这一个订阅源，界面不提供
 * 添加 / 删除 / 启停的入口（这是需求取舍，非功能缺失）。因此要换源，就是改
 * 下面这个常量的字段，然后重新构建（dev 模式下保存即热更新）。
 *
 * 各字段含义与修改约束：
 *
 * | 字段         | 说明                                                              |
 * | ------------ | ----------------------------------------------------------------- |
 * | `id`         | 源的唯一标识。**必须保持 `juya-daily`**，否则橘鸦定制阅读系统会失效 |
 * | `name`       | 列表 / 详情页展示的源名称                                          |
 * | `url`        | RSS 地址。目标服务必须返回 `Access-Control-Allow-Origin`，否则浏览器会被 CORS 拦截 |
 * | `enabled`    | 固定 `true`。单源下无停用入口                                      |
 * | `providerId` | 固定 `'builtin-rss'`。Web 版不迁移插件 provider 体系                |
 *
 * 为什么 `id` 不能改：`JUYA_SOURCE_ID` 是橘鸦定制阅读系统（五套风格 × 亮暗双变体）
 * 的**唯一身份判据**。`ReaderView` 用 `article.sourceId === JUYA_SOURCE_ID` 判断是否
 * 走定制模板；内容解析侧同理。改成别的字符串，定制风格会静默回退成通用阅读页。
 *
 * 如果只是想换成一个**非橘鸦**的 RSS 源（即不需要定制风格）：
 *   1. 修改 `url` 与 `name`；
 *   2. 把设置抽屉里的「橘鸦定制阅读风格」切到「关闭」，即可避免无意义的解析尝试；
 *   3. `id` 仍建议保留 `juya-daily`（改了也没有额外收益，且历史记录的键会失效）。
 *
 * 更换源后，旧的已读 / 收藏 / 稍后阅读记录按 `guid` 匹配。若新源的 `guid` 与旧的
 * 不同（绝大多数情况），旧记录不会命中新文章，属预期行为。
 */

/** 橘鸦 AI 早报内置源的唯一身份判据（同时是橘鸦定制阅读系统的身份判据，勿改）。 */
export const JUYA_SOURCE_ID = "juya-daily";

/** 唯一订阅源。改订阅 = 改这里。 */
export const DEFAULT_SOURCE: FeedSource = {
	id: JUYA_SOURCE_ID,
	name: "橘鸦AI早报",
	url: "https://daily.juya.uk/rss.xml",
	enabled: true,
	providerId: "builtin-rss",
};

/** 内置源锁定：不可删除、不可停用。页面无源管理 UI，此常量供设置抽屉展示说明用。 */
export const SOURCE_LOCKED = true;

/**
 * 离线快照地址（`public/` 下的相对路径）。
 * 实时抓取失败（断网 / CORS 变动 / 上游 5xx）时回退加载，保证页面不空白，
 * 并在顶栏明确标注「离线快照」。快照与实时源走同一个解析器，结构完全一致。
 *
 * 刷新快照：把当期 RSS 的 XML 原样覆盖到 `public/snapshot/juya.xml` 即可。
 */
export const SNAPSHOT_URL = `${import.meta.env.BASE_URL}ai-news/snapshot/juya.xml`;
