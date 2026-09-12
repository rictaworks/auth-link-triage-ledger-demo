"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faCircleCheck, faCircleXmark } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";
import { nameOf } from "@/lib/serviceNames";
import type { CandidateEvaluation, ExcludedCandidate, Recommendation, Service, TriageResult } from "@/lib/types";

export interface OriginCandidateListProps {
  services: Service[];
  result: TriageResult;
  onSelectOrigin: (serviceId: string) => void;
  onQuickObserve: (serviceId: string, status: "failed" | "working") => void;
}

function CandidateCard({
  services,
  candidate,
  rank,
  onSelectOrigin
}: {
  services: Service[];
  candidate: CandidateEvaluation;
  rank: number;
  onSelectOrigin: (id: string) => void;
}) {
  return (
    <div className="origin-card">
      <div>
        <span className="origin-card-rank">#{rank}</span>
        <strong>{nameOf(services, candidate.serviceId)}</strong>
      </div>
      <p>
        {STRINGS.triage.explainedLabel}: {candidate.explained.length} / {STRINGS.triage.unobservedLabel}:{" "}
        {candidate.unobserved.length} /{" "}
        {candidate.hasTrigger ? STRINGS.triage.hasTriggerLabel : STRINGS.triage.noTriggerLabel}
      </p>
      {candidate.rationale.length > 0 && (
        <p className="field-hint">{candidate.rationale.map((code) => STRINGS.triage.rationale[code]).join(" / ")}</p>
      )}
      {candidate.unexplained.length > 0 && <p className="field-hint">{STRINGS.triage.singleOriginInsufficient}</p>}
      <button type="button" className="button button-primary button-small" onClick={() => onSelectOrigin(candidate.serviceId)}>
        <FontAwesomeIcon icon={faArrowRight} />
        {STRINGS.triage.selectOriginButton}
      </button>
    </div>
  );
}

function ExcludedCard({ services, excluded }: { services: Service[]; excluded: ExcludedCandidate }) {
  return (
    <div className="origin-card">
      <strong>{nameOf(services, excluded.serviceId)}</strong>
      <ul>
        {excluded.contradictions.map((c, i) => (
          <li key={i}>
            {nameOf(services, c.serviceId)}：{STRINGS.triage.exclusionReason[c.reason]}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecommendationCard({
  services,
  recommendation,
  onQuickObserve
}: {
  services: Service[];
  recommendation: Recommendation;
  onQuickObserve: (id: string, status: "failed" | "working") => void;
}) {
  return (
    <div className="origin-card">
      <strong>{nameOf(services, recommendation.serviceId)}</strong>
      <p className="field-hint">{STRINGS.triage.recommendationHint}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="button button-small button-danger"
          onClick={() => onQuickObserve(recommendation.serviceId, "failed")}
        >
          <FontAwesomeIcon icon={faCircleXmark} />
          {STRINGS.observation.statusFailed}
        </button>
        <button
          type="button"
          className="button button-small"
          onClick={() => onQuickObserve(recommendation.serviceId, "working")}
        >
          <FontAwesomeIcon icon={faCircleCheck} />
          {STRINGS.observation.statusWorking}
        </button>
      </div>
    </div>
  );
}

export function OriginCandidateList({ services, result, onSelectOrigin, onQuickObserve }: OriginCandidateListProps) {
  if (!result.caseId) {
    return <p className="empty-state">{STRINGS.triage.noCase}</p>;
  }

  return (
    <div>
      <p className="field-hint">
        {STRINGS.triage.windowRangeLabel}: {result.windowStart} 〜 {result.windowEnd}
      </p>

      <h3>{STRINGS.triage.originCandidatesHeading}</h3>
      {result.ranked.length === 0 ? (
        <p className="empty-state">{STRINGS.common.empty}</p>
      ) : (
        result.ranked.map((candidate, index) => (
          <CandidateCard key={candidate.serviceId} services={services} candidate={candidate} rank={index + 1} onSelectOrigin={onSelectOrigin} />
        ))
      )}

      {result.excluded.length > 0 && (
        <>
          <h3>{STRINGS.triage.excludedCandidatesHeading}</h3>
          {result.excluded.map((excluded) => (
            <ExcludedCard key={excluded.serviceId} services={services} excluded={excluded} />
          ))}
        </>
      )}

      {result.origins.length > 1 && (
        <>
          <h3>{STRINGS.triage.multiOriginHeading}</h3>
          {result.origins.map((origin, index) => (
            <p key={origin.serviceId}>
              {index + 1}. {nameOf(services, origin.serviceId)} — {STRINGS.triage.explainedLabel}: {origin.explained.length}
            </p>
          ))}
        </>
      )}

      {result.unexplained.length > 0 && (
        <>
          <h3>{STRINGS.triage.unexplainedHeading}</h3>
          <p>{result.unexplained.map((id) => nameOf(services, id)).join(", ")}</p>
        </>
      )}

      {result.recommendations.length > 0 && (
        <>
          <h3>{STRINGS.triage.recommendationsHeading}</h3>
          {result.recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.serviceId}
              services={services}
              recommendation={recommendation}
              onQuickObserve={onQuickObserve}
            />
          ))}
        </>
      )}
    </div>
  );
}
