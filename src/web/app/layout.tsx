import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ToastProvider } from "@/components/ToastProvider";
import { STRINGS } from "@/config/strings";
import { APP_VERSION } from "@/config/version";
import { GA4_MEASUREMENT_ID } from "@/config/analytics";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation, faShieldHalved, faCommentDots } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = {
  title: STRINGS.app.title,
  description: STRINGS.app.disclaimer
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="demo-banner">{STRINGS.app.demoBanner}</div>
        <ToastProvider>
          <Nav />
          <main className="app-shell">
            <div className="disclaimer-banner">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              <span>{STRINGS.app.disclaimer}</span>
            </div>
            <div className="disclaimer-banner">
              <FontAwesomeIcon icon={faShieldHalved} />
              <span>{STRINGS.app.noPersonalDataNotice}</span>
            </div>
            {children}
            <p className="field-hint" style={{ textAlign: "right" }}>
              v{APP_VERSION}
            </p>
          </main>
          <footer className="app-footer">
            <a href="/legal/">{STRINGS.footer.legalLink}</a>
            <span style={{ margin: "0 8px" }}>|</span>
            <span>{STRINGS.footer.copyright}</span>
          </footer>
        </ToastProvider>

        <a
          href="https://rictaworks.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="consult-button"
        >
          <FontAwesomeIcon icon={faCommentDots} />
          {STRINGS.consult.cta}
        </a>

        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`} strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA4_MEASUREMENT_ID}');
        `}</Script>
      </body>
    </html>
  );
}
