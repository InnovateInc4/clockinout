const jwt = require("jsonwebtoken");
const jwtKey = require("../config/jwt-key");

module.exports = {
    checkToken: (req, res, next) => {
        let token = req.get("authorization");
        if (token) {
            
            token = token.slice(7);
            jwt.verify(token, jwtKey, (err, decoded) => {
                if (err) {
                    return res.status(401).json({
                        success: 0,
                        message: "Invalid Token..."
                    });
                } else {
                    req.decoded = decoded;
                    next();
                }
            });
        } else {
            return res.status(403).json({
                success: 0,
                message: "Access Denied! Unauthorized User"
            });
        }
    }
};