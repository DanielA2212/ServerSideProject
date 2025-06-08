const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index',
      { title: 'Welcome To Our Server Side Cost Manager Project' ,
      body: 'Made By The Greatest Students: Daniel And Nikole'});
});

module.exports = router;
