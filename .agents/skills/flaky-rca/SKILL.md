---
name: flaky-rca
description: Diagnostica la causa raíz concreta de un test de Playwright que falla de forma intermitente y aplica el fix verificado. Úsala siempre que el usuario señale un test flaky, entregue un reporte/trace de Playwright para analizar, diga que un caso "a veces pasa y a veces no", pida averiguar por qué falla un spec, o pida arreglar un flaky sin suposiciones. También aplica cuando pide revisar si un mismo fallo aparece en otros specs.
---

# Root Cause Analysis de tests flaky

Procedimiento para llegar a la **causa concreta y demostrada** de un flaky, no a una
sospecha. La regla que gobierna todo el documento: **nunca reportes una causa que no
hayas comprobado con evidencia reproducible.** Si no la comprobaste, dilo.

Antes de empezar, ten presente [`docs/flaky-test-patterns.md`](../../../docs/flaky-test-patterns.md):
si el síntoma coincide con un patrón ya catalogado, ya tienes la mitad del camino.

---

## 0. Reglas de oro

1. **Evidencia, no plausibilidad.** Una hipótesis coherente no es una causa. Cada
   afirmación del reporte final debe apoyarse en un trace, un log, una medición o un A/B.
2. **A/B siempre.** Antes de dar por bueno un fix, demuestra que el test falla sin él y
   pasa con él, en la misma sesión y con el mismo entorno. Revertir el fix y volver a
   correr es barato comparado con entregar un diagnóstico falso.
3. **Repite lo suficiente.** Un solo pase no prueba nada en un flaky. Usa
   `--repeat-each N`, y con `--workers=1` cuando necesites descartar interferencia entre
   corridas paralelas.
4. **Distingue "flaky" de "roto".** Muchos casos reportados como flaky fallan 6/6 al
   aislarlos: son deterministas bajo cierta condición (headless, un gate no propagado) y
   solo "pasan a veces" porque esa condición cambia. Decirlo cambia la conversación.
5. **No toques el test para que pase.** Subir un timeout o añadir un retry sobre un fallo
   real esconde el bug. El fix correcto ataca la causa.

---

## 1. Leer el input antes de correr nada

Llega en dos formatos. Identifica cuál tienes antes de nada.

**(a) Reporte local** en `playwright-report/`, tras una corrida en la máquina.

**(b) Bundle del dashboard de flakys** (una carpeta descargada, p. ej. `~/Downloads/<CASO>/`):

```
PROMPT.md                              contexto: spec, run, commit y el HISTORIAL de fallos previos
attempts.json                          cada intento con status, duracion, error y STACK
attempts/<wave>-retry<N>-<status>/     trace.zip, error-context.md, video.webm
```

Leelo entero antes de tocar nada:

- **`PROMPT.md` trae el historial** de veces que ese caso ya fallo. No es relleno: en
  RECON-T18 una de esas lineas ("el selector de roles no expone el rol creado") describia
  un **segundo bug distinto** al que rompia los intentos de ese run, y aparecio en cuanto
  se arreglo el primero. Si el historial menciona un sintoma que no explica el fallo
  actual, casi seguro hay mas de una causa.
- **`attempts.json` da el stack de cada intento, y su _forma_ es evidencia.** Un stack que
  solo tiene frames del page object, sin ninguna linea del `.spec.ts`, significa que la
  promesa reviento **fuera** del flujo del test: hay un `await` faltante (ver paso 6).
- Intentos con errores **distintos** en el mismo caso = probablemente varias causas, no una.

El reporte local se lee asi: Extrae de `test-results.json`,
por cada intento: estado, error, y **duración de cada step** (el step que revienta y el
tiempo que consumió acotan la búsqueda enormemente).

```bash
python3 -c "
import json
d=json.load(open('playwright-report/test-results.json'))
def w(s):
  for su in s.get('suites',[]): w(su)
  for sp in s.get('specs',[]):
    for t in sp.get('tests',[]):
      for i,r in enumerate(t.get('results',[])):
        print('===', sp.get('file'), 'attempt', i, r['status'], r.get('duration'))
        for e in r.get('errors',[])[:1]: print(e.get('message','')[:2000])
        for st in r.get('steps',[]): print('   ', st['title'][:90], st.get('duration'), 'ERR' if st.get('error') else '')
for s in d.get('suites',[]): w(s)
"
```

Señales que orientan de inmediato:

| Observación                                  | Qué sugiere                                           |
| -------------------------------------------- | ----------------------------------------------------- |
| Todos los intentos fallan igual              | No es flaky: es determinista bajo esta condición      |
| El step falla en milisegundos                | No hubo espera: se evalúa algo ya capturado           |
| El step consume exactamente el timeout       | Se esperó algo que nunca llegó                        |
| El valor recibido es raro (`":"`, `""`, `0`) | Suele delatar un estado del navegador, no del backend |

Además, `stdout` de cada resultado trae los logs de la corrida (respuestas HTTP, ids,
timestamps del servidor). Es la fuente más subestimada del reporte:

```bash
python3 -c "
import json
d=json.load(open('playwright-report/test-results.json'))
def w(s):
  for su in s.get('suites',[]): w(su)
  for sp in s.get('specs',[]):
    for t in sp.get('tests',[]):
      for r in t.get('results',[]):
        print(''.join(x.get('text','') for x in r.get('stdout',[])))
for s in d.get('suites',[]): w(s)
" | less
```

---

## 2. Exprimir el trace: la red es donde está la verdad

Los traces están en `playwright-report/data/*.zip`. Descomprime el que tenga
`0-trace.network` y analízalo con Python; **no** abras el visor interactivo, no sirve
para automatizar.

```bash
cd <scratchpad> && unzip -q -o <report>/data/<hash>.zip -d t1

# Peticiones relevantes con su estado y su fallo de red
python3 - <<'PY'
import json
for line in open('t1/0-trace.network'):
    e=json.loads(line); sn=e.get('snapshot',{})
    req=sn.get('request',{}); res=sn.get('response',{})
    u=req.get('url','')
    if any(k in u for k in ('purchase','voucher','fraud')):   # ajusta al caso
        print(sn.get('startedDateTime'), req.get('method'), res.get('status'),
              res.get('_failureText',''), u[:120])
PY

# Eventos del navegador (popup, download, pageError, console)
python3 - <<'PY'
import json
for line in open('t1/0-trace.trace'):
    e=json.loads(line)
    if e.get('type')=='frame-snapshot': continue
    if e.get('type') in ('event','console'): print(e.get('time'), json.dumps(e)[:300])
PY
```

Qué buscar:

- **`"status": -1` con `_failureText`** — la petición ni siquiera se completó.
  `net::ERR_BLOCKED_BY_ORB`, `net::ERR_FAILED`, `net::ERR_ABORTED` son causas raíz, no ruido.
- **Eventos `download` / `page`** — delatan que el navegador tomó un camino distinto al
  que el test asume (por ejemplo, descargar en vez de navegar).
- **`_wasContinued`** — la petición pasó por una ruta interceptada (`context.route`).
- **Timestamps del servidor** en cuerpos y cabeceras: sirven para medir gaps reales entre
  eventos de sistemas distintos (ver paso 4).

---

## 2b. El intento que paso es el grupo de control

Cuando el bundle incluye el trace de un intento **passed**, tienes lo que casi nunca se
tiene: mismo codigo, mismo commit, resultado opuesto. Corre la misma consulta sobre los dos
traces y mira que columna cambia.

Lo que mas rinde comparar:

| Eje                                          | Que revela                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| Duracion del mismo endpoint                  | Un backend lento que el test no contempla (10.8 s vs 34.1 s en RECON-T18)             |
| Status del mismo endpoint                    | 504/401/400 intermitentes que un predicado `status === 200` convierte en fallo duro   |
| Momento del check vs momento de la respuesta | Si el que paso chequeo 339 ms _despues_ de llegar el dato, el que fallo chequeo antes |
| Cuantas veces pide la app ese recurso        | Si solo lo pide una vez, reintentar en la UI no sirve de nada                         |

Los eventos `log` del `.trace` dan la linea de tiempo interna de Playwright, que es donde
se ve el patron "espere 1 s fijo y consulte al instante":

```bash
python3 - <<'PY'
import json
for line in open('fail/0-trace.trace'):
    e = json.loads(line)
    if e.get('type') == 'log':
        print(f"{e.get('time',0):9.0f} {e.get('message','')[:110]}")
    if e.get('type') == 'before' and e.get('method') == 'waitForTimeout':
        print(f"{e.get('startTime',0):9.0f} >>> waitForTimeout {e.get('params')}")
PY
```

> **Ojo:** los traces de CI **no guardan los cuerpos de respuesta** (`content.size: -1`, sin
> `_sha1`). Si tu hipotesis depende de lo que traia un JSON, no la vas a poder confirmar con
> ese trace — dilo en vez de asumirlo.

---

## 3. Aislar la variable: reproducir fuera del test

Cuando el trace apunta a comportamiento del navegador o de un tercero, **no** sigas
corriendo el test de 90 segundos. Escribe un script mínimo de 20 líneas que aísle esa
variable y contrasta dos modos. Es la técnica que más rápido convierte una sospecha en
un hecho.

```js
// Ejemplo: ¿el comportamiento depende de headless?
const { chromium } = require('<repo>/node_modules/playwright');
for (const headless of [true, false]) {
  const browser = await chromium.launch({ headless });
  // ...reproducir el gesto exacto y loguear el resultado
}
```

Contrastes que han dado resultado:

| Contraste                         | Sirve para                                                               |
| --------------------------------- | ------------------------------------------------------------------------ |
| `headless: true` vs `false`       | Visor de PDF, descargas, Client Hints, `sec-ch-ua`                       |
| Con y sin `context.route('**/*')` | Descartar que la interceptación global sea la culpable                   |
| `curl` vs el navegador            | Un WAF/CDN que responde distinto según cabeceras                         |
| `route.fetch()` interceptando     | Ver **qué respuesta recibe Chromium de verdad**, no la que devuelve curl |

> El caso Koin: `curl` daba 200 y `application/javascript`; `route.fetch()` reveló que al
> navegador le llegaba un **403 `text/html`** de Akamai. Sin ese paso, el diagnóstico
> habría sido "ORB bloquea el script" — cierto pero inútil.

---

## 4. Cuando el sospechoso es el tiempo, mídelo

No digas "parece un problema de propagación/timing". Mídelo y correlaciónalo:

1. Encuentra dos timestamps de fuentes independientes (respuesta de una API de
   configuración, fila escrita en base de datos, `startedDateTime` del trace).
2. Calcula el gap real en cada intento.
3. Corre N repeticiones y **correlaciona gap contra resultado**.
4. Fuerza distintas ventanas con una espera **temporal de diagnóstico** y busca el umbral.

```
gap ~20 s  → 6/6 fallan
gap ~30 s  → 3/3 pasan
gap ~50 s  → 2/2 pasan
```

Ese cuadro es el diagnóstico. Y ojo con la trampa: si al repetir en paralelo los gaps
**no** correlacionan con el resultado, la causa no es el tiempo — busca interferencia
entre corridas (estado global compartido, ver paso 6).

Recuerda además que `--reporter=json` mezcla su salida con los `console.log` del test;
recorta desde el último `\n{\n  "config"` para parsearlo.

---

## 5. Diseñar el fix: atacar la causa, no el síntoma

Elige el arreglo según lo que demostraste:

- **El navegador toma otro camino** → asertar sobre la señal real e independiente del
  modo (por ejemplo, aceptar el evento `download` _o_ la navegación del popup), no sobre
  el artefacto de un solo modo.
- **Un tercero rechaza al navegador automatizado** → `avoidAntibot(page)` en
  `@support/utils/avoidAntibot`, antes de que se cargue el SDK afectado.
- **Configuración eventualmente consistente** → esperar a que sea observable, colocando
  la espera **lo más tarde posible** para que el resto del setup cuente dentro de la
  ventana y el test no pague de más.
- **Estado compartido entre corridas** → que la escritura sea aditiva/idempotente en vez
  de destructiva.
- **Un endpoint lento o intermitente** → nunca poner `waitForResponse` con
  `status() === 200` como puerta de entrada a un helper que ya sabe reintentar: un 504
  pasajero se vuelve fallo duro. Deja que la aserción web-first sobre el locator sea la
  espera real, y si de verdad necesitas la respuesta, pídela como best-effort
  (`.catch(() => null)`), que es el idiom que ya usa el repo.
- **Una decisión tomada antes de tiempo** → `isVisible()`/`isEnabled()`/`isChecked()` **no
  esperan**; devuelven el estado del instante. Detrás de un `waitForTimeout` fijo, el
  resultado lo decide el reloj. Sustitúyelo por `await expect(locator).toBeVisible({ timeout })`.

Restricciones del repo que el fix debe respetar (`CLAUDE.md`, tabla de reglas del PR
Reviewer Agent):

- Nada de `waitForTimeout`/`sleep`/`setTimeout(resolve, n)` en un spec o page object
  (`no-static-wait`, severidad _error_). El backoff solo se admite bajo
  `playwright/support/`, con el delay como parámetro configurable y en una función cuyo
  nombre contenga `retry`/`poll`/`backoff`/`waitUntil` — así lo exime `isLegitimateBackoff`
  en `scripts/pr-review-agent/rules.ts`.
- Los locators van en el page object o el plugin DSL, nunca en el `.spec.ts`.
- Si el arreglo es común a varios tests, va en la capa compartida (page object o
  `@support/`), no copiado en cada spec.

---

## 6. Antes de cerrar: ¿está en más sitios?

Casi siempre sí. Busca por el **mecanismo**, no por el mensaje de error:

```bash
grep -rln "<helper o API involucrada>" --include="*.spec.ts" playwright
```

Para cada spec encontrado, mide en el código la distancia entre la causa y la acción que
depende de ella, y clasifícalos por riesgo. Dos señales de que ya alguien chocó con lo
mismo sin diagnosticarlo:

- un `setTimeout` a pelo con un valor pequeño y arbitrario,
- un comentario del tipo "a veces falla" o un retry casero.

Cuando la causa fue un `await` faltante, bárrelo en todo el repo con AST en vez de grep
(un `grep` no distingue una llamada async de una síncrona):

```js
// node <script>.js  — requiere ts-morph, ya está en node_modules
const { Project, SyntaxKind } = require('<repo>/node_modules/ts-morph');
const p = new Project({ tsConfigFilePath: '<repo>/tsconfig.json' });
for (const sf of p.getSourceFiles()) {
  const path = sf.getFilePath();
  if (!/\/playwright\/(pages|support|framework|tests)\//.test(path)) continue;
  for (const st of sf.getDescendantsOfKind(SyntaxKind.ExpressionStatement)) {
    const expr = st.getExpression();
    if (!expr.asKind(SyntaxKind.CallExpression)) continue;
    const txt = expr.getText().replace(/\s+/g, ' ');
    if (txt.startsWith('await')) continue; // NO filtres por prefijo: `expect(...)` es el caso mas grave
    if (!/Promise</.test(expr.getType().getText())) continue;
    const kind = txt.startsWith('expect(') ? 'EXPECT-SIN-AWAIT' : 'PROMESA-SUELTA';
    console.log(`[${kind}] ${path}:${st.getStartLineNumber()}  ${txt.slice(0, 110)}`);
  }
}
```

Separa los resultados en dos montones, porque **no todos son bugs**:

- **Correcto a propósito**: armar un listener antes de la acción (`waitResponseFrom*`,
  `page.route`, `interceptPurchaseResponse`). Es el patrón 1 del catálogo.
- **Bug**: cualquier `assert*`, `validate*` o una acción (`click`, `fill`, un `nextStep*`)
  sin `await`. La aserción no asserta nada — el test pasa sin verificar — y su fallo, si
  llega, aparece detached y en otro punto del test.
- **Bug peor todavía**: `expect(locator).toBeVisible()` sin `await`, y sobre todo
  `expect(locator.isVisible())`, que ni siquiera tiene matcher y es una sentencia muerta.

Ordena el arreglo por riesgo, porque no todos cuestan lo mismo:

1. **Acciones** (`click`, `fill`, `page.route`, un `nextStep*`): añadir `await` solo elimina
   una carrera, nunca puede volver rojo algo verde. Entra sin discusión.
2. **Aserciones**: al despertarlas empiezan a verificar de verdad. Corre los specs que las
   usan; si alguno falla, haz A/B (revierte el `await`, vuelve a correr) para saber si el
   fallo lo trajiste tú o ya estaba.

Un fix que **no cuesta nada cuando no hace falta** (por ejemplo, una espera que retorna
de inmediato si la ventana ya transcurrió) se puede aplicar de forma amplia como seguro.
Uno que sí cuesta, solo donde está demostrado.

---

## 7. Auditar el radio de impacto (a nivel de código)

Si tocaste código compartido, demuestra que no rompes a nadie más **sin depender de
correr toda la suite**:

```bash
git diff -U0 -- <archivo> | grep -E "^@@"        # qué zonas cambiaron exactamente
grep -rn "<metodoModificado>" --include="*.ts" . | grep -v node_modules
npx tsc --noEmit -p tsconfig.json
```

Enumera los llamadores de cada método que cambiaste, confirma que los métodos que usan
otros tests no tienen ni una línea dentro de un hunk modificado, y verifica que no exista
una implementación duplicada en otra capa.

---

## 8. El reporte final

Estructura que funciona:

1. **La cadena causal**, eslabón por eslabón, cada uno con su evidencia citada (la línea
   del trace, el status, el timestamp).
2. **Por qué era intermitente** — qué variable cambiaba entre corridas.
3. **El fix** y por qué ataca la causa.
4. **La verificación**, con números: `antes 5/6 fallan → después 3/3 pasan`.
5. **Lo que NO verificaste**, dicho explícitamente. Si no corriste un spec que tocaste,
   se dice.

Nunca presentes una hipótesis con el tono de una conclusión. Si algo quedó sin
demostrar, la frase correcta es "no lo verifiqué", no "probablemente sea".

---

## Comandos de referencia

```bash
# Un caso, repetido, serializado (descarta interferencia entre corridas)
npx playwright test <ID>.spec.ts --project=chromium --repeat-each 3 --workers=1

# Reporte parseable a archivo (evita que --reporter=json contamine stdout)
npx playwright test <ID>.spec.ts --project=chromium --reporter=json 2>/dev/null > out.json

# Con trace aunque pase
npx playwright test <ID>.spec.ts --project=chromium --trace on
```
