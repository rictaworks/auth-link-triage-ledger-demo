"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";
import { apiClient, ApiRequestError } from "@/lib/apiClient";
import { serviceKind, primaryProviderId } from "@/lib/graphView";
import type { AuthLink, ProcedureStep, Service } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";

export interface ServiceTableProps {
  services: Service[];
  links: AuthLink[];
  steps: ProcedureStep[];
  onChanged: () => void;
}

const KIND_LABEL: Record<string, string> = {
  provider: STRINGS.ledger.kindProvider,
  dependent: STRINGS.ledger.kindDependent,
  relay: STRINGS.ledger.kindRelay,
  isolated: STRINGS.ledger.kindIsolated
};

export function ServiceTable({ services, links, steps, onChanged }: ServiceTableProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const serviceById = new Map(services.map((s) => [s.id, s]));
  const stepServiceIds = new Set(steps.map((s) => s.serviceId));

  async function handleDelete(id: string) {
    try {
      await apiClient.delete(`/api/services/${id}`);
      setPendingDeleteId(null);
      setDeleteError(null);
      onChanged();
      showSuccess(STRINGS.ledger.serviceDeleteSuccess);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setDeleteError(err.message);
        showError(err.message);
      }
    }
  }

  if (services.length === 0) {
    return <p className="empty-state">{STRINGS.common.empty}</p>;
  }

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th>{STRINGS.ledger.columnName}</th>
            <th>{STRINGS.ledger.columnKind}</th>
            <th>{STRINGS.ledger.columnProvider}</th>
            <th>{STRINGS.ledger.columnPropagation}</th>
            <th>{STRINGS.ledger.columnSteps}</th>
            <th>{STRINGS.ledger.columnActions}</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => {
            const kind = serviceKind(links, service.id);
            const providerId = primaryProviderId(links, service.id);
            const primaryLink = links.find((l) => l.dependentId === service.id && l.route === "primary");
            return (
              <tr key={service.id}>
                <td>{service.name}</td>
                <td>{KIND_LABEL[kind]}</td>
                <td>{providerId ? serviceById.get(providerId)?.name ?? STRINGS.common.unknownService : "—"}</td>
                <td>
                  {primaryLink
                    ? primaryLink.propagation === "immediate"
                      ? STRINGS.ledger.propagationImmediate
                      : STRINGS.ledger.propagationDelayed
                    : "—"}
                </td>
                <td>{stepServiceIds.has(service.id) ? STRINGS.ledger.hasStepsYes : STRINGS.ledger.hasStepsNo}</td>
                <td>
                  <button
                    type="button"
                    className="button button-small button-danger"
                    onClick={() => {
                      setDeleteError(null);
                      setPendingDeleteId(service.id);
                    }}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    {STRINGS.common.delete}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title={STRINGS.ledger.deleteConfirmTitle}
        danger
        body={
          <>
            <p>{STRINGS.ledger.deleteConfirmBody}</p>
            {deleteError && <p className="field-error">{deleteError}</p>}
          </>
        }
        confirmLabel={STRINGS.common.delete}
        onConfirm={() => pendingDeleteId && handleDelete(pendingDeleteId)}
        onCancel={() => {
          setPendingDeleteId(null);
          setDeleteError(null);
        }}
      />
    </>
  );
}
