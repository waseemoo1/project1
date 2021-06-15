const { User } = require("../../models/user.js");
const { Post } = require("../../models/post");

module.exports = {
  Comment: {
    author: async function (parent, data, ctx, info) {
      const author = User.findOne({ _id: parent.author });
      return author;
    },
    post: async function (parent, data, ctx, info) {
      const post = Post.findOne({ _id: parent.post });
      return post;
    },
  }
}
