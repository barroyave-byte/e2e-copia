// TODO: This script will be improved
const fs = require('fs');
const path = require('path');

// Function to recursively find .spec.ts files
function findSpecFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      fileList = findSpecFiles(filepath, fileList);
    } else if (file.endsWith('.spec.ts')) {
      fileList.push(filepath);
    }
  });

  return fileList;
}

// Extract TestCase IDs from .spec.ts files
function extractTestCaseIDs(files) {
  return files.map((file) => {
    const fileName = path.basename(file);
    return fileName.substring(0, fileName.length - '.spec.ts'.length);
  });
}

// Save TestCase IDs to a CSV file
function saveToCSV(testCaseIDs, filePath) {
  const data = testCaseIDs.join('\n');
  fs.writeFileSync(filePath, data);
  console.log(`Test Case IDs have been saved to ${filePath}`);
}

// Current directory as starting point
const directoryPath = process.cwd();

// Get all .spec.ts files
const specFiles = findSpecFiles('playwright/tests/');

// Extract TestCase IDs from .spec.ts files
const testCaseIDs = extractTestCaseIDs(specFiles);

// Save TestCase IDs to a CSV file
saveToCSV(testCaseIDs, 'test_case_ids.csv');
