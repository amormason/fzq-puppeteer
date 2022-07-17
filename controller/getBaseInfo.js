const puppeteer = require('puppeteer');
const {
    loginURL,
    vendorID,
    password
} = require('../config');


const getBaseInfo = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: {
            width: 2560,
            height: 1440
        },
        args: [`--window-size=${2560},${1440}`], // new option
    });

    const page = await browser.newPage();
    await page.goto(loginURL);
    debugger;
    await page.type('#id_form_signin > div.form-inputs > div.margin.bottom20 > input', vendorID, {
        delay: 10
    });
    await page.type('#id_form_signin > div.form-inputs > div:nth-child(2) > input', password, {
        delay: 10
    });
    let loginButton = await page.$('#id_btn_signin')
    await loginButton.click();
    await page.waitForNavigation();
    console.log('1/n 页面登录成功了');

    // await page.screenshot({ path: 'example.png' });


    const list = await page.$$eval('ul.nav li', ulLIdom => {
        const pageSize = 400;
        var dd = [];
        for (var i = 0; i < ulLIdom.length; i++) {
            const liString = ulLIdom[i].textContent.replace(/\n/g, '');
            const title = liString.slice(0, liString.indexOf('(')).replace(/\s*/g, "");
            const allCount = liString.replace(/[^0-9]/ig, "") ? parseInt(liString.replace(/[^0-9]/ig, ""), 10) : 0;
            const maxPageNumber = Math.ceil(allCount / pageSize);
            allCount && dd.push({
                title,
                allCount,
                maxPageNumber
            });
        }
        return dd;
    });
    console.log(`2/n 得到了商品数量的基本数据: 总共个${list.length}分类有商品,共有${list.reduce((x, y) => x + y.allCount, 0)}个商品,`);
    await page.close();
    await browser.close();
    return list;
};


module.exports = {
    getBaseInfo
}