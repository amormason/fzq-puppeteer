const EventEmitter = require('node:events');
EventEmitter.setMaxListeners(0);
const { promisify } = require('util')
const sleep = promisify(setTimeout);
const puppeteer = require('puppeteer');
const nodeXlsx = require("node-xlsx"); //引用node-xlsx模块
const fs = require("fs"); //文件模块
const path = require("path"); //系统路径模块

// const { getWebData } = require('./app');
const { vendorID, password } = require('./config');


let index = 0;
let isFirstTime = true;
let page = undefined;
let browser = undefined;
let errorListWhenUpdateInv = [];
let idNotFundInWebPage = [];
let dataMap = {};


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

const getExcel = async (errorListWhenUpdateInv, idNotFundInWebPage) => {
    const filename = path.join(__dirname, 'data/3.第3个网站更新结果.xlsx');
    const header_idNotFundInWebPage = ['商品名称', '颜色', 'run的名字', '库存数值'];
    const header_errorListWhenUpdateInv = ['错误的原因', '发生错误的网页', '商品名称', '商品ID', '发生错误的颜色/run'];
    var buffer = nodeXlsx.build([
        {
            name: `这些商品在第三个网站上没找到--${idNotFundInWebPage.length}/${Object.keys(dataMap).length}条数据`,
            data: [header_idNotFundInWebPage, ...json_to_sheet(idNotFundInWebPage)]
        },
        {
            name: `更新数据时候发生错误--${errorListWhenUpdateInv.length}条数据`,
            data: [header_errorListWhenUpdateInv, ...json_to_sheet(errorListWhenUpdateInv)]
        }
    ]);

    //写入文件
    fs.appendFile(filename, buffer, (err) => {
        if (err) {
            console.log(err, '保存excel出错')
        } else {
            console.log('更新结果的Excel文件写入成功');
        }
    })
}


const updateInv = async (product) => {
    const pageURL = `https://brand.orangeshine.com/products/update/${product.id}/?redirect_url=/products/list/`;
    page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.goto(pageURL);

    if (isFirstTime) {
        await page.type('#id_form_signin > div.form-inputs > div.margin.bottom20 > input', vendorID, {
            delay: 10
        });
        await page.type('#id_form_signin > div.form-inputs > div:nth-child(2) > input', password, {
            delay: 10
        });
        let loginButton = await page.$('#id_btn_signin');
        await loginButton.click();
        await page.waitForNavigation();
        await page.waitForTimeout(000);
        const view_later_button = await page.$('#id-btn-su-view-later');
        await view_later_button.click();
        isFirstTime = false;
    }

    errorListWhenUpdateInv = await page.evaluate((product) => {
        const { id, name, colorObject, runObject } = product;
        var errorList = JSON.parse(localStorage.getItem('errorList')) || [];
        let current = JSON.parse(JSON.stringify(product));
        var colorsInWeb = [];
        $("#id_color_checkbox > li").each(function (index, item) {
            var color = $.trim($(item).find('label.text a').attr('title')).toUpperCase();
            colorsInWeb.push({ index, color });
        });


        // 1/3 先勾选横着的颜色的checkbox
        Object.keys(colorObject).forEach((color, color_index) => {
            var exitObj = colorsInWeb.find(item => item.color === color);
            var src = document.location.href;
            if (exitObj) {
                const isShouldBeChecked = colorObject[color].some(inventory => !!inventory);
                $(`#id_color_check${exitObj.index + 1}`).prop('checked', isShouldBeChecked);
            } else {
                current.errorMsg = `商品${current.name}[${current.id}]在勾选颜色的checkbox的时候没找到第${color_index}个颜色:${color}`;
                current.goodURL = src;
                errorList.push({
                    errorMsg: current.errorMsg,
                    URL: src,
                    name,
                    id,
                    color
                });
            }
        });


        // 2/3 总的激活状态更新
        var activeValuePers = [];
        $("#id_color_checkbox input[type='checkbox']").each(function (index, item) {
            activeValuePers.push($(this).prop('checked'));
        });
        var isStatusCanBeActive = activeValuePers.some(item => !!item);
        isStatusCanBeActive ? $("#id_status_active").click() : $("#id_status_inactive").click();

        console.log('====================================');
        console.log('isStatusCanBeActive:', isStatusCanBeActive);
        console.log('====================================');

        // 3/3 再勾选表格里面的checkbox
        var isShowSizeTable = undefined;
        $("#id_form_product > div > div.padding.bottom5.top10 > div:nth-child(1) > div > table > tbody > tr.tr-shoes").each(function (index, item) {
            if ($.trim($(item).children('td:nth-child(1)').text()) === 'Shoes Size') {
                const display = $(item).css('display');
                isShowSizeTable = display === 'none' ? false : true;
            }
        });
        if (isShowSizeTable && isStatusCanBeActive) {
            // 清除之前所有的勾选
            $('#id_shoes_size_table tbody input[type="checkbox"]').each(function (index, checkbox) {
                $(checkbox).prop('checked', false);
            });
            var runInWebTable = [];
            $('#id_shoes_size_table tbody tr').each(function (index, tr) {
                var runNameInWeb = $.trim($(tr).find('td:nth-child(1) span').text()).toUpperCase();
                runInWebTable.push(runNameInWeb);
            });

            Object.keys(runObject).forEach(run => {
                if (runInWebTable.includes(run)) {
                    $('#id_shoes_size_table tbody tr').each(function (index, tr) {
                        var runNameInWeb = $.trim($(tr).find('td:nth-child(1) span').text()).toUpperCase();
                        if (runNameInWeb === run) {
                            $(tr).find('td:nth-child(1) input[type="checkbox"]').prop('checked', runObject[run].some(inventory => !!inventory));
                            console.log(`已经${runObject[run].some(inventory => !!inventory) ? '勾选' : "取消"}了商品_${current.name}的:${run}`);
                        }
                    });
                } else {
                    current.errorMsg = `商品${current.name}[${current.id}]有run[${run}]在Shoes Size的表格中没找到`;
                    console.error(current.errorMsg);
                    errorList.push({
                        errorMsg: current.errorMsg,
                        URL: document.location.href,
                        name,
                        id,
                        run
                    });
                }

            });
        } else {
            // current.errorMsg = 'Shoes Size表格没有显示,因此无法勾选对应的run';
            // console.error(current.errorMsg);
            // current.goodURL = src;
            // errorList.push(current);
        }

        localStorage.setItem('errorList', JSON.stringify(errorList));
        return errorList;

    }, product);
    await page.waitForTimeout(5000 * Math.random());
    const save_button = await page.$('body > div.layout-fixed-header > div.main-panel > div.fixed-main-panel > div > div > div.card.border-bottom.padding.bottom10 > div > p > button.btn.btn-submit.btn-save');
    await save_button.click();
    await page.waitForNavigation();

    await page.close();

}

const matchData = async () => {
    dataMap = require("./data/0.allDataInWeb.json");
    const oldTable = nodeXlsx.parse("./source-inv.xlsx"); //读取excel表格
    let old_content = oldTable[0].data; //取出excel文件中的第一个工作表中的全部数据
    old_content.splice(0, 1); //一般来说表中的第一条数据可能是标题没有用，所以删掉

    const allGoods = {};

    old_content.map((row) => {
        var name = row[0].trim().toUpperCase();
        var color = row[1].trim().toUpperCase();
        var runName = name.split('-')[0] + '-' + row[2].trim().toUpperCase();
        var inventory = row[3];
        if (allGoods[name]) {
            if (allGoods[name]["colorObject"][color]) {
                allGoods[name]["colorObject"][color].push(inventory);
            } else {
                allGoods[name]["colorObject"][color] = [inventory];
            }

            if (allGoods[name]["runObject"][runName]) {
                allGoods[name]["runObject"][runName].push(inventory);
            } else {
                allGoods[name]["runObject"][runName] = [inventory];
            }

        } else {
            if (dataMap[name]) {

                allGoods[name] = {};
                allGoods[name]["id"] = dataMap[name]['id'];
                allGoods[name]["name"] = name;

                allGoods[name]["colorObject"] = {};
                allGoods[name]["colorObject"][color] = [inventory];

                allGoods[name]["runObject"] = {};
                allGoods[name]["runObject"][runName] = [inventory];
            } else {
                idNotFundInWebPage.push(row);
            }
        }
    });


    var content = JSON.stringify(allGoods);
    //指定创建目录及文件名称，__dirname为执行当前js文件的目录
    var file = path.join(__dirname, 'data/1.整理出来需要更新的数据.json');
    //写入文件
    await fs.writeFile(file, content, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log('文件创建成功，地址：' + file);
    });

    console.log(`0.需要更新的商品匹配在线数据后整理成的商品个数: ${Object.keys(allGoods).length}`);

    // for (const name of allGoods) {
    //     await updateInv(allGoods[name]);
    //     await sleep(4000);
    // }
    await sleep(3000);

    for (let keyIndex = 0; keyIndex < Object.keys(allGoods).length; keyIndex++) {
        const product = allGoods[Object.keys(allGoods)[keyIndex]];
        console.log('');
        console.log(`正在更新第${keyIndex + 1}/${Object.keys(allGoods).length}:${product.name}[${product.id}], 已经发生了错误${errorListWhenUpdateInv.length}条`);
        await updateInv(product, index, Object.keys(allGoods).length);
    }

    console.log('');
    console.log('====================================');
    console.timeEnd('使用puppeteer正式更新数据(不包含获取线上的基础数据): ');
    console.log(`更新完了,开始生成更新失败报告`);
    var content = JSON.stringify({
        errorListWhenUpdateInv,
        idNotFundInWebPage,
        allGoods
    });
    //指定创建目录及文件名称，__dirname为执行当前js文件的目录
    var file = path.join(__dirname, 'data/2.第3个网站的更新库存时候失败记录汇总.json');
    //写入文件
    await fs.writeFile(file, content, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log('第三个网站更新完成并生成了报表：' + file);
    });
    console.log('====================================');








    getExcel(errorListWhenUpdateInv, idNotFundInWebPage);


}


const setUp = async () => {
    console.time('使用puppeteer正式更新数据(不包含获取线上的基础数据): ');
    browser = await puppeteer.launch({
        headless: true,
        defaultViewport: {
            width: 2560,
            height: 1440
        },
        devtools: true,
        args: [`--window-size=${2560},${1440}`], // new option
    });
    matchData();
}

setUp();
