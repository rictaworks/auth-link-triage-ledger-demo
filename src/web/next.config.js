/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // AGENTS.md / CLAUDE.md の自動生成を無効化する。
  // 本リポジトリのAI向けルールは常にリポジトリルートのCLAUDE.mdに一元化する。
  agentRules: false,
  // trailingSlash の自動リダイレクトが /api/* の rewrite より先に働いてしまうため、
  // Next 自身のリダイレクトは無効化する（本番は Cloudflare 側のルーティングに委ねる）。
  skipTrailingSlashRedirect: true
};

// 開発時のみ、同一オリジン化のため /api/* を wrangler dev（既定 http://127.0.0.1:8787）へ
// プロキシする。本番は Cloudflare の Worker Route で同等の振り分けを行うため、
// output: "export" の静的書き出しには rewrites は含まれない（next dev 専用）。
if (process.env.NODE_ENV === "development") {
  // beforeFiles: trailingSlash の自動リダイレクトより先に /api/* を横取りする。
  nextConfig.rewrites = async () => ({
    beforeFiles: [
      {
        source: "/api/:path*",
        destination: `${process.env.API_ORIGIN ?? "http://127.0.0.1:8787"}/api/:path*`
      }
    ],
    afterFiles: [],
    fallback: []
  });
}

export default nextConfig;
