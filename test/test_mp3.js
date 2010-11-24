/*
 * @package node-mediascan
 * @subpackage test
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/node-mediascan/blob/master/LICENSE MIT License
 */

var MediaScan = require("../lib");
MediaScan.analyze(__dirname + "/test.mp3", function(err, info) {
    if (err)
        return console.log("ERROR: ", err);

    console.log("Recieved data: ", require("sys").inspect(info));
});
