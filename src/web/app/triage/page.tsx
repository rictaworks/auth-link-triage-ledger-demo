"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faDiagramProject, faFolderOpen, faMagnifyingGlass, faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";
import { apiClient } from "@/lib/apiClient";
import { useLedger } from "@/lib/useLedger";
import { formatDateTime } from "@/lib/datetime";
import type { ObservationStatus, TriageCase, TriageResult } from "@/lib/types";
import { DependencyGraphView } from "@/components/DependencyGraphView";
import { ObservationForm } from "@/components/ObservationForm";
import { TriggerForm } from "@/components/TriggerForm";
import { OriginCandidateList } from "@/components/OriginCandidateList";
import { useToast } from "@/components/ToastProvider";

const CASE_STATE_LABEL = STRINGS.triage.caseStates;

export default function TriagePage() {
  const router = useRouter();
  const { services, links, loading: ledgerLoading } = useLedger();
  const [result, setResult] = useState<TriageResult | null>(null);
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess } = useToast();

  const reload = useCallback(() => {
    setLoading(true);
    // /api/triage はケース状態を遷移させる副作用を持つため、/api/cases より先に完了させて
    // ケース一覧が最新の状態（受付中→切り分け済み 等）を反映するようにする。
    apiClient
      .get<TriageResult>("/api/triage")
      .then((triageRes) => {
        setResult(triageRes);
        return apiClient.get<{ cases: TriageCase[] }>("/api/cases");
      })
      .then((casesRes) => setCases(casesRes.cases))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleQuickObserve(serviceId: string, status: ObservationStatus) {
    try {
      await apiClient.post("/api/observations", { serviceId, status });
      showSuccess(STRINGS.observation.submitSuccess);
      reload();
    } catch {
      showError(STRINGS.errors.generic);
    }
  }

  const statusMap = new Map(Object.entries(result?.statuses ?? {}) as Array<[string, ObservationStatus]>);

  return (
    <>
      <h1>{STRINGS.triage.heading}</h1>

      <section className="card">
        <h2>
          <FontAwesomeIcon icon={faDiagramProject} />
          {STRINGS.triage.currentStatusHeading}
        </h2>
        {!ledgerLoading && <DependencyGraphView services={services} links={links} statusMap={statusMap} />}
      </section>

      <section className="card">
        <h2>
          <FontAwesomeIcon icon={faBolt} />
          {STRINGS.observation.heading}
        </h2>
        <ObservationForm services={services} onRecorded={reload} />
      </section>

      <section className="card">
        <h2>
          <FontAwesomeIcon icon={faBolt} />
          {STRINGS.trigger.heading}
        </h2>
        <TriggerForm services={services} onRecorded={reload} />
      </section>

      <section className="card">
        <h2>
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          {STRINGS.triage.originCandidatesHeading}
        </h2>
        {loading || !result ? (
          <p>{STRINGS.common.loading}</p>
        ) : (
          <OriginCandidateList
            services={services}
            result={result}
            onSelectOrigin={(serviceId) => router.push(`/procedures/?originId=${serviceId}`)}
            onQuickObserve={handleQuickObserve}
          />
        )}
      </section>

      <section className="card">
        <h2>
          <FontAwesomeIcon icon={faFolderOpen} />
          {STRINGS.triage.caseHeading}
        </h2>
        {cases.length === 0 ? (
          <p className="empty-state">{STRINGS.common.empty}</p>
        ) : (
          <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <FontAwesomeIcon icon={faClockRotateLeft} /> {STRINGS.observation.observedAtLabel}
                </th>
                <th>{STRINGS.triage.caseHeading}</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td>{formatDateTime(c.openedAt)}</td>
                  <td>{CASE_STATE_LABEL[c.state]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </>
  );
}
