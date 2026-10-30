export type ScheduleReportTiming = 'immediate' | 'scheduled';
export type ScheduleReportPeriodicity = 'daily' | 'weekly' | 'monthly';

export const SCHEDULE_REPORT_FORM_DATA_TEST_ID = {
  timingCard: (timing: ScheduleReportTiming) => `schedule-report-timing-card-${timing}`,
  periodicityCard: (periodicity: ScheduleReportPeriodicity) =>
    `schedule-report-type-card-${periodicity}`,
} as const;

// Selecting "Conciliaciones" as report type fires GET_FIELDS_PATH + GET_FILTERS_PATH
// (from ./commons) directly, confirmed live via the Network tab — there's no separate
// reconciliation/types catalog call and no acquirers call, contrary to the admin-ff
// context doc's assumption. Keep this file for the timing/periodicity testid builders only.
