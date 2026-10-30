#!/usr/bin/env bash
# Audita los commits que separan la rama base de la de desarrollo y los clasifica
# segun el label de version del PR que los introdujo.
#
# Uso:  audit-release-commits.sh <label-objetivo> [rama-base] [rama-desarrollo]
# Ej.:  audit-release-commits.sh v35.1
#       audit-release-commits.sh v35.1 origin/master origin/develop
#
# Salida: un bloque TSV por commit (en orden cronologico, del mas viejo al mas
# nuevo) mas un resumen y un chequeo de solapamiento de archivos.
#
# El script solo lee: no crea ramas, no hace cherry-pick, no hace push.

set -uo pipefail

TARGET_LABEL="${1:?Falta el label objetivo, ej: v35.1}"
BASE="${2:-origin/master}"
DEV="${3:-origin/develop}"

command -v gh >/dev/null || { echo "ERROR: se requiere la CLI 'gh' autenticada." >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "ERROR: 'gh' no esta autenticado. Corre: gh auth login" >&2; exit 1; }

REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
VERSION_RE='^v[0-9]+\.[0-9]+$'

echo "== Auditoria de release =="
echo "repo:      $REPO"
echo "base:      $BASE  ($(git rev-parse --short "$BASE"))"
echo "desarrollo:$DEV  ($(git rev-parse --short "$DEV"))"
echo "objetivo:  $TARGET_LABEL"
echo

TOTAL=$(git rev-list --count "$BASE..$DEV")
echo "commits totales en $DEV fuera de $BASE: $TOTAL"
echo

# Recorremos solo el primer nivel (--first-parent): cada entrada es un merge de PR,
# un squash o un commit empujado directo. Los commits internos de cada rama viajan
# junto a su merge cuando se hace cherry-pick con -m 1, asi que no se listan aparte.
COMMITS=$(git log --first-parent --reverse --format='%H' "$BASE..$DEV")

if [ -z "$COMMITS" ]; then
  echo "No hay commits que auditar: $DEV no adelanta a $BASE."
  exit 0
fi

PICK_LIST=""; SKIP_LIST=""; REVIEW_LIST=""
# Los back-merges ya contenidos en la base no arriesgan nada (su contenido ya esta
# ahi); el riesgo real viene de los commits de OTRO release que dejamos fuera.
SKIP_OTHER_SHAS=""

# Archivos que introduce un commit. Para un merge es el diff contra su primer padre,
# que es exactamente lo que aplica 'cherry-pick -m 1'.
commit_files() {
  local c="$1" n
  n=$(( $(git rev-list --parents -n1 "$c" | wc -w) - 1 ))
  if [ "$n" -gt 1 ]; then
    git diff-tree -r --no-commit-id --name-only "${c}^1" "$c"
  else
    git diff-tree -r --no-commit-id --name-only "$c"
  fi
}

printf '%-10s %-7s %-8s %-14s %-26s %s\n' SHA TIPO PR LABELS ACCION ASUNTO
printf '%s\n' "----------------------------------------------------------------------------------------------------"

for sha in $COMMITS; do
  short=$(git rev-parse --short "$sha")
  subject=$(git log -1 --format='%s' "$sha")
  nparents=$(( $(git rev-list --parents -n1 "$sha" | wc -w) - 1 ))

  if [ "$nparents" -gt 1 ]; then tipo="merge"; else tipo="simple"; fi

  # Un merge cuya rama fusionada ya vive en la base es un back-merge (tipico:
  # reintegrar un release ya publicado). Repetirlo produce un no-op o un conflicto.
  already_in_base="no"
  if [ "$nparents" -gt 1 ]; then
    second=$(git rev-list --parents -n1 "$sha" | awk '{print $3}')
    if [ -n "$second" ] && git merge-base --is-ancestor "$second" "$BASE" 2>/dev/null; then
      already_in_base="si"
    fi
  fi

  pr=$(gh api "repos/$REPO/commits/$sha/pulls" --jq '.[0].number' 2>/dev/null)
  labels=$(gh api "repos/$REPO/commits/$sha/pulls" --jq '[.[0].labels[].name] | join(",")' 2>/dev/null)
  [ -z "$pr" ] || [ "$pr" = "null" ] && pr="-"
  [ -z "$labels" ] || [ "$labels" = "null" ] && labels="-"

  # Solo miran labels con forma de version (vNN.N); los demas (bug, chore, ...) se ignoran.
  version_labels=$(printf '%s' "$labels" | tr ',' '\n' | grep -E "$VERSION_RE" | paste -sd, - 2>/dev/null)

  if [ "$already_in_base" = "si" ]; then
    accion="OMITIR-ya-en-base"
    SKIP_LIST="${SKIP_LIST}${short} ${subject} [back-merge ya en $BASE]"$'\n'
  elif printf '%s' "$version_labels" | tr ',' '\n' | grep -qxF "$TARGET_LABEL"; then
    accion="TOMAR"
    if [ "$tipo" = "merge" ]; then flag="-m 1"; else flag=""; fi
    PICK_LIST="${PICK_LIST}${short}|${flag}|PR #${pr}|${subject}"$'\n'
  elif [ -n "$version_labels" ]; then
    accion="OMITIR-otro-release"
    SKIP_LIST="${SKIP_LIST}${short} ${subject} [label $version_labels]"$'\n'
    SKIP_OTHER_SHAS="${SKIP_OTHER_SHAS}${sha} "
  else
    accion="REVISAR-sin-label"
    REVIEW_LIST="${REVIEW_LIST}${short}|PR #${pr}|${subject}"$'\n'
  fi

  printf '%-10s %-7s %-8s %-14s %-26s %s\n' \
    "$short" "$tipo" "$pr" "${version_labels:--}" "$accion" "${subject:0:70}"
done

echo
echo "== A cherry-pickear (orden cronologico) =="
printf '%s' "$PICK_LIST" | awk -F'|' 'NF{printf "  git cherry-pick %s %s   # %s  %s\n", $2, $1, $3, $4}'

echo
echo "== A omitir =="
[ -n "$SKIP_LIST" ] && printf '%s' "$SKIP_LIST" | sed 's/^/  /' || echo "  (ninguno)"

echo
echo "== Sin label: requieren decision del usuario =="
[ -n "$REVIEW_LIST" ] && printf '%s' "$REVIEW_LIST" | awk -F'|' 'NF{printf "  %s  %s  %s\n", $1, $2, $3}' || echo "  (ninguno)"

# Un commit omitido solo es seguro de dejar fuera si ningun commit tomado toca sus
# archivos; si se cruzan, el cherry-pick puede conflictuar o dejar codigo inconsistente.
echo
echo "== Riesgo de conflicto: archivos compartidos entre omitidos y tomados =="
pick_shas=$(printf '%s' "$PICK_LIST" | awk -F'|' 'NF{print $1}')

if [ -z "$SKIP_OTHER_SHAS" ] || [ -z "$pick_shas" ]; then
  echo "  Sin solapamiento posible (no hay commits de otro release, o no hay nada que tomar)."
else
  tmp_skip=$(mktemp); tmp_pick=$(mktemp)
  for s in $SKIP_OTHER_SHAS; do commit_files "$s"; done | sort -u > "$tmp_skip"
  for p in $pick_shas;        do commit_files "$p"; done | sort -u > "$tmp_pick"

  overlap=$(comm -12 "$tmp_skip" "$tmp_pick")
  if [ -n "$overlap" ]; then
    echo "  ATENCION: estos archivos los tocan tanto commits omitidos como tomados."
    echo "  Espera conflictos y revisa que la exclusion no rompa nada:"
    printf '%s\n' "$overlap" | sed 's/^/    /'
  else
    echo "  Ninguno. Excluir los commits omitidos es limpio."
  fi
  rm -f "$tmp_skip" "$tmp_pick"
fi

echo
echo "Verificacion sugerida despues del cherry-pick:"
echo "  git diff --stat <rama-release> $DEV"
echo "  -> lo unico que debe aparecer son los archivos de los commits omitidos."
