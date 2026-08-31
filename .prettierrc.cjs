module.exports = {
  tabWidth: 4,
  useTabs: true,
  singleQuote: false,
  trailingComma: "all",
  endOfLine: "auto",
  overrides: [
    {
      files: "*.{css,scss,styl}",
      options: { tabWidth: 2, useTabs: false, printWidth: 200 },
    },
  ],
};
