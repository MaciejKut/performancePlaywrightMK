/**
 * Copyright (c) [2024] Maciej Kutzmann
 * 
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

const { chromium, devices } = require('playwright');
const fs = require('fs');
const { parse } = require('csv-parse');
const ExcelJS = require('exceljs');
const path = require('path');

// Mobile device emulation
const iPhone12 = devices['iPhone 12'];

// Function to check if file exists and is not empty
function checkFileValidity(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size > 0;
    } catch (err) {
        console.error(`Error checking file: ${err.message}`);
        return false;
    }
}

// Function to read blocklist file
function readBlockList(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return data.split('\n').filter(Boolean);
    } catch (err) {
        console.error(`Error reading blocklist file: ${err.message}`);
        return [];
    }
}

// Function to run performance tests
async function measurePerformance(url, blockScripts = [], device = null) {
    const browser = await chromium.launch();
    const context = device ? await browser.newContext({ ...device }) : await browser.newContext();
    const page = await context.newPage();

    let times = [];

    try {
        if (blockScripts.length > 0) {
            await page.route('**/*', (route) => {
                const requestUrl = route.request().url();
                if (blockScripts.some(script => requestUrl.startsWith(script.trim()))) {
                    console.log(`Blocked script: ${requestUrl}`);
                    route.abort();
                } else {
                    route.continue();
                }
            });
        }

        for (let i = 0; i < 3; i++) {
            const startTime = new Date().getTime();
            await page.goto(url, { waitUntil: 'load', timeout: 30000 });
            await page.waitForLoadState('networkidle');
            const endTime = new Date().getTime();
            times.push(endTime - startTime);
        }

        return times;

    } catch (error) {
        console.error(`Error loading page ${url}:`, error.message);
        return ['no response', 'no response', 'no response'];
    } finally {
        await browser.close();
    }
}

// Function to test performance for pages and save results
async function testPerformanceForPages() {
    const pagesFile = 'pages.csv';
    const blocklistFile = 'blocklist.txt';

    if (!checkFileValidity(pagesFile)) {
        console.error('Invalid or empty URL file. Exiting.');
        process.exit(1);
    }

    const blockedScripts = checkFileValidity(blocklistFile) ? readBlockList(blocklistFile) : [];
    if (blockedScripts.length === 0) {
        console.log('No scripts to block or blocklist file is empty. Proceeding without blocking.');
    }

    const csvData = fs.readFileSync(pagesFile, 'utf-8');

    parse(csvData, { delimiter: ',' }, async (err, urls) => {
        if (err) {
            console.error('Error parsing CSV:', err);
            return;
        }

        urls = urls[0];

        console.log(`Testing the first URL: ${urls[0]} to verify setup.`);
        const initialTest = await measurePerformance(urls[0]);
        if (initialTest[0] === 'no response') {
            console.error('Initial URL test failed. Please check the setup.');
            process.exit(1);
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Performance Results');

        worksheet.columns = [
            { header: 'URL', key: 'url', width: 30 },
            { header: 'Device Type', key: 'deviceType', width: 15 },
            { header: 'Page Load 1 (ms)', key: 'load1', width: 15 },
            { header: 'Page Load 2 (ms)', key: 'load2', width: 15 },
            { header: 'Page Load 3 (ms)', key: 'load3', width: 15 },
            { header: 'Blocked Page Load 1 (ms)', key: 'blockedLoad1', width: 20 },
            { header: 'Blocked Page Load 2 (ms)', key: 'blockedLoad2', width: 20 },
            { header: 'Blocked Page Load 3 (ms)', key: 'blockedLoad3', width: 20 },
        ];

        for (const url of urls) {
            console.log(`Testing URL: ${url}`);

            const desktopResults = await measurePerformance(url);
            const desktopBlockedResults = await measurePerformance(url, blockedScripts);

            worksheet.addRow({
                url,
                deviceType: 'Desktop',
                load1: desktopResults[0],
                load2: desktopResults[1],
                load3: desktopResults[2],
                blockedLoad1: desktopBlockedResults[0],
                blockedLoad2: desktopBlockedResults[1],
                blockedLoad3: desktopBlockedResults[2],
            });

            const mobileResults = await measurePerformance(url, [], iPhone12);
            const mobileBlockedResults = await measurePerformance(url, blockedScripts, iPhone12);

            worksheet.addRow({
                url,
                deviceType: 'Mobile',
                load1: mobileResults[0],
                load2: mobileResults[1],
                load3: mobileResults[2],
                blockedLoad1: mobileBlockedResults[0],
                blockedLoad2: mobileBlockedResults[1],
                blockedLoad3: mobileBlockedResults[2],
            });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const testResultsDir = path.join(__dirname, 'testResults');
        
        // Create testResults directory if it doesn't exist
        if (!fs.existsSync(testResultsDir)) {
            fs.mkdirSync(testResultsDir);
        }

        const excelFile = path.join(testResultsDir, `performance_results_${timestamp}.xlsx`);

        try {
            await workbook.xlsx.writeFile(excelFile);
            console.log(`Results successfully saved to ${excelFile}`);
        } catch (error) {
            console.error(`Error saving the Excel file: ${error.message}`);
        }
    });
}

// Start the testing process
testPerformanceForPages();