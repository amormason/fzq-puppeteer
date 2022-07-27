const puppeteer = require('puppeteer');
const fs = require("fs"); //文件模块
const path = require("path"); //系统路径模块
const { loginURL, username, password, verification_code } = require('./config');

let isNeedLogin = true;
let max_page = 0;
let pageArray = [];
let page;
let goodsListInWeb = [];

const getDataByPage = async (src, pageNumber) => {
    await page.goto(src);

    let list = await page.evaluate((pageNumber) => {
        var listInWeb = [];
        var _$ = $;
        _$('tr').each((index, item) => {
            if (['even', 'odd'].includes(_$(this).attr('class'))) {
                var id = _$(this).find('td:nth-child(1) a').attr('onclick').match(/\d+/)[0];
                var name = _$.trim(_$(this).find('td:nth-child(5)').text().replace('\n\n\n\n', '').replace('\n\n \n\n', '').replace('\n\n\n \n', '').replace('\n \n\n\n', ''));
                listInWeb.push({
                    id: id,
                    name,
                    pageNumber: pageNumber,
                    display: false
                });
            }
        });
        _$('.edit-sub').find('li').each(function (index, item) {
            var name = (_$(this).find('.fix-width-sm').attr('alt')).toUpperCase();
            var id = _$(_$(this).find('input[type="checkbox"]')[0]).attr('value');
            listInWeb.push({
                id: id,
                name,
                pageNumber: pageNumber,
                display: true
            });
        });
        return listInWeb;
    }, pageNumber);
    return list;
};

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
        await page.on('dialog', async dialog => {
            if (dialog.message().includes('Are you sure to display this style now, this will reset any scheduled display date')) {
                dialog.accept();
            }
        })


        await page.goto(loginURL);
        await page.type('#uname', username, {
            delay: 10
        });
        await page.type('#login_pwd', password, {
            delay: 10
        });
        let loginButton = await page.$('body > div.login > div.login_flds > form > div:nth-child(4) > div.fl_r > input.btn.f14.tar.action-black.login-submit')
        await loginButton.click();
        await page.waitForNavigation();

        await page.type('#verification_code', verification_code, {
            delay: 10
        });
        let submit_button = await page.$('body > form > div.login > div.login_flds > div.fl_r > div:nth-child(3) > input');
        await submit_button.click();
        await page.waitForNavigation();
        console.log('0.数网站上商品时候 - 登录成功');
        isNeedLogin = false;
    }

    // await page.goto(`https://admin.lashowroom.com/item_dis_cat.php?category_id=all&pd=1&cd=1&sd=d`);
    // max_page = await page.evaluate(() => {
    //     return parseInt($("#edit_form > table > tbody > tr:nth-child(3) > td").children(':last-child').text())
    // });
    // pageArray = Array.from(Array(max_page), (v, k) => k + 1);
    // for (let index = 0; index < pageArray.length; index++) {
    //     const pageNumber = pageArray[index];
    //     const src = `https://admin.lashowroom.com/item_dis_cat.php?category_id=all&pd=${pageNumber}&cd=1&sd=d`
    //     const list = await getDataByPage(src, pageNumber);
    //     goodsListInWeb = [...goodsListInWeb, ...list];
    //     console.log(`Display的第${pageNumber}/${max_page}页共找到${list.length}个商品`);
    //     console.log('');
    // }

    await page.goto(`https://admin.lashowroom.com/item_rem_cat.php?category_id=all&pr=1&cr=8&sr=d`);
    let list_view_button = await page.$('#list_view_1')
    await list_view_button.click();
    await page.waitForTimeout(3000);
    max_page = await page.evaluate(() => {
        return parseInt($("#edit_form > table > tbody > tr:nth-child(3) > td").children(':last-child').text())
    });
    pageArray = Array.from(Array(max_page), (v, k) => k + 1);
    for (let index = 0; index < pageArray.length; index++) {
        const pageNumber = pageArray[index];
        const src = `https://admin.lashowroom.com/item_rem_cat.php?category_id=all&pr=${pageNumber}&cr=8&sr=d`
        const list = await getDataByPage(src, pageNumber);
        goodsListInWeb = [...list, ...goodsListInWeb];
        console.log(`UnDisplay的第${pageNumber}/${max_page}页共找到${list.length}个商品`);
        console.log('');
    }

    var content = JSON.stringify(goodsListInWeb);
    //指定创建目录及文件名称，__dirname为执行当前js文件的目录
    var file = path.join(__dirname, './data/0.get-all-data-in-web.json');
    //写入文件
    await fs.writeFile(file, content, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log('写入JSON文件成功：' + file);
    });
    return goodsListInWeb;
};

module.exports = getAllDataInWeb;