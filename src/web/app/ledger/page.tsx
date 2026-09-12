"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiagramProject, faList, faPlus, faLink } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";
import { apiClient } from "@/lib/apiClient";
import { useLedger } from "@/lib/useLedger";
import type { ProcedureStep } from "@/lib/types";
import { ServiceForm } from "@/components/ServiceForm";
import { LinkForm } from "@/components/LinkForm";
import { ServiceTable } from "@/components/ServiceTable";
import { DependencyGraphView } from "@/components/DependencyGraphView";

export default function LedgerPage() {
  const { services, links, templates, loading, reload } = useLedger();
  const [steps, setSteps] = useState<ProcedureStep[]>([]);

  useEffect(() => {
    apiClient.get<{ steps: ProcedureStep[] }>("/api/steps").then((res) => setSteps(res.steps));
  }, [services.length, links.length]);

  return (
    <>
      <h1>{STRINGS.ledger.heading}</h1>

      <section className="card">
        <h2>
          <FontAwesomeIcon icon={faList} />
          {STRINGS.ledger.serviceListHeading}
        </h2>
        {loading ? <p>{STRINGS.common.loading}</p> : <ServiceTable services={services} links={links} steps={steps} onChanged={reload} />}
      </section>

      <section className="card">
        <h2>
          <FontAwesomeIcon icon={faDiagramProject} />
          {STRINGS.ledger.dependencyGraphHeading}
        </h2>
        {!loading && <DependencyGraphView services={services} links={links} />}
      </section>

      <section className="card">
        <h2>
          <FontAwesomeIcon icon={faPlus} />
          {STRINGS.ledger.addServiceHeading}
        </h2>
        <ServiceForm templates={templates} onCreated={reload} />
      </section>

      <section className="card">
        <h2>
          <FontAwesomeIcon icon={faLink} />
          {STRINGS.ledger.addLinkHeading}
        </h2>
        {services.length < 2 ? (
          <p className="empty-state">{STRINGS.common.empty}</p>
        ) : (
          <LinkForm services={services} onCreated={reload} />
        )}
      </section>
    </>
  );
}
