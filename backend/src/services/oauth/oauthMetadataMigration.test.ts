import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../../prisma/migrations/20260815000000_sanitize_oauth_account_metadata/migration.sql",
  import.meta.url,
);

describe("OAuth metadata migration", () => {
  it("replaces metadata only from allowlisted account columns", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    expect(sql).toContain('UPDATE "platform_accounts"');
    expect(sql).toContain("jsonb_strip_nulls");
    expect(sql).toContain('"platform"::text');
    expect(sql).toContain('"external_account_id"');
    expect(sql).toContain('"external_account_name"');
    expect(sql).not.toContain("access_token_encrypted");
    expect(sql).not.toContain("refresh_token_encrypted");
    expect(sql).not.toMatch(/"metadata"\s*(?:->|#>|#>>)/);
  });
});
