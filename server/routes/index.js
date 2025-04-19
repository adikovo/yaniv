var express = require('express');
const zlib = require("node:zlib");
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  
  res.send({OK: true});
});



module.exports = router;
