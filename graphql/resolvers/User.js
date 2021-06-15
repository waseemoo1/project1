const { Post } = require('../../models/post');

module.exports = {
    User: {
        posts: async function (parent, args , ctx, info) {
            const posts =await Post.find({author: parent._id}).sort({createdAt: -1});
            return posts;
        },
        // stories: async function  (parent, args , ctx, info) {
        //     const stories = await Story.find({author: parent._id});
        //     return stories;
        // }
    } 
}