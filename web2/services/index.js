module.exports = {
    getInventoryPromise: async (id, token) => {
        const response = await fetch(`https://vendoradmin.fashiongo.net/api/item/${id}`, {
            "headers": {
                "accept": "application/json",
                "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "authorization": token,
                "cache-control": "no-cache",
                "content-type": "text/plain",
                "pragma": "no-cache",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"102\", \"Google Chrome\";v=\"102\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin"
            },
            "referrer": "https://vendoradmin.fashiongo.net/",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
        });
        return response.json();
    },
    updatePromise: async (product, token) => {
        const response = await fetch("https://vendoradmin.fashiongo.net/api/item/save", {
            "headers": {
                "accept": "application/json",
                "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "authorization": token,
                "cache-control": "no-cache",
                "content-type": "application/json",
                "pragma": "no-cache",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"101\", \"Google Chrome\";v=\"101\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin"
            },
            "referrer": "https://vendoradmin.fashiongo.net/",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": JSON.stringify(product),
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
        });
        return response.json();
    },
}