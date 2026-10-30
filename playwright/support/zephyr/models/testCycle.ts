export interface TestCycle {
  projectKey: string;
  name: string;
  description: string;
  jiraProjectVersion: number;
  plannedStartDate: string;
  plannedEndDate?: string;
  folderId?: number;
  customFields?: { [key: string]: any };
}

export interface TestCycleResponse {
  id: number;
  self: string;
  key: string;
}
