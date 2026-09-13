import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

// FontAwesome はデフォルトで、初回描画後に JS でサイズ調整用 CSS を動的挿入する
// （autoAddCss）。この注入が hydration/ルーティングの完了より遅れると、アイコンの
// SVG が素のサイズ（画面の大部分を覆うほど巨大）で一瞬描画されてしまう。
// 上記の import で CSS をビルド時にバンドルへ含め、動的注入自体を無効化する。
config.autoAddCss = false;
