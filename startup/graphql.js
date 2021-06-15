const { ApolloServer , PubSub} = require('apollo-server-express');

const path = require('path');
const http = require('http');

const { loadFilesSync } = require('@graphql-tools/load-files');
const { mergeTypeDefs } = require('@graphql-tools/merge');

const _ = require('lodash');

const MutationResolver = require('../graphql/resolvers/Mutation');
const QueryResolver = require('../graphql/resolvers/Query');
const SubscriptionResolver = require('../graphql/resolvers/Subscription');
const UserResolver = require('../graphql/resolvers/User');
const PostResolver = require('../graphql/resolvers/Post');
const StoryResolver = require('../graphql/resolvers/Story');
const CommentResolver = require('../graphql/resolvers/Comment');

const resolvers = _.merge(MutationResolver, QueryResolver
    , UserResolver , PostResolver , StoryResolver 
    , SubscriptionResolver , CommentResolver);

const typesArray = loadFilesSync(path.join(__dirname, '../graphql/schemas'), { extensions: ['graphql'] });
const typeDefs = mergeTypeDefs(typesArray);

const pubsub = new PubSub();

module.exports = function (app) {

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({req , res}) => {
            return {req: req , res: res , pubsub}
        },
        formatError: (err) => {
            if (!err.originalError) {
                console.log(err);
                return err;
            }
            const data = err.originalError.data;
            const message = err.message || 'An error occured.!';
            const code = err.originalError.code || 500;
            return { message: message, status: code, data: data };
        },
        subscriptions: {
            onConnect: async (connectionParams, webSocket, context) => {
                console.log("xxx")
                console.log(connectionParams)
            },
            onDisconnect: (websocket, context) => {
                console.log("WS Disconnected!")
            },
            path: "/Subscription"
          },
        uploads: false
    });

    server.applyMiddleware({ app });

    const httpServer = http.createServer(app);

    server.installSubscriptionHandlers(httpServer);

    const port = process.env.PORT || 3000;
    
    httpServer.listen(port, () => {
      console.log(
        `🚀 Server ready at http://localhost:${port}${server.graphqlPath}`,
      );
      console.log(
        `🚀 Subscriptions ready at ws://localhost:${port}${server.subscriptionsPath}`,
      );
    });
}