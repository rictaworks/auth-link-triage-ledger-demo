import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { Env } from "./env";
import { isProduction } from "./env";
import { LedgerRepository } from "./repo/repository";
import { toAuthLink, toObservation, toProcedureStep, toService, toTriageCase, toTriggerEvent } from "./repo/mappers";
import { resolveSessionId } from "./session/session";
import { generateId } from "./utils/id";
import { honeypotGuard } from "./middleware/honeypot";
import { ApiError, badRequest } from "./utils/errors";
import { LinkCycleError, PrimaryRouteConfirmationRequiredError } from "./utils/domainErrors";
import { MESSAGES } from "./config/messages";
import { LIMITS, PROVIDER_TEMPLATES, APP_VERSION } from "./config/masterData";
import { createService, deleteService, updateService } from "./usecases/services";
import { createLink, deleteLink } from "./usecases/links";
import { replaceProcedureSteps } from "./usecases/steps";
import { recordObservation } from "./usecases/observations";
import { recordTriggerEvent } from "./usecases/triggers";
import { computeTriage } from "./usecases/triage";
import { getReloginPlan, completeRelogin } from "./usecases/relogin";
import type { Propagation, Route, TriggerKind } from "./types";

const SESSION_COOKIE_NAME = "session_key";
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 日次リセットに合わせて1日

type Variables = {
  sessionId: string;
  repo: LedgerRepository;
  now: Date;
  body: Record<string, unknown>;
};

export function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();

  app.onError((err, c) => {
    if (err instanceof LinkCycleError) {
      return c.json({ error: "link_cycle", message: err.message, path: err.path }, err.status);
    }
    if (err instanceof PrimaryRouteConfirmationRequiredError) {
      return c.json(
        {
          error: "primary_route_confirmation_required",
          message: err.message,
          existingPrimaryLinkId: err.existingPrimaryLinkId,
          existingProviderId: err.existingProviderId
        },
        err.status
      );
    }
    if (err instanceof ApiError) {
      return c.json({ error: err.messageKey, message: err.message }, err.status as 400 | 404 | 409);
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return c.json({ error: "internal_error", message: MESSAGES.internalError }, 500);
  });

  app.use("*", honeypotGuard);

  app.use("*", async (c, next) => {
    const repo = new LedgerRepository(c.env.DB);
    const now = new Date();
    const cookieValue = getCookie(c, SESSION_COOKIE_NAME);
    const resolved = await resolveSessionId(
      cookieValue,
      {
        find: (id) => repo.findSession(id),
        create: (id, iso) => repo.createSession(id, iso),
        touch: (id, iso) => repo.touchSession(id, iso)
      },
      now,
      generateId
    );

    setCookie(c, SESSION_COOKIE_NAME, resolved.sessionId, {
      httpOnly: true,
      secure: isProduction(c.env),
      sameSite: "Lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS
    });

    c.set("sessionId", resolved.sessionId);
    c.set("repo", repo);
    c.set("now", now);
    await next();
  });

  app.get("/api/version", (c) => c.json({ version: APP_VERSION }));

  app.get("/api/service-templates", (c) => c.json({ templates: PROVIDER_TEMPLATES }));

  // --- services ---

  app.get("/api/services", async (c) => {
    const rows = await c.get("repo").listServices(c.get("sessionId"));
    return c.json({ services: rows.map(toService) });
  });

  app.post("/api/services", async (c) => {
    const body = c.get("body");
    const service = await createService(
      c.get("repo"),
      c.get("sessionId"),
      { name: String(body.name ?? ""), note: String(body.note ?? "") },
      c.get("now")
    );
    return c.json({ service }, 201);
  });

  app.patch("/api/services/:id", async (c) => {
    const body = c.get("body");
    const service = await updateService(c.get("repo"), c.get("sessionId"), c.req.param("id"), {
      name: String(body.name ?? ""),
      note: String(body.note ?? "")
    });
    return c.json({ service });
  });

  app.delete("/api/services/:id", async (c) => {
    await deleteService(c.get("repo"), c.get("sessionId"), c.req.param("id"));
    return c.json({ ok: true });
  });

  // --- links ---

  app.get("/api/links", async (c) => {
    const rows = await c.get("repo").listLinks(c.get("sessionId"));
    return c.json({ links: rows.map(toAuthLink) });
  });

  app.post("/api/links", async (c) => {
    const body = c.get("body");
    const route = body.route as Route;
    if (route !== "primary" && route !== "alternate") {
      throw badRequest("validationFailed");
    }
    const link = await createLink(
      c.get("repo"),
      c.get("sessionId"),
      {
        dependentId: String(body.dependentId ?? ""),
        providerId: String(body.providerId ?? ""),
        route,
        propagation: (body.propagation as Propagation) ?? "delayed",
        confirmDowngrade: body.confirmDowngrade === true
      },
      c.get("now")
    );
    return c.json({ link }, 201);
  });

  app.delete("/api/links/:id", async (c) => {
    await deleteLink(c.get("repo"), c.get("sessionId"), c.req.param("id"));
    return c.json({ ok: true });
  });

  // --- procedure steps ---

  app.get("/api/services/:id/steps", async (c) => {
    const rows = await c.get("repo").listSteps(c.get("sessionId"), c.req.param("id"));
    return c.json({ steps: rows.map(toProcedureStep) });
  });

  app.put("/api/services/:id/steps", async (c) => {
    const body = c.get("body");
    const bodies = Array.isArray(body.steps) ? body.steps.map((s) => String(s)) : [];
    const steps = await replaceProcedureSteps(c.get("repo"), c.get("sessionId"), c.req.param("id"), bodies);
    return c.json({ steps });
  });

  // --- observations ---

  app.get("/api/observations", async (c) => {
    const rows = await c.get("repo").listObservations(c.get("sessionId"));
    return c.json({ observations: rows.map(toObservation) });
  });

  app.post("/api/observations", async (c) => {
    const body = c.get("body");
    const status = body.status === "working" ? "working" : body.status === "failed" ? "failed" : null;
    if (!status) throw badRequest("validationFailed");
    const observedAt = typeof body.observedAt === "string" ? body.observedAt : c.get("now").toISOString();
    const result = await recordObservation(
      c.get("repo"),
      c.get("sessionId"),
      { serviceId: String(body.serviceId ?? ""), status, observedAt },
      c.get("now")
    );
    return c.json({ observation: result.observation }, 201);
  });

  // --- trigger events ---

  app.get("/api/triggers", async (c) => {
    const rows = await c.get("repo").listTriggers(c.get("sessionId"));
    return c.json({ triggers: rows.map(toTriggerEvent) });
  });

  app.post("/api/triggers", async (c) => {
    const body = c.get("body");
    const event = await recordTriggerEvent(
      c.get("repo"),
      c.get("sessionId"),
      {
        serviceId: String(body.serviceId ?? ""),
        kind: body.kind as TriggerKind,
        occurredAt: String(body.occurredAt ?? "")
      },
      c.get("now")
    );
    return c.json({ trigger: event }, 201);
  });

  // --- triage ---

  app.get("/api/triage", async (c) => {
    const result = await computeTriage(c.get("repo"), c.get("sessionId"), c.get("now"));
    return c.json(result);
  });

  app.get("/api/cases", async (c) => {
    const rows = await c.get("repo").listCases(c.get("sessionId"));
    return c.json({ cases: rows.map(toTriageCase) });
  });

  // --- relogin ---

  app.get("/api/relogin", async (c) => {
    const originId = c.req.query("originId");
    if (!originId) throw badRequest("validationFailed");
    const plan = await getReloginPlan(c.get("repo"), c.get("sessionId"), originId, c.get("now"));
    return c.json(plan);
  });

  app.post("/api/relogin/complete", async (c) => {
    const body = c.get("body");
    const result = await completeRelogin(c.get("repo"), c.get("sessionId"), String(body.serviceId ?? ""), c.get("now"));
    return c.json(result);
  });

  return app;
}

export const RUNTIME_LIMITS = LIMITS;
