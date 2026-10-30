#!/usr/bin/env bash
# =============================================================================
# cut-release.sh — Corta una branch release/vX.Y desde master cherry-pickeando
# los merge commits de PRs mergeados a develop que tengan el label de la versión.
#
# Uso:
#   scripts/release/cut-release.sh v29.0                # corte real
#   scripts/release/cut-release.sh v29.0 --dry-run      # solo lista los picks
#   scripts/release/cut-release.sh v29.0 --resume       # continuar tras resolver un conflicto
#
# Flags:
#   --dry-run             Lista los PRs/commits que se cherry-pickearían y sale.
#   --resume              Continúa un corte interrumpido por conflicto (después
#                         de resolver y hacer `git cherry-pick --continue`).
#   --base <branch>       Branch base del corte (default: master).
#   --no-verify           Omite el `tsc --noEmit` final.
#
# Requiere: gh (autenticado), jq, git.
#
# Flujo esperado:
#   1. Cada PR a develop lleva el label de la versión en la que sale (ej v29.0).
#   2. Al iniciar regresiones: cut-release.sh v29.0 → release/v29.0 desde master.
#   3. Terminadas las regresiones: release/v29.0 se mergea a master Y a develop.
# =============================================================================
set -euo pipefail

REPO="DUNA-E-Commmerce/e2e-testing"
BASE_BRANCH="master"
DRY_RUN=false
RESUME=false
VERIFY=true
STATE_FILE=".git/CUT_RELEASE_STATE"

RED='\033[31m'; GREEN='\033[32m'; YELLOW='\033[33m'; BLUE='\033[34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[cut-release]${NC} $*"; }
warn() { echo -e "${YELLOW}[cut-release] ⚠️  $*${NC}"; }
err()  { echo -e "${RED}[cut-release] ❌ $*${NC}" >&2; }
ok()   { echo -e "${GREEN}[cut-release] ✅ $*${NC}"; }

usage() { awk 'NR > 1 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"; exit 1; }

# --- Parseo de argumentos ----------------------------------------------------
[ $# -lt 1 ] && usage
VERSION="$1"; shift
while [ $# -gt 0 ]; do
    case "$1" in
        --dry-run) DRY_RUN=true ;;
        --resume) RESUME=true ;;
        --base) BASE_BRANCH="$2"; shift ;;
        --no-verify) VERIFY=false ;;
        *) err "Flag desconocido: $1"; usage ;;
    esac
    shift
done

if ! [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+$ ]]; then
    err "La versión debe tener formato vX.Y (ej: v29.0). Recibido: '$VERSION'"
    exit 1
fi
RELEASE_BRANCH="release/$VERSION"

# --- Prerrequisitos ----------------------------------------------------------
for tool in gh jq git; do
    command -v "$tool" >/dev/null || { err "Falta '$tool' en el PATH."; exit 1; }
done
# gh auth status puede retornar !=0 con cuentas secundarias sin scope; validar con una llamada real
gh api user --jq .login >/dev/null 2>&1 || { err "gh no está autenticado. Corre: gh auth login"; exit 1; }

cd "$(git rev-parse --show-toplevel)"

# El corte real cambia de branch y cherry-pickea: exige working tree limpio.
# El dry-run solo consulta la API y no necesita la restricción.
if ! $RESUME && ! $DRY_RUN && ! git diff --quiet HEAD 2>/dev/null; then
    err "El working tree tiene cambios sin commitear. Limpia antes de cortar."
    exit 1
fi

# --- Funciones ---------------------------------------------------------------

# Cherry-pick de un commit: usa -m 1 si es merge commit; si el pick queda
# vacío (el cambio ya está en la base por un corte anterior), lo salta.
# Retorna 0 = aplicado/saltado, 1 = conflicto real (queda en progreso).
pick_one() {
    local sha=$1
    local mainline_args=()
    local parent_count
    parent_count=$(git rev-list --parents -n 1 "$sha" | wc -w | tr -d ' ')
    [ "$parent_count" -gt 2 ] && mainline_args=(-m 1)

    if git cherry-pick "${mainline_args[@]}" "$sha" >/dev/null 2>&1; then
        return 0
    fi
    # Pick vacío: el diff ya existe en la base (ej. re-corte de una versión
    # o cambio que llegó a master por otra vía). Working tree limpio → skip.
    if git diff --quiet && git diff --cached --quiet; then
        git cherry-pick --skip >/dev/null 2>&1 || true
        warn "  saltado (ya aplicado en $BASE_BRANCH): $(git log --format='%h %s' -n 1 "$sha")"
        return 0
    fi
    return 1
}

apply_picks() {
    # Lee SHAs del STATE_FILE y los aplica en orden; ante conflicto guarda
    # el estado restante y sale con instrucciones.
    local remaining total applied=0
    total=$(wc -l < "$STATE_FILE" | tr -d ' ')

    while [ -s "$STATE_FILE" ]; do
        local sha
        sha=$(head -n 1 "$STATE_FILE")
        if pick_one "$sha"; then
            # Quitar el SHA aplicado del estado
            tail -n +2 "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
            applied=$((applied + 1))
        else
            err "Conflicto en: $(git log --format='%h %s' -n 1 "$sha")"
            echo ""
            echo "  Para continuar:"
            echo "    1. Resuelve los conflictos y haz 'git add' de los archivos"
            echo "    2. git cherry-pick --continue"
            echo "    3. Quita la primera línea de $STATE_FILE y re-corre:"
            echo "       scripts/release/cut-release.sh $VERSION --resume"
            echo ""
            echo "  Para abortar todo: git cherry-pick --abort && git switch develop && git branch -D $RELEASE_BRANCH"
            exit 1
        fi
    done
    rm -f "$STATE_FILE"
    ok "Cherry-picks completados."
}

verify_branch() {
    $VERIFY || return 0
    log "Verificando que la branch compila (tsc --noEmit)..."
    if npx tsc --noEmit 2>&1 | tail -20; then
        ok "TypeScript OK."
    else
        warn "tsc reportó errores — revisa si falta algún commit del que dependen los picks (¿PR de framework/support sin label de versión?)."
    fi
}

# --- Resume ------------------------------------------------------------------
if $RESUME; then
    [ -f "$STATE_FILE" ] || { err "No hay corte en progreso ($STATE_FILE no existe)."; exit 1; }
    if [ -f .git/CHERRY_PICK_HEAD ]; then
        err "Hay un cherry-pick sin terminar. Resuelve y corre 'git cherry-pick --continue' primero."
        exit 1
    fi
    # El SHA en conflicto ya fue aplicado con --continue: quitarlo si sigue primero
    log "Reanudando corte de $RELEASE_BRANCH ($(wc -l < "$STATE_FILE" | tr -d ' ') picks restantes)..."
    apply_picks
    verify_branch
    ok "Branch $RELEASE_BRANCH lista. Siguiente paso: git push -u origin $RELEASE_BRANCH"
    exit 0
fi

# --- Recolección de PRs ------------------------------------------------------
log "Actualizando refs de origin ($BASE_BRANCH, develop)..."
if ! git fetch origin "$BASE_BRANCH" develop --quiet 2>/dev/null; then
    if $DRY_RUN; then
        warn "No se pudo hacer fetch de origin — el dry-run usará solo la API de GitHub."
    else
        err "No se pudo hacer fetch de origin. Verifica tu acceso git (SSH/HTTPS)."
        exit 1
    fi
fi

log "Buscando PRs mergeados a develop con label '$VERSION'..."
PR_FIELDS="number,title,mergedAt,mergeCommit,labels,author"
picks=$(gh pr list --repo "$REPO" --state merged --base develop --label "$VERSION" --json "$PR_FIELDS" --limit 500 \
    | jq 'map(select(.mergeCommit.oid != null)) | sort_by(.mergedAt)')

count=$(echo "$picks" | jq 'length')
if [ "$count" -eq 0 ]; then
    err "No hay PRs mergeados con label '$VERSION'. ¿Label correcto?"
    exit 1
fi

# Avisar de PRs con el label aún abiertos (posible train incompleto)
open_prs=$(gh pr list --repo "$REPO" --state open --label "$VERSION" --json number,title --jq '.[] | "  #\(.number) \(.title)"')
if [ -n "$open_prs" ]; then
    warn "PRs ABIERTOS con label $VERSION (no entrarán al corte):"
    echo "$open_prs"
fi

echo ""
log "Se cherry-pickearán $count PRs sobre origin/$BASE_BRANCH (orden de merge):"
echo "$picks" | jq -r '.[] | "  \(.mergedAt[0:10])  \(.mergeCommit.oid[0:7])  #\(.number)  [\([.labels[].name] | join(","))]  \(.title)"'
echo ""

if $DRY_RUN; then
    ok "Dry-run: no se creó ninguna branch."
    exit 0
fi

# --- Corte -------------------------------------------------------------------
if git show-ref --verify --quiet "refs/heads/$RELEASE_BRANCH"; then
    err "La branch $RELEASE_BRANCH ya existe localmente. Bórrala o usa otra versión."
    exit 1
fi

log "Creando $RELEASE_BRANCH desde origin/$BASE_BRANCH..."
git switch -c "$RELEASE_BRANCH" "origin/$BASE_BRANCH" --quiet

echo "$picks" | jq -r '.[].mergeCommit.oid' > "$STATE_FILE"
apply_picks
verify_branch

echo ""
ok "Branch $RELEASE_BRANCH lista con $count PRs."
echo ""
echo "  Siguientes pasos:"
echo "    1. git push -u origin $RELEASE_BRANCH"
echo "    2. Correr regresiones desde $RELEASE_BRANCH"
echo "    3. Al terminar: mergear $RELEASE_BRANCH → $BASE_BRANCH  Y  $RELEASE_BRANCH → develop"
