"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faListOl, faPen, faRoute } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";
import { apiClient } from "@/lib/apiClient";
import { useLedger } from "@/lib/useLedger";
import { nameOf } from "@/lib/serviceNames";
import type { ReloginPlan } from "@/lib/types";
import { ProcedureEditor } from "@/components/ProcedureEditor";
import { useToast } from "@/components/ToastProvider";

function ProceduresContent() {
  const searchParams = useSearchParams();
  const originId = searchParams.get("originId");
  const { services } = useLedger();
  const [plan, setPlan] = useState<ReloginPlan | null>(null);
  const [resolved, setResolved] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const { showSuccess, showError } = useToast();

  const loadPlan = useCallback(() => {
    if (!originId) {
      setPlan(null);
      setResolved(false);
      return;
    }
    setResolved(false);
    apiClient
      .get<ReloginPlan>(`/api/relogin?originId=${originId}`)
      .then(setPlan)
      .catch(() => {
        // ケースが解決済み（進行中の切り分けケースが無い）場合、サーバーは400を返す。
        // これは異常系ではなく正常な遷移なので、エラー表示ではなく解決済み表示にする。
        setPlan(null);
        setResolved(true);
      });
  }, [originId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  async function complete(serviceId: string) {
    try {
      const result = await apiClient.post<{ caseResolved: boolean }>("/api/relogin/complete", { serviceId });
      showSuccess(STRINGS.procedures.completeSuccess);
      if (result.caseResolved) {
        showSuccess(STRINGS.procedures.caseResolved);
        setPlan(null);
        setResolved(true);
      } else {
        loadPlan();
      }
    } catch {
      showError(STRINGS.errors.generic);
    }
  }

  return (
    <>
      <h1>{STRINGS.procedures.heading}</h1>

      <section className="card">
        <h2>
          <FontAwesomeIcon icon={faRoute} />
          {STRINGS.procedures.reloginOrderHeading}
        </h2>
        {!originId ? (
          <p className="empty-state">{STRINGS.procedures.noOriginSelected}</p>
        ) : resolved ? (
          <p className="empty-state">{STRINGS.procedures.caseResolved}</p>
        ) : !plan ? (
          <p>{STRINGS.common.loading}</p>
        ) : (
          <>
            {plan.skipped.length > 0 && (
              <p className="field-hint">
                {STRINGS.procedures.skippedNotice} {plan.skipped.map((id) => nameOf(services, id)).join("、")}
              </p>
            )}
            {plan.entries.map((entry) => (
              <div key={entry.serviceId} className="relogin-entry">
                <h3>{nameOf(services, entry.serviceId)}</h3>
                {entry.alternateHint && (
                  <p className="field-hint">
                    {STRINGS.procedures.alternateHint}（{nameOf(services, entry.alternateHint)}）
                  </p>
                )}
                {entry.recorded ? (
                  <ol>
                    {entry.steps.map((step) => (
                      <li key={step.position}>{step.body}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="empty-state">{STRINGS.common.unrecorded}</p>
                )}
                <button type="button" className="button button-primary button-small" onClick={() => complete(entry.serviceId)}>
                  <FontAwesomeIcon icon={faCheck} />
                  {STRINGS.procedures.completeButton}
                </button>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="card">
        <h2>
          <FontAwesomeIcon icon={faPen} />
          {STRINGS.procedureEditor.heading}
        </h2>
        <div className="field">
          <label htmlFor="procedure-service-select">
            <FontAwesomeIcon icon={faListOl} /> {STRINGS.procedureEditor.serviceSelectLabel}
          </label>
          <select id="procedure-service-select" value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
            <option value="">—</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {selectedServiceId && (
          <ProcedureEditor service={services.find((s) => s.id === selectedServiceId)!} />
        )}
      </section>
    </>
  );
}

export default function ProceduresPage() {
  return (
    <Suspense fallback={<p>{STRINGS.common.loading}</p>}>
      <ProceduresContent />
    </Suspense>
  );
}
