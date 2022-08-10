const { allGoodsResult, idNotFund } = require('./data/1.match-id.json');
const nodeXlsx = require('node-xlsx')
const { webToken } = require('./data/0.get-all-data-in-web.json');
const { getInventoryPromise, updatePromise } = require('./services');
const path = require('path');
const fs = require('fs'); //
console.log(`需要更新的商品数量: ${Object.keys(allGoodsResult).length}`);
const updatedGoods = [];
const errorList = [];
let currentIndexForDataList = 0;
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
const handleRequest = (product, inventoryResponseData) => {
    const {
        item,
        inventory: inventoryArrayDataInWeb
    } = inventoryResponseData;
    let {
        productId,
        productName,
        categoryId,
        parentCategoryId,
        parentParentCategoryId,
        ingredients,
        howtouse,
        weight,
        mapDropshipProductId,
        crossSellCount
    } = item;
    const {
        inventoryObject
    } = product;

    var colorsInWeb = [];
    inventoryArrayDataInWeb.map(item => {
        colorsInWeb.push(item.colorName);
    });
    // console.log(`网站上商品${item.productName}【${item.productId}】的颜色是：${colorsInWeb}`);

    var inventoryArrayDataInWebCopy = [];
    Object.keys(inventoryObject).map(color => {
        if (colorsInWeb.includes(color)) {
            // console.log(`颜色匹配成功：${color}，其库存是：${inventoryObject[color]}`);
            inventoryArrayDataInWeb.map(item => {
                if (item.colorName === color) {
                    inventoryV2 = JSON.parse(JSON.stringify(item.sizes[0]));
                    inventoryV2.qty = inventoryObject[color];
                    inventoryV2.status = inventoryObject[color] ? "In Stock" : 'Out of Stock';
                    inventoryV2.statusCode = inventoryObject[color] ? 1 : 2;
                    inventoryV2.active = !!inventoryObject[color];
                    inventoryV2.available = !!inventoryObject[color];
                    item.sizes[0] = inventoryV2;
                    inventoryArrayDataInWebCopy.push(item);
                }
            });
        } else {
            var URL = `https://vendoradmin.fashiongo.net/#/item/detail/${product.id}`;
            errorList.push({
                errorMessage: `颜色不匹配：${color}`,
                URL,
                id: productId,
                name: productName,
            });
            console.log(`发生的第${errorList.length}个错误${color}这个颜色在web上没有找到`);
        }
    })


    inventoryArrayDataInWeb.map(item => {
        if (!Object.keys(inventoryObject).includes(item.colorName)) {
            inventoryV2 = JSON.parse(JSON.stringify(item.sizes[0]));
            inventoryV2.qty = 0;
            inventoryV2.status = 'Out of Stock';
            inventoryV2.statusCode = 2;
            inventoryV2.active = false;
            inventoryV2.available = false;
            item.sizes[0] = inventoryV2;
            inventoryArrayDataInWebCopy.push(item);
        }
    });


    let active = inventoryArrayDataInWebCopy.some((item, index) => {
        // console.log(`------第${index}个[${product.id}]active是${item.sizes[0].active}`);
        return item.sizes && item.sizes[0] && item.sizes[0].active === true;
    });

    inventoryArrayDataInWebCopy = inventoryArrayDataInWebCopy.map(item => item.sizes[0]);
    // console.log(`--[${productId}]本来的active: ${active}`);

    return {
        "item": {
            "active": active,
            "ingredients": ingredients,
            "howtouse": howtouse,
            "weight": weight,
            "mapDropshipProductId": mapDropshipProductId,
            "crossSellCount": crossSellCount,
            "categoryId": categoryId,
            "parentCategoryId": parentCategoryId,
            "parentParentCategoryId": parentParentCategoryId,
            "colorCount": inventoryArrayDataInWeb.length
        },
        "inventoryV2": {
            "saved": [{
                "productId": productId,
                "inventoryPrepack": inventoryArrayDataInWebCopy
            }],
            "deleted": []
        },
        "image": {
            "update": [],
            "delete": []
        },
        "crossSell": {
            "update": [],
            "delete": []
        },
        "inventory": {
            "delete": [],
            "update": inventoryArrayDataInWebCopy
        },
        "video": null,
        "volumeDiscounts": {
            "saved": [],
            "deleted": []
        },
        "linkItems": [],
        "productId": productId,
        "mapDropshipProductId": null,
        "dsSettingInfo": [],
        "vendorSettingInfo": []
    }
}
function updateInv() {
    const product = allGoodsResult[currentIndexForDataList];
    if (product) {
        getInventoryPromise(product['id'], webToken).then(getInventoryPromiseRes => {
            const inventoryResponseData = getInventoryPromiseRes && getInventoryPromiseRes.success && getInventoryPromiseRes.data;
            const requestBody = inventoryResponseData && product && handleRequest(product, inventoryResponseData);
            if (requestBody) {
                updatePromise(requestBody, webToken).then(response => {
                    product.requestBody = requestBody;
                    if (response.success) {
                        console.log(`更新第${currentIndexForDataList}/${allGoodsResult.length}个成功: ${product.name}[${product.id}]`);
                        updatedGoods.push(product);
                    } else {
                        console.log(`更新第${currentIndexForDataList}/${allGoodsResult.length}个失败:${response.message || '发生了错误'}, ${JSON.stringify(product)}`);
                        product.message = response.message || '发生了错误';
                        errorList.push(product);
                    }
                }).catch((err) => {
                    console.log(`正在更新第${currentIndexForDataList}/${allGoodsResult.length}个发生了错误'`);
                    console.log('******更新库存时候的catch错误信息');
                    product.message = '更新库存发生了catch错误';
                    errorList.push(product);
                }).finally(() => {
                    currentIndexForDataList++;
                    updateInv();
                });
            } else {
                currentIndexForDataList++;
                updateInv();
            }
        }).catch((err) => {
            product.message = '获取商品详情发生错误了哦';
            console.log('******获取详情时候的catch错误信息', err);
            errorList.push(product);
            currentIndexForDataList++;
            updateInv();
        }).finally(() => {
            // console.log(`获取商品详情完成:${product['id']}`);
            // console.log();
        });;
    } else {
        console.log('更库存完成');
        const headers1 = ['报错原因', '报错页面', '商品ID', '商品名称'];
        const headers2 = ['商品名称', '颜色', 'run', '目标库存值'];
        // 自动生成需要上传的文件;
        var buffer_out = nodeXlsx.build([{
            name: `更新时报错记录${errorList.length}条`,
            data: [headers1, ...json_to_sheet(errorList.sort(function (a, b) {
                var x = a.name.toLowerCase();
                var y = b.name.toLowerCase();
                if (x < y) { return -1; }
                if (x > y) { return 1; }
                return 0;
            }))]
        }, {
            name: `更新前匹配id错误${idNotFund.length}条`,
            data: [headers2, ...idNotFund.sort(function (a, b) {
                var x = a[0].toLowerCase();
                var y = b[0].toLowerCase();
                if (x < y) { return -1; }
                if (x > y) { return 1; }
                return 0;
            })]
        }
        ]);
        var filePath_out = `${__dirname}/data/第2个网站的更新库存结果.xlsx`;
        fs.appendFile(filePath_out, buffer_out, function (err) {
            if (err) {
                console.log(err, '保存excel出错');
            } else {
                console.log(`写入excel[${filePath_out}]成功!!!`);
            }
        });


    }
}
updateInv();