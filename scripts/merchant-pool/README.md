# Merchant pool

Herramientas para que las regresiones no creen ~1900 merchants a la vez contra merchant-auth.
El diseño, las mediciones y las decisiones están en
[`docs/merchant-pool-plan.md`](../../docs/merchant-pool-plan.md); el código que usan los tests vive
en [`playwright/support/merchantPool/`](../../playwright/support/merchantPool/).

Dos mecanismos, independientes entre sí:

- **Pool compartido**: specs que necesitan el mismo merchant (país, tipo y processors) y no
  modifican su configuración comparten unos pocos merchants (`MERCHANT_POOL` en `catalog.ts`).
  Reduce cuántos merchants se crean.
- **Stock de un solo uso** (`merchant_presupply`): antes de los shards se crea un merchant por
  spec, a ritmo controlado, y `basicSetup` toma uno en lugar de crearlo. No se comparte nada.
  Elimina la ráfaga de creación al arrancar.

## Comandos

| Comando                                                                                         | Para qué                                                                                                                          |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm run merchant-pool:provision -- --out m.json [--fresh-shards 80 --grep …] [--deadline 360]` | Crea el pool y el stock y escribe el manifiesto. Lo corre el job `provision-merchant-pool` de `regression_tests.yml`              |
| `npm run merchant-pool:report -- test-results.json`                                             | Resume una regresión: logins, merchants creados y tomados del stock, fallos por paso, uso del pool, errores HTTP de merchant-auth |
| `npm run merchant-pool:eligibility -- [--min 5] [--key K]`                                      | Qué specs pueden compartir merchant, agrupados por la configuración que necesitan                                                 |
| `npm run merchant-pool:migrate -- --key K [--dry-run]`                                          | Pasa al pool los specs elegibles de un grupo (la entrada tiene que existir en el catálogo)                                        |
| `npm run merchant-pool:canary -- --key K --baseline-report r.json`                              | Verifica una entrada antes de admitirla: modo worker + réplicas compartidas con `--repeat-each`                                   |
| `npm run merchant-pool:admin-session -- --out s.json`                                           | Empaqueta la sesión de admin que dejó el proyecto `setup` para que los shards no se logueen. Lo corre el job `admin-session`      |
| `npm run merchant-pool:release -- --manifest m.json`                                            | Borra los processors de las entradas con `releaseProcessorsAfterRun` (PayPal: libera webhooks). Lo corre el job de limpieza       |
| `npm run test:merchant-pool`                                                                    | Corre todos los tests de esta carpeta                                                                                             |

## Sumar una entrada al catálogo

1. `merchant-pool:eligibility` → elegir un grupo y su clave sugerida.
2. Agregar la entrada a `playwright/support/merchantPool/catalog.ts` (~1 réplica cada 8 specs) y
   regenerar los tipos del DSL: `npm run generate-action-types`.
3. `merchant-pool:migrate -- --key K`.
4. `merchant-pool:canary -- --key K --baseline-report <última regresión>`. Solo entra si da `PASS`;
   con `FAIL` o `INCONCLUSIVE` se revierte y se registra en `lib/rejected.ts`.

## Encender y apagar

No hay inputs en los workflows: el pool y el stock corren siempre. Se apagan en
[`config.ts`](config.ts) (`shared`, `presupply`); el cambio vale para la rama cuyas pruebas corren.
La sesión de admin compartida no se apaga: si el login falla, la regresión se detiene antes de los
shards (docs, sección 4.18).

## Usuarios y recetas

- Un spec que registra usuarios entra al pool solo si genera su email al azar y no tiene emails
  literales. Su entrada se verifica con `merchant-pool:canary -- --key K --repeat 1`: `--repeat-each`
  reusa el email de módulo en el mismo worker y da un choque que la regresión no tiene.
- `MerchantSpec.setup` (`network`, `checkoutConfigVault`): configuración idéntica para todos los specs
  que la usan, que la entrada aplica una vez al aprovisionar (antes de los processors, como hacían los
  specs) y el codemod quita del spec. Las llamadas que cuentan como receta están en `RECIPE_CALLS`
  (`lib/eligibility.ts`).
- `paypalWalletCampaign` (moneda) crea la campaña de PayPal Wallet tras los processors. No está en
  `RECIPE_CALLS`: el codemod no la reconoce y el spec se migra a mano (ENTP1-T2319).

## Recursos externos escasos

Una entrada cuyos processors ocupan un cupo externo (PayPal: 10 webhooks por app entre todos los
ambientes) lleva `releaseProcessorsAfterRun: true`. En modo worker los libera el fixture al cerrar el
worker; con manifiesto, `merchant-pool:release` en el job de limpieza. El canary también los libera
antes de borrar su manifiesto.

## Grupos rechazados

`lib/rejected.ts` guarda los grupos que cumplen las reglas estáticas pero no pueden compartir
merchant, con el motivo, la evidencia, la fecha y qué haría falta para reconsiderarlos. Hoy:
Mercado Pago authorize MX (rechazos por velocidad al compartir el merchant) y Conekta authorize MX
(sus specs están en `fixme`).

- `merchant-pool:eligibility` no los propone; los lista aparte con su motivo
  (`--include-rejected` para verlos entre los candidatos).
- `merchant-pool:migrate` los rechaza con el motivo; `--force-rejected` solo para re-evaluar uno
  con el canary.
- `tests/eligibility.test.ts` falla si un grupo rechazado aparece en `MERCHANT_POOL`.

Cuando un canary da `FAIL` o `INCONCLUSIVE`, agregar la entrada aquí en el mismo cambio que revierte
la migración.

`REJECTED_SPECS` hace lo mismo para un spec suelto, por id de caso: su grupo comparte bien, pero el
spec falla también con merchant propio (hoy los 4 de Cybersource de la tanda 4 y PAYM-T2180).
`eligibility` lo bloquea con el motivo.

## Estructura

```
cli/    puntos de entrada (los que exponen los npm scripts)
lib/    lógica sin efectos de entrada: concurrencia adaptativa, listados por shard, stock,
        elegibilidad, codemod
tests/  un archivo por área + run.ts, que corre cada uno en su propio proceso
```

`scripts/provision-merchant-pool.ts` reenvía a `cli/provision.ts`: es la ruta que llaman
`regression_tests.yml` y las ramas de release ya cortadas. No borrarla mientras exista una rama
que la use.

## Manifiesto

Contiene claves privadas de merchants de sandbox: el script nunca lo imprime, CI lo guarda en S3
cifrado y lo revoca al terminar la corrida. No lo dejes en el repo si lo generas en local.
