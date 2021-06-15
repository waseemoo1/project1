const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const {User} = require('./user');

const secretCode = new Schema({
    email: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    dateCreated: {
        type: Date,
        default: Date.now(),
        expires: 3600,
    },
});

secretCode.pre("remove", async function (next) {
    const code = this;
    console.log('here deleting user');
    await User.deleteOne({email: code.email});
    next();
  });

const Code = mongoose.model("code", secretCode);

exports.Code = Code;
