const pool = require('../controller/database_connection'); //db
const createHttpError = require('http-errors');

let PlayerInfo = {
    // details needed for player info bar
    findById: function (userId) {
        const sql_query = `
        select username, pic_url, level, xp, coins, "luckyDrawChance",daily_reward_date from public.user where user_id=$1
        `;
        return pool
            .query(sql_query, [userId])

            .then((result) => {
                console.log('player info-----------');
                console.log(result);
                if (result.rowCount == 1) {
                    return result.rows[0];
                } else {
                    return { error: 'Unable to find account.' };
                }
            });
    },

    getUserLevel: function (userId) {
        const sql_query = `
        select username, level from public.user where user_id=$1
        `;
        return pool
            .query(sql_query, [userId])

            .then((result) => {
                console.log('player info level-----------');
                console.log(result);
                if (result.rowCount == 1) {
                    return result.rows[0];
                } else {
                    return { error: 'Unable to find account.' };
                }
            });
    },

    updateXp: function (userId, xp) {
        return pool
            .query(
                `Update public.user
                    Set 
                        xp=xp + $2
                    Where
                        user_id=$1`,
                [userId, xp]
            )
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) {
                    return { message: 'Update successful' };
                }
            });
    },

    updateXpAndLevel: function (userId, levelData) {
        return pool
            .query(
                `Update public.user
                    Set 
                        xp=$2,
                        level=$3
                    Where
                        user_id=$1`,
                [userId, levelData.xp, levelData.level]
            )
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) {
                    return { message: 'Update successful' };
                }
            });
    },

    updateCoins: function (userId, coins) {
        return pool
            .query(
                `Update public.user
                    Set 
                        coins = coins + $2
                    Where
                        user_id=$1`,
                [userId, coins]
            )
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) {
                    return { message: 'Update successful' };
                }
            });
    },

    getLevelInfo: function (){
        return pool
            .query(`select * from public.level order by level_id`)
            .then((result) => {
                console.log(result);
                return result.rows;
            });
    }
};

module.exports = PlayerInfo;
