const _ = require("lodash");
const bcrypt = require('bcrypt');

const { Post } = require('../../models/post');
const { User, validateLogin } = require('../../models/user');
const { Story } = require('../../models/story');

const { combineResolvers } = require('graphql-resolvers');

const validate = require('../../middleware/validate');

const checkAuth = require('../../middleware/checkAuth');

module.exports = {
    Query: {
        login: combineResolvers(
            validate(validateLogin),
            async function (parent, {data}, ctx, info) {
                console.log(data);

                let user = await User.findOne({ email: data.email });
                if (!user) {
                    const errors = new Error("invalid input");
                    errors.data = "email not found"
                    errors.code = 400;
                    throw errors;
                }

                if (user.status != 'active') {
                    const errors = new Error("acount not activated");
                    errors.data = "please activate your account"
                    errors.code = 401;
                    throw errors;
                }

                const validPassword = await bcrypt.compare(data.password, user.password);

                if (!validPassword) throw new Error("Invalid password.");

                const token = user.generateAuthToken();

                return { token: token, user: user };
            }),

        getMe: combineResolvers(
            checkAuth,
            function (parent, args, ctx, info) {
                return ctx.req.user;
            }
        ),
        getPosts: combineResolvers(
            checkAuth,
            async function (parent, data, ctx, info) {
                let posts = await Post.find().sort({createdAt: -1});
                return posts;
            }),
        getComment: combineResolvers(
            checkAuth,
            async function (parent, data, ctx, info) {
                let comments = await Comment.find({});
                return comments;
            }
        ),
        stories: combineResolvers(
            checkAuth,
            async function (parent, args, ctx, info) {

                let users = await (User.find({ _id: { $ne: ctx.req.user._id } }).populate('stories'));

                users = _.filter(users, (element) => {
                    return element.stories.length > 0;
                })
                return users;
            }
        ),
        story: combineResolvers(
            checkAuth,
            async function (parent, args, ctx, info) {

                const story = await Story.findById(args.id);

                if (!story) {
                    const errors = new Error("story not found");
                    errors.code = 404;
                    throw errors;
                }
                return story;
            }
        ),
        hello: function (parent, args, ctx, info) {
            console.log('hello');
            return "hello anas";
        }
    }
}