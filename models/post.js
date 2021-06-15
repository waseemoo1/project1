const Joi = require("joi");
const mongoose = require("mongoose");
const validator = require("validator");
Joi.objectId = require('joi-objectid')(Joi)

const schemaPost = mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        imageUrl: {
            type: String
        },
        published: {
            type: Boolean,
            default: true
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
    },
    { 
        timestamps: true 
    }
);

const Post = mongoose.model("Post", schemaPost);

function validatePost(post) {
    const schema = {
        title: Joi.string().required().max(50),
        description: Joi.string().required(),
    }
    return Joi.object(schema).validate(post);
}

exports.Post = Post;
exports.validatePost = validatePost;
