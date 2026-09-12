import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(here, "..", "src");

// requirements.md の運用ルール「文字列リテラルは設定ファイル／DBに分離し、ハードコードを検出する
// テストを書くこと」を実装するテスト。config/ 配下（利用者向け文言・マスタデータの置き場）以外の
// ソースに日本語の文字列リテラルが直接埋め込まれていないかを検査する。

const JAPANESE_PATTERN = /[぀-ヿ㐀-䶿一-鿿]/;
const ALLOWED_DIRS = [path.join(srcDir, "config")];

function listTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listTsFiles(fullPath));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function findJapaneseStringLiterals(code: string): string[] {
  const stringLiteralPattern = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = stringLiteralPattern.exec(code)) !== null) {
    const content = match[2] ?? "";
    if (JAPANESE_PATTERN.test(content)) {
      matches.push(content);
    }
  }
  return matches;
}

describe("ハードコード検出：日本語文字列は設定ファイルに分離する", () => {
  const targetFiles = listTsFiles(srcDir).filter(
    (file) => !ALLOWED_DIRS.some((allowed) => file.startsWith(allowed))
  );

  it("config/ 以外のソースに日本語の文字列リテラルを直接埋め込まない", () => {
    const offenders: Array<{ file: string; literals: string[] }> = [];
    for (const file of targetFiles) {
      const source = readFileSync(file, "utf-8");
      const withoutComments = stripComments(source);
      const literals = findJapaneseStringLiterals(withoutComments);
      if (literals.length > 0) {
        offenders.push({ file: path.relative(srcDir, file), literals });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("検査対象ファイルが存在する（テスト自体の健全性確認）", () => {
    expect(targetFiles.length).toBeGreaterThan(0);
  });
});
