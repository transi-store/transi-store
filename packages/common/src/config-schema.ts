import z from "zod";

const projectConfigItemSchema = z.object({
  slug: z.string().nonempty(),
});

const schema = z.object({
  $schema: z.url().optional(),
  domainRoot: z.url().optional(),
  org: z.string().nonempty(),
  projects: z.array(projectConfigItemSchema).min(1),
});

export default schema;
