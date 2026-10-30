---
name: release-cut-cherry-pick
description: >
  Arma la rama de un release (release/vXX.X) cuando develop mezcla trabajo de varios
  releases y cada PR lleva un label de version (v36.1, v37.1). Audita que merge
  commits corresponden al release objetivo segun su label, decide si la rama sale
  directa de develop o hay que partir de master, y ejecuta los cherry-picks en orden
  con verificacion final. Usala cuando el usuario quiera cortar o sacar la rama de un
  release, preparar la branch de regresiones, saber que commits entran o quedan fuera
  de una version, armar el plan de cherry-picks por label, o avise que develop tiene
  mergeados PRs de un release futuro que no deben colarse. Sirve igual para consultas
  de solo lectura sobre el contenido de un release antes de cortarlo. No la uses para
  cherry-picks sueltos hacia una branch de feature, para reintegrar a develop y master
  una rama de release ya terminada, ni para editar los labels de un PR.
---

# Cortar una rama de release

En este repo `develop` recibe merges destinados a **distintos** releases a la vez. Cada
PR lleva un label de version (`v35.1`, `v36.1`, ...) que dice a que release pertenece.
De ahi salen dos formas de cortar la rama, y elegir mal contamina el release con codigo
que todavia no debia salir.

## Los dos escenarios

**Escenario limpio** — todos los commits de `develop` que no estan en `master` llevan el
mismo label objetivo. Entonces `develop` _es_ el release y la rama sale directa:

```bash
git checkout -b release/v35.1 develop
```

**Escenario mixto** — hay commits con labels de releases futuros. Como no se pueden
"restar" commits de una rama, se hace al reves: se parte de `master` (que siempre queda
actualizada despues del ultimo release cerrado) y se traen uno por uno solo los commits
del release objetivo.

El paso 1 decide cual de los dos aplica. No lo asumas: aunque el usuario diga "hay que
cherry-pickear", corre la auditoria igual, porque si el release resulta limpio le ahorras
diez cherry-picks innecesarios.

## Paso 1: auditar

```bash
git fetch origin --prune
.agents/skills/release-cut-cherry-pick/scripts/audit-release-commits.sh v35.1
```

El script recibe el label objetivo y opcionalmente las ramas base y de desarrollo
(por defecto `origin/master` y `origin/develop`). Es de solo lectura: no crea ramas, no
hace cherry-pick, no hace push. Clasifica cada commit de primer nivel en:

| Accion                | Significa                                                                      |
| --------------------- | ------------------------------------------------------------------------------ |
| `TOMAR`               | Su PR tiene el label objetivo. Va al release.                                  |
| `OMITIR-otro-release` | Su PR tiene otro label de version. Queda fuera.                                |
| `OMITIR-ya-en-base`   | Back-merge cuyo contenido ya vive en `master`. Repetirlo es no-op o conflicto. |
| `REVISAR-sin-label`   | Commit empujado directo a develop, sin PR y por tanto sin label.               |

Si todo sale `TOMAR`, estas en el escenario limpio: propone la rama directa desde develop
y termina ahi.

### Por que el script mira solo el primer nivel

Recorre `git log --first-parent`, o sea un renglon por PR mergeado, no los commits
internos de cada rama. Es lo correcto porque `cherry-pick -m 1` sobre un merge replica el
diff completo del PR de una sola vez. Listar los commits internos aparte llevaria a
aplicarlos dos veces.

### Como se identifica el PR de cada commit

Via `gh api repos/{owner}/{repo}/commits/{sha}/pulls`, no parseando el mensaje
"Merge pull request #NNNN". El mensaje falla con los squash merges (que no dicen "Merge")
y con los commits directos. El endpoint responde igual para merges, squashes y devuelve
vacio para los directos, que es justo la senal de "este no tiene label".

## Paso 2: presentar y esperar confirmacion

Muestra al usuario, antes de tocar nada:

1. La tabla de commits con su accion.
2. La lista ordenada de cherry-picks propuestos.
3. Los commits excluidos **con el motivo** de cada uno.
4. El veredicto de riesgo de conflicto.
5. Los `REVISAR-sin-label`, si los hay.

Los commits sin label son el unico punto que la skill no puede resolver sola: no hay dato
que consultar. Preguntale al usuario que hacer con cada uno, dandole contexto de que
tocan (`git show --stat <sha>`) para que decida informado. Un commit que solo agrega un
CSV de resultados no pesa lo mismo que uno que cambia specs.

Sobre el riesgo de conflicto: el script compara los archivos de los commits omitidos por
label contra los de los tomados. Si no hay solapamiento, excluirlos es limpio. Si lo hay,
avisalo explicitamente — no solo significa conflictos al aplicar, sino que el release
podria quedar con codigo a medias, referenciando algo que se quedo en develop.

Espera el visto bueno del usuario antes de seguir. Cortar un release es la entrada a una
regresion completa; que el arranque sea deliberado vale mucho mas que ahorrarse un turno.

## Paso 3: ejecutar

```bash
git checkout -b release/v35.1 master
```

Luego los cherry-picks **en orden cronologico, del mas viejo al mas nuevo** — que es como
los emite el script. El orden importa: varios PRs suelen tocar el mismo archivo, y
aplicarlos desordenados genera conflictos que no existirian.

Los merges llevan `-m 1` para indicar que el diff se toma contra el primer padre (la linea
de develop). Los commits de un solo padre —squash merges y pushes directos— van sin flag;
con `-m 1` git falla con "mainline was specified but commit is not a merge".

Ve de a pocos commits por comando, no todos de golpe, para poder parar donde falle. Si
aparece un conflicto, **no lo resuelvas por tu cuenta**: muestra los archivos afectados y
pregunta. En un release, resolver mal un conflicto se descubre tarde y caro.

## Paso 4: verificar

```bash
git diff --stat release/v35.1 origin/develop
```

Lo unico que debe aparecer son los archivos de los commits omitidos. Si sale algo mas,
algo se perdio en el camino y hay que revisar antes de seguir. Esta verificacion es la que
convierte "los comandos no dieron error" en "la rama tiene lo que debe tener", asi que
correla siempre y reportale el resultado al usuario.

Deja la rama **en local**. El push es del usuario: puede querer revisarla, renombrarla o
descartarla. Ofrecelo, no lo hagas por iniciativa propia.

## Notas

- Si `master` local no coincide con `origin/master`, avisa antes de ramificar: la rama
  saldria de una base vieja.
- Los labels que no tienen forma `vNN.N` (`bug`, `chore`, ...) se ignoran; solo cuentan
  los de version.
- Un PR sin ningun label de version cae en `REVISAR-sin-label` aunque tenga PR. Suele ser
  un olvido al etiquetar: vale la pena que el usuario lo corrija en GitHub.
