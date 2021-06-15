const bcrypt = require("bcrypt");
const Joi = require("joi");
const { Comment } = require("../../models/comment");

const { User } = require("../../models/user");
const { Post } = require("../../models/post");


module.exports = {
  Subscription: {
    comment: {
      subscribe: async function (parent, {postID}, { pubsub }, info) {
        const post = await Post.find({_id : postID });
        if (!post) {
          const errors = new Error("Post not found");
          errors.code = 404;
          throw errors;
        }
        console.log(postID);
    
        return pubsub.asyncIterator(`comment ${postID}`);
      }
    },   
    // comment: {
    //   subscribe: async function (parent, {postID}, { pubsub }, info) {
    //     const post = await Post.find({_id : postID });
    //     if (!post) {
    //       const errors = new Error("Post not found");
    //       errors.code = 404;
    //       throw errors;
    //     }
    //     console.log(postID);
    //     let count = 0;
    //     setInterval(() => {
    //       count++;
    //       pubsub.publish(`comment ${postID}`, {
    //         count ,
    //       });
    //     }, 1000);
    //     return pubsub.asyncIterator(`comment ${postID}`);
    //   },
    // },
  },
};

