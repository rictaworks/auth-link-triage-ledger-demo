"use client";

import { useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";
import { apiClient, ApiRequestError } from "@/lib/apiClient";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/datetime";
import type { Service, TriggerEvent, TriggerKind } from "@/lib/types";
import { useHoneypot } from "./Honeypot";
import { useToast } from "./ToastProvider";

export interface TriggerFormProps {
  services: Service[];
  onRecorded: () => void;
}

const KIND_OPTIONS: TriggerKind[] = [
  "password_change",
  "mfa_reset",
  "device_change",
  "logout_all_devices",
  "account_recovery"
];

export function TriggerForm({ services, onRecorded }: TriggerFormProps) {
  const [serviceId, setServiceId] = useState("");
  const [kind, setKind] = useState<TriggerKind>("password_change");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { honeypotValue, honeypotField } = useHoneypot();
  const { showSuccess, showError } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post<{ trigger: TriggerEvent }>("/api/triggers", {
        serviceId,
        kind,
        occurredAt: fromDatetimeLocalValue(occurredAt),
        hp: honeypotValue
      });
      onRecorded();
      showSuccess(STRINGS.trigger.submitSuccess);
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
        <label htmlFor="trigger-service">{STRINGS.trigger.serviceLabel}</label>
        <select id="trigger-service" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
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
        <label htmlFor="trigger-kind">{STRINGS.trigger.kindLabel}</label>
        <select id="trigger-kind" value={kind} onChange={(e) => setKind(e.target.value as TriggerKind)}>
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {STRINGS.trigger.kinds[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="trigger-time">{STRINGS.trigger.occurredAtLabel}</label>
        <input
          id="trigger-time"
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          required
        />
      </div>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" className="button button-primary" disabled={submitting}>
        <FontAwesomeIcon icon={faPaperPlane} />
        {STRINGS.trigger.submit}
      </button>
    </form>
  );
}
