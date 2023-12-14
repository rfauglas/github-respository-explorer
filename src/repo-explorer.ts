import { Octokit } from '@octokit/rest';
import * as yargs from 'yargs';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as glob from 'glob';
import * as csvWriter from 'csv-write-stream';

// Load environment variables from .env file
dotenv.config();

const argv = yargs
  .usage('Usage: $0 [--line_pattern <line_pattern>] [--org <org>] [--csv <path>] [--language <language>] [--file_pattern <file_pattern>]')
  .option('line_pattern', {
    describe: 'Pattern to search for lines in files',
    type: 'string',
  })
  .option('org', {
    describe: 'GitHub organization to search in',
    type: 'string',
  })
  .option('csv', {
    describe: 'Path to output CSV file with matches',
    type: 'string',
  })
  .option('language', {
    describe: 'Programming language to filter repositories by',
    type: 'string',
  })
  .option('file_pattern', {
    describe: 'File pattern to search for in repositories',
    type: 'string',
  })
  .help('h')
  .alias('h', 'help')
  .argv as { line_pattern: string; org?: string; csv?: string; language?: string; file_pattern?: string };

const csv = process.env.CSV_PATH || argv.csv;
const language = process.env.LANGUAGE || argv.language;
const org = process.env.ORG || argv.org || exitMissingParameter();
const line_pattern = process.env.LINE_PATTERN || exitMissingParameter();
const file_pattern = process.env.FILE_PATTERN || exitMissingParameter();

function exitMissingParameter(): string {
  yargs.showHelp();
  process.exit(1);
  return "";
}

// Introduced constant for the repos folder path
const REPOSITORIES_PATH = '.repositories';

// Function to authenticate with GitHub API
function authenticateWithGitHub() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
  return octokit;
}

// Function to clone a repository or update it if it already exists
function cloneOrUpdateRepository(repoName: string, cloneUrl: string) {
  const reposDir = path.join(__dirname, '..', REPOSITORIES_PATH);
  if (!fs.existsSync(reposDir)) {
    fs.mkdirSync(reposDir, { recursive: true });
  }
  const repoDir = path.join(reposDir, repoName);
  if (fs.existsSync(repoDir)) {
    // If the repository already exists, update it
    console.log(`Updating repository: ${repoName}`);
    child_process.execSync(`git -C "${repoDir}" pull`, { stdio: 'inherit' });
  } else {
    // If the repository does not exist, clone it
    console.log(`Cloning repository: ${repoName}`);
    child_process.execSync(`git clone ${cloneUrl} "${repoDir}"`, { stdio: 'inherit' });
  }
}

interface Match {
    repoName: string;
    fileName: string;
    lineContent: string;
    lineNumber: number;
  }
  
  // Function to search for the line_pattern in all files under the specified file_pattern
  function searchPatternInRequirements(repoName: string): Match[] {
    const repoDir = path.join(__dirname, '..', REPOSITORIES_PATH, repoName);
    const requirementsPattern = path.join(repoDir, file_pattern);
    const matches: Match[] = [];
    const linePatternRegex = new RegExp(line_pattern); // Convert the line_pattern to a regular expression
    const files = glob.sync(requirementsPattern);
    files.forEach(filePath => {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n');
      lines.forEach((line, index) => {
        if (linePatternRegex.test(line)) { // Use the regex test method for line_pattern matching
          matches.push({
            repoName: repoName,
            fileName: path.basename(filePath),
            lineContent: line,
            lineNumber: index + 1
          });
        }
      });
    });
    return matches;
  }

// Function to write matches to a CSV file
function writeMatchesToCSV(matches: Match[], csvFilePath: string) {
  const writer = csvWriter({ headers: ['repoName', 'fileName', 'lineContent', 'lineNumber'] });
  writer.pipe(fs.createWriteStream(csvFilePath));
  matches.forEach(match => writer.write(match));
  writer.end();
}

// Main function to run the utility
async function main() {
  const octokit = authenticateWithGitHub();

  // Initialize an array to hold all matches
  const allMatches: Match[] = [];

  // Fetch repositories from the provided organization that are written in the specified language
  try {
    const { data } = await octokit.search.repos({
      q: `org:${org} ${language? 'language:'+language:''}`,
      sort: 'updated',
      order: 'desc',
    });

    for (const repo of data.items) {
      console.log(`Cloning or updating repository: ${repo.full_name}`);
      cloneOrUpdateRepository(repo.name, repo.clone_url);
      // Concatenate the results to the allMatches array
      allMatches.push(...searchPatternInRequirements(repo.name));
    }

    // If the --csv option is provided, write the matches to the CSV file
    if (argv.csv) {
      writeMatchesToCSV(allMatches, argv.csv);
      console.log(`Matches written to CSV file at: ${argv.csv}`);
    } else {
      // Print the aggregated list of matches to the console
      console.log(allMatches);
    }

  } catch (error) {
    console.error(`Error fetching repositories: ${error.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});