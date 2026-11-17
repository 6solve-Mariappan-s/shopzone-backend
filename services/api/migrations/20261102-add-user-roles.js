export const name = "20261102-add-user-roles.js";

export async function up(queryInterface) {
  const dialect = queryInterface.sequelize.getDialect();
  if (dialect !== "postgres") throw new Error(`User-role migration requires PostgreSQL; received ${dialect}`);

  const [tables] = await queryInterface.sequelize.query(
    "SELECT to_regclass('public.users') AS users_table, to_regtype('public.enum_users_role') AS role_type"
  );
  if (!tables?.[0]?.users_table || !tables?.[0]?.role_type) {
    throw new Error("Expected the existing public.users table and enum_users_role type; no schema was changed");
  }

  for (const role of ["ADMIN", "VENDOR", "BUYER"]) {
    await queryInterface.sequelize.query(`ALTER TYPE public.enum_users_role ADD VALUE IF NOT EXISTS '${role}'`);
  }
}
