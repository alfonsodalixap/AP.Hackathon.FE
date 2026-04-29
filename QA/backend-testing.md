# Backend Testing Guide — Outside-In Due Diligence Tool
**Version:** 1.0  
**Date:** 2026-04-29  
**Author:** Alejandro Lupo (QA)  
**Status:** Draft

---

## 1. Overview

This document describes the backend testing strategy and conventions for the Laravel 13 / PHP 8.4 API. It covers unit tests, feature (integration) tests, and API contract validation for the three core endpoints powering the Outside-In Due Diligence Tool.

**Stack at a glance:**

| Component | Technology |
|---|---|
| Framework | Laravel 13 |
| Language | PHP 8.4 |
| Test runner | PHPUnit 12.5.12 |
| Test database | SQLite (`:memory:`) |
| Production database | SQL Server 2022 |
| Container orchestration | Docker Compose |

---

## 2. Test Environment Setup

### 2.1 Prerequisites

- Docker Desktop running
- Project cloned at `AP.Hackathon.BE/`
- `.env` copied from `.env.example`

### 2.2 First-time Setup

```bash
cd AP.Hackathon.BE
make build       # Build Docker images (PHP 8.4 + Nginx + SQL Server)
make install     # composer install + migrate + generate app key
make up          # Start all containers
```

### 2.3 Running Tests

```bash
# Run the full test suite
make test

# Run with coverage report (HTML output at coverage/)
make test-coverage

# Run only Unit tests
docker compose exec app php artisan test --testsuite=Unit

# Run only Feature tests
docker compose exec app php artisan test --testsuite=Feature

# Run a single test file
docker compose exec app php artisan test tests/Feature/RosterAnalysisTest.php

# Run a single test method
docker compose exec app php artisan test --filter test_analyze_returns_correct_headcount_kpi
```

### 2.4 Test Configuration

PHPUnit is configured in `phpunit.xml`. Key testing environment overrides:

| Variable | Test Value | Reason |
|---|---|---|
| `APP_ENV` | `testing` | Disables certain middleware and cache |
| `DB_CONNECTION` | `sqlite` | Fast in-memory DB (no SQL Server needed) |
| `DB_DATABASE` | `:memory:` | Isolated, reset after every test |
| `CACHE_STORE` | `array` | No Redis/file side-effects |
| `QUEUE_CONNECTION` | `sync` | Jobs execute immediately in tests |
| `SESSION_DRIVER` | `array` | No file I/O |
| `BCRYPT_ROUNDS` | `4` | Faster password hashing in tests |

> **Note:** Tests run against SQLite in-memory, not SQL Server. See [Database Testing Guide](database-testing.md) for SQL Server-specific validation.

---

## 3. Test Structure

```
tests/
├── Feature/                        # HTTP-level integration tests
│   ├── ExampleTest.php             # Laravel scaffold example
│   ├── HealthCheckTest.php         # GET /api/health
│   ├── RosterAnalysisTest.php      # POST /api/roster/analyze
│   └── FinancialsTest.php          # GET /api/financials/{ticker}
├── Unit/                           # Isolated service/logic tests
│   ├── ExampleTest.php             # Laravel scaffold example
│   ├── RosterParserTest.php        # Excel parsing logic
│   ├── KpiCalculatorTest.php       # KPI computation rules
│   └── FinancialsMapperTest.php    # SEC EDGAR response mapping
└── TestCase.php                    # Base class (extends Laravel's)
```

> **Convention:** Feature tests test HTTP request → response. Unit tests test a single class in isolation (no database, no HTTP).

---

## 4. Unit Tests

Unit tests live in `tests/Unit/` and test one class at a time. External dependencies (HTTP clients, DB) must be mocked.

### 4.1 KPI Calculator

```php
// tests/Unit/KpiCalculatorTest.php
namespace Tests\Unit;

use App\Services\KpiCalculator;
use Tests\TestCase;

class KpiCalculatorTest extends TestCase
{
    private KpiCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new KpiCalculator();
    }

    public function test_headcount_equals_row_count(): void
    {
        $roster = $this->makeRoster(rows: 42);

        $kpis = $this->calculator->compute($roster);

        $this->assertSame(42, $kpis['total_headcount']);
    }

    public function test_labor_spend_sums_flc_column(): void
    {
        $roster = [
            ['FLC' => 120_000],
            ['FLC' => 80_000],
            ['FLC' => 100_000],
        ];

        $kpis = $this->calculator->compute($roster);

        $this->assertSame(300_000, $kpis['total_labor_spend']);
    }

    public function test_function_distribution_groups_by_job_function(): void
    {
        $roster = [
            ['Job Function' => 'Engineering'],
            ['Job Function' => 'Engineering'],
            ['Job Function' => 'Finance'],
        ];

        $kpis = $this->calculator->compute($roster);

        $this->assertSame(
            ['Engineering' => 2, 'Finance' => 1],
            $kpis['by_function']
        );
    }

    public function test_average_labor_cost_rounds_to_two_decimals(): void
    {
        $roster = [
            ['FLC' => 100_001],
            ['FLC' => 100_002],
        ];

        $kpis = $this->calculator->compute($roster);

        $this->assertSame(100_001.50, $kpis['avg_labor_cost']);
    }

    // ── helpers ──────────────────────────────────────────────────────────
    private function makeRoster(int $rows): array
    {
        return array_fill(0, $rows, [
            'Employ ID'    => 'EMP001',
            'Job Title'    => 'Analyst',
            'Job Function' => 'Finance',
            'Seniority'    => 'Junior',
            'Country'      => 'US',
            'FLC'          => 90_000,
        ]);
    }
}
```

### 4.2 Roster Parser

```php
// tests/Unit/RosterParserTest.php
namespace Tests\Unit;

use App\Services\RosterParser;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class RosterParserTest extends TestCase
{
    public function test_parse_returns_array_of_rows(): void
    {
        $file = UploadedFile::fake()->createWithContent(
            'roster.xlsx',
            file_get_contents(base_path('tests/fixtures/WorkshopRoster.xlsx'))
        );

        $rows = (new RosterParser())->parse($file);

        $this->assertIsArray($rows);
        $this->assertNotEmpty($rows);
        $this->assertArrayHasKey('Employ ID', $rows[0]);
    }

    public function test_parse_throws_on_missing_required_column(): void
    {
        $this->expectException(\App\Exceptions\InvalidRosterException::class);
        $this->expectExceptionCode(422);

        $file = UploadedFile::fake()->createWithContent(
            'bad.xlsx',
            $this->makeXlsxWithoutColumn('FLC')
        );

        (new RosterParser())->parse($file);
    }

    public function test_parse_trims_whitespace_from_string_fields(): void
    {
        // Roster rows with leading/trailing spaces in Job Title
        $rows = (new RosterParser())->parseFromArray([
            ['Employ ID' => 'E001', 'Job Title' => '  Analyst  ', 'FLC' => '90000'],
        ]);

        $this->assertSame('Analyst', $rows[0]['Job Title']);
    }
}
```

### 4.3 Financials Mapper

```php
// tests/Unit/FinancialsMapperTest.php
namespace Tests\Unit;

use App\Services\FinancialsMapper;
use Tests\TestCase;

class FinancialsMapperTest extends TestCase
{
    public function test_maps_sec_edgar_response_to_dto(): void
    {
        $edgarPayload = json_decode(
            file_get_contents(base_path('tests/fixtures/sec-edgar-aapl.json')),
            true
        );

        $dto = (new FinancialsMapper())->map($edgarPayload);

        $this->assertSame('AAPL', $dto->ticker);
        $this->assertIsNumeric($dto->revenue);
        $this->assertIsNumeric($dto->ebitda);
        $this->assertIsNumeric($dto->totalExpenses);
        $this->assertIsNumeric($dto->depreciationAmortization);
    }

    public function test_mapper_returns_null_for_missing_fields(): void
    {
        $dto = (new FinancialsMapper())->map(['facts' => []]);

        $this->assertNull($dto->revenue);
        $this->assertNull($dto->ebitda);
    }
}
```

---

## 5. Feature Tests (API Endpoints)

Feature tests live in `tests/Feature/` and make actual HTTP requests against the full Laravel application stack. The database is refreshed between tests via the `RefreshDatabase` trait.

### 5.1 Health Check — `GET /api/health`

```php
// tests/Feature/HealthCheckTest.php
namespace Tests\Feature;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_health_returns_200(): void
    {
        $this->getJson('/api/health')
             ->assertStatus(200)
             ->assertJsonStructure(['status', 'timestamp']);
    }

    public function test_health_status_is_ok(): void
    {
        $this->getJson('/api/health')
             ->assertJson(['status' => 'ok']);
    }
}
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-29T12:00:00Z"
}
```

---

### 5.2 Roster Analysis — `POST /api/roster/analyze`

#### Happy Path

```php
// tests/Feature/RosterAnalysisTest.php
namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class RosterAnalysisTest extends TestCase
{
    // TC-BE-001
    public function test_analyze_accepts_valid_xlsx_and_returns_kpis(): void
    {
        $file = UploadedFile::fake()->createWithContent(
            'roster.xlsx',
            file_get_contents(base_path('tests/fixtures/WorkshopRoster.xlsx'))
        );

        $this->postJson('/api/roster/analyze', ['file' => $file])
             ->assertStatus(200)
             ->assertJsonStructure([
                 'total_headcount',
                 'total_labor_spend',
                 'avg_labor_cost',
                 'by_function',
                 'by_seniority',
                 'by_country',
             ]);
    }

    // TC-BE-002
    public function test_analyze_returns_correct_headcount_for_workshop_fixture(): void
    {
        $file = UploadedFile::fake()->createWithContent(
            'roster.xlsx',
            file_get_contents(base_path('tests/fixtures/WorkshopRoster.xlsx'))
        );

        $response = $this->postJson('/api/roster/analyze', ['file' => $file]);

        // WorkshopRoster.xlsx has 26 employees
        $response->assertJsonPath('total_headcount', 26);
    }

    // TC-BE-003
    public function test_analyze_returns_correct_country_breakdown(): void
    {
        $file = UploadedFile::fake()->createWithContent(
            'roster.xlsx',
            file_get_contents(base_path('tests/fixtures/WorkshopRoster.xlsx'))
        );

        $response = $this->postJson('/api/roster/analyze', ['file' => $file]);

        // WorkshopRoster.xlsx covers 2 countries
        $this->assertCount(2, $response->json('by_country'));
    }
}
```

#### Error Scenarios

```php
    // TC-BE-004
    public function test_analyze_returns_422_when_file_missing(): void
    {
        $this->postJson('/api/roster/analyze', [])
             ->assertStatus(422)
             ->assertJsonValidationErrorFor('file');
    }

    // TC-BE-005
    public function test_analyze_returns_422_when_required_column_missing(): void
    {
        $fileWithoutFlc = UploadedFile::fake()->createWithContent(
            'bad.xlsx',
            $this->makeMissingColumnFixture('FLC')
        );

        $this->postJson('/api/roster/analyze', ['file' => $fileWithoutFlc])
             ->assertStatus(422)
             ->assertJsonPath('error.code', 'MISSING_COLUMN');
    }

    // TC-BE-006
    public function test_analyze_returns_400_for_non_xlsx_file(): void
    {
        $csv = UploadedFile::fake()->create('roster.csv', 1, 'text/csv');

        $this->postJson('/api/roster/analyze', ['file' => $csv])
             ->assertStatus(400)
             ->assertJsonPath('error.code', 'INVALID_FILE_FORMAT');
    }

    // TC-BE-007
    public function test_analyze_returns_400_for_empty_xlsx(): void
    {
        $empty = UploadedFile::fake()->create('empty.xlsx', 0, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $this->postJson('/api/roster/analyze', ['file' => $empty])
             ->assertStatus(400)
             ->assertJsonPath('error.code', 'EMPTY_FILE');
    }
```

**Expected response shape (200):**
```json
{
  "total_headcount": 26,
  "total_labor_spend": 2340000,
  "avg_labor_cost": 90000.00,
  "by_function": {
    "Engineering": 8,
    "Finance": 5,
    "Sales": 6,
    "Operations": 7
  },
  "by_seniority": {
    "Senior": 10,
    "Mid": 9,
    "Junior": 7
  },
  "by_country": {
    "US": 18,
    "UK": 8
  }
}
```

**Expected error response shape (4xx):**
```json
{
  "error": {
    "code": "MISSING_COLUMN",
    "message": "Required column 'FLC' not found in the uploaded file.",
    "details": { "missing_columns": ["FLC"] }
  }
}
```

---

### 5.3 Financials — `GET /api/financials/{ticker}`

#### Happy Path

```php
// tests/Feature/FinancialsTest.php
namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FinancialsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Fake SEC EDGAR so tests never hit the real API
        Http::fake([
            'data.sec.gov/*' => Http::response(
                json_decode(
                    file_get_contents(base_path('tests/fixtures/sec-edgar-aapl.json')),
                    true
                ),
                200
            ),
        ]);
    }

    // TC-BE-008
    public function test_financials_returns_200_for_valid_ticker(): void
    {
        $this->getJson('/api/financials/AAPL')
             ->assertStatus(200)
             ->assertJsonStructure([
                 'ticker',
                 'revenue',
                 'ebitda',
                 'total_expenses',
                 'depreciation_amortization',
                 'fiscal_year',
             ]);
    }

    // TC-BE-009
    public function test_financials_ticker_is_case_insensitive(): void
    {
        $lower = $this->getJson('/api/financials/aapl')->json();
        $upper = $this->getJson('/api/financials/AAPL')->json();

        $this->assertSame($lower['ticker'], $upper['ticker']);
        $this->assertSame($lower['revenue'], $upper['revenue']);
    }

    // TC-BE-010
    public function test_financials_returns_404_for_unknown_ticker(): void
    {
        Http::fake([
            'data.sec.gov/*' => Http::response([], 404),
        ]);

        $this->getJson('/api/financials/XXXXXXXXXXX')
             ->assertStatus(404)
             ->assertJsonPath('error.code', 'TICKER_NOT_FOUND');
    }

    // TC-BE-011
    public function test_financials_returns_502_when_sec_edgar_is_down(): void
    {
        Http::fake([
            'data.sec.gov/*' => Http::response([], 503),
        ]);

        $this->getJson('/api/financials/AAPL')
             ->assertStatus(502)
             ->assertJsonPath('error.code', 'UPSTREAM_UNAVAILABLE');
    }

    // TC-BE-012
    public function test_financials_returns_422_for_invalid_ticker_format(): void
    {
        $this->getJson('/api/financials/123INVALID!!!')
             ->assertStatus(422)
             ->assertJsonPath('error.code', 'INVALID_TICKER');
    }
}
```

**Expected response shape (200):**
```json
{
  "ticker": "AAPL",
  "fiscal_year": 2024,
  "revenue": 391035000000,
  "ebitda": 130000000000,
  "total_expenses": 261035000000,
  "depreciation_amortization": 11445000000
}
```

---

## 6. Test Fixtures

Place fixture files in `tests/fixtures/` (create this directory):

| File | Purpose |
|---|---|
| `WorkshopRoster.xlsx` | 26-employee roster with 2 countries, 9 functions |
| `sec-edgar-aapl.json` | Mocked SEC EDGAR response for AAPL |
| `sec-edgar-empty.json` | SEC EDGAR response with no financial facts |
| `roster-missing-flc.xlsx` | Roster file missing the FLC column |
| `roster-empty.xlsx` | Valid XLSX with header row only (no data) |

Copy `WorkshopRoster.xlsx` from the `QA/` folder:
```bash
cp QA/WorkshopRoster.xlsx AP.Hackathon.BE/tests/fixtures/WorkshopRoster.xlsx
```

---

## 7. API Contract Summary

| Endpoint | Method | Success | Client Error | Server Error |
|---|---|---|---|---|
| `/api/health` | GET | 200 | — | 500 |
| `/api/roster/analyze` | POST | 200 | 400 / 422 | 500 |
| `/api/financials/{ticker}` | GET | 200 | 404 / 422 | 502 / 500 |

### Common Response Headers

All API responses must include:

```
Content-Type: application/json
X-Request-ID: <uuid>
```

---

## 8. Test Coverage Targets

| Layer | Target |
|---|---|
| Service classes (`app/Services/`) | ≥ 90% line coverage |
| Controllers (`app/Http/Controllers/`) | ≥ 80% line coverage |
| Models (`app/Models/`) | ≥ 70% line coverage |
| Overall | ≥ 80% line coverage |

Generate coverage report:
```bash
make test-coverage
# HTML report → coverage/index.html
```

---

## 9. HTTP Faking Rules

When writing feature tests that touch external HTTP calls (SEC EDGAR):

1. **Always** use `Http::fake()` in the test's `setUp()` or at the start of the test method.
2. **Never** let tests hit `data.sec.gov` in CI — add `HTTP_FAKE_ALL=true` to the CI `.env.testing`.
3. Store sample payloads as JSON fixtures in `tests/fixtures/` (not inline strings).

```php
// Good — isolated, deterministic
Http::fake([
    'data.sec.gov/submissions/*' => Http::response($this->edgarPayload(), 200),
]);

// Bad — hits the real internet
// (no Http::fake call — DO NOT do this)
```

---

## 10. Running in CI

The `phpunit.xml` configuration is already CI-ready. Add the following step to your pipeline:

```yaml
# GitHub Actions example
- name: Run PHPUnit
  run: docker compose exec -T app php artisan test --parallel

- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    files: coverage/clover.xml
```

---

## 11. Related Documents

| Document | Location |
|---|---|
| Master Test Plan | `QA/test-plan.md` |
| Happy Path Test Cases | `QA/test-cases-happy-path.md` |
| Database Testing Guide | `QA/database-testing.md` |
| Makefile commands | `AP.Hackathon.BE/Makefile` |
| PHPUnit config | `AP.Hackathon.BE/phpunit.xml` |
