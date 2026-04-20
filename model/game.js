const pool = require('../controller/database_connection'); //db

let Game = {
    getHighScore: function (userId, accessToken) {
        const sql_query = `
            select score from public.attempts
            where fk_user_id=$1
            order by score desc
            limit 1
        `;
        return pool.query(sql_query, [userId]).then((result) => {
            console.log(result);
            if (result.rowCount == 1)
                return {
                    score: result.rows[0].score,
                    accessToken: accessToken,
                };
            else return { score: 0, accessToken: accessToken };
        });
    },

    insertAttempt: function (userId, gameData) {
        return pool
            .query(
                `insert into public.attempts(fk_user_id, score, time, enemieskilled, gamemode) values($1, $2, $3, $4, $5)`,
                [
                    userId,
                    gameData.score,
                    gameData.time,
                    gameData.enemiesKilled,
                    gameData.gamemode,
                ]
            )
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) {
                    return { message: 'Game record inserted successfully' };
                }
            });
    },

    insertHighScore: function (userId, gamemode, gameData) {
        return pool
            .query(
                `insert into public.highscore(fk_user_id, gamemode, score, time) values($1, $2, $3, $4)`,
                [userId, gamemode, gameData.score, gameData.time]
            )
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) {
                    return { message: 'Insertion successful' };
                }
            });
    },

    updateHighScore: function (userId, gamemode, gameData) {
        return pool
            .query(
                `Update public.highscore
                    Set 
                        score=$3, 
                        time=$4
                    Where
                        fk_user_id=$1 AND 
                        gamemode = $2`,
                [userId, gamemode, gameData.score, gameData.time]
            )
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) {
                    return { message: 'Update successful' };
                }
            });
    },

    patchHighScore: function (userId, gamemode, time) {
        return pool
            .query(
                `Update public.highscore
                    Set  
                        time=$3
                    Where
                        fk_user_id=$1 AND 
                        gamemode = $2`,
                [userId, gamemode, time]
            )
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) {
                    return { message: 'Patch successful' };
                }
            });
    },

    getHighScoreByID: function (userId, gamemode) {
        return pool
            .query(
                `
                Select
                    time,
                    score
                From
                    public.highscore
                Where
                    fk_user_id=$1 AND
                    gamemode=$2
                `,
                [userId, gamemode]
            )
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) return { message: result.rows[0] };
                else return { message: 'Absent' };
            });
    },

    getHighScoreAll: function (userId, gamemode) {
        return pool
            .query(
                `
                Select
                    time,
                    score
                From
                    public.highscore h,
                    public.user u
                Where
                    h.fk_user_id=u.user_id
                `,
                [userId, gamemode]
            )
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) return { message: 'Present' };
                else return { message: 'Present' };
            });
    },

    getStoreData: function (userId) {
        const sql_query = `SELECT * FROM public.store
                            left join
                                (SELECT 
                                    "userId", "productName", soldout, amount 
                                FROM 
                                    public.user_purchase 
                                WHERE 
                                    "userId" = $1
                                )  AS purchase
                            on store.name = purchase."productName" `;
        return pool
            .query(sql_query, [userId])
            .then((result) => {
                console.log('products---------------------');
                console.log(result);
                let products = [];

                for (let i = 0; i < result.rowCount; i++) {
                    // re init for every product
                    let soldout = false;
                    let amount = 0;

                    if (
                        result.rows[i].soldout == null &&
                        result.rows[i].amount != null
                    ) {
                        amount = result.rows[i].amount;
                    } else if (
                        result.rows[i].soldout != null &&
                        result.rows[i].amount == null
                    ) {
                        soldout = result.rows[i].soldout;
                    } else if (
                        result.rows[i].soldout != null &&
                        result.rows[i].amount != null
                    ) {
                        soldout = result.rows[i].soldout;
                        amount = result.rows[i].amount;
                    }
                    products.push({
                        name: result.rows[i].name,
                        price: result.rows[i].price,
                        increasement: result.rows[i].increasement,
                        type: result.rows[i].type,
                        image: result.rows[i].image,
                        soldout: soldout,
                        amount: amount,
                    });
                }
                console.log('finish mapping------------------');
                console.log(products);

                return { data: products };
            })
            .catch((error) => {
                return {
                    errMsg: error.message,
                };
            });
    },

    productPurchase: function (userId, productName, productType, amountOwned) {
        let sql_query;
        let queryParams;

        //-----------------------------------------------------
        if (
            // for single purchase of medicine -- have bought medicine before(medicine never sold out)
            amountOwned != 0 &&
            (productType == 'lifeMedicine' || productType == 'ExMedicine')
        ) {
            console.log('medicine purchase----------------');
            sql_query = `UPDATE public.user_purchase
                        SET amount=$1
                        WHERE "userId"=$2 AND "productName"=$3;`;
            queryParams = [amountOwned + 1, userId, productName];
        } else if (
            // for medicine first time purchase
            productType == 'lifeMedicine' ||
            productType == 'ExMedicine'
        ) {
            // first bought medicine
            sql_query = `INSERT INTO public.user_purchase(
                "userId", "productName", soldout, amount, "productType")
                VALUES ($1, $2, $3, $4, $5);`;
            queryParams = [userId, productName, false, 1, productType];
        } else {
            // only for products besides medicine
            sql_query = `INSERT INTO public.user_purchase(
            "userId", "productName", soldout, amount, "productType")
            VALUES ($1, $2, $3, $4, $5);`;
            queryParams = [userId, productName, true, 1, productType];
        }
        return pool
            .query(sql_query, queryParams)
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) {
                    return { successMsg: 'Purchase Successfully!' };
                }
            })
            .catch((error) => {
                return {
                    errMsg: error.message,
                };
            });
    },

    luckyDraw: function (userId, luckyDrawChance, coinsEarned) {
        let sql_query;
        let queryParams;
        if (coinsEarned == 0) {
            sql_query = `UPDATE public."user"
                        SET "luckyDrawChance"=$1
                        WHERE user_id=$2;`;
            queryParams = [luckyDrawChance, userId];
        } else {
            sql_query = `UPDATE public."user"
            SET "luckyDrawChance"=$1, "coins" = "coins"+$2
            WHERE user_id=$3;`;
            queryParams = [luckyDrawChance, coinsEarned, userId];
        }

        return pool
            .query(sql_query, queryParams)
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) {
                    return {
                        successMsg: 'Update Lucky Draw Chance Successfully!',
                    };
                }
            })
            .catch((error) => {
                return {
                    errMsg: error.message,
                };
            });
    },

    getUserPurchase: function (userId) {
        const sql_query = `SELECT 
                                s."name", "increasement", "type", "image", "amount", "equipped"
                           FROM 
                                public.store s, public.user_purchase p
                           WHERE 
                                s."name" = p."productName" AND
                                "userId" = $1 AND
                                ("soldout" = true OR ("amount" >= 1 AND "soldout" = false)) `;
        return pool
            .query(sql_query, [userId])
            .then((result) => {
                console.log('user purchased products---------------------');
                console.log(result);

                return { data: result.rows };
            })
            .catch((error) => {
                return {
                    errMsg: error.message,
                };
            });
    },

    useProduct: function (userId, amountOwned, productName, productType) {
        console.log(
            'use product-------------' +
                userId +
                amountOwned +
                productName +
                productType
        );
        let sql_query;
        let queryParams;
        let updateAmt = amountOwned - 1;
        //-----------------------------------------------------
        // for medicine use
        if (
            updateAmt == 0 &&
            (productType == 'lifeMedicine' || productType == 'ExMedicine')
        ) {
            console.log('medicine using----------------');
            sql_query = `DELETE FROM public.user_purchase
                        WHERE "userId"=$1 AND "productName"=$2;`;
            queryParams = [userId, productName];
        } else if (
            productType == 'lifeMedicine' ||
            productType == 'ExMedicine'
        ) {
            console.log('medicine using----------------');
            sql_query = `UPDATE public.user_purchase
                        SET amount=$1
                        WHERE "userId"=$2 AND "productName"=$3;`;
            queryParams = [updateAmt, userId, productName];
        } else {
            // for euqipments use
            sql_query = `UPDATE public.user_purchase
                        SET equipped=true
                        WHERE "userId"=$1 AND "productName"=$2`;
            queryParams = [userId, productName];
        }
        return pool
            .query(sql_query, queryParams)
            .then((result) => {
                console.log(result);
                console.log('here is the product type-----' + productType);
                if (
                    result.rowCount != 0 &&
                    productType != 'lifeMedicine' &&
                    productType != 'ExMedicine'
                ) {
                    // to set besides the specific attack as not equipped that with same type
                    let sql_query2 = `
                    UPDATE public.user_purchase
                    SET equipped=false
                    WHERE "userId"=$1 AND "productName" != $2 AND "productType"=$3;`;

                    return pool
                        .query(sql_query2, [userId, productName, productType])
                        .then((result2) => {
                            console.log('here is the second query----------');
                            console.log(result2);
                            console.log(result2.rowCount);
                            if (result2.rowCount != 0) {
                                console.log(result2.rowCount);
                                return { successMsg: 'Equipped Successfully!' };
                            }
                        })
                        .catch((error) => {
                            return {
                                errMsg: error.message,
                            };
                        });
                } else {
                    return { successMsg: 'Medicine used Successfully!' };
                }
            })
            .catch((error) => {
                return {
                    errMsg: error.message,
                };
            });
    },

    unUseProduct: function (userId, productType) {
        let sql_query = `UPDATE public.user_purchase
                        SET equipped=false
                        WHERE "userId"=$1 AND "productType"=$2;`;

        return pool
            .query(sql_query, [userId, productType])
            .then((result) => {
                console.log(result);
                console.log('here is the un use product backend-----');
                if (result.rowCount != 0) {
                    return {
                        successMsg:
                            'Equip Default and Un Equipped Purchased Successfully!',
                    };
                }
            })
            .catch((error) => {
                return {
                    errMsg: error.message,
                };
            });
    },

    getUserMedicine: function (userId) {
        const sql_query = `SELECT 
                                s."name",  "type", "increasement", "image", "amount"
                            FROM 
                                public.store s
                                LEFT JOIN (SELECT "userId", "amount", "productName" from public.user_purchase p) AS medAmount
                                ON s."name" = "productName" AND "userId" = $1
                            WHERE 
                                s."type" = 'lifeMedicine' `;
        return pool
            .query(sql_query, [userId])
            .then((result) => {
                console.log('user medicines---------------------');
                console.log(result);
                return { data: result.rows };
            })
            .catch((error) => {
                return {
                    errMsg: error.message,
                };
            });
    },

    getEquippedItems: function (userId) {
        const sql_query = `
                            SELECT 
                                up."productName",
                                up."productType",
                                s."increasement"
                            FROM 
                                public.user_purchase up,
                                public.store s,
                                public.user u
                            Where
                                s."name" = up."productName" AND
                                up."userId" = u."user_id" AND
                                up."userId" = $1 AND
                                up."productType" IN ('equipment', 'fireball') AND
                                up."equipped" = true
                        `;
        return pool
            .query(sql_query, [userId])
            .then((result) => {
                console.log(result);

                return { data: result.rows };
            })
            .catch((error) => {
                return {
                    errMsg: error.message,
                };
            });
    },
};

module.exports = Game;
