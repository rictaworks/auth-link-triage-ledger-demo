"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faPlus, faSave, faShieldHalved, faTrash } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";
import { apiClient, ApiRequestError } from "@/lib/apiClient";
import type { ProcedureStep, Service } from "@/lib/types";
import { useToast } from "./ToastProvider";

export interface ProcedureEditorProps {
  service: Service;
}

export function ProcedureEditor({ service }: ProcedureEditorProps) {
  const [bodies, setBodies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<{ steps: ProcedureStep[] }>(`/api/services/${service.id}/steps`)
      .then((res) => setBodies(res.steps.sort((a, b) => a.position - b.position).map((s) => s.body)))
      .finally(() => setLoading(false));
  }, [service.id]);

  function updateAt(index: number, value: string) {
    setBodies((current) => current.map((b, i) => (i === index ? value : b)));
  }

  function move(index: number, direction: -1 | 1) {
    setBodies((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function remove(index: number) {
    setBodies((current) => current.filter((_, i) => i !== index));
  }

  function add() {
    setBodies((current) => [...current, ""]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiClient.put<{ steps: ProcedureStep[] }>(`/api/services/${service.id}/steps`, { steps: bodies });
      showSuccess(STRINGS.procedureEditor.saveSuccess);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : STRINGS.errors.generic;
      setError(message);
      showError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>{STRINGS.common.loading}</p>;

  return (
    <div>
      <p className="field-hint">
        <FontAwesomeIcon icon={faShieldHalved} /> {STRINGS.procedureEditor.credentialWarning}
      </p>
      {bodies.map((body, index) => (
        <div key={index} className="step-row">
          <input
            type="text"
            value={body}
            maxLength={200}
            placeholder={STRINGS.procedureEditor.stepBodyPlaceholder}
            onChange={(e) => updateAt(index, e.target.value)}
          />
          <button type="button" className="button button-small" aria-label={STRINGS.procedureEditor.moveUp} onClick={() => move(index, -1)}>
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
          <button
            type="button"
            className="button button-small"
            aria-label={STRINGS.procedureEditor.moveDown}
            onClick={() => move(index, 1)}
          >
            <FontAwesomeIcon icon={faArrowDown} />
          </button>
          <button
            type="button"
            className="button button-small button-danger"
            aria-label={STRINGS.procedureEditor.removeStep}
            onClick={() => remove(index)}
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      ))}
      <button type="button" className="button" onClick={add}>
        <FontAwesomeIcon icon={faPlus} />
        {STRINGS.procedureEditor.addStepButton}
      </button>
      {error && <p className="field-error">{error}</p>}
      <div style={{ marginTop: 12 }}>
        <button type="button" className="button button-primary" disabled={saving} onClick={save}>
          <FontAwesomeIcon icon={faSave} />
          {STRINGS.common.save}
        </button>
      </div>
    </div>
  );
}
