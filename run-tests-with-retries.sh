#!/bin/bash
# Automation script for running Playwright tests with sharding support and retry logic

# Default values
SHARD="1/1"
WORKERS=6
MAX_RETRIES=1
PROJECT="chromium"
GREP=""
GREP_INVERT=""
TEST_FILES=()
CI_MODE=${CI:-false}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --shard=*)
      SHARD="${1#*=}"
      shift
      ;;
    --workers=*)
      WORKERS="${1#*=}"
      shift
      ;;
    --retries=*)
      MAX_RETRIES="${1#*=}"
      shift
      ;;
    --project=*)
      PROJECT="${1#*=}"
      shift
      ;;
    --grep=*)
      GREP="${1#*=}"
      shift
      ;;
    --grep-invert=*)
      GREP_INVERT="${1#*=}"
      shift
      ;;
    --test-cases=*)
      # Parse multiple test files from the parameter value
      TEST_CASES_VALUE="${1#*=}"
      # Split by spaces and add to array
      read -ra TEST_FILES <<< "$TEST_CASES_VALUE"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

echo "Running tests with shard: $SHARD, workers: $WORKERS, max retries: $MAX_RETRIES"

# Initial run with sharding
echo "Running all tests in shard $SHARD..."
if [ ${#TEST_FILES[@]} -gt 0 ]; then
    echo "Running ${#TEST_FILES[@]} specific test files: ${TEST_FILES[*]}"
    PLAYWRIGHT_HTML_OPEN='never' npx playwright test "${TEST_FILES[@]}" --project=$PROJECT --shard=$SHARD --workers $WORKERS
elif [ -n "$GREP" ]; then
    # playwright's --grep is a plain regex, so "PF-T18" also matches inside "PF-T181".
    # Block that by requiring the match isn't immediately followed by another digit.
    PLAYWRIGHT_HTML_OPEN='never' npx playwright test --project=$PROJECT --shard=$SHARD --workers $WORKERS --grep="(?:$GREP)(?!\d)"
elif [ -n "$GREP_INVERT" ]; then
    PLAYWRIGHT_HTML_OPEN='never' npx playwright test --project=$PROJECT --shard=$SHARD --workers $WORKERS --grep-invert="$GREP_INVERT"
else
    PLAYWRIGHT_HTML_OPEN='never' npx playwright test --project=$PROJECT --shard=$SHARD --workers $WORKERS
fi
INITIAL_RESULT=$?

# Initialize RESULTADO with the initial result
RESULTADO=$INITIAL_RESULT

# Loop to execute retries for failed tests
if [ $INITIAL_RESULT -ne 0 ]; then
  for ((i=1; i<=MAX_RETRIES; i++))
  do
      echo "Re-running failed tests: attempt $i of $MAX_RETRIES"
      
      # Capture the output to check if tests were actually found
      RETRY_OUTPUT=$(PLAYWRIGHT_HTML_OPEN='never' npx playwright test --last-failed --project=$PROJECT --workers $WORKERS --retries 1 2>&1)
      RESULTADO=$?
      echo "$RETRY_OUTPUT"
      
      # Check if playwright actually found tests to run
      if echo "$RETRY_OUTPUT" | grep -q "Starting the run with 0 tests"; then
          echo "⚠️  WARNING: --last-failed found 0 tests to run, but initial run had failures."
          echo "This usually means tests failed before they could be tracked properly."
          echo "Maintaining failure status from initial run."
          RESULTADO=1
          break
      fi
      
      # If the command returns 0, there are no pending failures and the loop stops
      if [ $RESULTADO -eq 0 ]; then
          echo "No failed tests remaining on attempt $i. Ending retries."
          
          echo "All tests passed on retry $i - no flaky tests to log for this attempt."
          
          break
      else
          echo "Some tests still failing after retry $i. Will continue if more retries available."
      fi
  done
fi

# Only show report in local environments, not in CI
if [ "$CI_MODE" != "true" ]; then
  npx playwright show-report
fi

echo "Automated test sequence completed for shard $SHARD."
exit $RESULTADO