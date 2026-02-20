const tseslint = require("typescript-eslint");

module.exports = [
  // 1) Ignore build output และ dependency
  {
    ignores: ["dist/**", "node_modules/**"]
  },

  // 2) ใช้ recommended rules สำหรับ TypeScript
  ...tseslint.configs.recommended,

  // 3) อนุญาต require() ในไฟล์ config
  {
    files: ["eslint.config.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];