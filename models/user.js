const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('config');
const Joi = require("joi");
const mongoose = require("mongoose");
const validator = require('validator');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          const errors = new Error("Email already exist");
          errors.code = 400;
          throw errors;
        }
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 7,
      trim: true,
      validate(value) {
        if (value.toLowerCase().includes("password")) {
          throw new Error('Password cannot contain "password"');
        }
      },
    },
    age: {
      type: Number,
      default: 0,
      validate(value) {
        if (value < 0) {
          throw new Error("Age must be a postive number");
        }
      },
    },
    status: {
      type: String,
      default: "pending"
    }
    ,
    tokens:{
      type: [String],
      required: true
    },
  },
  { timestamps: true , toObject: { virtuals: true } }
);

userSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign({ _id: user._id }, config.get('jwtPrivateKey'));
  user.tokens.push(token);
  await user.save();

  return token;
}

userSchema.virtual("posts", {
  ref: "Post",
  localField: "_id",
  foreignField: "author",
});

userSchema.virtual("stories", {
  ref: "Story",
  localField: "_id",
  foreignField: "author",
});

//for login
userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email: email });
  if (!user) {
    throw new Error("Unable to login");
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Unable to login");
  }
  return user;
};

//hash password before save
userSchema.pre("save", async function (next) {
  const user = this;

  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }

  next();
});

//delet all post after delet my profile
userSchema.pre("remove", async function (next) {
  const user = this;
  await Post.deleteMany({ owner: user._id });
  next();
});

const User = mongoose.model('User', userSchema);

function validateUser(user) {
  const schema = {
    name: Joi.string().min(5).max(50).required(),
    email: Joi.string().min(5).max(255).required().email({ tlds: { allow: ['com', 'net'] } }),
    password: Joi.string().min(5).max(255).required(),
    age: Joi.number().min(0)
  }
  return Joi.object(schema).validate(user);
}

function validateLogin(userInput) {
  const schema = {
      email: Joi.string().min(5).max(255).required().email({ tlds: { allow: ['com', 'net'] } }),
      password: Joi.string().min(5).max(255).required()
  }
  return Joi.object(schema).validate(userInput);
}

exports.User = User;
exports.validateUser = validateUser;
exports.validateLogin = validateLogin;