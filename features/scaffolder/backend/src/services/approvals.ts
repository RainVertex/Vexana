import { createHmac, timingSafeEqual } from "node:crypto";
import type { ApprovalRequirement, Capability } from "@internal/scaffolder-core";

// Approval tokens are short-lived HMACs scoped to (planId, capability,
// approverUserId). Persisted in ScaffoldPlan.approvalsGranted as JSON; verified
// at apply time before that capability counts as "approved". The signing
// secret comes from SCAFFOLDER_APPROVAL_SECRET, falling back to SESSION_SECRET
// so dev/test environments don't need a separate env var.

export interface ApprovalGrant {
  capability: Capability;
  approverUserId: string;
  approverIsAdmin: boolean;
  issuedAt: string;
  expiresAt: string;
  // HMAC over the canonical body, base64-encoded.
  signature: string;
}

export interface ApprovalSigner {
  sign(input: {
    planId: string;
    capability: Capability;
    approverUserId: string;
    approverIsAdmin: boolean;
    expiresAt: Date;
  }): ApprovalGrant;
  verify(planId: string, grant: ApprovalGrant): { ok: true } | { ok: false; reason: string };
}

function approvalSecret(): string {
  return (
    process.env.SCAFFOLDER_APPROVAL_SECRET ?? process.env.SESSION_SECRET ?? "dev-only-fallback"
  );
}

function canonicalBody(planId: string, grant: Omit<ApprovalGrant, "signature">): string {
  return [
    planId,
    grant.capability,
    grant.approverUserId,
    grant.approverIsAdmin ? "1" : "0",
    grant.issuedAt,
    grant.expiresAt,
  ].join("\n");
}

export function createApprovalSigner(): ApprovalSigner {
  return {
    sign({ planId, capability, approverUserId, approverIsAdmin, expiresAt }) {
      const body: Omit<ApprovalGrant, "signature"> = {
        capability,
        approverUserId,
        approverIsAdmin,
        issuedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      const sig = createHmac("sha256", approvalSecret())
        .update(canonicalBody(planId, body))
        .digest("base64");
      return { ...body, signature: sig };
    },
    verify(planId, grant) {
      const expected = createHmac("sha256", approvalSecret())
        .update(canonicalBody(planId, grant))
        .digest();
      let supplied: Buffer;
      try {
        supplied = Buffer.from(grant.signature, "base64");
      } catch {
        return { ok: false, reason: "malformed signature" };
      }
      if (supplied.length !== expected.length) {
        return { ok: false, reason: "signature length mismatch" };
      }
      if (!timingSafeEqual(supplied, expected)) {
        return { ok: false, reason: "signature mismatch" };
      }
      if (new Date(grant.expiresAt).getTime() <= Date.now()) {
        return { ok: false, reason: "approval expired" };
      }
      return { ok: true };
    },
  };
}

// Subtracts verified, unexpired approvals from the original requiresApproval
// list and returns the residual capabilities still needing approval.
export function residualMissingApprovals(
  required: ApprovalRequirement[],
  granted: ApprovalGrant[],
  signer: ApprovalSigner,
  planId: string,
): ApprovalRequirement[] {
  const verifiedCaps = new Set<Capability>();
  for (const g of granted) {
    if (signer.verify(planId, g).ok) verifiedCaps.add(g.capability);
  }
  return required.filter((r) => !verifiedCaps.has(r.capability));
}
