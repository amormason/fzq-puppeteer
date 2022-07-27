const nodeXlsx = require('node-xlsx');
const fs = require("fs"); //文件模块
const path = require("path");

const getAllDataInWeb = require('./0.get-all-data-in-web');

const matchID = async () => {
    const goodsListInWeb = await getAllDataInWeb();
    const sourceTable = nodeXlsx.parse("../source.xlsx"); //读取excel表格
    let excelList = sourceTable[0].data; //取出excel文件中的第一个工作表中的全部数据
    excelList.splice(0, 1); //一般来说表中的第一条数据可能是标题没有用，所以删掉


    let allGoodsToUpdateObject = {};
    let idNotFundForUpdate = [];

    excelList.forEach((row, index) => {
        var name = row[0].trim().toUpperCase();
        var matchedObject = goodsListInWeb.find(obj => obj.name.trim().toUpperCase() === name);
        if (matchedObject) { //如果有对应的商品
            var id = matchedObject.id;
            var display = matchedObject.display;
            var color = row[1].trim().toUpperCase();
            var runName = row[2].trim().toUpperCase();
            var inventory = row[3];
            const obj = {
                runName,
                inventory
            };
            if (allGoodsToUpdateObject[id]) {
                if (allGoodsToUpdateObject[id]["colorObject"][color]) {
                    allGoodsToUpdateObject[id]["colorObject"][color].push(obj);
                } else {
                    allGoodsToUpdateObject[id]["colorObject"][color] = [obj];
                }
            } else {
                allGoodsToUpdateObject[id] = {};
                allGoodsToUpdateObject[id]['id'] = id;
                allGoodsToUpdateObject[id]['name'] = name;
                allGoodsToUpdateObject[id]['display'] = display;
                allGoodsToUpdateObject[id]['colorObject'] = {};
                allGoodsToUpdateObject[id]["colorObject"][color] = [obj];
            }
        } else {
            idNotFundForUpdate.push(row);
        };
    });

    var allGoodsList = Object.keys(allGoodsToUpdateObject).map(id => {
        return allGoodsToUpdateObject[id];
    });


    idNotFundForUpdate = Array.from(new Set(idNotFundForUpdate));
    idNotFundForUpdate = idNotFundForUpdate.sort();
    console.log(`第一个网站上现有的商品数量是${goodsListInWeb.length}个, 整理出来需要更新的商品个数是${allGoodsList.length}个, 匹配id失败的库存条数是:${idNotFundForUpdate.length}, 因此无法更新: ${idNotFundForUpdate}`);

    // 把data对象转换为json格式字符串
    var content = JSON.stringify({ allGoodsList, idNotFundForUpdate, goodsListInWeb });

    //指定创建目录及文件名称，__dirname为执行当前js文件的目录
    var file = path.join(__dirname, './data/1.match-id.json');
    //写入文件
    fs.writeFile(file, content, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log('1.整理出来的匹配id的结果:' + file);
    });
    return { allGoodsList, idNotFundForUpdate, goodsListInWeb };
};
module.exports = matchID;


