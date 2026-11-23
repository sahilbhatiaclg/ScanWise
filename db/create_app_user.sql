/* =====================================================================
   ScanWise - database users for the app and for Power BI
   Run in Azure Data Studio, connected to scanwise_dev as the admin login
   (NOT to master). Run schema.sql first - it creates the roles.
   1) Replace both CHANGE_ME passwords with strong ones of your own.
   2) Put the scanwise_app user/password in backend/.env instead of the admin login.
   ===================================================================== */

-- The Flask API: read/write on dbo + EXECUTE, audit_log cannot be edited (see schema.sql)
IF DATABASE_PRINCIPAL_ID('scanwise_app') IS NULL
    CREATE USER scanwise_app WITH PASSWORD = 'CHANGE_ME_app_Passw0rd!';
GO
ALTER ROLE app_rw ADD MEMBER scanwise_app;
GO

-- Power BI / analytics: read-only on the analytics schema (views only)
IF DATABASE_PRINCIPAL_ID('scanwise_bi') IS NULL
    CREATE USER scanwise_bi WITH PASSWORD = 'CHANGE_ME_bi_Passw0rd!';
GO
ALTER ROLE analytics_reader ADD MEMBER scanwise_bi;
GO

-- Check: should list scanwise_app -> app_rw and scanwise_bi -> analytics_reader
SELECT r.name AS role_name, m.name AS member_name
FROM sys.database_role_members rm
JOIN sys.database_principals r ON r.principal_id = rm.role_principal_id
JOIN sys.database_principals m ON m.principal_id = rm.member_principal_id
WHERE m.name IN ('scanwise_app', 'scanwise_bi');
GO
