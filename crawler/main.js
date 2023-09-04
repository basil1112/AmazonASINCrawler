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
    //utils.setFilePath(__dirname + "/apify_storage/datasets/firstdataset/000000001.json");
    await utils.processDataSet();

}

clearPreviousState(key_value_store).then(e => {

    Apify.main(crawlerFunction);
});


const crawlerFunctionSingle = async (data) => {
    /**
     *  set ASIN DATA data to the process function 
     *  Reference method util.js fn:setFilePath
     */
    await utils.processDataSetFromJson(data);

}


const crawFromRequest = (data) => {

    clearPreviousState(key_value_store).then(e => {
        Apify.main(crawlerFunctionSingle(data));
    });
}


module.exports = crawFromRequest;





