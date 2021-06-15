const _ = require("lodash");
const crypto = require('crypto');
const config = require('config');

const { User, validateUser } = require("../../models/user");
const { Post, validatePost } = require("../../models/post");
const { Comment, validateComment , validateComment2 } = require("../../models/comment");
const { Code } = require('../../models/secretCode');
const { Story } = require('../../models/story');

const emailService = require('../../util/nodemailer');

const { processUpload } = require('../../util/fileUpload');
const { deleteFile } = require('../../util/fileDelete');

const { combineResolvers } = require('graphql-resolvers');

const checkAuth = require('../../middleware/checkAuth');

const validate = require('../../middleware/validate');

module.exports = {
  Mutation: {
    createUser: combineResolvers(
      validate(validateUser),
      async function (parent, { data }, ctx, info) {
        console.log(data);

        const existingUser = await User.findOne({ email: data.email });
        if (existingUser) {
          const errors = new Error("User already exist");
          errors.code = 400;
          throw errors;
        }

        let user = new User(_.pick(data, ["name", "email", "password"]));
        user.status = "active";

        user = await user.save();

        // const baseUrl = ctx.req.protocol + "://" + ctx.req.get("host");

        // const secretCode = crypto.randomBytes(12).toString('hex');

        // const newCode = new Code({
        //   code: secretCode,
        //   email: user.email
        // })

        // await newCode.save();

        // const message = {
        //   to: user.email,
        //   from: config.get('email'),
        //   subject: 'Activate SayHey account',
        //   text: `Please use the following link to activate your account: ${baseUrl}/verification/verify-account/${user._id}/${secretCode}`,
        // }

        // await emailService.sendMail(message);

        return user;

      }),
    createPost: combineResolvers(
      checkAuth,
      validate(validatePost),
      async function (parent, args, ctx, info) {
        console.log(args);

        let uploadFile;
        if (args.image && args.image.file) {
          uploadFile = await processUpload(args.image.file);
          if (!uploadFile.success) {
            const errors = new Error("Faild uploading file");
            errors.code = 400;
            throw errors;
          }
        }

        let post = new Post({
          title: args.data.title,
          description: args.data.description,
          imageUrl: uploadFile ? uploadFile.location : null,
          author: ctx.req.user._id
        });

        post = await post.save();

        return post;
      }
    ),
    updatePost: combineResolvers(
      checkAuth,
      validate(validatePost),
      async function (parent, args, ctx, info) {

        const { id, data } = args;

        let post = await Post.findById(id);

        if (!post) {
          const errors = new Error("Post not found");
          errors.code = 404;
          throw errors;
        }

        if (!post.author.equals(ctx.req.user._id)) {
          const errors = new Error("can't update others post");
          errors.code = 401;
          throw errors;
        }

        let uploadFile;
        if (args.image && args.image.file) {
          uploadFile = await processUpload(args.image.file);
          if (!uploadFile.success) {
            const errors = new Error("Faild uploading file");
            errors.code = 400;
            throw errors;
          } else {
            if (post.imageUrl) deleteFile(post.imageUrl);
            post.imageUrl = uploadFile.location;
          }
        } else {
          if (post.imageUrl) deleteFile(post.imageUrl);
          post.imageUrl = null;
        }

        post.title = data.title;
        post.description = data.description;

        if (typeof data.published === "boolean") {
          post.published = data.published;
        }

        post = await post.save();

        return post;
      }
    ),
    deletePost: combineResolvers(
      checkAuth,
      async function (parent, { id }, ctx, info) {

        let post = await Post.findById(id);

        if (!post) {
          const errors = new Error("Post not found");
          errors.code = 404;
          throw errors;
        }

        if (!post.author.equals(ctx.req.user._id)) {
          const errors = new Error("can't remove others posts");
          errors.code = 401;
          throw errors;
        }

        if (post.imageUrl) deleteFile(post.imageUrl);

        post = await post.remove();

        return post;
      }),
    createComment: combineResolvers(
      checkAuth,
      validate(validateComment),
      async function (parent, { data }, ctx, info) {

        const pubsub = ctx.pubsub;

        data.author = ctx.req.user._id;
        const existingPost = await Post.findOne({ _id: data.post });
        if (!existingPost) {
          const errors = new Error("Post deleted !!");
          errors.code = 400;
          throw errors;
        }

        let comment = new Comment(data);
        comment = await comment.save();

        pubsub.publish(`comment ${data.post}`, {
          comment: {
            mutation: "Created",
            data: comment
          },
        });

        return comment;
      }),
    deleteComment: combineResolvers(
      checkAuth,
      async function (parent, { id }, ctx, info) {

        const pubsub = ctx.pubsub;

        let comment = await Comment.findById(id);

        if (!comment) {
          const errors = new Error("Post not found");
          errors.code = 404;
          throw errors;
        }

        if (!comment.author.equals(ctx.req.user._id)) {
          const errors = new Error("can't remove others comments");
          errors.code = 401;
          throw errors;
        }

        comment = await comment.remove();

        comment.author = ctx.req.user;
        pubsub.publish(`comment ${comment.post}`, {
          comment: {
            mutation: "Deleted",
            data: comment,
          },
        });
        return comment;
      }),
    updateComment: combineResolvers(
      checkAuth,
      async function (parent, args, ctx, info) {
        const pubsub = ctx.pubsub;

        const { id, data } = args;

        const { error } = validateComment2(data);
        if (error) {
          const errors = new Error("invalid input");
          errors.data = error.details[0].message;
          errors.code = 400;
          throw errors;
        }

        const comment = await Comment.findOne({
          _id: id,
          author: ctx.req.user._id,
        });

        if (!comment) {
          const errors = new Error("Post not found");
          errors.code = 404;
          throw errors;
        }

        comment.text = data.text;

        await comment.save();

        pubsub.publish(`comment ${comment.post}`, {
          comment: {
            mutation: "Updated",
            data: comment,
          },
        });
        return comment;
      }),
    addStory: combineResolvers(
      checkAuth,
      async function (parent, args, ctx, info) {

        let uploadFile = await processUpload(args.image.file);

        if (!uploadFile.success) {
          const errors = new Error("Faild uploading file");
          errors.code = 400;
          throw errors;
        }

        let story = new Story({
          imageUrl: uploadFile.location,
          author: ctx.req.user._id,
          viewers: [],
        })

        story = await story.save();

        return story;
      }
    ),
    storySeen: combineResolvers(
      checkAuth,
      async function (parent, args, ctx, info) {

        const id = args.id;

        const user = ctx.req.user;

        let story = await Story.findById(id);

        if (!story) {
          const errors = new Error("story not found");
          errors.code = 404;
          throw errors;
        }

        const seen = story.viewers.includes(user._id);

        if (seen) return true;

        story.viewers.push(user._id);
        story = await story.save();

        return true;
      }
    ),

    logout: combineResolvers(
      checkAuth,
      async function (parent, args, ctx, info) {

        ctx.req.user.tokens = ctx.req.user.tokens.filter((token) => {
          return ctx.req.token !== token;
        });

        const result = await ctx.req.user.save();

        return result ? true : false;
      }),

    logoutAll: combineResolvers(
      checkAuth,
      async function (parent, args, ctx, info) {
        ctx.req.user.tokens = [];
        const result = await ctx.req.user.save();
        return result ? true : false;
      }),

    test: function (parent, { data }, ctx, info) {
      return data.toString();
    },
    singleUpload: async (parent, args) => {
      console.log('upload file');
      console.log(args);
      try {
        const result = await processUpload(args.file.file);
        return result;
      } catch (err) {
        console.log(err.message);
        return null;
      }
    }
  },
};