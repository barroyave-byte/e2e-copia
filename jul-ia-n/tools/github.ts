import { Octokit } from '@octokit/rest';

let _octokit: Octokit | null = null;
const getOctokit = (): Octokit => {
  if (!_octokit) {
    const token = process.env.GITHUB_TOKEN || process.env.DUNA_ACTION_TOKEN;
    if (!token) {
      throw new Error(
        'No GitHub token found. Set GITHUB_TOKEN or DUNA_ACTION_TOKEN in env.',
      );
    }
    _octokit = new Octokit({ auth: token });
  }
  return _octokit;
};

export interface FileChange {
  path: string;
  contents: string;
}

export interface CreateBranchOptions {
  owner: string;
  repo: string;
  baseBranch: string;
  newBranch: string;
}

export const createBranchFromBase = async (
  opts: CreateBranchOptions,
): Promise<{ branch: string; sha: string }> => {
  const gh = getOctokit();
  const baseRef = await gh.git.getRef({
    owner: opts.owner,
    repo: opts.repo,
    ref: `heads/${opts.baseBranch}`,
  });
  const sha = baseRef.data.object.sha;

  await gh.git.createRef({
    owner: opts.owner,
    repo: opts.repo,
    ref: `refs/heads/${opts.newBranch}`,
    sha,
  });
  return { branch: opts.newBranch, sha };
};

export interface CommitFilesOptions {
  owner: string;
  repo: string;
  branch: string;
  files: FileChange[];
  message: string;
}

export const commitFilesToBranch = async (
  opts: CommitFilesOptions,
): Promise<{ commitSha: string }> => {
  const gh = getOctokit();
  const { data: branchRef } = await gh.git.getRef({
    owner: opts.owner,
    repo: opts.repo,
    ref: `heads/${opts.branch}`,
  });
  const parentCommitSha = branchRef.object.sha;

  const { data: parentCommit } = await gh.git.getCommit({
    owner: opts.owner,
    repo: opts.repo,
    commit_sha: parentCommitSha,
  });

  const treeItems = await Promise.all(
    opts.files.map(async (f) => {
      const { data: blob } = await gh.git.createBlob({
        owner: opts.owner,
        repo: opts.repo,
        content: Buffer.from(f.contents).toString('base64'),
        encoding: 'base64',
      });
      return {
        path: f.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      };
    }),
  );

  const { data: tree } = await gh.git.createTree({
    owner: opts.owner,
    repo: opts.repo,
    base_tree: parentCommit.tree.sha,
    tree: treeItems,
  });

  const { data: commit } = await gh.git.createCommit({
    owner: opts.owner,
    repo: opts.repo,
    message: opts.message,
    tree: tree.sha,
    parents: [parentCommitSha],
  });

  await gh.git.updateRef({
    owner: opts.owner,
    repo: opts.repo,
    ref: `heads/${opts.branch}`,
    sha: commit.sha,
  });

  return { commitSha: commit.sha };
};

export interface OpenDraftPrOptions {
  owner: string;
  repo: string;
  head: string;
  base: string;
  title: string;
  body: string;
  labels?: string[];
}

export const openDraftPr = async (
  opts: OpenDraftPrOptions,
): Promise<{ number: number; url: string }> => {
  const gh = getOctokit();
  const { data: pr } = await gh.pulls.create({
    owner: opts.owner,
    repo: opts.repo,
    head: opts.head,
    base: opts.base,
    title: opts.title,
    body: opts.body,
    draft: true,
  });

  if (opts.labels?.length) {
    await gh.issues.addLabels({
      owner: opts.owner,
      repo: opts.repo,
      issue_number: pr.number,
      labels: opts.labels,
    });
  }

  return { number: pr.number, url: pr.html_url };
};

export interface RequestReviewOptions {
  owner: string;
  repo: string;
  prNumber: number;
  reviewers?: string[];
  teamReviewers?: string[];
}

export const requestReview = async (
  opts: RequestReviewOptions,
): Promise<void> => {
  const gh = getOctokit();
  await gh.pulls.requestReviewers({
    owner: opts.owner,
    repo: opts.repo,
    pull_number: opts.prNumber,
    reviewers: opts.reviewers,
    team_reviewers: opts.teamReviewers,
  });
};

export interface CommentPrOptions {
  owner: string;
  repo: string;
  prNumber: number;
  body: string;
}

export const commentPr = async (opts: CommentPrOptions): Promise<void> => {
  const gh = getOctokit();
  await gh.issues.createComment({
    owner: opts.owner,
    repo: opts.repo,
    issue_number: opts.prNumber,
    body: opts.body,
  });
};

export interface OpenIssueOptions {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

export const openIssue = async (
  opts: OpenIssueOptions,
): Promise<{ number: number; url: string }> => {
  const gh = getOctokit();
  const { data: issue } = await gh.issues.create({
    owner: opts.owner,
    repo: opts.repo,
    title: opts.title,
    body: opts.body,
    labels: opts.labels,
    assignees: opts.assignees,
  });
  return { number: issue.number, url: issue.html_url };
};
