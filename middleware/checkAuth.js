const { skip } = require('graphql-resolvers');

module.exports = (parent, data , ctx) =>{
        if (!ctx.req.isAuth) {
            const errors = new Error("Authentication falild");
            errors.code = 401;
            throw errors;
          }
          skip
    }