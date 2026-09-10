# PR newsletter tool

This repository provides a reusable JavaScript Action. It collects pull requests merged in the previous rolling seven days and uses the OpenAI Responses API to write a newsletter in Markdown.

## Setup in another repository

Create `.github/workflows/pr-newsletter.yml` in the repository you want to report on:

```yaml
name: PR newsletter

on:
  schedule:
    - cron: "0 9 * * 1"
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: read

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - name: Collect newsletter input
        id: collect
        uses: YOUR_ORG/pr-newsletter@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          lookback_days: 7
          output_path: pr-newsletter.md

      - name: Upload newsletter
        if: steps.collect.outputs.has_prs == 'true'
        uses: actions/upload-artifact@v4
        with:
          name: pr-newsletter
          path: pr-newsletter.md
          if-no-files-found: error
```

Replace `YOUR_ORG/pr-newsletter` with the owner and repository containing this tool. Pin the action to a release tag such as `v1` or to a commit SHA.

The action runs in the calling repository, so it reads that repository's merged pull requests. Each successful run with matching pull requests produces `pr-newsletter.md`; the example uploads it as a downloadable workflow artifact. To inspect the prompt sent to OpenAI, enable GitHub Actions step debugging by setting the `ACTIONS_STEP_DEBUG` repository secret to `true`. The prompt is emitted through GitHub's debug log channel and is not written as an artifact.
