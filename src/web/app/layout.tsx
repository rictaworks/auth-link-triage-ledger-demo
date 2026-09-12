import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ToastProvider } from "@/components/ToastProvider";
import { STRINGS } from "@/config/strings";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation, faShieldHalved } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = {
  title: STRINGS.app.title,
  description: STRINGS.app.disclaimer
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
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
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
