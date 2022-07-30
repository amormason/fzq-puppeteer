const puppeteer = require('puppeteer');
const fs = require("fs");
const nodeXlsx = require('node-xlsx'); //文件模块
const path = require("path"); //系统路径模块
const { loginURL, username, password, verification_code } = require('./config');
const matchID = require('./1.match-id');

const json_to_sheet = (arr) => {
    let result = [];
    arr.forEach(element => {
        let row = [];
        Object.keys(element).map(col => {
            if (Object.prototype.toString.call(element[col]) !== '[Object Object]') {
                row.push(element[col])
            }
        })
        result.push(row);
    });
    return result;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
let isNeedLogin = true;
let errorListWhenUpdateInv;
let page;

const only_set_inventory_value = async (page, product) => {
    await page.waitForTimeout(2000);
    const updateResult = await page.evaluate((current) => {
        var errorListWhenUpdateInv = JSON.parse(localStorage.getItem('errorListWhenUpdateInv')) || [];
        var src = document.location.href;
        const _$ = $;
        const runsTR = [];
        _$("#itemcolor > tbody > tr:nth-child(2) th").each(function (index, item) {
            var runName = _$.trim(_$(item).text()).replace('Prepack ', '');
            runName = runName.slice(runName.indexOf('(') + 1, runName.length - 1).replace('RUN-', '');
            // console.log(runName);
            runsTR.push({
                name: runName,
                th: 5 + index
            });
        });
        // console.log('runsTR', runsTR);

        // 如果网页上存在的颜色不存在Excel中的话,那么对应的库存信息会被设置成0
        // 如果网页上存在的颜色存在Excel中的话,那么对应的库存信息会被设置成Excel中的库存信息
        // 如果excel中存在的颜色或者库存不存在网页中,那么此时就应该报错了

        // 1.清空已有库存数据
        const colorsInWeb = {};

        _$('#itemcolor tbody tr').each(function (index, tr) {
            var color = _$(tr).find('td:nth-child(4) input').val();
            if (color) {  // 删除黑色的行和空白的行   
                colorsInWeb[color] = [];
                runsTR.map(runInWeb => {
                    _$(this).find('td:nth-child(' + runInWeb.th + ')').find('input[type="text"]').val(0);
                    colorsInWeb[color].push(runInWeb.name);
                });
            };
        });


        // 2.将Excel中的库存信息设置到网页中
        var colorObject = current.colorObject;
        Object.keys(colorObject).map(color => {
            // 判断excel中的颜色是否存在网页中
            var inventoryArrayInWeb = colorsInWeb[color];

            if (inventoryArrayInWeb && inventoryArrayInWeb.length > 0) {
                // 如果颜色存在,那么再检查该颜色的所有run是否存在
                colorObject[color].map(inventoryInExcel => {  //[{"runName":"B12","inventory":999}]
                    if (!inventoryArrayInWeb.includes(inventoryInExcel.runName)) {
                        errorListWhenUpdateInv.push({
                            id: current.id,
                            name: current.name,
                            display: current.display,
                            src: src,
                            error: `${current.name}[${current.id}]-color[${color}]的run名字[${inventoryInExcel.runName}]不存在网页中`
                        });
                        console.error(`${current.name}[${current.id}]-color[${color}]的run名字[${inventoryInExcel.runName}]不存在网页中`);
                    } else {
                        // 如果color和run都匹配上了就开始正式更新库存数据
                        _$('#itemcolor tbody tr').each(function (index, tr) {
                            var colorInWeb = _$(tr).find('td:nth-child(4) input').val();
                            runsTR.map(runInWeb => {
                                var runNameInWeb = runInWeb.name;
                                if (colorInWeb === color && runNameInWeb === inventoryInExcel.runName) {  // 删除黑色的行和空白的行   
                                    let inventoryValue = inventoryInExcel.inventory;
                                    if (inventoryInExcel.inventory == 999) {
                                        inventoryValue = '';
                                    }
                                    _$(tr).find('td:nth-child(' + runInWeb.th + ')').find('input[type="text"]').val(inventoryValue);
                                };
                            });
                        });
                    }
                })
            } else {
                errorListWhenUpdateInv.push({
                    id: current.id,
                    name: current.name,
                    display: current.display,
                    src: src,
                    error: `颜色[${color}]不存在网页中`
                });
                console.error(`颜色[${color}]不存在网页中`);
            }
        });
        localStorage.setItem('errorListWhenUpdateInv', JSON.stringify(errorListWhenUpdateInv));
        return {
            errorListWhenUpdateInv,
            isNeedDisplay: _$("#maintbl > tbody > tr:nth-child(1) > td:nth-child(2) > span > input.btn2.show_button.save_form_here").attr('style') !== 'display:none;'
        };
    }, product);
    return updateResult;
}

const update_inv = async (product) => {
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
        console.log('1.正式更新数据时候 - 登录成功');
        isNeedLogin = false;
    }


    await page.goto('https://admin.lashowroom.com/old_item_edit.php?item_id=' + product.id);

    const { isNeedDisplay, errorListWhenUpdateInv } = await only_set_inventory_value(page, product);

    if (isNeedDisplay) { //需要改为显示
        console.log(`当前商品需要更新显示状态为display: ${product.name}[${product.id}]`);
        let display_button = await page.$('#maintbl > tbody > tr:nth-child(1) > td:nth-child(2) > span > input.btn2.show_button.save_form_here');
        await display_button.click();
        await page.waitForNavigation();
        await page.waitForTimeout(1000);
    } else { //直接保存数据
        let save_button = await page.$("#maintbl > tbody > tr:nth-child(1) > td:nth-child(2) > span > input.btn3.pointer.save_form_here");
        await save_button.click();
    }
    await page.waitForTimeout(1000);
    // await page.close();
    // await browser.close();
    return errorListWhenUpdateInv;
};

(async () => {
    const { allGoodsList, idNotFundForUpdate: idNotFundInWebPage = [], goodsListInWeb } = await matchID();
    await sleep(5000);
    for (let keyIndex = 0; keyIndex < allGoodsList.length; keyIndex++) {
        const product = allGoodsList[keyIndex];
        console.log('');
        console.log(`正在更新第${keyIndex + 1}/${allGoodsList.length}条: ${product.name} (商品id是: ${product.id})`);
        errorListWhenUpdateInv = await update_inv(product);
        errorListWhenUpdateInv = errorListWhenUpdateInv.sort((a, b) => {
            var x = a.name.toLowerCase();
            var y = b.name.toLowerCase();
            if (x < y) { return -1; }
            if (x > y) { return 1; }
            return 0;
        })
    }

    console.log(``); console.log(``);
    console.log(`第1个网站更新时候发生错误的数量是: ${errorListWhenUpdateInv.length}`);

    const filename = path.join(__dirname, 'data/第1个网站更新结果.xlsx');
    const header_goodsListInWeb = ['商品ID', '商品名称', '商品列表中的页码', 'display属性'];
    const header_idNotFundInWebPage = ['商品名称', '颜色', 'run的名字', '库存数值'];
    const header_errorListWhenUpdateInv = ['商品ID', '商品名称', '颜色', '详情的链接', '错误的原因'];
    var buffer = nodeXlsx.build([
        {
            name: `在第1个网站上没找到的商品--${idNotFundInWebPage.length}条数据`,
            data: [header_idNotFundInWebPage, ...json_to_sheet(idNotFundInWebPage)]
        },
        {
            name: `更新库存数据时候发生错误--${errorListWhenUpdateInv.length}条数据`,
            data: [header_errorListWhenUpdateInv, ...json_to_sheet(errorListWhenUpdateInv)]
        },
        {
            name: `当前网站上的数据--${goodsListInWeb.length}条数据`,
            data: [header_goodsListInWeb, ...json_to_sheet(goodsListInWeb)]
        }

    ]);

    //写入文件
    await fs.appendFile(filename, buffer, (err) => {
        if (err) {
            console.log(err, '保存excel出错')
        } else {
            console.log('写入成功: ', filename);
        }
    })
    return {
        errorListWhenUpdateInv,
        idNotFundInWebPage
    }
})();