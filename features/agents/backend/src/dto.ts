import { z } from "zod";

const avatarUrlSchema = z
  .string()
  .max(1_500_000)
  .refine(
    (v) => v.startsWith("data:image/") || v.startsWith("/"),
    "avatarUrl must be an uploaded image or a root-relative path",
  )
  .nullable()
  .optional();

export const createAgentSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  avatarUrl: avatarUrlSchema,
  category: z.string().max(60).nullable().optional(),
  kind: z.string().min(1).max(60).default("custom"),
  modelId: z.string().min(1),
  instructions: z.string().min(1).max(20000),
  toolIds: z.array(z.string()).default([]),
  approvalMode: z.enum(["auto", "ask"]).default("ask"),
  maxToolCalls: z.number().int().min(1).max(50).default(10),
  tokenBudget: z.number().int().min(1).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
});

export const updateAgentSchema = createAgentSchema.partial();

export const testAgentSchema = z.object({ prompt: z.string().min(1).max(8000) });

export const runAgentSchema = z.object({ input: z.record(z.string(), z.unknown()).default({}) });

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type TestAgentInput = z.infer<typeof testAgentSchema>;
// Named to avoid colliding with the executor's RunAgentInput that the package barrel re-exports.
export type RunAgentBody = z.infer<typeof runAgentSchema>;
