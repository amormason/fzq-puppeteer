const EventEmitter = require('node:events');
EventEmitter.setMaxListeners(0);

const nodeXlsx = require("node-xlsx"); //引用node-xlsx模块
var fs = require("fs"); //文件模块
var path = require("path"); //系统路径模块

const puppeteer = require('puppeteer');
var fs = require('fs'); //文件模块
var path = require('path'); //系统路径模块
const {
    getBaseInfo
} = require('./controller/getBaseInfo');
const {
    tabMapObject,
    vendorID,
    password
} = require('./config');

const getTabData = async (pageURL) => {
    const browser = await puppeteer.launch({
        headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
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

    const list = await page.$$eval('.product-box', productDom => {
        var dd = [];
        for (var i = 0; i < productDom.length; i++) {
            const id = $(productDom[i]).find(`input[type='checkbox']`).attr('id');
            const name = $.trim($(productDom[i]).find('.style-number').text());
            const currency = parseFloat($(productDom[i]).find('.currency').text());
            const status = $.trim($(productDom[i]).find('.item-status').text());
            const colors = [];
            $(productDom[i]).find('ul.colors li').each(function (index, element) {
                var name = $(this).find(`input[type='checkbox']`).attr('data-color-name');
                var checked = $(this).find(`input[type='checkbox']`).prop('checked');
                var id = $(this).attr('data-color-id');
                colors.push({
                    name,
                    checked,
                    id
                })
            });
            console.log(`${name}的价格是:${currency}`);
            dd.push({
                id,
                name,
                currency,
                status,
                colors
            });
        }
        // console.log(dd);
        return dd;
    });
    await page.close();
    await browser.close();
    return list;
    // console.log(list);

};
let allDataInWeb = [];
const allGoodsMap = {};

const checkPrice = () => {
    const oldTable = nodeXlsx.parse("./source.xlsx"); //读取excel表格
    let old_content = oldTable[0].data; //取出excel文件中的第一个工作表中的全部数据
    old_content.splice(0, 1); //一般来说表中的第一条数据可能是标题没有用，所以删掉
    console.log("原始Excel数据共有" + old_content.length + "条");
    var errorList = [];
    old_content.map((item) => {
        var name = item[0].replace(/\s/g, "").toUpperCase();
        var target_price = item[1];
        if (allGoodsMap[name]) {
            var current_price = allGoodsMap[name]['currency'];
            if (current_price !== target_price) {
                console.log(`更新失败: ${item}`);
                errorList.push({
                    message: '更新失败,现在的价格是:' + current_price,
                    name,
                    target_price: target_price
                });
            }
        } else {
            console.log(`商品不存在: ${item}`);
            errorList.push({
                message: '商品都不存在',
                name,
                target_price: target_price
            });
        }
    });
    console.log(`检查价格时候发现更新失败:${errorList.length}`);
    var content = JSON.stringify(errorList);
    //指定创建目录及文件名称，__dirname为执行当前js文件的目录
    var file = path.join(__dirname, "check-errorList.json");
    //写入文件
    fs.writeFile(file, content, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("文件创建成功，地址：" + file);
    });
}


const getWebData = async () => {
    return getBaseInfo().then(async list => {
        let promiseAll = [];
        console.log('list:', list);
        let countForPlan = list.reduce((c, R) => c + R.allCount, 0);
        await list.map(async tab => {
            const {
                status
            } = tabMapObject[tab.title];
            // const pageNumberArray = [1];
            const pageNumberArray = Array.from(Array(tab.maxPageNumber)).map((item, index) => index + 1);
            pageNumberArray.map(page_number => {
                const pageURL = `https://brand.orangeshine.com/products/list/?category_id=&status=${status}&filter=all&show_brand_only=False&sort_type=newest&page_size=400&page_number=${page_number}&search_field=style_num&search_text=&redirect_url=%2Fproducts%2Flist%2F`;
                promiseAll.push(getTabData(pageURL));
            });
        });

        Promise.all(promiseAll).then(values => {
            allDataInWeb = values.flat();

            allDataInWeb.map(good => {
                var name = good.name.toUpperCase();
                allGoodsMap[name] = {
                    id: good.id,
                    name,
                    currency: good.currency
                }
            })

            console.log(`实际找到${allDataInWeb.length}个商品,与原计划的${countForPlan}个${allDataInWeb.length === countForPlan ? '保持一致😄😄😄' : '居然不一样😭😭😭'}`);
            // console.log(`转换后实际有${Object.keys(allGoodsMap).length}个商品`);
            //把data对象转换为json格式字符串
            var content = JSON.stringify(allGoodsMap);

            //指定创建目录及文件名称，__dirname为执行当前js文件的目录
            var file = path.join(__dirname, 'data/0.allDataInWeb.json');

            //写入文件
            fs.writeFile(file, content, function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log('文件创建成功，地址：' + file);
            });


            // checkPrice();
            return allDataInWeb;
        });
    });
}

getWebData();

module.exports = {
    getWebData
}