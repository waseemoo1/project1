const express = require('express');
const router = express.Router();
const { User } = require('../models/user');
const { Code } = require('../models/secretCode');
const mongoose = require('mongoose');

router.get("/verify-account/:userId/:secretCode", async (req, res, next) => {
        try {
            const user = await User.findById(mongoose.Types.ObjectId(req.params.userId));

            const code = await Code.findOne({
                email: user.email,
                code: req.params.secretCode,
            });

            if (!user || !code) return res.status(400).send('user not found!!!!');

            await User.updateOne(
                { email: user.email },
                { status: "active" }
            );

            await Code.deleteMany({ email: user.email });

            res.status(200).send('Your email has been verified');

        } catch (err) {
            console.log(err);
            res.status(500).sendStatus('server error!!!');
        }
    });

module.exports = router;