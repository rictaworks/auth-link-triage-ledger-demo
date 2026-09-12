"use client";

import { useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";
import { apiClient, ApiRequestError } from "@/lib/apiClient";
import type { AuthLink, Propagation, Route, Service } from "@/lib/types";
import { useHoneypot } from "./Honeypot";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";

export interface LinkFormProps {
  services: Service[];
  onCreated: (link: AuthLink) => void;
}

export function LinkForm({ services, onCreated }: LinkFormProps) {
  const [dependentId, setDependentId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [route, setRoute] = useState<Route>("primary");
  const [propagation, setPropagation] = useState<Propagation>("delayed");
  const [error, setError] = useState<string | null>(null);
  const [cyclePath, setCyclePath] = useState<string[] | null>(null);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { honeypotValue, honeypotField } = useHoneypot();
  const { showSuccess, showError } = useToast();

  async function submitLink(withDowngrade: boolean) {
    setSubmitting(true);
    setError(null);
    setCyclePath(null);
    try {
      const { link } = await apiClient.post<{ link: AuthLink }>("/api/links", {
        dependentId,
        providerId,
        route,
        propagation,
        confirmDowngrade: withDowngrade,
        hp: honeypotValue
      });
      onCreated(link);
      setDependentId("");
      setProviderId("");
      setConfirmDowngrade(false);
      showSuccess(STRINGS.ledger.linkAddSuccess);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.body?.error === "link_cycle" && err.body.path) {
          setCyclePath(err.body.path.map((s) => s.name));
        } else if (err.body?.error === "primary_route_confirmation_required") {
          setConfirmDowngrade(true);
        } else {
          setError(err.message);
          showError(err.message);
        }
      } else {
        setError(STRINGS.errors.generic);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submitLink(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      {honeypotField}
      <div className="field">
        <label htmlFor="link-dependent">{STRINGS.ledger.dependentLabel}</label>
        <select id="link-dependent" value={dependentId} onChange={(e) => setDependentId(e.target.value)} required>
          <option value="" disabled>
            —
          </option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="link-provider">{STRINGS.ledger.providerLabel}</label>
        <select id="link-provider" value={providerId} onChange={(e) => setProviderId(e.target.value)} required>
          <option value="" disabled>
            —
          </option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="link-route">{STRINGS.ledger.routeLabel}</label>
        <select id="link-route" value={route} onChange={(e) => setRoute(e.target.value as Route)}>
          <option value="primary">{STRINGS.ledger.routePrimary}</option>
          <option value="alternate">{STRINGS.ledger.routeAlternate}</option>
        </select>
      </div>
      {route === "primary" && (
        <div className="field">
          <label htmlFor="link-propagation">{STRINGS.ledger.propagationLabel}</label>
          <select id="link-propagation" value={propagation} onChange={(e) => setPropagation(e.target.value as Propagation)}>
            <option value="delayed">{STRINGS.ledger.propagationDelayed}</option>
            <option value="immediate">{STRINGS.ledger.propagationImmediate}</option>
          </select>
        </div>
      )}
      {cyclePath && (
        <div className="field-error">
          <p>{STRINGS.ledger.cycleRejectedBody}</p>
          <p>{cyclePath.join(" → ")}</p>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
      <button type="submit" className="button button-primary" disabled={submitting}>
        <FontAwesomeIcon icon={faPlus} />
        {STRINGS.common.add}
      </button>

      <ConfirmDialog
        open={confirmDowngrade}
        title={STRINGS.ledger.primaryDowngradeConfirmTitle}
        body={<p>{STRINGS.ledger.primaryDowngradeConfirmBody}</p>}
        onConfirm={() => void submitLink(true)}
        onCancel={() => setConfirmDowngrade(false)}
      />
    </form>
  );
}
