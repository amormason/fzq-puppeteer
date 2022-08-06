const nodeXlsx = require('node-xlsx') //引用node-xlsx模块
var fs = require('fs'); //文件模块
var path = require('path'); //系统路径模块

// npm i -S node-xlsx  fs path

var { allGoodsMap, webToken } = require('./data/0.get-all-data-in-web.json');
const dataTable = nodeXlsx.parse("../source.xlsx") //读取excel表格
let list = dataTable[0].data //取出excel文件中的第一个工作表中的全部数据
list.splice(0, 1);

var allGoods = {};
var idNotFund = [];
list.forEach((row, index) => {
    var name = row[0].toUpperCase();
    var color = row[1].toUpperCase();
    // var run = row[2].toUpperCase();
    var inventory = row[3];

    var id = allGoodsMap[name];
    if (id) { //如果有对应的商品
        if (allGoods[id]) {
            if (allGoods[id]["colorObject"][color]) {
                allGoods[id]["colorObject"][color].push(inventory);
            } else {
                allGoods[id]["colorObject"][color] = [inventory];
            }
        } else {
            allGoods[id] = {};
            allGoods[id]['id'] = id;
            allGoods[id]['name'] = name;
            allGoods[id]['colorObject'] = {};
            allGoods[id]["colorObject"][color] = [inventory];
        }
    } else {
        idNotFund.push(row);
    };
});

var allGoodsResult = [];
Object.keys(allGoods).map(id => {
    var current = JSON.parse(JSON.stringify(allGoods[id]));
    var colorObject = current.colorObject;
    current.inventoryObject = {}
    Object.keys(colorObject).map(color => {
        var currentColor = colorObject[color];
        var sum = 0;
        currentColor.forEach(item => {
            sum += item;
        });
        current.inventoryObject[color] = sum;
        delete current.colorObject;
    });
    allGoodsResult.push(current);
});




//把data对象转换为json格式字符串
var content = JSON.stringify({
    idNotFund,
    allGoodsResult,
    webToken
});
const idNotFundLength = idNotFund.length;
idNotFund = Array.from(new Set(idNotFund));
console.log(`第2个网站[https://vendoradmin.fashiongo.net/]中有${idNotFund.length}个名称没有匹配到ID,因此无法更新${idNotFundLength}条记录,涉及商品${idNotFund.length}个,对应的商品名称是:${idNotFund}`);
//指定创建目录及文件名称，__dirname为执行当前js文件的目录
var file = path.join(__dirname, 'data/1.match-id.json');
//写入文件
fs.writeFile(file, content, function (err) {
    if (err) {
        return console.log(err);
    }
    console.log('文件创建成功，地址：' + file);
});