import { z, type ZodType } from "zod";

/** Derives a JSON Schema from a Zod schema, suitable for handing to RJSF on the frontend or to */
export function toJsonSchema(schema: ZodType<unknown>): Record<string, unknown> {
  // draft-7 is what @rjsf/validator-ajv8 supports natively. Targeting
  // 2020-12 stamps a $schema URL that AJV8's default meta-schema set can't
  // resolve, surfacing as "no schema with key or ref ..." in the form UI.
  return z.toJSONSchema(schema, {
    target: "draft-7",
    unrepresentable: "any",
  }) as Record<string, unknown>;
}
