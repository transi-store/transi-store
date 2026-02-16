import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import z from "zod";
import schema from "@transi-store/cli/schema";

const schemaJson = z.toJSONSchema(schema);

// get current file dir
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const outputPath = path.resolve(__dirname, "../packages/cli/dist/schema.json");

writeFileSync(outputPath, JSON.stringify(schemaJson, null, 2), "utf-8");
