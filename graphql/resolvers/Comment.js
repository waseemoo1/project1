const { Post } = require("../../models/post");
const { User } = require("../../models/user");
const { Comment } = require("../../models/comment");
const checkAuth = require("../../middleware/checkAuth");
const { deleteFile } = require("../../util/forUploadFile/fileDelete");
const { processUpload } = require("../../util/forUploadFile/fileUplad");
const notificationComment = require('../../util/forNotification/notificationComment')
const validateID = require('../../util/idValidate')
module.exports = {
  Query: {
    getComment: checkAuth.createResolver(async function (parent, data, ctx, info) {
      let comments = await Comment.find({});
      return comments;
    }),

    getCommentForPost: checkAuth.createResolver(async function (parent, data, ctx, info) {
      postId = data.postId;
      const post = await Post.findById(postId).populate("comments");
      return post.comments;
    }),
  },

  Mutation: {
    createComment: checkAuth.createResolver(async function (parent, { data }, ctx, info) {
      Comment.validateCreateComment(data);

      const pubsub = ctx.pubsub;
      data.author = ctx.req.user._id;

      const existingPost = await Post.findOne({ _id: data.postId });
      if (!existingPost) {
        const errors = new Error("Post deleted !!");
        errors.code = 400;
        throw errors;
      }

      let uploadFile;
      if (data.fileUrl) {
        uploadFile = await processUpload(data.fileUrl);

        if (!uploadFile.success) {
          const errors = new Error("Faild uploading file");
          errors.code = 400;
          throw errors;
        }
      }

      data.fileUrl = uploadFile ? uploadFile.Location : null;
      data.post = data.postId;
      let comment = new Comment(data);
      comment = await comment.save();

      pubsub.publish(`comment ${data.postId}`, {
        comment: {
          mutation: "Create",
          data: comment,
        },
      });

      await notificationComment(ctx.req.user.name, ctx.req.user._id, existingPost.author, ctx.pubsub);

      return comment;
    }),

    deleteComment: checkAuth.createResolver(async function (parent, { commentId }, ctx, info) {
      const pubsub = ctx.pubsub;
      validateID(commentId);

      let comment = await Comment.findById(commentId);

      if (!comment) {
        const errors = new Error("comment not found");
        errors.code = 404;
        throw errors;
      }

      if (!comment.author.equals(ctx.req.user._id)) {
        const errors = new Error("can't remove others comments");
        errors.code = 401;
        throw errors;
      }

      if (comment.fileUrl) deleteFile(comment.fileUrl);

      comment = await comment.remove();

      comment.author = ctx.req.user;
      pubsub.publish(`comment ${comment.post}`, {
        comment: {
          mutation: "delete",
          data: comment,
        },
      });
      return comment;
    }),
    updateComment: checkAuth.createResolver(async function (parent, args, ctx, info) {
      Comment.validateUpdateComment(args.data);

      const pubsub = ctx.pubsub;
      const { commentId, data } = args;
      validateID(commentId);

      const comment = await Comment.findOne({
        _id: commentId,
        author: ctx.req.user._id,
      });

      if (!comment) {
        const errors = new Error("comment not found");
        errors.code = 404;
        throw errors;
      }

      let uploadFile;
      if (data.fileUrl) {
        uploadFile = await processUpload(data.fileUrl);
        if (!uploadFile.success) {
          const errors = new Error("Faild uploading file");
          errors.code = 400;
          throw errors;
        } else {
          if (comment.fileUrl) deleteFile(comment.fileUrl);
          comment.fileUrl = uploadFile.Location;
        }
      }

      comment.text = data.text;
      await comment.save();
      pubsub.publish(`comment ${comment.post}`, {
        comment: {
          mutation: "update",
          data: comment,
        },
      });
      return comment;
    }),
  },

  Subscription: {
    comment: {
      subscribe: function (parent, { postID }, { pubsub }, info) {
        validateID(postID);
        const post = Post.findById(postID);
        if (!post) {
          const error = new Error("not found post");
          error.code = 401;
          throw error;
        }
        
        return pubsub.asyncIterator(`comment ${postID}`);
      },
    },
  },

  Comment: {
    author: async function (parent, data, ctx, info) {
      const author = User.findOne({ _id: parent.author });
      return author;
    },
    post: async function (parent, data, ctx, info) {
      const post = Post.findOne({ _id: parent.post });
      return post;
    },
  },
};
