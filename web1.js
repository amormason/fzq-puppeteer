const puppeteer = require('puppeteer');
const fs = require("fs"); //文件模块
const path = require("path"); //系统路径模块


const {
    loginURL,
    username,
    password,
    verification_code
} = require('./config-web1');
const allGoods = require("./config-web1/allgoods.json");

let isNeedLogin = true;
let errorList;
let page;

const only_set_inventory_value = async (page, product) => {
    const updateResult = await page.evaluate((current) => {
        var errorList = JSON.parse(localStorage.getItem('errorList')) || [];
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
                        errorList.push({
                            ...current,
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
                errorList.push({
                    ...current,
                    src: src,
                    error: `颜色[${color}]不存在网页中`
                });
                console.error(`颜色[${color}]不存在网页中`);
            }
        });
        localStorage.setItem('errorList', JSON.stringify(errorList));
        return {
            errorList,
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
        console.log('1/n 页面登录成功了');
        isNeedLogin = false;
    }


    await page.goto('https://admin.lashowroom.com/old_item_edit.php?item_id=' + product.id);

    const { isNeedDisplay, errorList } = await only_set_inventory_value(page, product);

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
    return errorList;
};

(async () => {
    for (let keyIndex = 0; keyIndex < Object.keys(allGoods).length; keyIndex++) {
        const product = allGoods[Object.keys(allGoods)[keyIndex]];
        console.log('');
        console.log(`正在更新第${keyIndex + 1}/${Object.keys(allGoods).length}:${product.name}[${product.id}]}条`);
        errorList = await update_inv(product, keyIndex, Object.keys(allGoods).length);
    }
    console.log(`第1个网站更新时候发生错误的数量是: ${errorList.launch}`);
    var content = JSON.stringify(errorList);
    //指定创建目录及文件名称，__dirname为执行当前js文件的目录
    var file = path.join(__dirname, 'data/第1个网站的更新库存时候失败记录汇总.json');
    //写入文件
    await fs.writeFile(file, content, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log('第1个网站更新完成并生成了报表：' + file);
    });
})();