const puppeteer = require('puppeteer');
const fs = require("fs"); //文件模块
const path = require("path"); //系统路径模块
const { loginURL, username, password, homePage } = require('./config');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let isNeedLogin = true;
let page;

const getTabData = async (page_number, active, token) => {
    const pageURL = active ? `https://vendoradmin.fashiongo.net/api/items?pn=${page_number}&ps=180&orderBy=activatedOn&pageNo=1&pageSize=20&active=true&backUrl=;apn=18;ipn=1;pages=active` : `https://vendoradmin.fashiongo.net/api/items?pn=${page_number}&ps=180&orderBy=lastModified&pageNo=1&pageSize=20&active=false&backUrl=;apn=17;ipn=24;pages=inactive`;
    const response = await fetch(pageURL, {
        "headers": {
            "accept": "application/json",
            "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
            "authorization": token,
            "content-type": "text/plain",
            "sec-ch-ua": "\".Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"103\", \"Chromium\";v=\"103\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "cookie": "OptanonConsent=isIABGlobal=false&datestamp=Sat+Jul+09+2022+14%3A35%3A42+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=6.23.0&hosts=&consentId=aac57e7a-1b15-41ae-8729-37fd40ad53a6&interactionCount=0&landingPath=https%3A%2F%2Fvendoradmin.fashiongo.net%2F%23%2Fauth%2Flogin&groups=C0001%3A1%2CC0003%3A1; __stripe_mid=eae6d4fb-6a9a-4571-b0ae-10ca739f9e6656072b; __stripe_sid=d4aeda93-0447-4bf8-8df7-757838adf6fb812fa0; SESSION=e6089f6c-5701-4990-8a90-63e0ec32ae71; VA_SSO_SESSION=eyJhbGciOiJIUzUxMiJ9.eyJ2ZW5kb3JUeXBlIjoxLCJkc1ZlbmRvcklkIjpudWxsLCJyb2xlIjoiVmVuZG9yQWRtaW4iLCJkc1ZlbmRvclR5cGUiOm51bGwsImRzUmVzb3VyY2VzIjoiIiwicmVzb3VyY2VzIjoiSXRlbXMsIE9yZGVycywgU3RhdGlzdGljcywgUGhvdG8gU3R1ZGlvIiwidXNlck5hbWUiOiJmYXNoaW9uZW1wb3JpbzEiLCJ3aG9sZXNhbGVySWQiOjYzNTUsImF1ZCI6IndlYiIsImdyb3VwSWRzIjpudWxsLCJndWlkIjoiQ0E3ODQzNzQtRjBDNC00Q0MzLUE1Q0YtNDc4OEI0MDY4NzYzIiwic2VjdXJpdHlVc2VySWQiOm51bGwsImlzT3JkZXJTdGF0dXNNYW5hZ2VtZW50IjpmYWxzZSwiZXhwIjoxNjU3NDM1MzQ1LCJzZWN1cml0eVVzZXJSb2xlIjpudWxsfQ.LgkbIDtQSIL0VE1QF4y2c6aV2NXVG6KmPSt_P28zfRhL-PrKKgzMQowvxTgH1icuAUWcVlC_j1w4gof8wNvxrw; aps=3; ips=0; asortby=3; isortby=1",
            "Referer": "https://vendoradmin.fashiongo.net/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
    });
    var res = await response.json();
    // return {
    //     active,
    //     page_number,
    //     records: res.data.records.map(item => item.productId)
    // };
    return res.data.records;
}


const getAllDataInWeb = async () => {
    if (isNeedLogin) {
        const browser = await puppeteer.launch({
            headless: true,
            defaultViewport: {
                width: 2560,
                height: 1440,
            },
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=2560,1440'],
            devtools: true
        });

        page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        await page.goto(loginURL);
        await page.type('input[placeholder="Username"]', username, {
            delay: 10
        });

        await page.type('input[placeholder="Password"]', password, {
            delay: 10
        });

        let rememberMeButton = await page.$('input[type="checkbox"]')
        await rememberMeButton.click();

        let loginButton = await page.$('button[type="submit"]')
        await loginButton.click();

        await page.waitForNavigation();
        console.log('0.数网站上商品时候 - 登录成功');
        isNeedLogin = false;
    }

    await page.goto(homePage);
    await page.waitForTimeout(10000);
    const webInfo = await page.evaluate(() => {
        const webToken = 'Bearer ' + localStorage.getItem('token')
        const list = [
            {
                active: true,
                maxPageNo: parseInt(((parseInt($("#main > div > fg-editall > div.panel.margin-bottom-16 > div.panel__header > div > div.table-grid__left.align-mid > div").text().replace(/[^0-9]/ig, ""))) / 180) + 1),
                total: parseInt($("#main > div > fg-editall > div.panel.margin-bottom-16 > div.panel__header > div > div.table-grid__left.align-mid > div").text().replace(/[^0-9]/ig, ""))
            },
            {
                active: false,
                maxPageNo: parseInt(((parseInt($("#main > div > fg-editall > div:nth-child(6) > div > div > div.table-grid__left.align-mid > div").text().replace(/[^0-9]/ig, ""))) / 180) + 1),
                total: parseInt($("#main > div > fg-editall > div:nth-child(6) > div > div > div.table-grid__left.align-mid > div").text().replace(/[^0-9]/ig, ""))
            }
        ];
        return {
            list,
            webToken
        };
    });
    const { list, webToken } = webInfo;

    let allGoodsMap = {};
    let target_count = 0;

    await list.map(async tab => {
        const { active, maxPageNo, total } = tab;
        target_count += total;
        const pageNumberArray = Array.from(Array(maxPageNo)).map((item, index) => index + 1);
        return await pageNumberArray.map(async page_number => {
            const records = await getTabData(page_number, active, webToken);
            records.map(record => {
                if (allGoodsMap[record.productId]) {
                    console.log('居然有重复的:', record);
                } else {
                    // allGoodsMap[record.productId] = record.productName.toUpperCase();

                    allGoodsMap[record.productName.toUpperCase()] = record.productId;
                    // allGoodsMap[record.productName.toUpperCase()] = {
                    //     id: record.productId,
                    //     name: record.productName.toUpperCase(),
                    //     price: record.sellingPrice
                    // };
                }
            });
            var content = JSON.stringify({ allGoodsMap, webToken });
            //指定创建目录及文件名称，__dirname为执行当前js文件的目录
            var file = path.join(__dirname, `data/0.get-all-data-in-web.json`);
            //写入文件
            fs.writeFile(file, content, function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log((active ? '上架的第 ' : '未上架的第 ') + page_number + '/' + maxPageNo + '页, 已经获取' + Object.keys(allGoodsMap).length + '个商品,理论值是: ' + target_count);
            });
            return allGoodsMap;
        });
    });
};

getAllDataInWeb();