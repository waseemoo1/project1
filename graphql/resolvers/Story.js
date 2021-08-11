const { User } = require("../../models/user");
const _ = require("lodash");
const { Story } = require("../../models/story");
const checkAuth = require("../../middleware/checkAuth");
const {processUpload} = require('../../util/forUploadFile/fileUplad');
const {Friends} = require('../../models/friend');

module.exports = {
  Query: {
    stories:
      checkAuth.createResolver(
        async function (parent, args, ctx, info) {

          const userToGetFriendsId = ctx.req.user._id;

          const friendsRelations = await Friends.find().or([{ user1: userToGetFriendsId }, { user2: userToGetFriendsId }]);
    
          const friendsIds = friendsRelations.map(friendsRelations => {
            return friendsRelations.user1.equals(userToGetFriendsId) ? friendsRelations.user2 : friendsRelations.user1;
          })
    
          let friends = await User.find({ _id: { $in: friendsIds } }).populate('stories');

          friends = friends.filter((element) => {
            return element.stories.length > 0;
          })

          return friends;
        }
      ),
    story: checkAuth.createResolver(

      async function (parent, args, ctx, info) {

        const story = await Story.findById(args.storyId);

        if (!story) {
          const errors = new Error("story not found");
          errors.code = 404;
          throw errors;
        }
        return story;
      }),
    myStories: checkAuth.createResolver(
      async function (parent, args, ctx, info) {
        const user = ctx.req.user;
        const stories = await Story.find({ author: user._id });

        return stories;
      }),
  },

  Mutation: {
    addStory: checkAuth.createResolver(
      async function (parent, args, ctx, info) {

        let uploadFile = await processUpload(args.image);

        if (!uploadFile.success) {
          const errors = new Error("Faild uploading file");
          errors.code = 400;
          throw errors;
        }

        let story = new Story({
          imageUrl: uploadFile.Location,
          author: ctx.req.user._id,
          viewers: [],
        })

        story = await story.save();

        return story;
      }
    ),
    storySeen: checkAuth.createResolver(
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
  },
  Story: {
    author: async function (parent, args, ctx, info) {
      const author = await User.findById(parent.author);
      return author;
    },
  },
  MyStory: {
    story: async function (parent, args, ctx, info) {
      return parent;
    },
    viewers: async function (parent, args, ctx, info) {

      let viewers = await User.find({ _id: { $in: parent.viewers } });
      return viewers;

    },
    viewerCount: async function (parent, args, ctx, info) {
      return parent.viewers ? parent.viewers.length : 0;
    },
  }
};