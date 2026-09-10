const fs = require('fs');
const path = require('path');
const { collectMergedPullRequests } = require('./github');
const { buildNewsletterInput } = require('./format');
const { generateNewsletter } = require('./openai');

function input(name, fallback) {
  const value = process.env[`INPUT_${name.toUpperCase()}`];
  return value || fallback;
}

function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  fs.appendFileSync(outputFile, `${name}<<EOF\n${value}\nEOF\n`);
}

function writeFile(outputPath, contents) {
  const fsPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(fsPath), { recursive: true });
  fs.writeFileSync(fsPath, contents);
}

async function main() {
  const token = input('github_token');
  const apiKey = input('openai_api_key', process.env.OPENAI_API_KEY);
  const model = input('model', 'gpt-5');
  const outputPath = input('output_path', 'pr-newsletter.md');
  const lookbackDays = Number(input('lookback_days', '7'));
  const repository = process.env.GITHUB_REPOSITORY;

  if (!token) throw new Error('The github_token input is required.');
  if (!apiKey) throw new Error('The openai_api_key input is required.');
  if (!model) throw new Error('The model input must not be empty.');
  if (!repository?.includes('/')) {
    throw new Error('GITHUB_REPOSITORY must contain an owner and repository name.');
  }
  if (!Number.isInteger(lookbackDays) || lookbackDays < 1) {
    throw new Error('lookback_days must be a positive whole number.');
  }

  const [owner, repo] = repository.split('/', 2);
  const end = new Date();
  const start = new Date(end.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const pulls = await collectMergedPullRequests({ token, owner, repo, start });

  if (pulls.length === 0) {
    console.log(`No pull requests were merged between ${start.toISOString()} and ${end.toISOString()}.`);
    setOutput('has_prs', 'false');
    return;
  }

  const report = buildNewsletterInput({ owner, repo, start, end, pulls });
  report.split('\n').forEach((line) => {
    console.log(`::debug::${line.replaceAll('%', '%25')}`);
  });

  const newsletter = await generateNewsletter({ apiKey, model, prompt: report });
  writeFile(outputPath, newsletter);
  setOutput('has_prs', 'true');
  setOutput('output_path', outputPath);
  console.log(`Generated newsletter from ${pulls.length} merged pull requests into ${outputPath}.`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
