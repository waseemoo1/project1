const { skip } = require('graphql-resolvers');

module.exports = (validator) => {
    return (parent, args , ctx) =>{

        const {error} = args.data? validator(args.data): validator(args); 

        if (error) {
            const errors = new Error("invalid input");
            errors.data = error.details[0].message;
            errors.code = 400;
            throw errors;
        }
       skip
    }
}