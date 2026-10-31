import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_OWNER_PASSWORD;

if (!url || !serviceRoleKey || !email || !password) {
  console.error(
    "Butuh NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_OWNER_EMAIL, dan SEED_OWNER_PASSWORD.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const branches = [
  {
    id: "br-main",
    name: "Toko Utama",
    address: "Jl. Malioboro No. 88, Yogyakarta",
    phone: "0274-512345",
    is_active: true,
  },
  {
    id: "br-bandung",
    name: "Cabang Bandung",
    address: "Jl. Asia Afrika No. 21, Bandung",
    phone: "022-4234567",
    is_active: true,
  },
];

async function findUserByEmail(targetEmail) {
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const user = data.users.find(
      (item) => item.email?.toLowerCase() === targetEmail,
    );

    if (user) return user;
    if (data.users.length < 1000) return null;

    page += 1;
  }
}

async function main() {
  const { error: branchError } = await admin
    .from("branches")
    .upsert(branches, { onConflict: "id" });

  if (branchError) throw branchError;

  let user = await findUserByEmail(email);

  if (user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { name: "Nurcahyo" },
    });

    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Nurcahyo" },
    });

    if (error || !data.user) {
      throw error ?? new Error("User Owner gagal dibuat");
    }

    user = data.user;
  }

  const { error: employeeError } = await admin.from("employees").upsert(
    {
      id: "emp-owner",
      user_id: user.id,
      name: "Nurcahyo",
      phone: "0812-1000-0001",
      initials: "NA",
      role: "Owner",
      branch_id: "br-main",
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (employeeError) throw employeeError;

  console.log(`Owner siap: ${email}`);
  console.log("Password seed tersimpan di .env.local (SEED_OWNER_PASSWORD).");
}

main().catch((error) => {
  console.error("Seed Owner gagal:", error.message ?? error);
  process.exit(1);
});
