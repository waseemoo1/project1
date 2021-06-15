const mongoose = require("mongoose");

const storySchema = mongoose.Schema(
    {
        imageUrl: {
            type: String,
            required: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        viewers: {
            type: [mongoose.Schema.Types.ObjectId],
        },
        dateCreated: {
            type: Date,
            default: Date.now(),
            expires: 60 * 60 * 24,
        },
    }
    , { timestamps: true }
);

const Story = mongoose.model('Story', storySchema);

exports.Story = Story;
