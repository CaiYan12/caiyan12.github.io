module.exports = {
  tabWidth: 4,
  useTabs: true,
  singleQuote: false,
  trailingComma: "all",
  endOfLine: "auto",
  // .astro/.svelte 此前因无插件被 Prettier 静默跳过（目录模式下 --check 恒绿），必须显式注册插件
  plugins: ["prettier-plugin-astro", "prettier-plugin-svelte"],
  overrides: [
    {
      files: "*.{css,scss,styl}",
      options: { tabWidth: 2, useTabs: false, printWidth: 200 },
    },
    {
      files: "*.astro",
      options: {
        parser: "astro",
        // astro 插件要求内部 script/style 各自的缩进规则；沿用项目 4 空格基准
        tabWidth: 4,
        useTabs: true,
      },
    },
    {
      files: "*.svelte",
      options: {
        parser: "svelte",
        svelteSortOrder: "options-scripts-markup-styles",
        svelteAllowShorthand: true,
      },
    },
  ],
};
