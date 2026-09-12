"use client";

import { useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";
import { apiClient, ApiRequestError } from "@/lib/apiClient";
import type { ProviderTemplate, Service } from "@/lib/types";
import { useHoneypot } from "./Honeypot";
import { useToast } from "./ToastProvider";

export interface ServiceFormProps {
  templates: ProviderTemplate[];
  onCreated: (service: Service) => void;
}

export function ServiceForm({ templates, onCreated }: ServiceFormProps) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { honeypotValue, honeypotField } = useHoneypot();
  const { showSuccess, showError } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { service } = await apiClient.post<{ service: Service }>("/api/services", {
        name,
        note,
        hp: honeypotValue
      });
      onCreated(service);
      setName("");
      setNote("");
      showSuccess(STRINGS.ledger.serviceAddSuccess);
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
        <label htmlFor="service-name">{STRINGS.ledger.nameLabel}</label>
        <input
          id="service-name"
          type="text"
          list="provider-templates"
          value={name}
          placeholder={STRINGS.ledger.namePlaceholder}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          required
        />
        <datalist id="provider-templates">
          {templates.map((template) => (
            <option key={template.id} value={template.name} />
          ))}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor="service-note">{STRINGS.ledger.noteLabel}</label>
        <textarea id="service-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={2} />
      </div>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" className="button button-primary" disabled={submitting}>
        <FontAwesomeIcon icon={faPlus} />
        {STRINGS.common.add}
      </button>
    </form>
  );
}
