import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(here, "..");
const TARGET_DIRS = ["app", "components", "lib"].map((d) => path.join(rootDir, d));
const ALLOWED_DIRS = [path.join(rootDir, "config")];

const JAPANESE_PATTERN = /[぀-ヿ㐀-䶿一-鿿]/;

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if ((entry.endsWith(".ts") || entry.endsWith(".tsx")) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function findJapaneseLiterals(code: string): string[] {
  const literalPattern = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  const jsxTextPattern = />([^<>{}\n]*[぀-ヿ㐀-䶿一-鿿][^<>{}\n]*)</g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = literalPattern.exec(code)) !== null) {
    if (JAPANESE_PATTERN.test(match[2] ?? "")) matches.push(match[2] ?? "");
  }
  while ((match = jsxTextPattern.exec(code)) !== null) {
    const text = (match[1] ?? "").trim();
    if (text.length > 0) matches.push(text);
  }
  return matches;
}

describe("ハードコード検出：日本語文字列は設定ファイル（config/strings.ts）に分離する", () => {
  const targetFiles = TARGET_DIRS.flatMap(listSourceFiles).filter(
    (file) => !ALLOWED_DIRS.some((allowed) => file.startsWith(allowed))
  );

  it("app/ components/ lib/ に日本語の文字列リテラル・JSXテキストを直接埋め込まない", () => {
    const offenders: Array<{ file: string; literals: string[] }> = [];
    for (const file of targetFiles) {
      const source = readFileSync(file, "utf-8");
      const withoutComments = stripComments(source);
      const literals = findJapaneseLiterals(withoutComments);
      if (literals.length > 0) {
        offenders.push({ file: path.relative(rootDir, file), literals });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("検査対象ファイルが存在する（テスト自体の健全性確認）", () => {
    expect(targetFiles.length).toBeGreaterThan(0);
  });
});
