/**
 * Seed Admin User.
 *
 * Creates or updates the Firebase Auth user and Firestore profile for the
 * default admin account, then stamps the `kind: "admin"` custom claim.
 *
 * Run: pnpm seed:admin
 */

import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import { auth } from "@/lib/firebase/admin";
import { UpsertProfileUseCase } from "@/data/profile/use-cases/upsert-profile.use-case";

const ADMIN_EMAIL = "v@cosmoops.com";
const ADMIN_NAME = "CosmoOps Admin";
const ADMIN_HOME_PATH = "/console";

async function seedAdminUser() {
  console.log(
    `[SeedAdmin] Ensuring admin account exists for ${ADMIN_EMAIL}...\n`,
  );

  let userRecord;
  let authAction: "created" | "updated" = "updated";

  try {
    userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
    await auth.updateUser(userRecord.uid, {
      displayName: userRecord.displayName ?? ADMIN_NAME,
      emailVerified: userRecord.emailVerified,
      disabled: false,
    });
    userRecord = await auth.getUser(userRecord.uid);
    console.log(`  ⏭️  Reusing Firebase Auth user: ${userRecord.uid}`);
  } catch (error) {
    let code = "";

    if (typeof error === "object" && error !== null && "code" in error) {
      const errorCode = (error as { code: unknown }).code;
      if (typeof errorCode === "string") {
        code = errorCode;
      }
    }

    if (code !== "auth/user-not-found") {
      throw error;
    }

    userRecord = await auth.createUser({
      email: ADMIN_EMAIL,
      displayName: ADMIN_NAME,
      emailVerified: true,
      disabled: false,
    });
    authAction = "created";
    console.log(`  ✅ Created Firebase Auth user: ${userRecord.uid}`);
  }

  await auth.setCustomUserClaims(userRecord.uid, { kind: "admin" });
  console.log(`  ✅ Set custom claims: kind=admin`);

  const profile = await new UpsertProfileUseCase().execute(
    UpsertProfileUseCase.validate({
      userId: userRecord.uid,
      kind: "admin",
      name: userRecord.displayName ?? ADMIN_NAME,
      email: ADMIN_EMAIL,
    }),
  );

  console.log(`  ✅ Upserted profile: ${profile.userId}`);
  console.log(
    `\n✅ Admin ready — Auth ${authAction}, profile synced, custom claims applied.`,
  );
  console.log(`Next: request a magic link for ${ADMIN_EMAIL} at /auth/login`);
  console.log(`Then open ${ADMIN_HOME_PATH}`);
}

async function main() {
  try {
    await seedAdminUser();
    process.exit(0);
  } catch (error) {
    console.error("[SeedAdmin] Fatal error:", error);
    process.exit(1);
  }
}

void main();
