"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "./apiClient";
import type { AuthLink, ProviderTemplate, Service } from "./types";

export interface LedgerData {
  services: Service[];
  links: AuthLink[];
  templates: ProviderTemplate[];
  loading: boolean;
  reload: () => void;
}

/** 台帳画面・切り分け画面の両方で使う、サービス・連携・提供元テンプレートの取得。 */
export function useLedger(): LedgerData {
  const [services, setServices] = useState<Service[]>([]);
  const [links, setLinks] = useState<AuthLink[]>([]);
  const [templates, setTemplates] = useState<ProviderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiClient.get<{ services: Service[] }>("/api/services"),
      apiClient.get<{ links: AuthLink[] }>("/api/links"),
      apiClient.get<{ templates: ProviderTemplate[] }>("/api/service-templates")
    ])
      .then(([servicesRes, linksRes, templatesRes]) => {
        if (cancelled) return;
        setServices(servicesRes.services);
        setLinks(linksRes.links);
        setTemplates(templatesRes.templates);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  return { services, links, templates, loading, reload };
}
