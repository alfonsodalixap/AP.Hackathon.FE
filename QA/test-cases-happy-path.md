# Test Cases — Happy Path
**Outside-In Due Diligence Tool**
**Status:** Draft v3 — expandido con lógica real del prototipo
**Last updated:** 2026-04-29
**Author:** Alejandro Lupo (QA)

---

## Referencia de datos de prueba — WorkshopRoster.xlsx

| Columna | Descripción |
|---|---|
| Employ ID | Identificador numérico del empleado |
| Job Title | Título del puesto (texto libre) |
| Job Function | Categoría funcional (ej. Engineering, Finance, Operations) |
| Seniority | Nivel jerárquico (ej. VP, Director, Manager, Staff) |
| Country | País de empleo |
| FLC | Full Labor Cost anual en USD |

---

## Flujo 1 — Análisis de Dotación

### TC-001 — Carga de archivo Excel válido

| Campo | Detalle |
|---|---|
| **Archivo de prueba** | `WorkshopRoster.xlsx` |
| **Precondiciones** | El usuario tiene `WorkshopRoster.xlsx` disponible localmente |
| **Pasos** | 1. Navegar a la pantalla de Análisis de Dotación <br> 2. Seleccionar el modo "Upload" <br> 3. Hacer clic o arrastrar el archivo `WorkshopRoster.xlsx` a la zona de carga <br> 4. Confirmar la carga |
| **Resultado esperado** | El archivo es aceptado. El sistema parsea las columnas, muestra el total de empleados correctamente y habilita la vista de análisis. |

---

### TC-002 — Carga de dotación por pegado desde portapapeles

| Campo | Detalle |
|---|---|
| **Precondiciones** | El usuario tiene los datos del roster copiados en el portapapeles desde una planilla (formato TSV) |
| **Pasos** | 1. Navegar a la pantalla de Análisis de Dotación <br> 2. Seleccionar el modo "Paste" <br> 3. Hacer clic en la zona de pegado <br> 4. Presionar Ctrl+V |
| **Resultado esperado** | El sistema detecta y mapea las columnas automáticamente. Se muestra una tabla de preview con las primeras 4 filas y la cantidad de filas/columnas detectadas. El usuario puede confirmar la carga. |

---

### TC-003 — KPIs de dotación: headcount y costos

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-001 o TC-002 aprobado |
| **Pasos** | 1. Observar la fila de KPIs en la pantalla de Análisis de Dotación |
| **Resultado esperado** | Se muestran correctamente: **Total Headcount** (total de filas del archivo), **Total Labor Spend** (suma de FLC), **Avg Cost/Employee** (Total Labor Spend / Total Headcount), **Median Cost/Employee** (mediana de los valores FLC). Los valores son matemáticamente consistentes entre sí. |

---

### TC-004 — KPIs de dotación: senior ratio y concentración de costos

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-001 o TC-002 aprobado |
| **Pasos** | 1. Observar la segunda fila de KPIs |
| **Resultado esperado** | Se muestran: **Nº de Funciones** (valores únicos de Job Function), **Nº de Países** (valores únicos de Country), **Senior Ratio** (% de headcount con Seniority = VP o Director), **Cost Concentration** (% del gasto total que representa el 25% de empleados de mayor FLC). Los valores son consistentes con los datos del archivo. |

---

### TC-005 — Desglose de headcount por Job Function

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-001 o TC-002 aprobado |
| **Pasos** | 1. Localizar el gráfico de barras "Headcount by Function" |
| **Resultado esperado** | Gráfico de barras horizontales ordenado de mayor a menor. Muestra una barra por cada valor único en Job Function. El total de todas las barras es igual al headcount total. |

---

### TC-006 — Desglose de headcount por Seniority

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-001 o TC-002 aprobado |
| **Pasos** | 1. Localizar el gráfico de barras "Seniority Distribution" |
| **Resultado esperado** | Gráfico de barras horizontales ordenado según la jerarquía organizacional (Executive → VP → Director → Manager → Staff hacia abajo). Muestra una barra por nivel. El total es igual al headcount total. |

---

### TC-007 — Desglose de gasto en personal por función

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-001 o TC-002 aprobado |
| **Pasos** | 1. Localizar el gráfico "Labor Spend by Function" |
| **Resultado esperado** | Gráfico de barras horizontales mostrando el FLC total agrupado por Job Function. El total de todas las barras es igual al Total Labor Spend del KPI. |

---

### TC-008 — Desglose geográfico (tabla de países)

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-001 o TC-002 aprobado |
| **Pasos** | 1. Localizar la tabla de desglose geográfico |
| **Resultado esperado** | Tabla con columnas: País, Headcount, % del Total, Labor Spend. Muestra hasta los 10 países principales. El total de headcount suma correctamente al total general. |

---

## Flujo 2 — Datos Financieros

### TC-009 — Obtener datos financieros por ticker (modo automático SEC EDGAR)

| Campo | Detalle |
|---|---|
| **Precondiciones** | El usuario tiene el ticker de una empresa pública que haya presentado un 10-K (ej. `AAPL`, `MSFT`) |
| **Pasos** | 1. Navegar a la pantalla de Datos Financieros <br> 2. Seleccionar modo "Auto" <br> 3. Ingresar el ticker en el campo de búsqueda <br> 4. Enviar la solicitud |
| **Resultado esperado** | El sistema consulta SEC EDGAR y devuelve: nombre de la empresa, ticker, CIK, año fiscal, Revenue, EBITDA, Operating Income, D&A, Total Expenses y desglose de gastos (Cost of Revenue, R&D, SG&A). Se muestra la fecha del filing y la fuente "SEC EDGAR 10-K". |

---

### TC-010 — Los datos financieros corresponden al 10-K más reciente

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-009 aprobado |
| **Pasos** | 1. Observar el campo de año fiscal y fecha de filing mostrados |
| **Resultado esperado** | Los datos corresponden al filing anual (10-K) más reciente disponible en SEC EDGAR, no a un año anterior. |

---

### TC-011 — Ingresar datos financieros en forma manual

| Campo | Detalle |
|---|---|
| **Precondiciones** | El usuario tiene los datos financieros de la empresa disponibles |
| **Pasos** | 1. Navegar a la pantalla de Datos Financieros <br> 2. Seleccionar modo "Manual" <br> 3. Completar: Company Name, Fiscal Year, Total Revenue, EBITDA, Total Expenses <br> 4. (Opcional) Completar Cost of Revenue, R&D, SG&A <br> 5. Hacer clic en "Save & Apply" |
| **Resultado esperado** | Los datos son aceptados y se muestran en la pantalla. La fuente se muestra como "Manual Entry". El sistema acepta valores con formato de moneda (con `$` y comas). |

---

## Flujo 3 — Análisis Integrado

### TC-012 — Bloqueo de acceso al análisis integrado sin ambas fuentes

| Campo | Detalle |
|---|---|
| **Precondiciones** | Solo una de las dos fuentes está cargada (roster O financials, no ambas) |
| **Pasos** | 1. Intentar navegar a la pantalla de Análisis Integrado |
| **Resultado esperado** | La pantalla muestra un indicador de bloqueo con un checklist indicando qué fuente falta. No es posible acceder al análisis hasta tener ambas. |

---

### TC-013 — Modal de advertencia por desfase de período

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-001/TC-002 y TC-009/TC-011 aprobados. Es la primera vez que el usuario accede al análisis integrado en la sesión. |
| **Pasos** | 1. Navegar a la pantalla de Análisis Integrado |
| **Resultado esperado** | Se muestra un modal "Check your data periods" advirtiendo al usuario que verifique que ambos datasets sean comparables en términos de tiempo. El usuario puede cerrar el modal y continuar. |

---

### TC-014 — KPI: Revenue per Employee

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-013 aprobado (análisis integrado accesible) |
| **Pasos** | 1. Localizar la tarjeta de KPI "Revenue per Employee" |
| **Resultado esperado** | El valor mostrado es igual a `Total Revenue (financials) / Total Headcount (roster)`. El resultado es matemáticamente correcto. |

---

### TC-015 — KPI: Labor Spend como % de Revenue

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-013 aprobado |
| **Pasos** | 1. Localizar la tarjeta de KPI "Labor Spend as % of Revenue" |
| **Resultado esperado** | El valor mostrado es igual a `Total Labor Spend (roster) / Total Revenue (financials) * 100`. Si el resultado es menor a 1%, se muestra con decimales (no como "0%"). |

---

### TC-016 — KPI: EBITDA Margin

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-013 aprobado |
| **Pasos** | 1. Localizar la tarjeta de KPI "EBITDA Margin" |
| **Resultado esperado** | El valor mostrado es igual a `EBITDA (financials) / Total Revenue (financials) * 100`. El resultado es matemáticamente correcto. |

---

### TC-017 — Banner de comparación (resumen de ambas fuentes)

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-013 aprobado |
| **Pasos** | 1. Observar el banner superior de la pantalla de Análisis Integrado |
| **Resultado esperado** | El banner muestra a la izquierda los datos del roster (nombre del archivo, headcount, países) y a la derecha los datos financieros (empresa, año fiscal, revenue, EBITDA margin). El botón "Export to PPT" está visible y habilitado. |

---

### TC-018 — Pirámide de seniority en análisis integrado

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-013 aprobado |
| **Pasos** | 1. Localizar la visualización de pirámide de seniority |
| **Resultado esperado** | Gráfico de barras horizontales ordenado por jerarquía organizacional (niveles más senior arriba). La distribución es consistente con los datos del roster cargado. |

---

### TC-019 — Oportunidades de creación de valor: senior layer rationalization

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-013 aprobado. El roster cargado tiene VP + Director > 20% del headcount total. |
| **Pasos** | 1. Localizar la sección "Value Creation Opportunities" |
| **Resultado esperado** | Se muestra la oportunidad "Senior layer rationalization" con el detalle del porcentaje actual de VP/Director y un impacto estimado calculado como la reducción del 15% de ese grupo multiplicada por su FLC promedio. |

---

### TC-020 — Exportar análisis a PowerPoint

| Campo | Detalle |
|---|---|
| **Precondiciones** | TC-013 aprobado |
| **Pasos** | 1. Hacer clic en el botón "Export to PPT" en el banner superior |
| **Resultado esperado** | Se genera y descarga un archivo `.pptx` con las slides del análisis integrado. El archivo se descarga correctamente en el navegador. |

---

## Preguntas abiertas (confirmar con el equipo dev)

| # | Pregunta | Impacta en |
|---|---|---|
| 1 | ¿Qué columnas exactas del Excel son obligatorias vs opcionales para el parseo? | TC-001, TC-002 |
| 2 | ¿El FLC se usa directamente como-es o hay alguna transformación? | TC-003, TC-007 |
| 3 | ¿Qué sucede si SEC EDGAR no devuelve respuesta dentro de los 15 segundos — hay fallback automático a manual? | TC-009 |
| 4 | ¿La lógica de Value Creation Opportunities se aplica también cuando los datos son ingresados manualmente? | TC-019 |
| 5 | ¿El PPT export incluye también datos del roster o solo el análisis integrado? | TC-020 |
