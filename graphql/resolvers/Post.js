const { User } = require('../../models/user');

module.exports = {
    Post: {
        author: async function (parent, data , ctx, info) {
            const authorId = parent.author;
            const author =await User.findById(authorId);
            return author;
        }
    } 
}
