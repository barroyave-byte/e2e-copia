# Pedido de acceso: ai-heal (`serviceInvestigator`) → SRE Agent vía LiteLLM `company_ai`

**Estado:** pendiente de aprobación de SRE / AI Platform.
**Dueño del pedido:** QA / Payment Integration (ai-heal).
**Dueño de la decisión:** dueño de política de `services/litellm` + dueño del SRE Agent (`owner: sre`
en `policy/mcp-tools.staging.json`).

## Qué se pide

Un **LiteLLM workload team** dedicado a ai-heal, con una **virtual key MCP-only** en el secret store,
con grants sobre el server `prod_sre_agent` limitados a cuatro tools:

| Tool | Riesgo declarado | Tier actual |
|---|---|---|
| `sre_agent_capabilities` | `read_only` | ai-readonly+ |
| `rca_session_run` | `local_write` | ai-operator (`operator_entitlement`) |
| `rca_session_investigate` | `external_read` | ai-operator (`operator_entitlement`) |
| `artifact_read` | `read_only` | ai-operator (`operator_entitlement`) |

Sin acceso a modelos (`models: []`, ai-heal usa sus propias keys de OpenAI/Anthropic), sin
`prod_repograph`, sin `grafana_cloud_api_query`, sin `cloud_readonly_*`.

> **`team_id` y `principal_id` no son cosméticos — el SRE Agent los valida exactamente.**
> `internal/toolmcp/http_auth.go` compara el JWT de delegación contra
> `SRE_AGENT_MCP_ALLOWED_WORKLOAD_IDENTITIES`, cuyo formato es `service:<subject>=<actor>`. Por el
> precedente ya desplegado (`service:aws-devops-agent=aws-devops-agent-repograph`, cuyo team tiene
> `team_id: aws-devops-agent-repograph` y `principal_id: service:aws-devops-agent`), el mapeo es
> **subject = `metadata.principal_id`, actor = `team_id`**. La entrada desplegada para nosotros es
> `service:ai-heal=ai-heal`, así que el team debe tener `team_id: "ai-heal"` y
> `principal_id: "service:ai-heal"`, literales. Cualquier otro nombre hace fallar `validateJWT` con
> 401 (este doc pedía `e2e-ai-heal` hasta el 2026-08-14; era incorrecto).

Forma propuesta del team, calcada del precedente ya aprobado `aws-devops-agent-repograph`
(`sre-dev-portal/services/litellm/rbac/teams.staging.json`):

```json
{
  "team_id": "ai-heal",
  "team_alias": "E2E ai-heal",
  "models": [],
  "max_budget": 0,
  "budget_duration": "30d",
  "rpm_limit": 30,
  "tpm_limit": 100000,
  "mcp_rpm_limit": { "prod_sre_agent": 20 },
  "object_permission": {
    "mcp_access_groups": ["company_ai"],
    "mcp_tool_permissions": {
      "prod_sre_agent": [
        "sre_agent_capabilities",
        "rca_session_run",
        "rca_session_investigate",
        "artifact_read"
      ]
    }
  },
  "metadata": {
    "managed_by": "deuna-central-ai",
    "principal_type": "workload",
    "principal_id": "service:ai-heal",
    "principal_email": "ai-heal@deuna.com",
    "owner": "qa-payment-integration"
  }
}
```

## Para qué

ai-heal (`jul-ia-n/heal.ts`) clasifica los fallos de la regresión E2E y, cuando el fallo pinta a bug de
servicio (`bugLocation='service'`), despacha el subagente `serviceInvestigator`. Hoy ese subagente
produce un RCA con lo que ve desde el test (trace, network calls, IDs). Con estas tools produce un RCA
apoyado en evidencia de runtime real, y ese texto va directo a la columna "AI Proposed Solution" del
`release.csv` que lee el equipo dueño del servicio. El objetivo es que el equipo de servicio reciba
una hipótesis con evidencia citada en vez de "revisar telemetría".

Volumen esperado: solo los leaders con `bugLocation='service'` de cada corrida de regresión — orden de
unidades a decenas de casos por release, no por hora.

## Impacto y riesgo

- **`rca_session_investigate` hace lecturas vivas** (CloudWatch/Grafana) con credenciales del servidor.
  El cambio real de postura es que quien las dispara pasa a ser un pipeline desatendido, no un humano
  con sesión de 1h. Es la parte que necesita aprobación explícita, no la key.
- **Sin mutación**: ninguna de las cuatro tools muta estado de aplicación o de cloud.
  `playwright_test_run` es `denied_company_ai` y no se pide.
- **Sin credencial de empleado**: la key es de workload, vive en el secret store y no se distribuye.
  No se reutiliza ninguna sesión de `deuna-ai`.
- **Alcance de cuenta**: los escenarios se arman con `environment=staging` / `accountAlias=dev`
  (`790714449507`) por defecto. Producción/compliance requiere override explícito por env var.

## Controles del lado ai-heal (ya implementados)

- Transporte único: gateway `company_ai`. `tools/prodSreAgentClient.ts` no tiene fallback al endpoint
  directo del SRE Agent ni flujo OAuth interactivo; sin key falla de inmediato con mensaje explícito.
- Concurrencia propia acotada (`AI_HEAL_SRE_AGENT_CONCURRENCY`, def. 2) para no chocar con
  `max_concurrent_requests_per_worker: 8` ni con el circuit breaker del registry.
- Retry solo cuando la llamada probadamente **no** se despachó (429 con `Retry-After`, sesión MCP
  expirada). Nunca se reintenta un 5xx/timeout, porque `rca_session_run` no está en `retryable_tools`
  y un replay abriría una segunda sesión de RCA para el mismo fallo.
- Resultados truncados a 20k chars antes de entrar al contexto del modelo.
- La key se inyecta solo en el job `process-failed-tests-ai` del workflow de regresión, como secret.

## Entrega esperada

1. Team creado en LiteLLM (la DB es la autoridad de runtime; el fixture en git es solo bootstrap).
2. Virtual key MCP-only emitida y depositada en el secret store, con política de rotación definida.
3. Secret de GitHub `AI_HEAL_LITELLM_MCP_KEY` disponible para el workflow de regresión.
4. Un caso negativo verificado: la key **no** puede llamar un tool fuera de los cuatro (p. ej.
   `cloud_readonly_cli`) — lo pide el change checklist de `DEUNA_AI_ARCHITECTURE.md`.

## Entrega de la key (acordado con SRE, 2026-08-06)

La key **no** pasa por Slack ni por manos de QA. El camino es:

1. QA abre ticket a **ITOps** pidiendo crear el Actions secret (deja el rastro de auditoría),
   taggeando a **SRE**.
2. SRE le entrega el valor a ITOps directamente por el canal de credenciales. El valor no va en el
   cuerpo del ticket.
3. ITOps crea el secret **`AI_HEAL_LITELLM_MCP_KEY`** a nivel repositorio en
   `DUNA-E-Commmerce/e2e-testing`.

Tiene que ser ese repo y no `github-actions`: el workflow que corre ai-heal es reusable y se invoca
con `secrets: inherit`, que hereda los secrets del repo llamador.

## Validación

Los secrets de GitHub no se pueden leer de vuelta, así que la validación corre **dentro de CI** —
nadie necesita tener la key en su máquina, que es justamente la postura que pide
`DEUNA_AI_ARCHITECTURE.md` ("a managed credential that is never distributed to employees").

Workflow: **Actions → "ai-heal SRE Agent preflight" → Run workflow**
(`.github/workflows/ai-heal-sre-preflight.yml`). Correrlo al crear el secret, en cada rotación, y
cada vez que `serviceInvestigator` falle por auth.

- `run_rca = false`: handshake + `tools/list` + un tool call `read_only`.
- `run_rca = true`: agrega `rca_session_run` con un escenario sintético. **Es la única etapa que
  prueba el `operator_entitlement`** — crea una sesión de RCA descartable en el servidor.

**Por qué `run_rca` no es opcional:** el modo de falla es asimétrico. `sre_agent_capabilities` es
`read_only` y las tres tools de RCA son `ai-operator` con `operator_entitlement`. Una key creada en un
team que no recibió el grant de operador autentica bien, lista bien y responde
`sre_agent_capabilities` bien — y recién falla con 403 en `rca_session_run` durante una regresión
real. Un chequeo de solo handshake pasa en ese estado roto.

Después del preflight, el end-to-end por el pipeline sobre un fallo de servicio real (no abre
PR/Issue):

```bash
npm run ai-heal -- --input <test-results.json> --testcase <ID> --dry-run
```

Eso sí necesita la key en el entorno, así que corre en CI o lo ejecuta quien administre el secret.
Para iterar sobre el transporte sin credencial existe `npm run ai-heal:sre-smoke` (offline).

**Por qué el paso 2 no es opcional:** el modo de falla es asimétrico.
`sre_agent_capabilities` es `read_only` y las tres tools de RCA son `ai-operator` con
`operator_entitlement`. Una key creada en un team que no recibió el grant de operador
autentica bien, lista bien y responde `sre_agent_capabilities` bien — y recién falla con 403 en
`rca_session_run` durante una regresión real. Un chequeo de solo handshake pasa en ese estado roto.

Los nombres de tool en el gateway van prefijados por el alias del server upstream:
`prod_sre_agent-rca_session_run`. El cliente lo aplica solo (`AI_HEAL_SRE_AGENT_MCP_SERVER`).

## Verificado contra runtime (2026-08-04, Admin UI de LiteLLM)

No derivado de los fixtures de git, sino leído del dashboard:

- alias del server upstream: **`prod_sre_agent`** (coincide con el default del cliente);
- access groups del server: `company_ai`, `monitoring`, `execs` — el path que usa ai-heal
  (`/litellm/company_ai/mcp`) es válido para este server;
- las cuatro tools pedidas están en el available tools del server, o sea el techo global del registry
  ya las permite. Lo único que falta es el grant a nivel team.

## Cómo leer un fallo de auth (mapa de códigos del SRE Agent)

De `sre-dev-portal/services/sre-agent/app/internal/toolmcp/http_auth.go`. Sirve para no mandar el
problema al equipo equivocado — el status distingue capas:

| Status | Significa |
|---|---|
| **401** | Falta el bearer, o `validateJWT` falló: issuer/firma RS256, audience (`urn:deuna:mcp:sre-agent`), exp/nbf, `sub` vacío, o **`sub`/`act.sub` que no matchean `SRE_AGENT_MCP_ALLOWED_WORKLOAD_IDENTITIES`**. Es LiteLLM emitiendo un token que el SRE Agent no acepta. |
| **403 "email is not allowed"** | El token es válido pero el principal no está permitido. |
| **403 "correlation identity does not match delegation"** | El header `X-Request-ID` que llega no coincide con el claim `request_id` firmado. |
| **403 "delegated scope does not allow this MCP request"** | El scope delegado no cubre ese método/tool. |

Ojo con el tercero: nuestro cliente manda su propio `X-Request-ID` en cada llamada. Si LiteLLM firma
un `request_id` propio en vez de propagar el nuestro, eso da 403 apenas se resuelva el 401. Todavía no
lo vimos porque nunca pasamos de `validateJWT`.

## Referencias

- `sre-dev-portal/docs/DEUNA_AI_ARCHITECTURE.md` — límite del sistema, delegación, auth de workload,
  patrones legacy prohibidos, change checklist.
- `sre-dev-portal/services/litellm/policy/mcp-tools.staging.json` — riesgo/tier/approval por tool.
- `sre-dev-portal/services/litellm/rbac/teams.staging.json` — precedente `aws-devops-agent-repograph`.
- `sre-dev-portal/services/aws-devops-agent-repograph-edge/internal/edge/handler.go` — contrato de
  llamada de un workload al gateway (headers, sesión, prefijo de tool).
- `sre-dev-portal/services/sre-agent/app/docs/MCP_ADAPTER.md` — workflow RCA y contrato de las tools.
- `sre-dev-portal/docs/MCP_AWS_ACCOUNT_CONTEXT.md` — vocabulario de `accountAlias`.
