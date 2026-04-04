import z from "zod";
import { SupportedFormat } from "./supported-format.ts";

const configItemSchema = z.object({
  project: z.string().nonempty(),
  langs: z
    .array(z.string().regex(/^[a-z]{2}(?:-[A-Za-z]{2,})?$/))
    .min(1)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "langs must contain unique items",
    }),
  format: z.enum(SupportedFormat),
  output: z
    .string()
    .nonempty()
    .refine((s) => s.includes("<lang>"), {
      message: "output must contain '<lang>' placeholder",
    }),
});

const schema = z.object({
  $schema: z.url().optional(),
  domainRoot: z.url().optional(),
  org: z.string().nonempty(),
  projects: z.array(configItemSchema).min(1),
});

export default schema;
