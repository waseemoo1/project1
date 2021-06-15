const { User } = require("../../models/user");
const mongoose = require('mongoose');

module.exports = {
    Story: {
        author: async function (parent, args, ctx, info) {
            const author = await User.findById(parent.author);
            return author;
        },
        viewers: async function (parent, args, ctx, info) {

            let viewers = [];

            for(var i=0; i<parent.viewers.length; i++){
                let viewer = await User.findById(parent.viewers[i]);
                viewers.push(viewer)   
            }

            return viewers;
        },
        viewerCount: async function (parent, args, ctx, info) {
            return parent.viewers ? parent.viewers.length: 0;
        },
    }
}