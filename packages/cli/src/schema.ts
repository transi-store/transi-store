import z from "zod";

const configItemSchema = z.object({
  org: z.string().min(1),
  project: z.string().min(1),
  apiKey: z.string().min(1),
  langs: z
    .array(z.string().regex(/^[a-z]{2}(?:-[A-Za-z]{2,})?$/))
    .min(1)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "langs must contain unique items",
    }),
  format: z.enum(["json", "yaml", "po", "xlf", "xliff", "csv"]),
  output: z
    .string()
    .min(1)
    .refine((s) => s.includes("<lang>"), {
      message: "output must contain '<lang>' placeholder",
    }),
});

const schema = z.array(configItemSchema).min(1);

export default schema;
