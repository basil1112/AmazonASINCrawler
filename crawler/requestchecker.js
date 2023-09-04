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
    /**
     *  set ASIN DATA data to the process function 
     *  Reference method util.js fn:setFilePath
     */
    utils.setFilePath(__dirname + "/apify_storage/datasets/firstdataset/input.json");
    //await utils.processDataSet();
    await utils.getAuthKey('https://www.amazon.in/dp/B07BMXQRL9');

}

clearPreviousState(key_value_store).then(e => {

    Apify.main(crawlerFunction);
});



