/**
 * Simple script to seed test data for manual testing
 */

import { db } from "../app/lib/db.server.ts";
import {
  users,
  organizations,
  organizationMembers,
  projects,
  projectLanguages,
  translationKeys,
  translations,
  sessions,
} from "../drizzle/schema.ts";
import { randomBytes } from "crypto";

async function seed() {
  try {
    console.log("🌱 Seeding test data...");

    // Create a test user
    const [user] = await db
      .insert(users)
      .values({
        email: "test@example.com",
        name: "Test User",
      })
      .returning();

    console.log("✓ Created user:", user.email);

    // Create a test organization
    const [org] = await db
      .insert(organizations)
      .values({
        name: "Test Organization",
        slug: "test-org",
        createdBy: user.id,
      })
      .returning();

    console.log("✓ Created organization:", org.name);

    // Add user as member
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: user.id,
      role: "owner",
    });

    console.log("✓ Added user as organization member");

    // Create a test project
    const [project] = await db
      .insert(projects)
      .values({
        name: "Test Project",
        slug: "test-project",
        organizationId: org.id,
        createdBy: user.id,
      })
      .returning();

    console.log("✓ Created project:", project.name);

    // Add languages
    const [langFr] = await db
      .insert(projectLanguages)
      .values({
        projectId: project.id,
        locale: "fr",
        name: "Français",
        isDefault: true,
      })
      .returning();

    const [langEn] = await db
      .insert(projectLanguages)
      .values({
        projectId: project.id,
        locale: "en",
        name: "English",
        isDefault: false,
      })
      .returning();

    console.log("✓ Created languages: fr, en");

    // Create a test translation key
    const [key] = await db
      .insert(translationKeys)
      .values({
        projectId: project.id,
        keyName: "welcome.message",
        description: "Message de bienvenue",
        createdBy: user.id,
      })
      .returning();

    console.log("✓ Created translation key:", key.keyName);

    // Create translations
    await db.insert(translations).values([
      {
        keyId: key.id,
        locale: "fr",
        value: "Bienvenue !",
      },
      {
        keyId: key.id,
        locale: "en",
        value: "Welcome!",
      },
    ]);

    console.log("✓ Created translations");

    // Create a session for the user
    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(sessions).values({
      id: sessionToken,
      userId: user.id,
      expiresAt,
    });

    console.log("✓ Created session");
    console.log("\n✅ Test data seeded successfully!");
    console.log("\nYou can now access the application at:");
    console.log(`  http://localhost:5173/orgs/${org.slug}/projects/${project.slug}/keys/${key.id}`);
    console.log("\nSession cookie (paste in browser dev tools):");
    console.log(`  session=${sessionToken}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

seed();
