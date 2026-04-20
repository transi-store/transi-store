import z from "zod";

const configItemSchema = z.object({
  project: z.string().nonempty(),
});

const schema = z.object({
  $schema: z.url().optional(),
  domainRoot: z.url().optional(),
  org: z.string().nonempty(),
  projects: z.array(configItemSchema).min(1),
});

export default schema;
