"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faMagnifyingGlassChart, faListCheck, faLinkSlash } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";

const ITEMS = [
  { href: "/ledger/", label: STRINGS.nav.ledger, icon: faBook },
  { href: "/triage/", label: STRINGS.nav.triage, icon: faMagnifyingGlassChart },
  { href: "/procedures/", label: STRINGS.nav.procedures, icon: faListCheck }
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="app-header">
      <div className="app-title">
        <FontAwesomeIcon icon={faLinkSlash} />
        <span>{STRINGS.app.title}</span>
      </div>
      <nav className="app-nav">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} data-active={pathname?.startsWith(item.href.replace(/\/$/, ""))}>
            <FontAwesomeIcon icon={item.icon} />
            {item.label}
          </Link>
        ))}
        <a href="https://rictaworks.jp/#demos" className="app-nav-demos-link">
          {STRINGS.nav.backToDemos}
        </a>
      </nav>
    </header>
  );
}
