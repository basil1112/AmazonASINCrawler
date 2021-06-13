const Apify = require('apify');
const utils = require('./utils');
const fs = require('fs');
const path = require('path');
const { rejects } = require('assert');

/**
 * Keyword
 */
const keyword = "Oneplus";

const { log } = Apify.utils;

/**
 * Data directories
 */
const key_value_store = 'apify_storage/key_value_stores/default';
const directory = 'apify_storage/datasets/firstdataset';
const process_directory = 'apify_storage/datasets/processedDataSet';


/**
 * Name of the directory
 * @param {*} directory 
 * @returns promise
 */

const clearPreviousState = (directory) => {
    return new Promise((resolve, rejects) => {
        try {
            fs.readdir(directory, (err, files) => {
                if (err) { rejects(); }
                for (const file of files) {
                    fs.unlink(path.join(directory, file), err => {
                        if (err) throw err;
                    });
                }
                resolve();
            });
            resolve();
        } catch (error) {
            console.log(error);
        }
    });
}


/**
 * Async fn 
 * Crawl the url 
 */
const crawlerFunction = async () => {

    const requestList = await Apify.openRequestList('start-urls', [
        { url: `https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=${keyword}` }
    ]);

    try {
        await clearPreviousState(key_value_store);
    } catch (error) { 
    }
    try {
        await clearPreviousState(directory);    
    } catch (error) {
    }
    try {
        await clearPreviousState(process_directory);
    } catch (error) { 
    }
    
    /**
     * Calling CheerioCrawler
     *  Other alternatives BasicCrawler PuppeteerCrawler
     *  NOTE : PuppeteerCrawler npm module installation required,Also Chromium browser tab will be opened on crawling
     */
    const crawler = new Apify.CheerioCrawler({
        requestList,
        minConcurrency: 10,
        maxConcurrency: 50,
        maxRequestRetries: 1,
        handlePageTimeoutSecs: 30,
        maxRequestsPerCrawl: 10,
        handlePageFunction: async ({ request, $ }) => {
            log.debug(`Processing ${request.url}...`);
            let ASIN_DATA = [];
            $('.s-asin').each((index, el) => {
                ASIN_DATA.push({ ASIN_ID: $(el).attr('data-asin') });
            });

            const mainDataSet = await Apify.openDataset("firstdataset");
            mainDataSet.client
            await mainDataSet.pushData({
                url: request.url,
                ASIN_DATA,
            });
        },
        // This function is called if the page processing failed more than maxRequestRetries+1 times.
        handleFailedRequestFunction: async ({ request }) => {
            log.debug(`Request ${request.url} failed twice.`);
        },
    });
    // Run the crawler and wait for it to finish.
    await crawler.run();
    log.debug('Crawler finished.');

    /**
     *  set ASIN DATA data to the process function 
     *  Reference method util.js fn:setFilePath
     */
    utils.setFilePath(__dirname + "/apify_storage/datasets/firstdataset/000000001.json");
    await utils.processDataSet();


}


clearPreviousState(key_value_store).then(e=>{

    
/**
 * 
 */
    Apify.main(crawlerFunction);
});








