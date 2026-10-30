import * as fs from 'fs';

type TeamFilter = (fileContent: string) => boolean;

const FILTERS: Record<string, TeamFilter> = {
  checkout: (content) =>
    // TestingTool usage (typo "nagivate" is intentional in this codebase)
    /from ['"]@support\/testing_tool\/TestingTool['"]/.test(content) ||
    /nagivateAndConfigureWidget|navigateAndConfigureWidget/.test(content) ||
    // Widget page object imports
    /from ['"]@pages\/(checkout|vault|clickToPay|explore\/forms?|deuna_now|payment_link)\//.test(content) ||
    // Widget tags
    /@(elements_link|vault|click_to_pay|payment_widget|websdk|checkout_base|checkout_qsr)/.test(content),

  admin: (content) =>
    /from ['"]@pages\/admin\//.test(content) ||
    /@team_admin/.test(content),
};

/**
 * Returns true if the test at filePath is relevant for the given team.
 * Fail-open: unknown team or unreadable file → returns true (never silently drops tests).
 */
export function isRelevantForTeam(team: string, filePath: string): boolean {
  const filter = FILTERS[team.toLowerCase()];
  if (!filter) {
    console.warn(`[TEAM_FILTER] Unknown team "${team}". Available: ${Object.keys(FILTERS).join(', ')}. Skipping filter.`);
    return true;
  }
  try {
    return filter(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return true;
  }
}

export function availableTeams(): string[] {
  return Object.keys(FILTERS);
}
