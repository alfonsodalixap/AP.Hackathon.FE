# Test Plan — Outside-In Due Diligence Tool
**Versión:** 1.0
**Fecha:** 2026-04-29
**Autor:** Alejandro Lupo (QA)
**Estado:** Draft

---

## 1. Introducción

### 1.1 Propósito
Este documento describe la estrategia de testing para el **Outside-In Due Diligence Tool**, una aplicación que permite a practitioners cargar datos de dotación (LinkedIn export) y obtener datos financieros (10-K de SEC EDGAR), combinándolos en un análisis integrado para engagements de M&A.

### 1.2 Alcance
La aplicación se compone de tres flujos principales:
- **Flujo 1 — Análisis de Dotación:** carga de Excel o pegado desde portapapeles, KPIs de headcount y labor spend, visualizaciones por función / seniority / país.
- **Flujo 2 — Datos Financieros:** obtención automática vía SEC EDGAR o ingreso manual de Revenue, EBITDA y Expenses.
- **Flujo 3 — Análisis Integrado:** combinación de ambas fuentes, KPIs cruzados, oportunidades de valor, exportación a PowerPoint.

### 1.3 Fuera de alcance
- Testing de infraestructura y DevOps (Docker, Nginx, SQL Server)
- Testing de seguridad y penetration testing
- Testing de carga / stress (por tratarse de un hackathon con usuarios simultáneos limitados)
- Compatibilidad con versiones de browser anteriores a 2023

---

## 2. Stack tecnológico relevante para QA

| Capa | Tecnología |
|---|---|
| Frontend | React 19 / TypeScript / Vite (producción); Alpine.js + Chart.js (prototipo) |
| Backend | Python FastAPI (prototipo) / PHP Laravel 13 (producción) |
| Base de datos | SQL Server 2022 |
| Automatización | **Playwright** |
| Accessibility | **axe-core** (integrado con Playwright) |
| API externa | SEC EDGAR (data.sec.gov) |

---

## 3. Tipos de testing

### 3.1 Testing funcional
Validación de los flujos de negocio, KPIs y reglas de navegación.
Referencia: `test-cases-happy-path.md` (TC-001 a TC-020).

### 3.2 Testing de automatización (Playwright)
Ver sección 5.

### 3.3 Testing de API
Validación directa de los endpoints del backend:
- `POST /api/roster/analyze`
- `GET /api/financials/{ticker}`
- `GET /api/health`

### 3.5 Testing exploratorio
Sesiones libres para descubrir comportamientos no especificados, especialmente en el parseo de archivos y la generación de narrativa AI.

### 3.6 Testing de compatibilidad
Verificación en los browsers de uso esperado por los practitioners de AlixPartners.

---

## 4. Entornos de testing

| Entorno | Descripción | URL |
|---|---|---|
| Local (prototipo) | FastAPI + HTML estático corriendo localmente | `http://localhost:8000` |
| Local (producción) | Laravel + React corriendo en Docker | `http://localhost` |
| Staging | TBD — a definir con el equipo | — |

---

## 5. Estrategia de automatización con Playwright

### 5.1 Criterios de selección

Un caso se automatiza si cumple al menos dos de estos criterios:
- Es parte del happy path crítico (la app no funciona sin él)
- Es un cálculo numérico verificable con precisión
- Es una regla de negocio que puede romperse silenciosamente con un refactor
- Se ejecuta en cada ciclo de regression

### 5.2 Qué SE automatiza

| TC | Caso | Motivo |
|---|---|---|
| TC-001 | Carga de archivo Excel | Happy path crítico; Playwright soporta `setInputFiles()` nativamente |
| TC-003 | KPIs de headcount y costos | Cálculos numéricos verificables con exactitud |
| TC-004 | KPIs de senior ratio y cost concentration | Reglas de negocio que pueden romperse silenciosamente |
| TC-005 | Headcount por función | Consistencia de totales — fácil de assertions |
| TC-006 | Headcount por seniority | Ídem + orden jerárquico verificable |
| TC-007 | Labor spend por función | Totales numéricos verificables |
| TC-008 | Tabla geográfica | Estructura de tabla verificable con `getByRole` |
| TC-011 | Ingreso manual de datos financieros | Formulario con validación — candidato fuerte para automation |
| TC-012 | Bloqueo de navegación sin ambas fuentes | Regla de negocio crítica; estado de UI verificable |
| TC-013 | Modal de advertencia por desfase de período | Aparición condicional del modal — verificable con `toBeVisible()` |
| TC-014 | KPI Revenue per Employee | Cálculo cruzado de fuentes — alta probabilidad de regresión |
| TC-015 | KPI Labor Spend % of Revenue | Ídem + edge case del "0%" con decimales |
| TC-016 | KPI EBITDA Margin | Cálculo numérico verificable |
| TC-017 | Banner de comparación | Presencia de datos de ambas fuentes en un mismo componente |

### 5.3 Qué NO se automatiza (y por qué)

| TC | Caso | Motivo |
|---|---|---|
| TC-002 | Pegado desde portapapeles | El acceso al portapapeles en Playwright requiere permisos de contexto del browser; es frágil y dependiente del OS — mejor cubrirlo manualmente |
| TC-009 | Fetch automático SEC EDGAR | Dependencia de API externa; puede fallar por rate limits, timeouts o cambios en el schema de SEC EDGAR. Se mockea en unit tests del backend; no en e2e |
| TC-010 | Verificar que sea el 10-K más reciente | Depende de datos reales que cambian con el tiempo — no es estable como assertion automatizada |
| TC-018 | Pirámide de seniority (visual) | La correctitud del gráfico (Chart.js canvas) no es verificable con assertions DOM estándar — requiere visual regression testing o revisión manual |
| TC-019 | Value Creation Opportunities | Requiere datasets de prueba con condiciones específicas (VP+Director > 20%); mejor cubierto manualmente con datos controlados |
| TC-020 | Export a PowerPoint | El archivo `.pptx` es binario — verificar contenido requiere parseo especializado; se limita a verificar que la descarga ocurre |

### 5.4 Estructura sugerida del proyecto Playwright

```
tests/
├── fixtures/
│   ├── WorkshopRoster.xlsx          # archivo de prueba
│   └── financials-manual.json       # datos financieros de prueba
├── e2e/
│   ├── roster-analysis.spec.ts      # TC-001, TC-003 a TC-008
│   ├── financial-data.spec.ts       # TC-011
│   └── integrated-analysis.spec.ts  # TC-012 a TC-017
├── helpers/
│   └── setup.ts                     # beforeEach, login si aplica
└── playwright.config.ts
```

### 5.5 Configuración recomendada

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'edge',     use: { ...devices['Desktop Edge'] } },
  ],
});
```

### 5.6 Ejemplo de test automatizado (referencia)

```typescript
// roster-analysis.spec.ts
test('TC-003 — KPIs de headcount y costos son consistentes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /upload/i }).click();
  await page.locator('input[type="file"]').setInputFiles('fixtures/WorkshopRoster.xlsx');
  await page.getByRole('button', { name: /confirm/i }).click();

  const headcount = await page.getByTestId('kpi-total-headcount').textContent();
  const laborSpend = await page.getByTestId('kpi-total-labor-spend').textContent();
  const avgCost   = await page.getByTestId('kpi-avg-cost').textContent();

  // Los valores deben ser numéricamente consistentes
  const n  = parseFloat(headcount!.replace(/\D/g, ''));
  const ls = parseFloat(laborSpend!.replace(/[\$,]/g, ''));
  const avg = parseFloat(avgCost!.replace(/[\$,]/g, ''));

  expect(Math.round(ls / n)).toBeCloseTo(avg, -2); // tolerancia de $100
});
```

---

## 6. Testing de API (backend)

### 7.1 Endpoint: POST /api/roster/analyze

| Caso | Input | Expected |
|---|---|---|
| Happy path | Excel válido con todas las columnas | 200 + JSON con todos los campos de agregación |
| Columna faltante | Excel sin columna `Seniority` | 422 con mensaje de error indicando la columna faltante |
| Formato inválido | Archivo `.pdf` | 400 con mensaje de error de formato |
| Columnas con nombres alternativos | Excel con `"Seniority Level"` en vez de `"Seniority"` | 200 — el fuzzy matching debe resolverlo |

### 7.2 Endpoint: GET /api/financials/{ticker}

| Caso | Input | Expected |
|---|---|---|
| Ticker válido | `AAPL` | 200 + JSON con datos del 10-K más reciente |
| Ticker inválido | `XXXXX` | 404 con mensaje claro |
| SEC EDGAR no disponible | (mock de timeout) | 502 con mensaje de fallback a ingreso manual |

### 7.3 Herramientas sugeridas
- **Playwright API testing** (usando `request` fixture) para tests integrados
- **Postman / Bruno** para exploración y documentación manual

---

## 8. Testing de compatibilidad de browsers

| Browser | Versión mínima | Prioridad |
|---|---|---|
| Google Chrome | Último estable | Alta |
| Microsoft Edge | Último estable | Alta |
| Mozilla Firefox | Último estable | Media |
| Safari | Último estable | Baja |

**Resoluciones a verificar:** 1920×1080 (desktop estándar), 1366×768 (laptop corporativo típico).
**Mobile:** fuera de alcance para este hackathon.

---

## 9. Criterios de entrada y salida

### 9.1 Criterios de entrada (para iniciar testing)
- El ambiente local está levantado y accesible
- Los 20 TCs de happy path tienen su implementación correspondiente
- El archivo de prueba `WorkshopRoster.xlsx` está disponible en `QA/`
- Los tests de Playwright están configurados y corren sin errores de setup

### 9.2 Criterios de salida (para dar por aprobada una release)
- 100% de los TCs de happy path (TC-001 a TC-020) aprobados
- 0 violaciones de accesibilidad críticas (`critical`) o graves (`serious`) detectadas por axe-core
- Tests automatizados de Playwright corriendo en CI sin flakiness
- Todos los endpoints de API responden correctamente para los casos happy path
- No hay regresiones visuales en las pantallas principales respecto a la última versión aprobada

---

## 10. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| SEC EDGAR cambia su schema de respuesta | Media | Alto | Mockear la API en los tests de e2e; el backend debe tener manejo de errores robusto |
| Los gráficos de Chart.js renderizan incorrectamente en algunos browsers | Media | Medio | Verificación manual en cada browser objetivo |
| El fuzzy matching de columnas del Excel falla con variantes no previstas | Alta | Alto | Documentar y probar todas las variantes de nombres de columna conocidas |
| El export a PPT genera un archivo corrupto | Baja | Alto | Verificar la descarga + abrir el archivo manualmente en cada ciclo de regression |
| La narrativa AI devuelve respuestas inconsistentes | Alta | Bajo | No automatizar — cubrir manualmente verificando que la UI maneja loading/error states correctamente |

---

## 11. Datos de prueba

| Archivo | Descripción | Ubicación |
|---|---|---|
| `WorkshopRoster.xlsx` | Roster de 26 empleados, 2 países, 9 funciones, columna FLC | `QA/WorkshopRoster.xlsx` |
| Datos financieros manuales (TBD) | JSON con Revenue/EBITDA/Expenses de empresa de prueba | `QA/fixtures/` (a crear) |
| Tickers para prueba | `AAPL` (Apple), `MSFT` (Microsoft) | — |

---

## 12. Documentos relacionados

| Documento | Ubicación |
|---|---|
| Test Cases — Happy Path | `QA/test-cases-happy-path.md` |
| Test Cases — Happy Path (Excel ES) | `QA/test-cases-happy-path-es.xlsx` |
| Test Cases — Happy Path (Excel EN) | `QA/test-cases-happy-path.xlsx` |
| Roster de prueba | `QA/WorkshopRoster.xlsx` |
