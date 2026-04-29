# Database Testing Guide — Outside-In Due Diligence Tool
**Version:** 1.0  
**Date:** 2026-04-29  
**Author:** Alejandro Lupo (QA)  
**Status:** Draft

---

## 1. Overview

This document covers database-level testing for the Outside-In Due Diligence Tool. It addresses:

- How and when to test migrations
- Schema validation assertions
- Factory and seeder usage in tests
- The SQLite (test) vs SQL Server (production) gap and how to manage it
- Manual validation against the SQL Server instance

**Database stack:**

| Environment | Engine | Connection string |
|---|---|---|
| Production / local dev | SQL Server 2022 | `sqlsrv://sa:Hackathon@2026!@sqlserver:1433/hackathon` |
| Automated tests | SQLite `:memory:` | Configured in `phpunit.xml` |

---

## 2. Database Architecture

### 2.1 Migrations

All schema changes live in `database/migrations/` and are applied in filename order.

| Migration file | Tables created |
|---|---|
| `0001_01_01_000000_create_users_table.php` | `users`, `password_reset_tokens`, `sessions` |
| `0001_01_01_000001_create_cache_table.php` | `cache`, `cache_locks` |
| `0001_01_01_000002_create_jobs_table.php` | `jobs`, `job_batches`, `failed_jobs` |

> Future domain migrations (roster uploads, financial snapshots, analysis results) will be added here as the application evolves.

### 2.2 Schema Reference

#### `users`
| Column | Type | Constraints |
|---|---|---|
| `id` | bigint unsigned | PK, auto-increment |
| `name` | varchar(255) | NOT NULL |
| `email` | varchar(255) | NOT NULL, UNIQUE |
| `email_verified_at` | timestamp | nullable |
| `password` | varchar(255) | NOT NULL |
| `remember_token` | varchar(100) | nullable |
| `created_at` | timestamp | nullable |
| `updated_at` | timestamp | nullable |

#### `sessions`
| Column | Type | Constraints |
|---|---|---|
| `id` | varchar(255) | PK |
| `user_id` | bigint unsigned | FK → users.id, nullable, indexed |
| `ip_address` | varchar(45) | nullable |
| `user_agent` | text | nullable |
| `payload` | longtext | NOT NULL |
| `last_activity` | int | NOT NULL, indexed |

#### `password_reset_tokens`
| Column | Type | Constraints |
|---|---|---|
| `email` | varchar(255) | PK |
| `token` | varchar(255) | NOT NULL |
| `created_at` | timestamp | nullable |

---

## 3. Test Database Setup

### 3.1 How SQLite In-Memory Works

PHPUnit bootstraps a fresh SQLite `:memory:` database for every test run. The `RefreshDatabase` trait in Laravel re-runs all migrations before each test class and wraps each test in a transaction that is rolled back on teardown — so tests are fully isolated.

```php
use Illuminate\Foundation\Testing\RefreshDatabase;

class MyTest extends TestCase
{
    use RefreshDatabase;   // runs migrations + rolls back each test

    public function test_something_with_db(): void { ... }
}
```

> **When to use `RefreshDatabase` vs `DatabaseTransactions`:**
> - `RefreshDatabase` — re-migrates the schema. Use when a test creates/alters tables.
> - `DatabaseTransactions` — wraps the test in a transaction, no schema reset. Faster; use for pure data tests.

### 3.2 Accessing the SQL Server Instance

```bash
# Open SQL Server CLI inside the running container
make db

# Or directly via Docker
docker compose exec sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P 'Hackathon@2026!' -d hackathon

# Apply migrations against the real SQL Server
make migrate

# Roll back the last batch of migrations
docker compose exec app php artisan migrate:rollback

# Check migration status
docker compose exec app php artisan migrate:status
```

---

## 4. Migration Tests

Migration tests verify that schema changes apply cleanly and roll back without errors.

```php
// tests/Feature/MigrationTest.php
namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MigrationTest extends TestCase
{
    use RefreshDatabase;

    // TC-DB-001
    public function test_users_table_exists_after_migration(): void
    {
        $this->assertTrue(Schema::hasTable('users'));
    }

    // TC-DB-002
    public function test_sessions_table_exists_after_migration(): void
    {
        $this->assertTrue(Schema::hasTable('sessions'));
    }

    // TC-DB-003
    public function test_cache_table_exists_after_migration(): void
    {
        $this->assertTrue(Schema::hasTable('cache'));
    }

    // TC-DB-004
    public function test_jobs_table_exists_after_migration(): void
    {
        $this->assertTrue(Schema::hasTable('jobs'));
    }

    // TC-DB-005
    public function test_users_table_has_expected_columns(): void
    {
        $expected = ['id', 'name', 'email', 'email_verified_at', 'password', 'remember_token', 'created_at', 'updated_at'];

        foreach ($expected as $column) {
            $this->assertTrue(
                Schema::hasColumn('users', $column),
                "Column 'users.{$column}' is missing."
            );
        }
    }

    // TC-DB-006
    public function test_sessions_table_has_expected_columns(): void
    {
        $expected = ['id', 'user_id', 'ip_address', 'user_agent', 'payload', 'last_activity'];

        foreach ($expected as $column) {
            $this->assertTrue(Schema::hasColumn('sessions', $column));
        }
    }

    // TC-DB-007
    public function test_rollback_drops_users_table(): void
    {
        $this->artisan('migrate:rollback', ['--step' => 1])->assertExitCode(0);

        $this->assertFalse(Schema::hasTable('users'));

        // Re-apply so other tests are not broken
        $this->artisan('migrate')->assertExitCode(0);
    }
}
```

---

## 5. Model Tests

Model tests verify Eloquent behaviour: fillable attributes, relationships, casts, and business logic on the model.

```php
// tests/Unit/UserModelTest.php
namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    use RefreshDatabase;

    // TC-DB-008
    public function test_user_can_be_created_with_factory(): void
    {
        $user = User::factory()->create();

        $this->assertDatabaseHas('users', ['email' => $user->email]);
    }

    // TC-DB-009
    public function test_email_is_unique(): void
    {
        User::factory()->create(['email' => 'test@example.com']);

        $this->expectException(\Illuminate\Database\QueryException::class);

        User::factory()->create(['email' => 'test@example.com']);
    }

    // TC-DB-010
    public function test_password_is_hidden_from_serialization(): void
    {
        $user = User::factory()->make();

        $this->assertArrayNotHasKey('password', $user->toArray());
    }

    // TC-DB-011
    public function test_remember_token_is_hidden_from_serialization(): void
    {
        $user = User::factory()->make();

        $this->assertArrayNotHasKey('remember_token', $user->toArray());
    }

    // TC-DB-012
    public function test_factory_unverified_state_sets_null_verified_at(): void
    {
        $user = User::factory()->unverified()->make();

        $this->assertNull($user->email_verified_at);
    }
}
```

---

## 6. Factory & Seeder Reference

### 6.1 User Factory

```php
// database/factories/UserFactory.php (existing)
User::factory()->create();                    // 1 persisted user
User::factory()->make();                      // 1 in-memory user (no DB)
User::factory()->count(10)->create();         // 10 persisted users
User::factory()->unverified()->create();      // user with null email_verified_at
```

### 6.2 Domain Factories (to be created)

As the application grows, add factories for domain models:

```php
// Example — future RosterUpload factory
RosterUpload::factory()->create([
    'filename'   => 'WorkshopRoster.xlsx',
    'row_count'  => 26,
    'uploaded_by' => User::factory(),
]);
```

### 6.3 Database Seeder

The `DatabaseSeeder` in `database/seeders/DatabaseSeeder.php` is used for local development only (never for test runs). To seed the SQL Server dev instance:

```bash
make migrate          # apply migrations
docker compose exec app php artisan db:seed   # run seeders
```

---

## 7. SQLite vs SQL Server Compatibility

Automated tests use SQLite for speed. SQL Server is the production engine. The following table lists known differences that can cause false positives/negatives:

| Feature | SQLite behavior | SQL Server behavior | Risk |
|---|---|---|---|
| Case-sensitive string comparison | case-insensitive by default | depends on collation (usually case-insensitive) | Low |
| `NVARCHAR` / `NTEXT` types | mapped to TEXT | native Unicode support | Low |
| `DATETIME2` precision | microseconds | 100-nanosecond precision | Very low |
| `UNIQUE` constraint error class | `QueryException` | `QueryException` (same) | None |
| Full-text search (`CONTAINS`, `FREETEXT`) | not supported | supported | High — avoid in SQLite tests |
| Stored procedures | not supported | supported | High — test separately on SQL Server |
| `TOP n` syntax | use `LIMIT n` | use `TOP n` | Medium — use Eloquent, not raw SQL |
| `IDENTITY` columns | auto-increment | IDENTITY(1,1) | Low — Laravel handles transparently |

**Mitigation rules:**
1. Write all queries through Eloquent ORM — never raw SQL with engine-specific syntax.
2. Any query that cannot be expressed in Eloquent must have a dedicated SQL Server integration test (see Section 8).
3. Do not add SQL Server-only features (stored procedures, full-text indexes) without a matching skip annotation on the SQLite test.

---

## 8. SQL Server Integration Tests

For SQL Server-specific behaviour, create an integration test suite that runs only when `DB_CONNECTION=sqlsrv`. Mark these with `@group sqlserver` and skip them in CI unless a real SQL Server is available.

```php
// tests/Feature/SqlServerIntegrationTest.php
namespace Tests\Feature;

use Tests\TestCase;

/**
 * @group sqlserver
 */
class SqlServerIntegrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'sqlsrv') {
            $this->markTestSkipped('SQL Server not available in this environment.');
        }
    }

    // TC-DB-SQL-001
    public function test_migrations_run_cleanly_on_sql_server(): void
    {
        $this->artisan('migrate:fresh')->assertExitCode(0);
        $this->artisan('migrate:rollback', ['--step' => 999])->assertExitCode(0);
        $this->artisan('migrate')->assertExitCode(0);
    }

    // TC-DB-SQL-002
    public function test_unique_constraint_is_enforced_by_sql_server(): void
    {
        \App\Models\User::factory()->create(['email' => 'dup@example.com']);

        $this->expectException(\Illuminate\Database\QueryException::class);

        \App\Models\User::factory()->create(['email' => 'dup@example.com']);
    }
}
```

Run SQL Server integration tests manually:
```bash
docker compose exec app php artisan test --group=sqlserver \
  --env=DB_CONNECTION=sqlsrv \
  --env=DB_DATABASE=hackathon
```

---

## 9. Database Assertion Cheatsheet

Laravel's `TestCase` provides these built-in DB assertions:

```php
// Record exists
$this->assertDatabaseHas('users', ['email' => 'foo@example.com']);

// Record does NOT exist
$this->assertDatabaseMissing('users', ['email' => 'deleted@example.com']);

// Exact row count
$this->assertDatabaseCount('users', 5);

// Soft-deleted record exists in table but is trashed
$this->assertSoftDeleted('users', ['id' => 1]);

// Table exists
$this->assertTrue(\Illuminate\Support\Facades\Schema::hasTable('users'));

// Column exists
$this->assertTrue(\Illuminate\Support\Facades\Schema::hasColumn('users', 'email'));
```

---

## 10. Manual SQL Server Validation Checklist

Run this checklist after every migration batch on the SQL Server dev instance.

```sql
-- 1. Verify all expected tables exist
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND TABLE_CATALOG = 'hackathon'
ORDER BY TABLE_NAME;
-- Expected: cache, cache_locks, failed_jobs, job_batches, jobs,
--           password_reset_tokens, sessions, users

-- 2. Verify users column list
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'users'
ORDER BY ORDINAL_POSITION;

-- 3. Verify users.email unique index exists
SELECT i.name AS index_name, i.is_unique
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.columns c       ON ic.object_id = c.object_id AND ic.column_id = c.column_id
JOIN sys.tables t        ON i.object_id = t.object_id
WHERE t.name = 'users' AND c.name = 'email';
-- Expected: 1 row, is_unique = 1

-- 4. Verify FK on sessions.user_id
SELECT
    fk.name AS fk_name,
    tp.name AS parent_table,
    cp.name AS parent_column,
    tr.name AS referenced_table,
    cr.name AS referenced_column
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
JOIN sys.tables tp  ON fkc.parent_object_id = tp.object_id
JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
JOIN sys.tables tr  ON fkc.referenced_object_id = tr.object_id
JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
WHERE tp.name = 'sessions';
-- Expected: sessions.user_id → users.id

-- 5. Confirm no orphan migration entries
SELECT migration FROM migrations ORDER BY batch, migration;
```

---

## 11. Test IDs Reference

| Test ID | Description | Type |
|---|---|---|
| TC-DB-001 | `users` table exists after migration | Feature (Schema) |
| TC-DB-002 | `sessions` table exists after migration | Feature (Schema) |
| TC-DB-003 | `cache` table exists after migration | Feature (Schema) |
| TC-DB-004 | `jobs` table exists after migration | Feature (Schema) |
| TC-DB-005 | `users` has all expected columns | Feature (Schema) |
| TC-DB-006 | `sessions` has all expected columns | Feature (Schema) |
| TC-DB-007 | Rollback drops `users` table | Feature (Schema) |
| TC-DB-008 | User factory creates persisted record | Unit (Model) |
| TC-DB-009 | `email` UNIQUE constraint is enforced | Unit (Model) |
| TC-DB-010 | `password` hidden from serialization | Unit (Model) |
| TC-DB-011 | `remember_token` hidden from serialization | Unit (Model) |
| TC-DB-012 | Factory `unverified()` sets `email_verified_at` = NULL | Unit (Model) |
| TC-DB-SQL-001 | Migrations apply and roll back on SQL Server | Integration |
| TC-DB-SQL-002 | UNIQUE constraint enforced by SQL Server | Integration |

---

## 12. Related Documents

| Document | Location |
|---|---|
| Master Test Plan | `QA/test-plan.md` |
| Backend Testing Guide | `QA/backend-testing.md` |
| Happy Path Test Cases | `QA/test-cases-happy-path.md` |
| PHPUnit config | `AP.Hackathon.BE/phpunit.xml` |
| Makefile commands | `AP.Hackathon.BE/Makefile` |
| Schema migrations | `AP.Hackathon.BE/database/migrations/` |
