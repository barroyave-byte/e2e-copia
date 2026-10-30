import 'dotenv/config';

import { readFileSync } from 'fs';

import { groupSummary, normalizeToString } from './steps';

async function main(pathToJsonFile?: string) {
  // Read JSON input
  const jsonFilePath = pathToJsonFile;
  const jsonInput = readFileSync(jsonFilePath, 'utf-8');

  // all steps always receive and return a string
  const steps = [
    normalizeToString,
    groupSummary,
  ];

  // the output of the last step is the input of the next one
  let result: string = jsonInput;
  for (const step of steps) {
    result = await step(result);
  }

  // create output.md file
  const outputFilePath = `jul-ia-n/release.csv`;
  require('fs').writeFileSync(outputFilePath, result);
  console.log(`✅ Output saved to ${outputFilePath}`);

  return result;
}

// get the file path from the command line arguments
const args = process.argv.slice(2);
const filePath = args[0];

console.time('Total execution time');
main(filePath).finally(() => {
  console.timeEnd('Total execution time');
});
