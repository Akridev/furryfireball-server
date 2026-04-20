const pool = require('../controller/database_connection'); //db
const createHttpError = require('http-errors');

let FriendReq = {

    getAll: function(userId){
        const sql_query =
        `
        SELECT
            u.user_id,
            u.username,
            u.level,
            u.pic_url
        FROM
            public.friend_requests fr,
            public.user u
        WHERE
            fr.fk_req_received_by = $1 AND
            u.user_id = fr.fk_req_sent_by
        `

        console.log(sql_query);
        return pool.query(sql_query, [userId])
            
            .then((result) => {
                console.log(result.rows);
                //console.log(result);
                if (result.rows.length == 0) return null;
                else return result.rows;

            });
    },

    acceptFriendReq: function(userId, userId2){
        const sql_query = `
        DELETE FROM
            public.friend_requests
        WHERE
            (fk_req_sent_by = $1 AND fk_req_received_by = $2) OR
            (fk_req_received_by = $1 AND fk_req_sent_by = $2)
        `
        console.log(sql_query)
        return pool.query(sql_query, [userId, userId2])
            .then((result)=> {
                console.log(result)
                if (result.rowCount > 0) {
                    return { message: 'Delete successful!' };
                }
                else
                    return { message: 'Delete unsuccessful!'};
            })
    },

    rejectFriendReq: function(userId, userId2){
        const sql_query = `
        DELETE FROM
            public.friend_requests
        WHERE
            fk_req_received_by = $1 AND fk_req_sent_by = $2
        `

        return pool.query(sql_query, [userId, userId2])
            .then((result)=> {
                console.log(result)
                if (result.rowCount > 0) {
                    return { message: 'Delete successful!' };
                }
                else
                    return { message: 'Delete unsuccessful!'};
            })
    },

    sendFriendReq: function(userId, userId2){
        const sql_query = `
        INSERT INTO public.friend_requests
            (fk_req_sent_by, fk_req_received_by)
        VALUES
            ($1, $2)
        `

        return pool.query(sql_query, [userId, userId2])
            .then((result)=> {
                console.log(result)
                if (result.rowCount == 1) {
                    return { message: 'Sent successfully' };
                }
                else
                    return { message: 'Sent unsuccessfully'};
            })
    }
}

module.exports = FriendReq;