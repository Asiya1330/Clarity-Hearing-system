import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      // Build output and caches
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "coverage/**",
      // Deployment / tooling
      ".vercel/**",
      // Static assets — no JS/TS to lint
      "public/**",
      // Markdown
      "**/*.md",
      // Playwright test output and fixtures
      "test-results/**",
      "playwright-report/**",
      "tests/.auth/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
