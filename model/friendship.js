const pool = require('../controller/database_connection'); //db
const createHttpError = require('http-errors');

let Friendship = {

    findById: function(userId){
        const sql_query =
        `
        select * from public.user where user_id=$1
        `
        return pool.query(sql_query, [userId])

            .then((result) => {
                //console.log(result);
                if (result.rowCount == 1) {
                    console.log('result: ' + result.rows[0]);
                    return result.rows[0];
                }
            });
    },
    
    selectAllFriends : function(userId) {
        const sql_query =
        `
        SELECT
            DISTINCT ON (u.user_id) u.user_id,
            u.username,
            f.friendship_id,
            u.pic_url,
            u.level
        FROM
            public.friendship as f,
            public.user as u
        WHERE
            f.fk_friend_one_id = $1 AND
            u.user_id = f.fk_friend_two_id
        `
        return pool.query(sql_query, [userId])
            .then((result) => {
            // console.log(result);
            console.log("Connected");
            
            if (result.rows.length === 0) {
                return {
                    error: `No friend(s) for user with Id '${userId}' found!`
                }
            }
            else {
                return result.rows;
            }
        })
    },

    searchFriendByName : function(userId, fName) {
        var newFName = fName + '%';
        const sql_query =
        `
        SELECT
            DISTINCT ON (u.user_id) u.user_id,
            u.username,
            f.friendship_id
        FROM
            public.friendship as f,
            public.user as u
        WHERE
            f.fk_friend_one_id = $1 AND
            u.user_id = f.fk_friend_two_id AND
            LOWER(u.username) LIKE LOWER($2)
        `
        return pool.query(sql_query, [userId, newFName])
            .then((result) => {
            // console.log(result);
            console.log("Connected");
            
            if (result.rows.length === 0) {
                return {
                    error: `No friend(s) with username starting with '${fName}' found!`
                }
            }
            else {
                return result.rows;
            }
        })
    },

    deleteFriendById : function(userId, friendId) {
        const sql_query =
        `
        DELETE
        FROM
            public.friendship as fs
        WHERE
            ((fs.fk_friend_one_id = $1 AND fs.fk_friend_two_id = $2) OR
            (fs.fk_friend_one_id = $2 AND fs.fk_friend_two_id = $1))
        `
        return pool.query(sql_query, [userId, friendId])
            .then((result) => {
            // console.log(result);
            console.log("Connected");
            
            if (result.rows.length === 0) {
                return {
                    error: `No user with id starting with '${userId}' found!`
                }
            }
            else {
                return result.rows;
            }
        })
    },

    selectSuggestedFriends : function(userId) {
        const sql_query =
        `
        SELECT
            *
        FROM
            public.user as u
        WHERE
            u.user_id NOT IN (
                SELECT
                    u.user_id
                FROM
                    public.user as u,
                    public.friendship as f
                WHERE
                    u.user_id = f.fk_friend_one_id AND
                    f.fk_friend_two_id = $1
            )
            AND
            u.user_id NOT IN (
                SELECT
                    fk_req_received_by
                FROM
                    public.friend_requests
                WHERE
                    fk_req_sent_by = $1
            )
            AND
            u.user_id != $1
        ORDER BY
            RANDOM()
        LIMIT
            15
        `

        return pool.query(sql_query, [userId])
            .then((result) => {
            // console.log(result);
            console.log("Connected");
            
            if (result.rows.length === 0) {
                return {
                    error: `User with id '${userId}' not found! OR You have added all users as friends!`
                }
            }
            else {
                return result.rows;
            }
        })
    },

    searchUserByName : function(userId, uName) {
        var newUName = uName + '%';
        const sql_query =
        `
        SELECT
            *
        FROM
            public.user as u
        WHERE
            u.user_id NOT IN (
                SELECT
                    u.user_id
                FROM
                    public.user as u,
                    public.friendship as f
                WHERE
                    u.user_id = f.fk_friend_one_id AND
                    f.fk_friend_two_id = $1
            )
            AND
            u.user_id != $1 AND
            LOWER(u.username) LIKE LOWER($2)
        `
        return pool.query(sql_query, [userId, newUName])
            .then((result) => {
            // console.log(result);
            console.log("Connected");
            
            if (result.rows.length === 0) {
                return {
                    error: `No other user(s) with username starting with '${uName}' found!`
                }
            }
            else {
                return result.rows;
            }
        })
    },
    
    addFriendByID: function(userId, userId2){

        const sql_query = `
        INSERT INTO public.friendship
            (fk_friend_one_id, fk_friend_two_id)
        VALUES
            ($1, $2),
            ($2, $1)
        `
        return pool.query(sql_query, [userId, userId2])
            .then((result)=> {
                console.log(result)
                if (result.rowCount > 0) {
                    return { message: 'Insert successful!' };
                }
                else
                    return { message: 'Insert unsuccessful!'};
            })
    },

    getMoreInfo : function (userId) {
        const sql_query = `
        SELECT
            u.user_id,
            u.username,
            u.pic_url,
            u.level,
            a.gamemode,
            COUNT(a.attempt_id) as "games_played",
            MAX(a.score) as "highest_score"
        FROM
            public.user as u,
            public.attempts as a
        WHERE
            u.user_id = a.fk_user_id AND
            u.user_id = $1
        GROUP BY
            u.user_id,
            u.username,
            u.pic_url,
            u.level,
            a.gamemode
        `;
        return pool
            .query(sql_query, [userId])

            .then((result) => {
                console.log('player info-----------');
                console.log(result);
                return result.rows;
            });
    },
}

module.exports = Friendship;