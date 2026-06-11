import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Architecture rule: extract a helper instead of nesting a third conditional.
      complexity: ["error", 10],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Marketing pages must not pay for the editor: editor-only deps stay out
    // of everything except the editor route group and editor components.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/app/(editor)/**",
      "src/components/editor/**",
      "src/stores/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "zustand", message: "Editor-only dependency — keep it inside the editor route group." },
            { name: "zundo", message: "Editor-only dependency — keep it inside the editor route group." },
            { name: "exifr", message: "Editor-only dependency — keep it inside the editor route group." },
          ],
          patterns: [
            { group: ["@dnd-kit/*"], message: "Editor-only dependency — keep it inside the editor route group." },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client is not held to project lint rules.
    "src/generated/**",
  ]),
]);

export default eslintConfig;
