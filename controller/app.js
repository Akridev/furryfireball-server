if(process.env.VERCEL_ENV != 'production') require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('./database_connection'); //db
const cors = require('cors');
const createHttpError = require('http-errors');
const nodemailer = require('nodemailer');
const res = require('express/lib/response');
const app = express().use(cors()).use(express.json());
const axios = require('axios');
const bcrypt = require('bcrypt');

// const { login } = require('./storage');

//======== Model Imports =============
const User = require('../model/user');
const Records = require('../model/pastRecord');
const Profile = require('../model/profile');
const Leaderboard = require('../model/leaderboard');
const Friendship = require('../model/friendship');
const Game = require('../model/game');
const FriendReq = require('../model/friendReq');
const { ignore } = require('nodemon/lib/rules');
const { password } = require('pg/lib/defaults');
const { user } = require('pg/lib/defaults');
const { json } = require('express/lib/response');
const PlayerInfo = require('../model/playerInfo');
const Campaign = require('../model/campaign');
const AUTH_SERVER_HOST = process.env.AUTH_SERVER;

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.get('/time', function (req, res, next) {
    pool.query('SELECT NOW();').then((response) => {
        const now = response.rows[0].now;
        return res.json({ now: now });
    });
});

// Start of User Endpoints-------------------------------------------

// Register a new user [done]
// http://localhost:4000/register
app.post('/register', function (req, res, next) {
    let registerData = {
        user: req.body.registerName,
        pass: req.body.registerPass,
        confirmPass: req.body.confirmPass,
        email: req.body.email,
        country: req.body.country,
    };

    console.log(registerData);
    User.register(registerData)
        .then((result) => {
            console.log(result);
            if (result.errMsg) {
                res.status(409).json({ error: result.errMsg });
            } else {
                console.log(result);
                res.status(201).json(result);
            }
        })
        .catch(next);
});

function verifyToken(req, res, next) {
    const url = `${AUTH_SERVER_HOST}/verifyToken`;
    console.log('verify user and get user id-------------');
    console.log(url);
    axios(url, {
        method: 'POST', // // or "PUT" with the url changed to, e.g "https://reqres.in/api/users/2"
        headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers['authorization'],
        },
    })
        .then((result) => {
            if (result.data.userId) {
                if (isNaN(result.data.userId)) {
                    req.userId = result.data.userId.id; // when only access token
                } else {
                    req.userId = result.data.userId;
                }
                if (result.data.newAccessToken) {
                    req.newAccessToken = result.data.newAccessToken; // when got both token
                }
                console.log('HTTP request successful');
                next();
            }
        })
        .catch((error) => {
            // return res when verification got err
            console.log(error);
            console.log('HTTP request unsuccessful');

            // return err to client when verify token fail
            // used to be res.status(401).json({ error: error.response.data.error });
            res.status(401).json({ error: error });
        });
}

// Verify email [done]
// http://localhost:4000/verifyMail
app.post('/verifyMail', function (req, res, next) {
    const { email } = req.query;
    console.log(req.query); //{ email: '13@gmail.com' }

    User.verifyMail(email)
        .then((result) => {
            console.log(result);
            if (result) {
                // when user can be found by email successfully (not null)
                //---------------------------------email token generated here
                const EMAIL_SECRET = process.env.EMAIL_SECRET; // some random text

                const payload = {
                    userEmail: result.rows[0].email,
                };

                const emailSecretToken = jwt.sign(payload, EMAIL_SECRET, {
                    expiresIn: process.env.EMAIL_TOKEN_EXPIRY,
                });
                sendConfirmMail(email, emailSecretToken);

                console.log({
                    email: email,
                    emailSecretToken: emailSecretToken,
                });
                //------------------------------------generate email token end
                res.status(200).json({
                    message:
                        'A verify email is sent! Check your email to proceed!',
                });
            } else {
                res.status(404).json({
                    error: 'The email does not register an account yet, register your account first!',
                });
            }
        })
        .catch(next);
    // }
});

// Reset user password [done]
// http://localhost:4000/login
app.put('/resetPass', function (req, res, next) {
    let resetData = {
        email: req.body.email,
        password: req.body.password,
    };
    // checking if match
    console.log(resetData);

    User.resetPass(resetData)
        .then((affectedRow) => {
            if (affectedRow == 1) {
                res.status(201).json({ message: 'Reset password successful!' });
            } else {
                res.status(500).json({
                    error: 'Not able to reset password! Please try again',
                });
            }
        })
        .catch(next);
});

// Get past records [done]
// http://localhost:4000/pastRecord
app.get('/pastRecord', verifyToken, function (req, res, next) {
    Records.getPastRecord(req.userId)
        .then((recordsSet) => {
            if (recordsSet) {
                res.status(201).json({ recordsSet: recordsSet });
            }
        })
        .catch(next);
});

app.post('/getLoggedInUserId', verifyToken, function (req, res, next) {
    const userId = req.userId;
    console.log(req.userId);
    res.status(200).json(userId);
});

// End of User Endpoints----------------------------------------------

//==================================
// Profile
//==================================

//getting user information
// http://localhost:4000/getUser

app.post('/getUser', verifyToken, function (req, res, next) {
    console.log('userIDgetuser:' + req.userId);
    const accessToken = req.newAccessToken;
    const userId = req.userId;

    if (isNaN(userId)) {
        res.status(400).json({
            error: 'Invalid user id!',
        });
    }
    Profile.findById(userId, accessToken)
        .then((result) => {
            if (result.error) {
                return res.status(404).json({ result: result });
            }
            return res.status(201).json({ result: result });
        })
        .catch(next);
});
// http://localhost:4000/updateUser

app.put('/updateUser', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const accessToken = req.newAccessToken;

    let userId = req.userId;

    const info = req.body;
    if (isNaN(userId)) {
        res.status(400).json({
            error: 'Unable to find account!',
        });
    }

    Profile.update(userId, info, accessToken)
        .then((result) => {
            console.log(result);
            if (result.error === 'username or email already exists') {
                return res.status(409).json(result);
            } else if (result.error) {
                return res.status(405).json(result);
            }
            return res.status(201).json(result);
        })
        .catch(next);
});

app.put('/updateDailyRewardDate', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const accessToken = req.newAccessToken;

    let userId = req.userId;

    let { date } = req.query;
    console.log('DATE:' + date);
    if (isNaN(userId)) {
        res.status(400).json({
            error: 'Unable to find account!',
        });
    }

    Profile.updateDailyRewardDate(userId, date)
        .then((result) => {
            console.log(result);
            if (result.error) {
                return res.status(405).json(result);
            }
            return res.status(201).json(result);
        })
        .catch(next);
});

app.get('/getAllProfileImage', verifyToken, function (req, res, next) {
    const accessToken = req.newAccessToken;

    Profile.getAllImages().then((result) => {
        return res
            .status(201)
            .json({ result: result, accessToken: accessToken });
    });
});

app.get('/getPurchasedProfileImage', verifyToken, function (req, res, next) {
    const accessToken = req.newAccessToken;
    let userId = req.userId;
    console.log(userId);
    Profile.getPurchasedImages(userId).then((result) => {
        return res
            .status(201)
            .json({ result: result, accessToken: accessToken });
    });
});

app.post('/insertPurchaseImage', verifyToken, function (req, res, next) {
    const accessToken = req.newAccessToken;
    let userId = req.userId;
    console.log(req.query);
    let { picurl } = req.query;

    Profile.insertPurchasedImage(picurl, userId, accessToken).then((result) => {
        return res.status(201).json(result);
    });
});

app.put('/updateUserImage', verifyToken, function (req, res, next) {
    const { imageUrl } = req.query;
    const accessToken = req.newAccessToken;
    console.log(imageUrl);
    let userId = req.userId;
    if (isNaN(userId)) {
        res.status(400).json({
            error: 'Unable to find account!',
        });
    }

    Profile.updateImage(userId, imageUrl, accessToken)
        .then((result) => {
            console.log(result);
            if (result.error) {
                return res.status(405).json(result);
            }
            return res.status(201).json(result);
        })
        .catch(next);
});

// http://localhost:4000/deleteUser
app.delete('/deleteUser', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const userId = req.userId;
    const accessToken = req.newAccessToken;

    if (isNaN(userId)) {
        res.status(400).json({
            error: 'Unable to find account!',
        });
    }
    Profile.delete(userId)
        .then((result) => {
            if (result.error) {
                return res.status(500).json(result);
            }
            res.status(200).json(result);
        })
        .catch(next);
});

// http://localhost:4000/checkPassword
app.post('/checkPassword', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const userId = req.userId;
    const password = req.body.pass;
    const accessToken = req.newAccessToken;

    if (isNaN(userId)) {
        res.status(400).json({
            error: 'Unable to find account!',
        });
    }

    Profile.checkPassword(password, userId, accessToken)

        .then((result) => res.status(201).json(result))
        .catch(next);
});
//==================================
// Leaderboard
//==================================

app.get('/leaderboard/global', function (req, res, next) {
    const { gamemode } = req.query;
    console.log(gamemode);
    Leaderboard.selectGlobal(gamemode)
        .then((result) => res.status(200).json({ data: result }))
        .catch(next);
});


app.get('/leaderboard/local', verifyToken, function (req, res, next) {
    const { gamemode } = req.query;
    const userId = req.userId;
    Leaderboard.selectLocal(userId, gamemode)
        .then((result) => res.status(200).json({ data: result }))
        .catch(next);
});

app.get('/leaderboard/friends', verifyToken, function (req, res, next) {
    const { gamemode } = req.query;
    const userId = req.userId;
    Leaderboard.selectFriends(userId, gamemode)
        .then((result) => res.status(200).json({ data: result }))
        .catch(next);
});

//==================================
// Friends Requests
//==================================

app.get('/friendReqs', verifyToken, function (req, res, next) {
    console.log(req.query);
    const userId = req.userId;
    console.log(userId);
    FriendReq.getAll(userId)
        .then((result) => res.status(200).json({ data: result }))
        .catch(next);
});

app.delete('/friendReq/reject', verifyToken, function (req, res, next) {
    console.log(req.query);
    const userId = req.userId;
    console.log(req.body);
    const userId2 = req.body.second_userid;
    console.log(userId, userId2);
    FriendReq.rejectFriendReq(userId, userId2)
        .then((result) => res.status(201).send(result))
        .catch(next);
});

app.delete('/friendReq/accept', verifyToken, function (req, res, next) {
    console.log(req.query);
    const userId = req.userId;
    console.log(req.body);
    const userId2 = req.body.second_userid;
    console.log(userId, userId2);
    FriendReq.acceptFriendReq(userId, userId2)
        .then((result) => res.status(201).send(result))
        .catch(next);
});

app.post('/friendReq/accept', verifyToken, function (req, res, next) {
    const userId = req.userId;
    const userId2 = req.body.second_userid;
    console.log(userId, userId2);
    Friendship.addFriendByID(userId, userId2)
        .then((result) => res.status(201).send(result))
        .catch(next);
});

app.post('/friendReq/send', verifyToken, function (req, res, next) {
    const userId = req.userId;
    const userId2 = req.body.second_userid;
    console.log(userId, userId2);
    FriendReq.sendFriendReq(userId, userId2)
        .then((result) => res.status(201).send(result))
        .catch(next);
});

app.get('/friendReq/request/:friendId', verifyToken, function (req, res, next) {
    const userId = req.userId;
    const friendId = parseInt(req.params.friendId);

    FriendReq.searchFriendReq(userId, friendId)
        .then((result) => {
            if (result.error != null) {
                res.status(404).json(result);
            } else {
                return res.status(200).json(result);
            }
        })
        .catch(next);
});

app.delete(
    '/friendReq/cancel/:friendId',
    verifyToken,
    function (req, res, next) {
        console.log(req.query);
        const userId = req.userId;
        const friendId = parseInt(req.params.friendId);
        console.log(friendId, userId);
        FriendReq.rejectFriendReq(friendId, userId)
            .then((result) => res.status(201).send(result))
            .catch(next);
    }
);

app.delete(
    '/friendReq/reject/:userId2',
    verifyToken,
    function (req, res, next) {
        console.log(req.query);
        const userId = req.userId;
        const userId2 = parseInt(req.params.userId2);
        console.log(userId, userId2);
        FriendReq.rejectFriendReq(userId, userId2)
            .then((result) => res.status(201).send(result))
            .catch(next);
    }
);

app.delete(
    '/friendReq/accept/:userId2',
    verifyToken,
    function (req, res, next) {
        console.log(req.query);
        const userId = req.userId;
        const userId2 = parseInt(req.params.userId2);
        console.log(userId, userId2);
        FriendReq.acceptFriendReq(userId, userId2)
            .then((result) => res.status(201).send(result))
            .catch(next);
    }
);

app.post('/friendReq/accept/:userId2', verifyToken, function (req, res, next) {
    const userId = req.userId;
    const userId2 = parseInt(req.params.userId2);
    console.log(userId, userId2);
    Friendship.addFriendByID(userId, userId2)
        .then((result) => res.status(201).send(result))
        .catch(next);
});

//======= End of Friends Requests =======

// Start of Friends Endpoints-------------------------------------------

app.get('/getUserId', verifyToken, function (req, res, next) {
    const userId = req.userId;
    console.log(userId);

    Friendship.findById(userId)
        .then((result) => {
            return res.status(201).json(result);
        })
        .catch(next);
});

app.get('/users/friends', verifyToken, function (req, res, next) {
    const userId = req.userId;
    console.log(userId);

    Friendship.selectAllFriends(userId)
        .then((result) => {
            if (result.error != null) {
                res.status(404).json(result);
            } else {
                return res.status(200).json(result);
            }
        })
        .catch(next);
});

app.get('/friends/friend', verifyToken, function (req, res, next) {
    const userId = req.userId;
    const fName = req.query.friendName.trim();
    console.log(fName);

    var regex = new RegExp('^[a-zA-Z0-9]+$');
    if (!fName) {
        return next(createHttpError(400, 'Please provide username of friend!'));
    } else if (!regex.test(fName)) {
        return next(
            createHttpError(
                403,
                'No special characters and no numbers, please!'
            )
        );
    } else {
        Friendship.searchFriendByName(userId, fName)
            .then((result) => {
                if (result.error != null) {
                    res.status(404).json(result);
                } else {
                    return res.status(200).json(result);
                }
            })
            .catch(next);
    }
});

app.delete('/friends/:friendId', verifyToken, function (req, res, next) {
    const userId = req.userId;
    const friendId = parseInt(req.params.friendId);

    if (!friendId) {
        return next(createHttpError(400, 'Please provide username of friend!'));
    } else {
        if (isNaN(userId)) {
            res.status(400).json({
                error: 'Invalid user id!',
            });
        } else if (isNaN(friendId)) {
            ers.status(400).json({
                error: 'Invalid friend id!',
            });
        } else {
            Friendship.deleteFriendById(userId, friendId)
                .then((result) => {
                    if (result.error != null) {
                        res.status(404).json(result);
                    } else {
                        return res.status(200).json(result);
                    }
                })
                .catch(next);
        }
    }
});

app.get('/friends/suggestions', verifyToken, function (req, res, next) {
    const userId = req.userId;
    Friendship.selectSuggestedFriends(userId)
        .then((result) => {
            if (result.error != null) {
                res.status(404).json(result);
            } else {
                return res.status(200).json(result);
            }
        })
        .catch(next);
});

app.get('/users/user', verifyToken, function (req, res, next) {
    const userId = req.userId;
    const uName = req.query.userName.trim();

    var regex = new RegExp('^[a-zA-Z0-9]+$');
    if (!uName) {
        return next(createHttpError(400, 'Please provide username of friend!'));
    } else if (!regex.test(uName)) {
        return next(
            createHttpError(
                403,
                'No special characters and no numbers, please!'
            )
        );
    } else {
        Friendship.searchUserByName(userId, uName)
            .then((result) => {
                if (result.error != null) {
                    res.status(404).json(result);
                } else {
                    return res.status(200).json(result);
                }
            })
            .catch(next);
    }
});

// End of Friends Endpoints-------------------------------------------

//==================================
// Game
//==================================

app.get('/game/highScore', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const userId = req.userId;
    const accessToken = req.newAccessToken;

    if (isNaN(userId)) {
        res.status(400).json({
            error: 'Unable to find account!',
        });
    } else {
        Game.getHighScore(userId, accessToken)
            .then((result) => res.status(200).json(result))
            .catch(next);
    }
});

app.post('/game/highScore', verifyToken, function (req, res, next) {
    const { gamemode } = req.query;
    const userId = req.userId;

    let gameData = {
        score: 0,
        time: 0,
    };
    if (req.body) {
        gameData.score = req.body.score;
        gameData.time = req.body.time;
    }
    Game.insertHighScore(userId, gamemode, gameData)
        .then((result) => res.status(201).json(result))
        .catch(next);
});

app.put('/game/highScore', verifyToken, function (req, res, next) {
    const { gamemode } = req.query;
    const userId = req.userId;

    const gameData = {
        score: req.body.score,
        time: req.body.time,
    };

    Game.updateHighScore(userId, gamemode, gameData)
        .then((result) => res.status(201).json(result))
        .catch(next);
});

app.patch('/game/highScore', verifyToken, function (req, res, next) {
    const { gamemode } = req.query;
    const userId = req.userId;

    const time = req.body.time;

    Game.patchHighScore(userId, gamemode, time)
        .then((result) => res.status(201).json(result))
        .catch(next);
});

app.post('/game/attempt', verifyToken, function (req, res, next) {
    const userId = req.userId;
    const gameData = {
        score: req.body.score,
        time: req.body.time,
        enemiesKilled: req.body.enemiesKilled,
        gamemode: req.body.gamemode,
    };
    console.log(userId);
    console.log(gameData);
    Game.insertAttempt(userId, gameData)
        .then((result) => res.status(201).json(result))
        .catch(next);
});

app.get('/game/highScoreByID', verifyToken, function (req, res, next) {
    const { gamemode } = req.query;
    const userId = req.userId;
    console.log(userId);
    console.log('=======================');
    Game.getHighScoreByID(userId, gamemode)
        .then((result) => res.status(200).json(result))
        .catch((err) => {
            console.log(err);
            next();
        });
});

app.get('/game/highScores', verifyToken, function (req, res, next) {
    const { userId, gamemode } = req.query;
    console.log(userId, gamemode);
    Game.getHighScoreAll(userId, gamemode)
        .then((result) => res.status(200).json(result))
        .catch((err) => {
            console.log(err);
            next();
        });
});

app.get('/game/equippedItems', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const userId = req.userId;

    Game.getEquippedItems(userId)
        .then((response) => {
            console.log(response);
            if (response.data) {
                console.log('sending back to client------------');
                console.log(response.data);
                res.status(200).json({ data: response.data });
            } else {
                res.status(404).json({ errMsg: response.errMsg });
            }
        })
        .catch(next);
});
//======= End of Game =======

// Start of Game Store, lucky draw, inventory api-------------------------------------------
app.get('/getStoreData', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const userId = req.userId;

    Game.getStoreData(userId)
        .then((response) => {
            console.log(response);
            if (response.data) {
                console.log('sending back to client------------');
                console.log(response.data);
                res.status(200).json({ data: response.data });
            } else {
                res.status(404).json({ errMsg: response.errMsg });
            }
        })
        .catch(next);
});

app.post('/productPurchase', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const userId = req.userId;
    const productName = req.body.productName;
    const productType = req.body.productType;
    const amountOwned = req.body.amountOwned;

    console.log(
        'product purchase-----------------------------\n' +
            productName +
            productType +
            amountOwned
    );

    Game.productPurchase(userId, productName, productType, amountOwned)
        .then((response) => {
            console.log(response);
            if (response.successMsg) {
                console.log('product sending back to client------------');
                console.log(response.successMsg);
                res.status(200).json({ successMsg: response.successMsg });
            } else {
                res.status(404).json({ errMsg: response.errMsg });
            }
        })
        .catch(next);
});

app.put('/luckyDraw', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const userId = req.userId;
    const luckyDrawChance = req.body.luckyDrawChance;
    const coinsEarned = req.body.coinsEarned;

    console.log(
        'luckyDrawChance-----------------------------' + luckyDrawChance
    );

    Game.luckyDraw(userId, luckyDrawChance, coinsEarned)
        .then((response) => {
            console.log(response);
            if (response.successMsg) {
                console.log(
                    'luckyDrawChance sending back to client------------'
                );
                console.log(response.successMsg);
                res.status(200).json({ successMsg: response.successMsg });
            } else {
                res.status(404).json({ errMsg: response.errMsg });
            }
        })
        .catch(next);
});

app.get('/getUserPurhcase', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const userId = req.userId;

    Game.getUserPurchase(userId)
        .then((response) => {
            console.log(response);
            if (response.data) {
                console.log('sending back to client------------');
                console.log(response.data);
                res.status(200).json({ data: response.data });
            } else {
                res.status(404).json({ errMsg: response.errMsg });
            }
        })
        .catch(next);
});

app.put('/useProduct', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const userId = req.userId;
    const productName = req.body.productName;
    const productType = req.body.productType;
    const amountOwned = req.body.amount;

    Game.useProduct(userId, amountOwned, productName, productType)
        .then((response) => {
            console.log('use product api-----------------');
            console.log(response);
            if (response.successMsg) {
                console.log('use product sending back to client------------');
                console.log(response.successMsg);
                res.status(200).json({ successMsg: response.successMsg });
            } else {
                res.status(404).json({ errMsg: response.errMsg });
            }
        })
        .catch(next);
});

app.put('/unUseProduct', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const userId = req.userId;
    const productType = req.body.productType;

    Game.unUseProduct(userId, productType)
        .then((response) => {
            console.log('un use product api-----------------');
            console.log(response);
            if (response.successMsg) {
                console.log('unUse product sending back to client------------');
                console.log(response.successMsg);
                res.status(200).json({ successMsg: response.successMsg });
            } else {
                res.status(404).json({ errMsg: response.errMsg });
            }
        })
        .catch(next);
});
// End of Game Store, lucky draw, inventory api---------------------------------------------

// Start of In Game Medicine api above useProduct is used for both lifeMedicine and exMedicine---------------------------------------------
app.get('/getUserMedicine', verifyToken, function (req, res, next) {
    console.log('userID:' + req.userId);
    const userId = req.userId;

    Game.getUserMedicine(userId)
        .then((response) => {
            console.log(response);
            if (response.data) {
                console.log('sending back to client the medicines------------');
                console.log(response.data);

                res.status(200).json({ data: response.data });
            } else {
                res.status(404).json({ errMsg: response.errMsg });
            }
        })
        .catch(next);
});

// End of of In Game Medicine api---------------------------------------------

// =================================================================
// For Player Info Bar #pb-eps

// to get the data for each level
app.get('/level', function (req, res, next) {
    PlayerInfo.getLevelInfo()
        .then((result) => res.status(200).json({ result: result }))
        .catch(next);
});

app.get('/player/infoBar', verifyToken, function (req, res, next) {
    console.log('player info | UserId: ' + req.userId);
    const userId = req.userId;

    PlayerInfo.findById(userId)
        .then((result) => {
            if (result.error) {
                return res.status(404).json({ result: result });
            }
            return res.status(200).json({ result: result });
        })
        .catch(next);
});

app.get('/player/level', verifyToken, function (req, res, next) {
    console.log('player info | UserId: ' + req.userId);
    const userId = req.userId;

    PlayerInfo.getUserLevel(userId)
      .then((result) => {
            if (result.error) {
                return res.status(404).json({ result: result });
            }
            return res.status(200).json({ result: result });
        })
        .catch(next);
});

app.get('/player/info/:userId', verifyToken, function (req, res, next) {
    const userId = req.params.userId;

    Friendship.getMoreInfo(userId)
        .then((result) => {
            if (result.error) {
                return res.status(404).json({ result: result });
            }
            return res.status(200).json({ result: result });
        })
        .catch(next);
});

app.patch('/player/level', verifyToken, function (req, res, next) {
    console.log('player info | UserId: ' + req.userId);
    const userId = req.userId;

    let xp = req.body.xp;

    if (isNaN(userId)) {
        res.status(400).json({
            error: 'Invalid user id!',
        });
    }

    PlayerInfo.updateXp(userId, xp)
        .then((result) => res.status(201).json({ result: result }))
        .catch(next);
});

app.put('/player/level', verifyToken, function (req, res, next) {
    console.log('player info | UserId: ' + req.userId);
    const userId = req.userId;

    let levelData = {
        xp: req.body.xp,
        level: req.body.level,
    };

    if (isNaN(userId)) {
        res.status(400).json({
            error: 'Invalid user id!',
        });
    }

    PlayerInfo.updateXpAndLevel(userId, levelData)
        .then((result) => res.status(201).json({ result: result }))
        .catch(next);
});

app.patch('/player/coins', verifyToken, function (req, res, next) {
    console.log('player info | UserId: ' + req.userId);
    const userId = req.userId;

    let coins = req.body.coins;

    if (isNaN(userId)) {
        res.status(400).json({
            error: 'Invalid user id!',
        });
    }

    PlayerInfo.updateCoins(userId, coins)
        .then((result) => res.status(201).json({ result: result }))
        .catch(next);
});

//====================================================================

// =================================================================
// For Campaign Mode #campaign-eps

// to get the data for each campaign stage
app.get('/campaignStorage', function (req, res, next) {
    const { stage } = req.query;
    console.log(stage);

    if (stage) {
        Campaign.getCampaignStageDataByStage(stage)
            .then((result) => res.status(200).json({ result: result }))
            .catch(next);
    } else {
        Campaign.getAllCampaignStageData()
            .then((result) => res.status(200).json({ result: result }))
            .catch(next);
    }
});

app.get('/campaignStorage/totalNumOfStages', function (req, res, next) {
    Campaign.getTotalNumOfStages()
        .then((result) => res.status(200).json({ result: result }))
        .catch(next);
});

app.get('/campaign', verifyToken, function (req, res, next) {
    console.log('campaign | UserId: ' + req.userId);
    const userId = req.userId;
    const { stage } = req.query;
    console.log(stage);

    if (stage) {
        Campaign.verifyCampaignDataByUser(userId, stage)
            .then((result) => res.status(200).json({ result: result }))
            .catch(next);
    } else {
        Campaign.getCampaignDataByUser(userId)
            .then((result) => res.status(200).json({ result: result }))
            .catch(next);
    }
});

app.post('/campaign', verifyToken, function (req, res, next) {
    console.log('campaign post');
    console.log('campaign | UserId: ' + req.userId);
    const userId = req.userId;

    const newStage = parseInt(req.body.stage);
    console.log(
        '============================================================================================0'
    );
    console.log(newStage);
    if (isNaN(newStage)) {
        res.status(400).json({
            error: 'Invalid stage level!',
        });
    }

    Campaign.addNewStage(userId, newStage)
        .then((result) => res.status(201).json({ result: result }))
        .catch(next);
});

app.put('/campaign', verifyToken, function (req, res, next) {
    console.log('campaign put');
    console.log('campaign | UserId: ' + req.userId);
    const userId = req.userId;

    const stageData = {
        stage: req.body.stage,
        obj_one: req.body.obj_one,
        obj_two: req.body.obj_two,
        obj_three: req.body.obj_three,
    };
    console.log(
        '============================================================================================0'
    );
    console.log(stageData);

    Campaign.updateStageCompletion(userId, stageData)
        .then((result) => res.status(201).json({ result: result }))
        .catch(next);
});

app.patch('/campaign', verifyToken, function (req, res, next) {
    console.log('campaign put');
    console.log('campaign | UserId: ' + req.userId);
    const userId = req.userId;

    const stageData = {
        stage: req.body.stage,
        obj_one: req.body.obj_one,
        obj_two: req.body.obj_two,
        obj_three: req.body.obj_three,
    };
    console.log(
        '============================================================================================0'
    );
    console.log(stageData);

    Campaign.updateStageObjectives(userId, stageData)
        .then((result) => res.status(201).json({ result: result }))
        .catch(next);
});
// =================================================================

// img: next() pass obj into the next api (err)
app.use((req, res, next) =>
    next({
        // go to next middleware with the err obj
        message: `Resource not found ${req.method} ${req.originalUrl}`,
        status: 404,
    })
);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err.stack);
    // console.log(err.message);
    res.status(err.status || 500).send({
        error: err.message || 'Unknown error!',
    });
});

// used to send email
const transporter = nodemailer.createTransport({
    // service: 'hotmail',
    host: 'live.smtp.mailtrap.io',
    port: '587',
    secure: false,
    auth: {
        user: process.env.AUTH_USER,
        pass: process.env.AUTH_PASS,
    },
});

console.log(transporter.auth)

function sendConfirmMail(userEmail, emailSecretToken) {
    console.log("HELL======================================")
    transporter.sendMail(
        {
            from: "noreply@demomailtrap.co", // sender address
            to: userEmail, // list of receivers --- to: mailToSend
            subject: 'Verification Email', // Subject line
            html: `<h2>This is an Email Verification</h2>
                    <h4>Please verify your mail to continue...</h4>
                    <a href="${process.env.HOST_WEB}/resetPass?userEmail=${userEmail}&emailSecretToken=${emailSecretToken}">Verify to Reset Password</a>
                    `,
        },
        // https://ades-host-website.herokuapp.com/resetPass
        function (error, info) {
            if (error) {
                console.log("TRACER")
                console.log(error);
            } else {
                console.log('Email sent successfully!');
                console.log('Email sent: ' + info.response);
                // console.log(info);
            }
        }
    );
}
//----------------------------------------
// Module Exports
//----------------------------------------
module.exports = app;
