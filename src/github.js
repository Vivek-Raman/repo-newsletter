const API_VERSION = '2022-11-28';

async function listClosedPullRequests({ token, owner, repo, page }) {
  const params = new URLSearchParams({
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: '100',
    page: String(page),
  });
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${params}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': API_VERSION,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${message}`);
  }

  return response.json();
}

async function collectMergedPullRequests({ token, owner, repo, start }) {
  const mergedPulls = [];
  let page = 1;

  while (true) {
    const pulls = await listClosedPullRequests({ token, owner, repo, page });
    if (pulls.length === 0) break;

    for (const pull of pulls) {
      if (!pull.merged_at) continue;

      const mergedAt = new Date(pull.merged_at);
      if (mergedAt >= start) mergedPulls.push(pull);
    }

    const oldestUpdatedAt = new Date(pulls[pulls.length - 1].updated_at);
    if (oldestUpdatedAt < start || pulls.length < 100) break;
    page += 1;
  }

  return mergedPulls.sort(
    (a, b) => new Date(a.merged_at) - new Date(b.merged_at),
  );
}

module.exports = { collectMergedPullRequests };
