import { writeFileSync } from "node:fs";
import path from "node:path";
import z from "zod";
import schema from "@transi-store/cli/schema";

const schemaJson = z.toJSONSchema(schema);

// get current file dir
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const outputPath = path.resolve(__dirname, "../packages/cli/dist/schema.json");

writeFileSync(outputPath, JSON.stringify(schemaJson, null, 2), "utf-8");
