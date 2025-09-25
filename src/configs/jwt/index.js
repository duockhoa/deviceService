require('dotenv').config()
const jwt = require('jsonwebtoken')

let makeAccessToken = function(data){
    return jwt.sign( data , process.env.SECRET_KEY  , {expiresIn: process.env.TOKEN_TIME_LIFE})    
}

let makeRefreshToken = function(data){
    return jwt.sign( data , process.env.SECRET_KEY  , {expiresIn: process.env.REFRESH_TIME_LIFE})    
}   



const verifyToken = function(token) {
    return jwt.verify(token, process.env.SECRET_KEY)
}

module.exports ={
    makeAccessToken ,
    makeRefreshToken,
    verifyToken
}