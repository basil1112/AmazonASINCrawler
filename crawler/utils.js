
const Apify = require('apify');
const ApifyClient = require('apify-client');
const fs = require('fs');
const path = require('path');

const _TOKEN = "F3PjressaodHqwxYHToJhwPs5"
const _MAILTO = "achu@clifit.com";
/**
 * Path to keyword crawled data amazon ASIN json file
 */
var mainDataSetPath = '';

const { log } = Apify.utils;

var utils = {


    /**
     * Read File from filepath
     * @param {*} filepath 
     * @returns JSON 
     */
    loadJSON: (filepath) => {
        return new Promise((resolve, reject) => {
            fs.readFile(filepath, 'utf8', (err, content) => {
                if (err) {
                    reject(err)
                    console.log("ERROR",err);
                } else {
                    try {
                        resolve(JSON.parse(content));
                    } catch (err) {
                        console.log("ERROR",err);
                        reject(err)
                    }
                }
            })
        });
    },

    /**
     * fn setting ASIN JSON DATA path 
     * invoked from main.js
     * @param {*} filepath 
     */
    setFilePath: (filepath) => {
        console.log(filepath);
        mainDataSetPath = filepath;
    },

    /**
     * fn: process each ASIN Id 
     * Fetch Title,Price,Sellername,description,offers
     * @returns promise<any>
     */
    processDataSet: async () => {

        console.log("............PROCESSING STARTS............");

        return new Promise((processDataSetResolve, processDataSetResolveReject) => {

            utils.loadJSON(mainDataSetPath)
                .then(async (response) => {

                    let ASIN_PRODUCTS = response;
                    let processURL = new Array();

                    for (var i = 0; i < ASIN_PRODUCTS.ASIN_DATA.length; i++) {
                        var urlObject = new Object();
                        urlObject.url = `https://www.amazon.com/dp/${ASIN_PRODUCTS.ASIN_DATA[i].ASIN_ID}`
                        processURL.push(urlObject);
                    }
                   
                    /**
                     * APIFY main 
                     * using PuppeteerCrawler
                     * Passing All amazon ASIN URL constructed in processURL array
                     */
                    Apify.main(async () => {

                        const requestList = new Apify.RequestList({
                            sources: processURL,
                            persistStateKey: 'my-state',
                        });

                        await requestList.initialize();

                        let _productList = new Object();
                        _productList.Amazon = new Array();

                        const crawler = new Apify.PuppeteerCrawler({
                            requestList,
                            // Here you can set options that are passed to the Apify.launchPuppeteer() function.
                            launchContext: {
                                launchOptions: {
                                    headless: true,
                                    // Other Puppeteer options like use chrome,proxy URL
                                },
                            },
                            // Stop crawling after several pages
                            maxRequestsPerCrawl: 50,
                            // This function will be called for each URL to crawl.
                            // Here you can write the Puppeteer scripts you are familiar with,
                            // with the exception that browsers and pages are automatically managed by the Apify SDK.
                            // The function accepts a single parameter, which is an object with the following fields:
                            // - request: an instance of the Request class with information such as URL and HTTP method
                            handlePageFunction: async ({ request, page }) => {
                                console.log(`Processing ${request.url}...`);

                                /**
                                 * $page gives the html of the current processed page
                                 * find out the elements using $eval / $$eval selectors
                                 * try catch block for exception handling on element not found
                                 */

                                //productTitle class name .product-title-word-break
                                const productTitle = await page.$eval('.product-title-word-break', (el) => el.innerHTML.trim());
                                let productPrice = '';
                                try {
                                    productPrice = await page.$eval('.priceBlockBuyingPriceString', (el) => el.innerHTML.trim());
                                } catch (error) {
                                    productPrice = '';
                                }

                                 //productSellerName ID name #sellerProfileTriggerId
                                let productSellerName = null;
                                try {
                                    productSellerName = await page.$eval('#sellerProfileTriggerId', (el) => el.innerHTML.trim());
                                } catch (error) {
                                    productSellerName = null;
                                }

                                 //productDescription ID name #productDescription
                                let productDescription = null;
                                try {
                                    productDescription = await page.$eval('#productDescription', (el) => el.innerHTML.trim());
                                    if (productDescription) {
                                        var start = productDescription.lastIndexOf("<p>")+2;
                                        var end = productDescription.indexOf("</p>")- 2;
                                        productDescription = productDescription.substring((start + 1), end);
                                    }
                                } catch (error) {
                                    productDescription = null;
                                }

                                 //productShipping ID name #ourprice_shippingmessage
                                 // used regex for fetching the span element
                                 //since we cannot find any specify ID/className
                                let productShipping = "Free Shipping";
                                try {
                                    productShipping = await page.$eval('#ourprice_shippingmessage', (el) => el.innerHTML.trim());
                                    if (productShipping) {
                                        var regex = /<span[^>]*>|\$([\d,]+(?:\.\d+)\sShipping?)/g;
                                        var productShippingRegex = new RegExp(regex);
                                        var pro = productShipping.match(productShippingRegex);
                                        productShipping = pro[1] ? "" + pro[1] : null;
                                    }
                                } catch (error) {
                                    console.log("product shipping error", error);
                                    productShipping = null;
                                }

                             //offers class name .a-span12 a-color-price a-size-base priceBlockSavingsString
                                let offers = "";
                                try {
                                    offers = await page.$eval('.a-span12 a-color-price a-size-base priceBlockSavingsString', (el) => el.innerHTML().trim());
                                } catch (error) {
                                    offers = null;
                                }
                                let offers2 = "";
                                try {
                                    offers2 = await page.$eval('#regularprice_savings', (el) => el.innerHTML().trim());
                                    console.log("OFFER TWO", offers2);
                                } catch (error) {
                                    offers2 = null;
                                }

                                /**
                                 * Adding to product details to single Object
                                 */
                                var _singleProductDetails = new Object();
                                _singleProductDetails.Url = request.url;
                                _singleProductDetails.Title = productTitle;
                                _singleProductDetails.Price = productPrice;
                                _singleProductDetails.SellerName = productSellerName;
                                _singleProductDetails.Description = productDescription;
                                _singleProductDetails.ProductShipping = productShipping;
                                _singleProductDetails.offers = offers;

                                /**
                                 * Pushing product object to array
                                 */
                                _productList.Amazon.push(_singleProductDetails);

                            },

                            // This function is called if the page processing failed more than maxRequestRetries+1 times.
                            handleFailedRequestFunction: async ({ request }) => {
                                console.log(`Request ${request.url} failed too many times.`);
                            },
                        });

                        // Run the crawler and wait for it to finish.
                        await crawler.run();
                        /**
                         * Dataset folder name 
                         * to write the processed product details
                         */
                        const processDataSet = await Apify.openDataset("processedDataSet");
                        //writing dataset data
                        await processDataSet.pushData(_productList);

                        console.log('Crawler finished.');

                        /**
                         * fn to sendmail 
                         * Dataset(processed) as attachment
                         */
                        await utils.sendMail();
                        processDataSetResolve(true);

                    });
                })
                .catch(error => {
                    console.log("TEST RUN", error);
                });
        });

    },

    /**
     * APIFY mailer fn
     * @returns promise<any>
     */
    sendMail: async () => {

        return new Promise((resolve, reject) => {

            console.log("Sending mail fn invoked....");
            try {
                const client = new ApifyClient({
                    token: _TOKEN,
                });

                /**
                 * Reading data from processed dataset
                 */
                let _processedDataPath = __dirname + "/apify_storage/datasets/processedDataSet/000000001.json";
                utils.loadJSON(_processedDataPath).then(async jsonResponse => {

                    /**
                     * convert JSON string to Base64 Encoding 
                     * Mail attachment : property accept base64 encoded string
                     */
                    buffer = Buffer.from(JSON.stringify(jsonResponse,null,4)).toString('base64');
            
                    const input = {
                        to: `${_MAILTO}`,
                        subject: "Clifit: This is for the Apify SDK exercise",
                        text: 'processedDataSet',
                        attachments: [{
                            filename: 'processedDataSet.txt',
                            data: buffer
                        }]
                    };
                    console.log("Sending mail....");
                    const run = await client.actor("apify/send-mail").call(input);
                    console.log("Sending mail successfull");
                    
                }).catch(error => {
                    console.log("SENDING MAIL ERROR",error);
                })

            } catch (error) {
                console.log("SOMEERROR", error);
            }

        });

    }

}

module.exports = utils;