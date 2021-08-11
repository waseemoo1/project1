
const User = require('../../models/user');
const jwt = require('jsonwebtoken')
const config = require('config')
module.exports =  function createUrlConfirmEmail(userID) {
    const token = jwt.sign({ _id: userID }, config.get("jwtPrivateKey") , {expiresIn : "86400s"});



    return `http://localhost:4000/confirmation/${token}`
}