# Universal Performance Testing Tool with Playwright

This repository contains a Node.js application that uses Playwright to measure the page load time for websites with and without specific scripts being blocked. The tests are conducted on both desktop and mobile (iPhone 12 emulation), and the results are saved in an Excel file.

## Author
This project was developed by Maciej Kutzmann.

## Features
- Measure page load time for a list of URLs.
- Block specific scripts (e.g., Instatag and Adobe) and compare performance by specifying the scripts in a blocklist file.
- Run tests for both desktop and mobile emulation.
- Save results in an Excel file with detailed columns for each run.

## Prerequisites
- Node.js installed (v14 or later).
- Playwright, ExcelJS, and csv-parse libraries.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/MaciejKut/performancePlaywrightMK.git


- install dependencies npm install
- install playwright dependencies   npx playwright install

Provide comma spearated list of URLs to pages.csv
https://example.com,https://anotherexample.com

Prepare the blocklist.txt file with a list of scripts (one per line) to be blocked.
Example 
/script.name.com/
/launch-601c2xxxdf.min.js


run the script node performanceTest.js