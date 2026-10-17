import globals from "globals";
import js from "@eslint/js";

// ES modules of the parser. The parts in lib/opal/parser/parts/ are
// import-less fragments assembled into parser.mjs, so only the parser's own
// style rules apply there.
const parserFiles = [
  "lib/opal/parser/**/*.mjs",
  "spec/lib/parser/**/*.mjs",
  "tasks/parser/**/*.mjs",
  "benchmark/parser/**/*.mjs",
  "exe/potch",
];

// The JS compiler (lib/opal/compiler) is linted with the recommended rules.
const compilerFiles = [
  "lib/opal/compiler/**/*.mjs",
  "spec/lib/compiler/**/*.mjs",
  "tasks/compiler/**/*.mjs",
  "tasks/*.mjs",
  "tasks/testing/**/*.mjs",
];

export default [
  { files: ["**/*.js"], ...js.configs.recommended },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      globals: {
          ...globals.browser,
          ...globals.node,
          ...globals.es2020,
          Opal: "readonly",
      },
    },

    rules: {
      "no-unused-vars": ["error", {
          varsIgnorePattern: "($($|$$|yield|post_args|[a-z])|self)",
          argsIgnorePattern: "($($|$$|yield|post_args|[a-z])|self)",
      }],

      "no-extra-semi": "off",
      "no-empty": "off",
      "no-unreachable": "off",
      "no-cond-assign": "off",
      "no-prototype-builtins": "off",

      "no-constant-condition": ["error", {
          checkLoops: false,
      }],

      "no-useless-escape": "off",

      "no-fallthrough": ["error", {
          commentPattern: "raise|no-break",
      }],

      "no-regex-spaces": "off",
      "no-control-regex": "off",
    },
  },
  // Builds that embed the JS compiler (opal-parser, opal-builder) contain
  // its ES2022 code; everything else Opal generates stays ES2021. The
  // compiler and parser sources are linted with their own rules (the parser
  // and compiler lint steps), so the rules they don't use are off here.
  {
    files: ["**/opal-parser.js", "**/opal-builder.js"],
    languageOptions: { ecmaVersion: 2024 },
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "no-fallthrough": "off",
      "no-case-declarations": "off",
      "no-dupe-else-if": "off",
      "no-loss-of-precision": "off",
    },
  },
  {
    files: parserFiles,
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
          ...globals.node,
      },
    },

    rules: {
      semi: "error",
      "prefer-const": "error",
    },
  },
  { files: compilerFiles, ...js.configs.recommended },
  {
    files: compilerFiles,
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
          ...globals.node,
          // Node 22 exposes a global WebSocket, used by the Firefox runner
          WebSocket: "readonly",
      },
    },

    rules: {
      semi: "error",
      "prefer-const": "error",
    },
  },
];
