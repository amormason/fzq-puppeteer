var {
    MongoClient
} = require('mongodb');
var url = "mongodb://admin:123456@192.168.100.1/";

MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    var myobj = {
        name: "Company Inc",
        address: "Highway 37",
        random: Math.random()
    };

    // 增
    dbo.collection("customers").insertOne(myobj, function (err, res) {
        if (err) throw err;
        console.log("1 document inserted");
        // db.close();
    });

    //查
    dbo.collection("customers").findOne({
        random: 0.363958154093038
    }, function (err, result) {
        if (err) throw err;
        console.log('result:', result);
        // db.close();
    });
});