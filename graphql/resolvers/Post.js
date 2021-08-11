const _ = require("lodash");
const { Post } = require("../../models/post");
const { User } = require("../../models/user");
const checkAuth = require("../../middleware/checkAuth");
const { deleteMultipleFile } = require("../../util/forUploadFile/fileDelete");
const { multipleUpload } = require("../../util/forUploadFile/fileUplad");
const notificationPost = require('../../util/forNotification/notificationPost');
const { Friends } = require('../../models/friend');
const validateID = require('../../util/idValidate')
const notificationReaction = require('../../util/forNotification/notificationReaction')
module.exports = {
  Query: {
    getPosts: checkAuth.createResolver(async function (parent, data, ctx, info) {
      let posts = await Post.find().sort({ createdAt: -1 });
      return posts;
    }),

    getPostsOnFriends: checkAuth.createResolver(async function (parent, data, ctx, info) {
      const user = ctx.req.user;

      const friendsRelations = await Friends.find().or([{ user1: user._id }, { user2: user._id }]);

      const friends = friendsRelations.map(friendsRelations => {
        return friendsRelations.user1.equals(user._id) ? friendsRelations.user2 : friendsRelations.user1;
      })

      const posts = await Post.find({ author: { $in: [...friends, user._id] } }).sort({ createdAt: -1 })

      return posts;
    }),
  },

  Mutation: {
    createPost: checkAuth.createResolver(async function (parent, args, ctx, info) {
      Post.validatePost(args.data);

      let uploadFiles = [];
      let filesLocation = [];

      if (args.data.filesUrl) {
        try {
          uploadFiles = await multipleUpload(args.data.filesUrl);
          console.log(uploadFiles);
          uploadFiles.forEach((file) => {
            filesLocation.push(file.Location);
          });
        } catch (err) {
          throw err;
        }
      }

      let post = new Post({
        description: args.data.description,
        filesUrl: uploadFiles ? filesLocation : null,
        author: ctx.req.user._id,
      });

      post = await post.save();
      await notificationPost(ctx.req.user.name, ctx.req.user._id, ctx.pubsub)
      return post;
    }),

    updatePost: checkAuth.createResolver(async function (parent, args, ctx, info) {
      Post.validatePost(args.data);
      const { id, data } = args;
      validateID(id);

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

      let uploadFiles = [];
      let filesLocation = [];
      if (args.data.filesUrl) {
        try {
          uploadFiles = await multipleUpload(args.data.filesUrl);
          console.log(uploadFiles);
          uploadFiles.forEach((file) => {
            filesLocation.push(file.Location);
          });
        } catch (err) {
          throw err;
        }

        if (post.filesUrl) deleteMultipleFile(post.filesUrl);
        post.filesUrl = filesLocation;
      }

      post.description = data.description;

      post = await post.save();

      return post;
    }),
    deletePost: checkAuth.createResolver(async function (parent, { id }, ctx, info) {
      validateID(id);

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

      if (post.filesUrl) deleteMultipleFile(post.filesUrl);

      post = await post.remove();

      return post;
    }),
    likePost: checkAuth.createResolver(
      async function (parent, args, ctx, info) {

        const postId = args.postId;
          const user = ctx.req.user;
  
          let post = await Post.findById(postId);
  
          if (!post) {
            const errors = new Error("post not found");
            errors.code = 404;
            throw errors;
          }
  
          let index = post.disLikes.findIndex((dislike) => dislike._id.equals(user._id));
          if (index !== -1) {
            post.disLikes.splice(index , 1);
          }
  
          index = post.loves.findIndex((love) => love._id.equals(user._id));
          if (index !== -1) {
            post.loves.splice(index , 1);
          }
  
          index = post.likes.findIndex((like) => like._id.equals(user._id));
  
          if (index !== -1) {
            post.likes.splice(index , 1);
          } else {
            post.likes.push(user);
          }
  
          post = await post.save();
          notificationReaction(`${ctx.req.user.name} Like your post ` , user._id ,post.author , ctx.pubsub ) 
          return post;
        
      }
    ),
    disLikePost: checkAuth.createResolver(

      async function (parent, args, ctx, info) {
        const postId = args.postId;
        const user = ctx.req.user;

        let post = await Post.findById(postId);

        if (!post) {
          const errors = new Error("post not found");
          errors.code = 404;
          throw errors;
        }

        let index = post.loves.findIndex((love) => love._id.equals(user._id));
        if (index !== -1) {
          post.loves.splice(index , 1);
        }

        index = post.likes.findIndex((like) => like._id.equals(user._id));
        if (index !== -1) {
          post.likes.splice(index , 1);
        }

        index = post.disLikes.findIndex((dislike) => dislike._id.equals(user._id));

        if (index !== -1) {
          post.disLikes.splice(index , 1);
        } else {
          post.disLikes.push(user);
        }

        post = await post.save();
        notificationReaction(`${ctx.req.user.name} disLike your post ` , user._id ,post.author , ctx.pubsub ) 
        return post;
      }
    ),
    lovePost:
      checkAuth.createResolver(
        async function (parent, args, ctx, info) {
          const postId = args.postId;
          const user = ctx.req.user;

          let post = await Post.findById(postId);

          if (!post) {
            const errors = new Error("post not found");
            errors.code = 404;
            throw errors;
          }

          let index = post.likes.findIndex((like) => like._id.equals(user._id));
          if (index !== -1) {
            post.likes.splice(index , 1);
          }

          index = post.disLikes.findIndex((dislike) => dislike._id.equals(user._id));
          if (index !== -1) {
            post.disLikes.splice(index , 1);
          }

          index = post.loves.findIndex((love) => love._id.equals(user._id));

          if (index !== -1) {
            post.loves.splice(index , 1);
          } else {
            post.loves.push(user);
          }

          post = await post.save();
          
          notificationReaction(`${ctx.req.user.name} Love your post ` , user._id ,post.author , ctx.pubsub ) 

          return post;
        }
      ),
  },

  Post: {
    author: async function (parent, data, ctx, info) {
      const authorId = parent.author;
      const author = await User.findById(authorId);
      return author;
    },
    likes: async function (parent, data, ctx, info) {

      const user = ctx.req.user;
      const post = parent;

      let iLike = false;

      let likers = [];
      for (let i = 0; i < post.likes.length; i++) {


        if (post.likes[i]._id.equals(user._id)) {
          iLike = true;
          continue;
        };

        let liker = await User.findById(post.likes[i]._id);
        likers.push(liker)
      }

      if (iLike) {
        likers.unshift(user);
      }

      return likers;
    },
    disLikes: async function (parent, data, ctx, info) {

      const user = ctx.req.user;
      const post = parent;

      let iDisLike = false;

      let disLikers = [];
      for (let i = 0; i < post.disLikes.length; i++) {

        if (post.disLikes[i]._id.equals(user._id)) {
          iDisLike = true;
          continue;
        }

        let disliker = await User.findById(post.disLikes[i]._id);
        disLikers.push(disliker)
      }

      if (iDisLike) {
        disLikers.unshift(user);
      }

      return disLikers;
    },
    loves: async function (parent, data, ctx, info) {

      const user = ctx.req.user;
      const post = parent;

      let iLove = false;

      let lovers = [];
      for (let i = 0; i < post.loves.length; i++) {

        if (post.loves[i]._id.equals(user._id)) {
          iLove = true;
          continue;
        }

        let lover = await User.findById(post.loves[i]._id);
        lovers.push(lover)
      }

      if (iLove) {
        lovers.unshift(user);
      }

      return lovers;
    },
    myReaction: async function (parent, data, ctx, info) {
      let post = parent;
      let user = ctx.req.user;

      let index = post.likes.findIndex((like) => like._id.equals(user._id));
      if (index !== -1) {
        return "LIKE"
      }

      index = post.disLikes.findIndex((dislike) => dislike._id.equals(user._id));
      if (index !== -1) {
        return "DISLIKE";
      }

      index = post.loves.findIndex((love) => love._id.equals(user._id));
      if (index !== -1) {
        return "LOVE";
      }

      return "NONE"
    },
  },
};
