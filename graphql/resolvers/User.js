const { User } = require("../../models/user");
const sendEmail = require("../../util/forConfirmEmail/sendEmail");
const checkAuth = require("../../middleware/checkAuth");
const createUrlConfirmEmail = require("../../util/forConfirmEmail/createUrlConfirmEmail");
const { createResolver } = require("apollo-resolvers");
const { processUpload } = require("../../util/forUploadFile/fileUplad");
const { deleteFile } = require("../../util/forUploadFile/fileDelete");
const { Post } = require("../../models/post");
const { Friends } = require("../../models/friend");
const { Requests } = require("../../models/request");
const { Pennding } = require("../../models/pennding");
const { sendNotRequsetFriend, acceptNotRequestFriend } = require("../../util/forNotification/notificationFriend");
const validateID = require('../../util/idValidate')
const _ = require('lodash');
const bcrypt = require('bcrypt');

module.exports = {

  Query: {
    getMe: checkAuth.createResolver(function (parent, args, ctx, info) {
      return ctx.req.user;
    }),
    getProfile: checkAuth.createResolver(
      async function (parent, args, ctx, info) {

        const profileId = args.userId;

        const profile = await User.findById(profileId);

        if (!profile) {
          const errors = new Error("User you want not found");
          errors.code = 404;
          throw errors;
        }

        return profile;
      }),
  },

  Mutation: {
    createUser: createResolver(async function (parent, { data }, ctx, info) {
      User.validateUser(data);
      const existingUser = await User.findOne({
        email: data.email,
      });
      if (existingUser) {
        const errors = new Error("User already exist");
        errors.code = 400;
        throw errors;
      }
      let uploadFile;
      console.log(data.image);
      if (data.image) {
        uploadFile = await processUpload(data.image);
        if (!uploadFile.success) {
          const errors = new Error("Faild uploading file");
          errors.code = 400;
          throw errors;
        }
      }

      let user = new User({
        name: data.name,
        password: data.password,
        email: data.email,
        age: data.age,
        imageUrl: uploadFile ? uploadFile.Location : null,
        confirm: true,
      });
      user = await user.save();

      //await sendEmail(data.email, createUrlConfirmEmail(user._id));

      return user;
    }),
    updateUser: checkAuth.createResolver(async function (parent, args, ctx, info) {

      User.validateUpdateUser(args.data);
      const { id, data } = args;
      validateID(id);

      let user = await User.findById(id);

      if (!user) {
        const errors = new Error("User not found");
        errors.code = 404;
        throw errors;
      }

      let uploadFile;
      if (data.image) {
        uploadFile = await processUpload(data.image);
        if (!uploadFile.success) {
          const errors = new Error("Faild uploading file");
          errors.code = 400;
          throw errors;
        } else {
          if (user.imageUrl) deleteFile(user.imageUrl);
          user.imageUrl = uploadFile.Location;
        }
      }

      user.name = data.name ? data.name : user.name;
      user.age = data.age ? data.age : user.age;

      await user.save();

      return user;
    }),
    deleteUser: checkAuth.createResolver(async function (parent, { id }, ctx, info) {
      let user = await User.findById(id);

      if (!user) {
        const errors = new Error("user not found");
        errors.code = 404;
        throw errors;
      }

      if (!user._id.equals(ctx.req.user._id)) {
        const errors = new Error("can't remove others account");
        errors.code = 401;
        throw errors;
      }

      if (user.imageUrl) deleteFile(user.imageUrl);

      user = await user.remove();

      return user;
    }),

    acceptFriendRequest: checkAuth.createResolver(async function (parent, args, ctx, info) {

      const id = args.id;
      let user = ctx.req.user;
      validateID(id);

      let UserToBeFriend = await User.findById(id);

      if (!UserToBeFriend) {
        const errors = new Error("UserToBeFriend not found");
        errors.code = 404;
        throw errors;
      }

      const isFriends = await Friends
        .exists({ $or: [{ user1: user._id, user2: id }, { user2: user._id, user1: id }] });

      if (isFriends) {
        const errors = new Error("He's alredy your friend");
        errors.code = 404;
        throw errors;
      }

      let friendRequest = await Requests.find({ from: id });
      if (friendRequest.length == 0) {
        const errors = new Error("this user don't send you frined request");
        errors.code = 404;
        throw errors;
      }

      await Requests.deleteOne({ from: id, to: user._id });

      let friends = new Friends({
        user1: user,
        user2: UserToBeFriend,
      });
      await friends.save();

      await acceptNotRequestFriend(
        ctx.req.user.name,
        ctx.req.user._id,
        id,
        ctx.pubsub
      );

      return user;
    }),

    sendaFriendRequest: checkAuth.createResolver(async function (parent, args, ctx, info) {

      const id = args.id;
      validateID(id);

      let user = ctx.req.user;
      let UserToBeFriend = await User.findById(id);

      if (!UserToBeFriend) {
        const errors = new Error("UserToBeFriend not found");
        errors.code = 404;
        throw errors;
      }

      const checkStatuPennding = await Pennding.exists({ user1: id, user2: user._id });

      if (checkStatuPennding) {
        const errors = new Error("can't send request to user now must be wait after 1 month");
        errors.code = 404;
        throw errors;
      }

      const isFriends = await Friends
        .exists({ $or: [{ user1: user._id, user2: id }, { user2: user._id, user1: id }] });

      if (isFriends) {
        const errors = new Error("He's alredy your friend");
        errors.code = 404;
        throw errors;
      }

      const doIsentHimFriendRequest = await Requests.exists({ from: user._id, to: id, });

      if (doIsentHimFriendRequest) {
        const errors = new Error("you already sent him a friend request");
        errors.code = 404;
        throw errors;
      }

      const doHeSentMeFriendRequest = await Requests.exists({ from: id, to: user._id, });

      if (doHeSentMeFriendRequest) {
        const errors = new Error("He send you a friend request");
        errors.code = 404;
        throw errors;
      }

      let Requset = new Requests({
        from: user._id,
        to: id,
      });
      await Requset.save();

      await sendNotRequsetFriend(
        ctx.req.user.name,
        ctx.req.user._id,
        id,
        ctx.pubsub
      );

      return user;
    }),

    deleteFriend: checkAuth.createResolver(async function (parent, args, ctx, info) {

      const id = args.id;
      validateID(id);

      let user = ctx.req.user;
      let UserToDelete = await User.findById(id);

      if (!UserToDelete) {
        const errors = new Error("UserToDelete not found");
        errors.code = 404;
        throw errors;
      }

      let friend1 = await Friends.deleteOne({
        user1: user._id,
        user2: id,
      });
      let friend2 = await Friends.deleteOne({
        user2: user._id,
        user1: id,
      });

      if (friend1.deletedCount == 0 && friend2.deletedCount == 0) {
        const errors = new Error("alredy user not friend with you");
        errors.code = 404;
        throw errors;
      }

      return user;
    }),

    deleteFriendRequestSent: checkAuth.createResolver(async function (parent, args, ctx, info) {
      const id = args.id;
      validateID(id);

      let user = ctx.req.user;
      let UserToDeleteRequest = await User.findById(id);

      if (!UserToDeleteRequest) {
        const errors = new Error("UserToBeFriend not found");
        errors.code = 404;
        throw errors;
      }

      let request = await Requests.deleteOne({
        from: user._id,
        to: id,
      });

      if (request.deletedCount == 0) {
        const errors = new Error("don't have request to remove ");
        errors.code = 404;
        throw errors;
      }

      return user;
    }),

    rejectFriendRequest: checkAuth.createResolver(async function (parent, args, ctx, info) {
      const id = args.id;
      validateID(id);

      let user = ctx.req.user;
      let UserToDeleteRequest = await User.findById(id);

      if (!UserToDeleteRequest) {
        const errors = new Error("UserToBeFriend not found");
        errors.code = 404;
        throw errors;
      }

      let request = await Requests.deleteOne({
        from: id,
        to: user._id,
      });

      if (request.deletedCount == 0) {
        const errors = new Error("don't have request to remove ");
        errors.code = 404;
        throw errors;
      }

      let pennding = new Pennding({
        user1: user._id,
        user2: id,
      });
      await pennding.save();

      return user;
    }),
    resetPassword: checkAuth.createResolver( async function (parent,args, ctx , info){
      const user = ctx.req.user;
      const newPassword  = args.newPassword;
      const oldPassword = args.oldPassword;
      
      const validPassword = await bcrypt.compare(oldPassword, user.password);
      if (!validPassword) throw new Error("Invalid password.");

      user.password = newPassword;
      user.tokens = [];
      user.tokens.push(ctx.req.token)
      await user.save()
      return true;
    }
    )},

  User: {
    posts: async function (parent, args, ctx, info) {

      const user = ctx.req.user;

      const isFriends = await Friends
        .exists({ $or: [{ user1: parent._id, user2: user._id }, { user1: user._id, user2: parent._id }] });

      if (user._id.equals(parent._id) || isFriends) {
        const posts = await Post.find({
          author: parent._id,
        }).sort({
          createdAt: -1,
        });
        return posts;
      }

      return [];
    },
    friendRequestsSent: async function (parent, data, ctx, info) {
      if (parent._id.equals(ctx.req.user._id)) {

        let friendRequestsSent = [];
        friendRequestsSent = await Requests.find({ from: parent._id });
        let users = [];
        for (let i = 0; i < friendRequestsSent.length; i++) {
          let user = await User.findById(friendRequestsSent[i].to);
          users.push(user);
        }
        return users;
      }
      return [];
    },
    friendRequestsReceived: async function (parent, data, ctx, info) {
      if (parent._id.equals(ctx.req.user._id)) {
        let friendRequestsReceived = [];
        friendRequestsReceived = await Requests.find({ to: parent._id });
        let users = [];
        for (let i = 0; i < friendRequestsReceived.length; i++) {
          let user = await User.findById(friendRequestsReceived[i].from);
          users.push(user);
        }
        return users;
      }
      return [];
    },
    friends: async function (parent, data, ctx, info) {
      const state = parent.friendsPrivacy;
      const userToGetFriendsId = parent._id;
      const friendsRelations = await Friends.find().or([{ user1: userToGetFriendsId }, { user2: userToGetFriendsId }]);
      const friendsIds = friendsRelations.map(friendsRelations => {
        return friendsRelations.user1.equals(userToGetFriendsId) ? friendsRelations.user2 : friendsRelations.user1;
      })
      const friends = await User.find({ _id: { $in: friendsIds } });

      switch (state) {
        case 'FRIENDS':
          const isFriends = await Friends
            .exists({ $or: [{ user1: parent._id, user2: ctx.req.user._id }, { user1: ctx.req.user._id, user2: parent._id }] });
          if (isFriends) {
            return { friendsData: friends, friendsCount: friends.length };
          }
        case 'PRIVATE':
          return { friendsData: [], friendsCount: 0 };
        default:
          return { friendsData: friends, friendsCount: friends.length };

      }

    },
    mutualFriends: async function (parent, data, ctx, info) {
      const userId = parent._id;
      const myUser = ctx.req.user;

      const myUserFriendsRelation = await Friends.find().or([{ user1: myUser._id }, { user2: myUser._id }])
      const myUserFriendsIds = myUserFriendsRelation.map(friendsRelations => {
        return friendsRelations.user1.equals(myUser._id) ? friendsRelations.user2 : friendsRelations.user1;
      })

      const userFriendsRelation = await Friends.find().or([{ user1: userId }, { user2: userId }])
      const userFriendsIds = userFriendsRelation.map(friendsRelations => {
        return friendsRelations.user1.equals(userId) ? friendsRelations.user2 : friendsRelations.user1;
      })

      //intersection between myFriends and your Friends
      let mutualFriendsIds = []
      userFriendsIds.forEach(elementF => {
        myUserFriendsIds.forEach(elementA => {
          if (elementF.equals(elementA)) {
            mutualFriendsIds.push(elementF)
          }
        });
      });

      console.log(mutualFriendsIds)
      const mutualFriends = await User.find({ _id: { $in: mutualFriendsIds } });

      return { mutualFriendsData: mutualFriends, mutualFriendsCount: mutualFriends.length };
    },
    isFriends: async function (parent, data, ctx, info) {

      const user = ctx.req.user;
      const profileId = parent._id;

      return isFriends = await Friends
        .exists({ $or: [{ user1: user._id, user2: profileId }, { user1: profileId, user2: user._id }] });
    },
    doISentHimFriendRequest: async function (parent, data, ctx, info) {

      const user = ctx.req.user;
      const profileId = parent._id;

      return doISentHimFriendRequest = await Requests
        .exists({ from: user._id, to: profileId });

    },
    doHeSentMeFriendRequest: async function (parent, data, ctx, info) {

      const user = ctx.req.user;
      const profileId = parent._id;

      return doISentHimFriendRequest = await Requests
        .exists({ from: profileId, to: user._id });
    },
  }
}
