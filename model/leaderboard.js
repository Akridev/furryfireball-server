
const pool = require('../controller/database_connection'); //db
const createHttpError = require('http-errors');

let Leaderboard = {

    selectGlobal: function(gamemode){

        const sql_query = `
        Select
            u.username,
            u.pic_url,
            u.user_id,
            CASE WHEN u.user_id IN (SELECT fk_user_id FROM public.highscore WHERE gamemode = $1) THEN (SELECT score FROM public.highscore WHERE fk_user_id = u.user_id AND gamemode = $1) ELSE 0 END AS score,
            CASE WHEN u.user_id IN (SELECT fk_user_id FROM public.highscore WHERE gamemode = $1) THEN (SELECT time FROM public.highscore WHERE fk_user_id = u.user_id AND gamemode = $1) ELSE 0 END AS time
        From
            public.user u
        order by
            score desc,
            time
        
        `
        return pool.query(sql_query, [gamemode]).then((result) => {
            console.log(result.rows);
            return result.rows;
        })
    },

    selectLocal: function(userId, gamemode){

        const sql_query = `
        Select
            u.username,
            u.pic_url,
            u.user_id,
            CASE WHEN u.user_id IN (SELECT fk_user_id FROM public.highscore WHERE gamemode = $2) THEN (SELECT score FROM public.highscore WHERE fk_user_id = u.user_id AND gamemode = $2) ELSE 0 END AS score,
            CASE WHEN u.user_id IN (SELECT fk_user_id FROM public.highscore WHERE gamemode = $2) THEN (SELECT time FROM public.highscore WHERE fk_user_id = u.user_id AND gamemode = $2) ELSE 0 END AS time
        From
            public.user u
        WHERE
            u.country = (Select country From public.user Where user_id=$1)
        order by
            score desc,
            time
        `

        console.log(sql_query)
        return pool.query(sql_query, [userId, gamemode]).then((result) => {
            console.log(result.rows);
            if(result.rows.length == 0) return null
            else return result.rows;
        })
    },

    selectFriends: function(userId, gamemode){
        const sql_query = `
        Select
            u.username,
            u.pic_url,
            u.user_id,
            CASE WHEN u.user_id IN (SELECT fk_user_id FROM public.highscore WHERE gamemode = $2) THEN (SELECT score FROM public.highscore WHERE fk_user_id = u.user_id AND gamemode = $2) ELSE 0 END AS score,
            CASE WHEN u.user_id IN (SELECT fk_user_id FROM public.highscore WHERE gamemode = $2) THEN (SELECT time FROM public.highscore WHERE fk_user_id = u.user_id AND gamemode = $2) ELSE 0 END AS time
        From
            public.user u
        WHERE
            u.user_id IN (
                        Select
                            u.user_id
                        From
                            public.friendship f,
                            public.user u
                        WHERE   
                            f.fk_friend_two_id = u.user_id AND
                            f.fk_friend_one_id = $1 OR 
                            u.user_id = $1
                    )
        order by
            score desc,
            time
        `

        console.log(sql_query)
        return pool.query(sql_query, [userId, gamemode]).then((result) => {
            console.log(result.rows);
            console.log(gamemode)
            if(result.rows.length <= 1) return null
            else return result.rows;
        })
    }
}

module.exports = Leaderboard;