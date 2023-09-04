
const Apify = require('apify');
const ApifyClient = require('apify-client');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment');
const FormData = require('form-data');

const _TOKEN = "F3PjressaodHqwxYHToJhwPs5"
const _MAILTO = "basil1112@gmail.com";


let PRICE_TRACKER_AUTH = undefined;


/**
 * Path to keyword crawled data amazon ASIN json file
 */
var mainDataSetPath = ``;

const { log } = Apify.utils;

let count = 0;

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
                    console.log("ERROR", err);
                } else {
                    try {
                        resolve(JSON.parse(content));
                    } catch (err) {
                        console.log("ERROR", err);
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

                    var urlObject = new Object();
                    urlObject.headers = {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'User-Agent': 'Mozilla / 5.0(Windows NT 10.0; Win64; x64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 115.0.0.0 Safari / 537.36',
                        'Accept-Encoding': 'gzip',
                    }
                    urlObject.url = "https://pricehistoryapp.com/";

                    processURL.push(urlObject);


                    for (var i = 0; i < ASIN_PRODUCTS.ASIN_DATA.length; i++) {
                        var urlObject = new Object();
                        urlObject.headers = {
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                            'User-Agent': (i % 2 == 0) ? 'Mozilla / 5.0(Windows NT 10.0; Win64; x64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 115.0.0.0 Safari / 537.36' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.200',
                            'Accept-Encoding': 'gzip',
                        }
                        urlObject.url = `https://www.amazon.in/dp/${ASIN_PRODUCTS.ASIN_DATA[i].ASIN_ID}`
                        urlObject.id = ASIN_PRODUCTS.ASIN_DATA[i].ASIN_ID;
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
                            maxConcurrency: 2,
                            // Here you can set options that are passed to the Apify.launchPuppeteer() function.
                            launchContext: {
                                launchOptions: {
                                    headless: true,
                                    //executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
                                    // Other Puppeteer options like use chrome,proxy URL
                                },
                            },
                            // Stop crawling after several pages
                            maxRequestsPerCrawl: 80,
                            // This function will be called for each URL to crawl.
                            // Here you can write the Puppeteer scripts you are familiar with,
                            // with the exception that browsers and pages are automatically managed by the Apify SDK.
                            // The function accepts a single parameter, which is an object with the following fields:
                            // - request: an instance of the Request class with information such as URL and HTTP method
                            handlePageFunction: async ({ request, page }) => {
                                console.log(`Processing ${request.url}...`);


                                if (request.url == "https://pricehistoryapp.com/") {

                                    await page.waitForTimeout(1000);
                                    let urlText = null;
                                    try {
                                        await page.type('*[placeholder="Enter name or paste the product link"]', "https://www.amazon.in/dp/B0C6KBHPZW")
                                        await page.waitForTimeout(1000);
                                        let xxxx = await page.$eval('.flex.flex-col.mt-5.space-y-1 > button', (el) => el.textContent);
                                        page.on('requestfinished', async (request) => {
                                            PRICE_TRACKER_AUTH = request.headers()["auth"] != undefined ? request.headers()["auth"] : PRICE_TRACKER_AUTH;
                                            console.log("AUTH DONE", PRICE_TRACKER_AUTH);
                                        });
                                        await page.waitForTimeout(1000);
                                        await page.click('button[title="Search Price History"]');
                                        await page.waitForTimeout(3000);


                                    } catch (error) {
                                        console.log("PROD", error);
                                    }


                                }
                                else {

                                    await page.waitForTimeout(1000);
                                    /**
                                     * $page gives the html of the current processed page
                                     * find out the elements using $eval / $$eval selectors
                                     * try catch block for exception handling on element not found
                                     */

                                    //productTitle class name .product-title-word-break
                                    const productTitle = await page.$eval('.product-title-word-break', (el) => el.innerHTML.trim());
                                    let productPrice = '';
                                    try {
                                        productPrice = await page.$eval('.a-offscreen', (el) => el.innerHTML.trim());
                                    } catch (error) {
                                        productPrice = '';
                                    }

                                    //productDescription ID name #productDescription
                                    let productDescription = null;
                                    try {
                                        productDescription = await page.$eval('#feature-bullets > .a-unordered-list.a-vertical.a-spacing-mini ', (el) => el.innerHTML.trim());
                                        productDescription = await utils.extractLIInnerHtml(productDescription);
                                        productDescription = await utils.extractSpanInnerHtml(productDescription);
                                    } catch (error) {
                                        console.log("PROD", error);
                                        try {
                                            productDescription = await page.$eval('#productDescription > p > span ', (el) => el.textContent.trim());

                                        } catch (error) {
                                            productDescription = null;
                                        }
                                    }



                                    //offers class name .a-span12 a-color-price a-size-base priceBlockSavingsString
                                    let offers = "";
                                    try {
                                        let mrp = null;
                                        const mrpPriceElement = await page.$eval('.a-price.a-text-price > .a-offscreen', (el) => el.innerHTML.trim());
                                        console.log(mrpPriceElement);
                                        if (mrpPriceElement) {
                                            const mrp_n = mrpPriceElement.trim();
                                            console.log(`MRP: ${mrp_n}`);
                                            mrp = parseFloat(
                                                mrp_n
                                                    .replace('M.R.P.:', '')
                                                    .replace('Rs.', '')
                                                    .replace(',', '')
                                                    .replace('₹', '')
                                                    .replace('€', '')
                                                    .replace('$', '')
                                                    .trim()
                                            );
                                            if (isNaN(mrp)) {
                                                mrp = null;
                                            }
                                        } else {
                                            mrp = price;
                                        }

                                        console.log("MRP", mrp);
                                        offers = mrp;
                                    } catch (error) {
                                        console.
                                            offers = null;
                                    }


                                    await page.waitForTimeout(4000);

                                    let productImage = null;
                                    try {
                                        productImage = await page.$$eval('#imgTagWrapperId img[src]', imgs => imgs.map(img => img.getAttribute('src')));
                                    } catch (error) {
                                        console.log("product image error", error);
                                        productImage = null;
                                    }

                                    console.log("IMG0", productImage);

                                    let dealMsg = ""
                                    try {
                                        dealMsg = await page.$eval('#dealBadgeSupportingText', (el) => el.innerHTML.trim());
                                        const textRegex = /<span[^>]*>(.*?)<\/span>/;
                                        dealMsg = dealMsg.match(textRegex)[1];
                                    } catch (error) {
                                        console.log("product image error", error);
                                        dealMsg = null;
                                    }

                                    console.log("Deal", dealMsg);


                                    let productCategory = null;
                                    try {
                                        productCategory = await page.$eval('#wayfinding-breadcrumbs_feature_div > ul > li > span > a', (el) => el.textContent.trim());
                                    } catch (error) {
                                        console.log("PROD", error);
                                        productCategory = null;
                                    }

                                    console.log("productCAT", productCategory);

                                    let productRating = null

                                    try {
                                        productRating = await page.$eval("#acrPopover > span > a > span", (el) => el.textContent.trim())
                                    } catch (error) {
                                        productRating = 1;
                                        console.log("Rating Error", error);
                                    }

                                    let ratingCount = null;

                                    try {

                                        ratingCount = await page.$eval("#acrCustomerReviewText", (el) => el.textContent.trim());

                                    } catch (error) {
                                        ratingCount = 0;
                                    }


                                    let _singleProductDetails = {
                                        "id": request.id,
                                        "title": productTitle,
                                        "price": productPrice,
                                        "offer": offers,
                                        "deal": dealMsg,
                                        "description": productDescription,
                                        "category": productCategory,
                                        "image": productImage,
                                        "rating": {
                                            "rate": productRating,
                                            "count": ratingCount
                                        },
                                        "platforms": {
                                            "amazon": request.url + "/amzn111_2",
                                        },
                                        "date": (moment(new Date()).utc().valueOf() / 1000)
                                    }


                                    let _singleProductDetails1 = {
                                        "id": request.id,
                                        "name": productTitle,
                                        "country": {
                                            "currency_icon": "₹",
                                            "country_code": "en-in"
                                        },
                                        "slug": productTitle,
                                        "image": productImage,
                                        "highest_price": -1112,
                                        "discount": offers,
                                        "price": productPrice,
                                        "store": {
                                            "name": "Amazon",
                                            "slug": "amazon-in",
                                            "prime_image": "https://cdn.pricehistory.in/media/store/Amazon-Prime.png",
                                            "image": "https://cdn.pricehistory.in/media/store/amazon.png",
                                            "isSearchable": true,
                                            "searchUrl": "https://www.amazon.in/s?k=",
                                            "searchSeperator": "+"
                                        },
                                        "category": {
                                            "name": productCategory,
                                            "slug": productCategory
                                        },
                                        "features": [],
                                        "rating": productRating,
                                        "rating_count": ratingCount,
                                        "url": request.url + "/amzn111_2",
                                        "is_prime": false
                                    }


                                    try {

                                        let apiUrl = 'https://ph.pricetoolkit.com/api/product/history/getSlugFromUrl';
                                        const config = {
                                            headers: {
                                                'auth': PRICE_TRACKER_AUTH
                                            }
                                        };

                                        let formData = new FormData();
                                        formData.append('purl', request.url);
                                        let resposnePrice = await axios.post(apiUrl, formData, config);
                                        if (resposnePrice.status == 200 && resposnePrice.data.slug) {

                                            apiUrl = "https://ph.pricetoolkit.com/api/product/history/updateFromSlug";
                                            formData = new FormData();
                                            formData.append("slug", resposnePrice.data.slug);
                                            let hereWeGo = await axios.post(apiUrl, formData, config);
                                            console.log("RESPONSE", hereWeGo.data);

                                            _singleProductDetails1["highest_price"] = hereWeGo.data.highest_price;

                                        }

                                    } catch (error) {

                                    }


                                    /**
                                     * Pushing product object to array
                                     */

                                    _productList.Amazon.push(_singleProductDetails1);

                                }



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


                        await axios.post("http://localhost:3000/start_tinyurl", { "inputData": _productList });


                        processDataSetResolve(true);

                    });
                })
                .catch(error => {
                    console.log("TEST RUN", error);
                });
        });

    },


    extractLIInnerHtml: async (htmlString) => {

        return new Promise((resolve, reject) => {
            const liRegex = /<li[^>]*>(.*?)<\/li>/g;
            const matches = htmlString.match(liRegex);

            if (matches) {
                const liTextArray = matches.map(match => {
                    const textRegex = /<li[^>]*>(.*?)<\/li>/;
                    const textMatch = match.match(textRegex);
                    return textMatch[1];
                });

                return resolve(liTextArray);
            }

            return resolve([]);
        })
    },

    extractSpanInnerHtml: async (htmlString) => {

        htmlString = htmlString.join(" ");

        return new Promise((resolve, reject) => {
            const liRegex = /<span[^>]*>(.*?)<\/span>/g;
            const matches = htmlString.match(liRegex);

            if (matches) {
                const liTextArray = matches.map(match => {
                    const textRegex = /<span[^>]*>(.*?)<\/span>/;
                    const textMatch = match.match(textRegex);
                    return textMatch[1];
                });

                return resolve(liTextArray);
            }

            return resolve([]);
        })
    },

    getAuthKey: async (url) => {

        return new Promise((processDataSetResolve1, processDataSetResolveReject) => {

            let processURL = new Array();

            var urlObject = new Object();
            urlObject.headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'User-Agent': 'Mozilla / 5.0(Windows NT 10.0; Win64; x64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 115.0.0.0 Safari / 537.36',
                'Accept-Encoding': 'gzip',
            }
            urlObject.url = "https://pricehistoryapp.com/";

            processURL.push(urlObject);

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
                    maxConcurrency: 2,
                    // Here you can set options that are passed to the Apify.launchPuppeteer() function.
                    launchContext: {
                        launchOptions: {
                            headless: true,
                            //executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
                            // Other Puppeteer options like use chrome,proxy URL
                        },
                    },
                    // Stop crawling after several pages
                    maxRequestsPerCrawl: 80,
                    // This function will be called for each URL to crawl.
                    // Here you can write the Puppeteer scripts you are familiar with,
                    // with the exception that browsers and pages are automatically managed by the Apify SDK.
                    // The function accepts a single parameter, which is an object with the following fields:
                    // - request: an instance of the Request class with information such as URL and HTTP method
                    handlePageFunction: async ({ request, page }) => {
                        console.log(`Processing ${request.url}...`);
                        await page.waitForTimeout(1000);
                        //productDescription ID name #productDescription
                        let urlText = null;
                        try {
                            await page.type('*[placeholder="Enter name or paste the product link"]', url)
                            await page.waitForTimeout(1000);
                            let xxxx = await page.$eval('.flex.flex-col.mt-5.space-y-1 > button', (el) => el.textContent);
                            page.on('requestfinished', async (request) => {
                                PRICE_TRACKER_AUTH = request.headers()["auth"] != undefined ? request.headers()["auth"] : PRICE_TRACKER_AUTH;



                            });
                            await page.waitForTimeout(1000);
                            await page.click('button[title="Search Price History"]');
                            await page.waitForTimeout(3000);

                            const jsonFilePath = path.join(__dirname, '/apify_storage/datasets/firstdataset/', 'Auth.json');

                            let data = {
                                "Auth": PRICE_TRACKER_AUTH
                            }

                            fs.writeFile(jsonFilePath, JSON.stringify(data, null, 2), () => {



                            });



                        } catch (error) {
                            console.log("PROD", error);
                        }
                    },
                    // This function is called if the page processing failed more than maxRequestRetries+1 times.
                    handleFailedRequestFunction: async ({ request }) => {
                        console.log(`Request ${request.url} failed too many times.`);
                    },
                });
                // Run the crawler and wait for it to finish.
                await crawler.run();
                processDataSetResolve1(true);
            });

        });

    },

    processListAgain: async () => {





        /*  console.log("gettign auth..............");
         await utils.getAuthKey(request.url);
         console.log("GOT THE AUTH....................");
 
         const apiUrl = 'https://ph.pricetoolkit.com/api/product/history/getSlugFromUrl';
         const config = {
             headers: {
                 'auth': PRICE_TRACKER_AUTH
             }
         };
 
         const formData = new FormData();
         formData.append('purl', request.url);
         let resposnePrice = await axios.post(apiUrl, formData, config);
         console.log("KILLER...........", resposnePrice); */


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
                    buffer = Buffer.from(JSON.stringify(jsonResponse, null, 4)).toString('base64');

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
                    console.log("SENDING MAIL ERROR", error);
                })

            } catch (error) {
                console.log("SOMEERROR", error);
            }

        });

    },













}

module.exports = utils;