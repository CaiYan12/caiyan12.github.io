# 天气壁纸资产

7 张摄影壁纸，命名与 `public/weather/icons/` 同一套 kind，供侧栏天气卡
`.weather-widget-body::before` 作背景层（白纱另起一层，见 `src/styles/global.css`）。

- **来源**：站主本人自 [Pexels](https://www.pexels.com/) 下载（2026-09-30），
  未逐张记录页面链接。
- **许可**：Pexels License —— 可免费商用、可修改、可再分发，无需署名；
  不得把图片原样分发到其他图库平台。本仓库以修改后（重采样 WebP）的形式随站点公开。
- **生产方式**：`pnpm build:weather-bg -- --from <原图目录>`
  （脚本 `scripts/build-weather-bg.mjs`）。显式运行、**不参与 `pnpm build`**；
  640px 原图不入库。
- **尺寸口径**：宽 502px（卡片主体区实测 253×113 CSS px，×2 DPR），**保留竖向原高**
  （282–377px，合计 62,598B）。不预裁到盒子高（502×226）是因为取景锚点在 CSS
  `background-position` 上，预裁会把「往上一点/往下一点」的余量烘死；
  `background-size: cover` 后各张实际只显竖向 59–80%，那就是可挪动的行程。
