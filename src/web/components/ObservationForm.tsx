"use client";

import { useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";
import { apiClient, ApiRequestError } from "@/lib/apiClient";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/datetime";
import type { Observation, ObservationStatus, Service } from "@/lib/types";
import { useHoneypot } from "./Honeypot";
import { useToast } from "./ToastProvider";

export interface ObservationFormProps {
  services: Service[];
  onRecorded: () => void;
}

export function ObservationForm({ services, onRecorded }: ObservationFormProps) {
  const [serviceId, setServiceId] = useState("");
  const [status, setStatus] = useState<ObservationStatus>("failed");
  const [observedAt, setObservedAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { honeypotValue, honeypotField } = useHoneypot();
  const { showSuccess, showError } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post<{ observation: Observation }>("/api/observations", {
        serviceId,
        status,
        observedAt: fromDatetimeLocalValue(observedAt),
        hp: honeypotValue
      });
      onRecorded();
      showSuccess(STRINGS.observation.submitSuccess);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : STRINGS.errors.generic;
      setError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {honeypotField}
      <div className="field">
        <label htmlFor="obs-service">{STRINGS.observation.serviceLabel}</label>
        <select id="obs-service" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
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
        <label htmlFor="obs-status">{STRINGS.observation.statusLabel}</label>
        <select id="obs-status" value={status} onChange={(e) => setStatus(e.target.value as ObservationStatus)}>
          <option value="failed">{STRINGS.observation.statusFailed}</option>
          <option value="working">{STRINGS.observation.statusWorking}</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="obs-time">{STRINGS.observation.observedAtLabel}</label>
        <input
          id="obs-time"
          type="datetime-local"
          value={observedAt}
          onChange={(e) => setObservedAt(e.target.value)}
          required
        />
        <button type="button" className="button button-small" onClick={() => setObservedAt(toDatetimeLocalValue(new Date()))}>
          <FontAwesomeIcon icon={faClock} />
          {STRINGS.observation.useNow}
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" className="button button-primary" disabled={submitting}>
        <FontAwesomeIcon icon={faPaperPlane} />
        {STRINGS.observation.submit}
      </button>
    </form>
  );
}
