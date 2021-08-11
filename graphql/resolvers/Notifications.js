const { Notification } = require("../../models/notification");
const { User } = require("../../models/user");

module.exports = {
  Query: {
    notifications: async (parent, args, ctx, info) => {
      const notifications = await Notification.find({ to: ctx.user._id });
      return notifications;
    },
  },

  Mutation: {
    pushNotification: async (root, args, ctx, info) => {

      const newNotification = new Notification({
        label: args.label,
        from: ctx.req.user._id,
        to: args.id,
      });

      await newNotification.save();

      ctx.pubsub.publish(newNotification.to, {
        newNotification: newNotification,
      });

      return newNotification;
    },
  },

  Subscription: {
    newNotification: {
      subscribe: (parent, args, ctx) =>
        ctx.pubsub.asyncIterator(`${ctx.user._id}`),
    },
  },
  
  Notification: {
    from: async (parent, args, ctx, info) => {
      const user = await User.findById({ _id: parent.from });
      return user;
    },
    to: async (parent, args, ctx, info) => {
      const user = await User.findById({ _id: parent.to });
      return user;
    },
  },
};
