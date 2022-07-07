const EventEmitter = require('node:events');
EventEmitter.setMaxListeners(0);

const puppeteer = require('puppeteer');
var fs = require('fs'); //文件模块
var path = require('path'); //系统路径模块
const { getBaseInfo } = require('./controller/getBaseInfo');
const { tabMapObject, vendorID, password } = require('./config');

const getTabData = async (pageURL) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.goto(pageURL);
    // await page.waitForTimeout(3000);
    await page.type('#id_form_signin > div.form-inputs > div.margin.bottom20 > input', vendorID, { delay: 10 });
    await page.type('#id_form_signin > div.form-inputs > div:nth-child(2) > input', password, { delay: 10 });
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
                    name, checked, id
                })
            })
            dd.push({
                id, name, currency, status, colors
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

getBaseInfo().then(list => {
    console.time("分页查询数组总花费时间是");
    let allData = [];
    let promiseAll = [];
    list.map(tab => {
        const { status } = tabMapObject[tab.title];
        // const pageNumberArray = [1];
        const pageNumberArray = Array.from(Array(tab.maxPageNumber)).map((item, index) => index + 1);
        pageNumberArray.map(page_number => {
            const pageURL = `https://brand.orangeshine.com/products/list/?category_id=&status=${status}&filter=all&show_brand_only=False&sort_type=newest&page_size=400&page_number=${page_number}&search_field=style_num&search_text=&redirect_url=%2Fproducts%2Flist%2F`;
            promiseAll.push(getTabData(pageURL));
        });
    });
    Promise.all(promiseAll).then(values => {
        allData = values.flat();
        console.log(`实际找到${allData.length}个商品`);
        console.timeEnd("分页查询数组总花费时间是");

        //把data对象转换为json格式字符串
        var content = JSON.stringify(allData);

        //指定创建目录及文件名称，__dirname为执行当前js文件的目录
        var file = path.join(__dirname, 'allData.json');

        //写入文件
        fs.writeFile(file, content, function (err) {
            if (err) {
                return console.log(err);
            }
            console.log('文件创建成功，地址：' + file);
        });
    });
})

