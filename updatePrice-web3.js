const EventEmitter = require('node:events');
EventEmitter.setMaxListeners(0);
const {
    promisify
} = require('util')
const sleep = promisify(setTimeout)
let index = 0;
const nodeXlsx = require("node-xlsx"); //引用node-xlsx模块
var fs = require("fs"); //文件模块
var path = require("path"); //系统路径模块

const {
    getWebData
} = require('./web3-pre')
var allData = require("./allDataInWeb.json");

// npm i -S node-xlsx  fs path

const puppeteer = require('puppeteer');
var fs = require('fs'); //文件模块
var path = require('path'); //系统路径模块

const {
    vendorID,
    password
} = require('./config');



let browser = undefined;
let page = undefined;
let isLogin = false;


const updatePrice = async (product) => {
    const pageURL = `https://brand.orangeshine.com/products/update/${product.id}/?redirect_url=/products/list/`;
    index++;
    console.log(`当前正在处理: ${index}/${todoList.length}: `, product);
    if (!isLogin) {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: {
                width: 2560,
                height: 1440
            },
            args: [`--window-size=${2560},${1440}`], // new option
        });
        page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);
        await page.goto(pageURL);
        // await page.waitForTimeout(3000);
        await page.type('#id_form_signin > div.form-inputs > div.margin.bottom20 > input', vendorID, {
            delay: 10
        });
        await page.type('#id_form_signin > div.form-inputs > div:nth-child(2) > input', password, {
            delay: 10
        });
        let loginButton = await page.$('#id_btn_signin')
        await loginButton.click();
        await page.waitForNavigation();
        // await page.goto(pageURL);
        await page.evaluate(() => document.querySelectorAll('#id_form_product input[name="price"]')[0].value = '');
        await page.type('#id_form_product input[name="price"]', product.price.toString());
        const save_button = await page.$('body > div.layout-fixed-header > div.main-panel > div.fixed-main-panel > div > div > div.card.border-bottom.padding.bottom10 > div > p > button');
        await save_button.click();
        await page.waitForTimeout(2000);
        isLogin = true;
    } else {
        await page.goto(pageURL);
        await page.evaluate(() => document.querySelectorAll('#id_form_product input[name="price"]')[0].value = '');
        await page.type('#id_form_product input[name="price"]', product.price.toString());
        const save_button = await page.$('body > div.layout-fixed-header > div.main-panel > div.fixed-main-panel > div > div > div.card.border-bottom.padding.bottom10 > div > p > button');
        await save_button.click();
        await page.waitForTimeout(2000);
    }
}


const test = async () => {
    await getWebData();


    const todoList = [];
    const errorList = [];
    const oldTable = nodeXlsx.parse("./source.xlsx"); //读取excel表格
    let old_content = oldTable[0].data; //取出excel文件中的第一个工作表中的全部数据
    old_content.splice(0, 1); //一般来说表中的第一条数据可能是标题没有用，所以删掉
    old_content.map((item) => {
        var name = item[0].replace(/\s/g, "").toUpperCase();
        var target_price = item[1];
        if (allData[name]) {
            todoList.push({
                name,
                price: target_price,
                id: allData[name]['id']
            })
        } else {
            errorList.push({
                message: '商品都不存在',
                name,
                target_price: target_price
            });
        }
    });
    console.log(`Excel中记录的是${old_content.length}条,需要更新的是${todoList.length}条,不包含匹配不到ID的${errorList.length}条`);

    console.time('更新价格处理完了:');
    for (const product of todoList) {
        await updatePrice(product);
        await sleep(4000);
    }
    console.log('====================================');
    console.timeEnd('更新价格处理完了:');
    console.log('====================================');
}
test();