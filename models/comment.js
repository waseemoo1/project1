const Joi = require("joi");
const mongoose = require("mongoose");

const commentSchema = mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Post",
    },
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comment", commentSchema);

function validateComment(comment) {
  const schema = {
    text: Joi.string().required(),
    post: Joi.required()
  }
  return Joi.object(schema).validate(comment);
}

function validateComment2(comment) {
  const schema = {
    text: Joi.string().required(),
  }
  return Joi.object(schema).validate(comment);
}

exports.Comment = Comment;

module.exports.validateComment2 = validateComment2;
module.exports.validateComment = validateComment;