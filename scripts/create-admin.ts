import { db, user, account, pangkalan } from "../db";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from "better-auth/crypto";

type CliOptions = {
  email: string;
  password: string;
  name: string;
  pangkalanName: string;
};

function readArg(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.findIndex((arg) => arg === `--${flag}`);
  if (index === -1) return undefined;
  return args[index + 1];
}

function readOptions(): CliOptions {
  const email = readArg("email") || "admin@ollapos.local";
  const password = readArg("password") || "Admin12345";
  const name = readArg("name") || "Admin Ollapos";
  const pangkalanName = readArg("pangkalan") || "Pangkalan Utama";

  return { email, password, name, pangkalanName };
}

async function ensureUserAsAdmin(options: CliOptions) {
  const now = new Date();
  const existingUser = await db.select().from(user).where(eq(user.email, options.email)).limit(1);

  let userId: string;
  if (existingUser.length > 0) {
    userId = existingUser[0].id;
    await db
      .update(user)
      .set({
        name: options.name,
        role: "admin",
        updatedAt: now,
      })
      .where(eq(user.id, userId));
    console.log(`✅ User ditemukan dan dipromosikan ke admin: ${options.email}`);
  } else {
    userId = `usr_${nanoid()}`;
    await db.insert(user).values({
      id: userId,
      name: options.name,
      email: options.email,
      emailVerified: true,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✅ User admin baru dibuat: ${options.email}`);
  }

  const passwordHash = await hashPassword(options.password);
  const credentialAccount = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);

  if (credentialAccount.length > 0) {
    await db
      .update(account)
      .set({ password: passwordHash, updatedAt: now, accountId: userId })
      .where(eq(account.id, credentialAccount[0].id));
    console.log("✅ Password credential diperbarui");
  } else {
    await db.insert(account).values({
      id: `acc_${nanoid()}`,
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    console.log("✅ Credential account dibuat");
  }

  const existingPangkalan = await db.select().from(pangkalan).where(eq(pangkalan.userId, userId)).limit(1);
  let selectedPangkalanId: string;

  if (existingPangkalan.length > 0) {
    selectedPangkalanId = existingPangkalan[0].id;
    console.log(`✅ Pangkalan user sudah ada: ${existingPangkalan[0].name}`);
  } else {
    selectedPangkalanId = `pkg_${nanoid()}`;
    await db.insert(pangkalan).values({
      id: selectedPangkalanId,
      userId,
      name: options.pangkalanName,
      address: "Belum diatur",
      phone: "-",
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✅ Pangkalan default dibuat: ${options.pangkalanName}`);
  }

  await db
    .update(user)
    .set({
      defaultPangkalanId: selectedPangkalanId,
      activePangkalanId: selectedPangkalanId,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  console.log("\n=== Kredensial Login Admin ===");
  console.log(`Email    : ${options.email}`);
  console.log(`Password : ${options.password}`);
  console.log(`Role     : admin`);
  console.log(`Pangkalan: ${selectedPangkalanId}`);
}

ensureUserAsAdmin(readOptions())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Gagal membuat akun admin:", error);
    process.exit(1);
  });
