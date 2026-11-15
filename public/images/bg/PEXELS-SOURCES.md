# Pexels 都市背景来源

以下照片用于网站随机背景（壁纸池），均从对应 Pexels 页面下载。

导出方式：原图放一个目录，跑 `pnpm build:bg -- --from <原图目录>`，按文件名产出同名 `.webp` 到 `public/images/bg/`；原图不入库。

口径：单张 ≤1.5MB、最长边 ≤2560px、WebP q80。判定由 `scripts/verify-background-assets.mjs` 在 `pnpm build` 的 `astro build` 之前执行。

| 文件                   | 作者                | 来源                                                                             | 原图                     | 导出后                |
| ---------------------- | ------------------- | -------------------------------------------------------------------------------- | ------------------------ | --------------------- |
| `pexels-65441.webp`    | Kaique Rocha        | https://www.pexels.com/photo/night-street-with-buildings-65441/                  | 5263×3509 · 2,170,503 B  | 2560×1707 · 347,282 B |
| `pexels-5981771.webp`  | Lucas Pezeta        | https://www.pexels.com/photo/modern-city-street-with-road-at-night-time-5981771/ | 5538×3692 · 3,240,350 B  | 2560×1707 · 485,416 B |
| `pexels-8561543.webp`  | Abdulwahab Alawadhi | https://www.pexels.com/photo/modern-city-downtown-illuminated-at-night-8561543/  | 4032×2268 · 895,240 B    | 2560×1440 · 270,618 B |
| `pexels-30123516.webp` | Mohammed Alim       | https://www.pexels.com/photo/kuala-lumpur-cityscape-during-blue-hour-30123516/   | 9520×4810 · 10,044,667 B | 2560×1293 · 350,102 B |

2026-11-15 实测：四张合计 16,305,760 B → **1,453,418 B**。
