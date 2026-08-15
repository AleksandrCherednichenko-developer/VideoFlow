UPDATE "platform_accounts"
SET "metadata" = jsonb_strip_nulls(
  jsonb_build_object(
    'provider', "platform"::text,
    'profile', CASE
      WHEN "external_account_id" IS NOT NULL
        OR "external_account_name" IS NOT NULL
      THEN jsonb_strip_nulls(
        jsonb_build_object(
          'externalAccountId', "external_account_id",
          'externalAccountName', "external_account_name"
        )
      )
      ELSE NULL
    END
  )
);
