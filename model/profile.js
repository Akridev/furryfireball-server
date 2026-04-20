const pool = require('../controller/database_connection'); //db
const createHttpError = require('http-errors');
const hashing = require('./hash.js')

let Profile = {
    findById: function(userId, accessToken){
        const sql_query =
        `
        select * from public.user where user_id=$1
        `
        return pool.query(sql_query, [userId])

            .then((result) => {

                if (result.rowCount == 1) {
                    result.rows[0].accessToken = accessToken
                    return result.rows[0];
                }
                else{
                    return {error: "Unable to find account.", accessToken: accessToken}
                }
            });
    },

    update: function(userId, info, accessToken){
        //generate hashed password
        if(info.checking=='change'){
            info.password = hashing.generateHash(info.password);
        }
        const sql_query = 
        `UPDATE 
            public.user 
        SET 
            email=$1,
            country=$2,
            password=$3,
            username=$4 
        WHERE 
            user_id=$5`

        return pool
            .query(sql_query, 
                [
                    info.email, 
                    info.country, 
                    info.password, 
                    info.username, 
                    userId
                ]
            )

            .then((result) => {
                if (result.rowCount == 1) {
                    return { message: 'Update successful!', accessToken: accessToken };
                }
                else{
                    return { error: 'Update unsuccessful!', accessToken: accessToken };
                }
            })
            .catch((err) => {
                if (err.code === '23505') {
                    return {error: 'username or email already exists', accessToken: accessToken}
            }
            });
    },

    getAllImages: function(){
        const sql_query = 
        `
            SELECT * FROM public.image ORDER BY amount asc
        `
        return pool 
            .query(sql_query)
            .then((result) => {
                return result.rows
            })
    },

    getPurchasedImages: function(userid){
        const sql_query = 
        `
            SELECT * FROM public.image_purchase WHERE user_id=$1
        `
        return pool 
            .query(sql_query,[ userid ])
            .then((result) => {
                return result.rows
            })
    },

    insertPurchasedImage: function(pic_url, userid, accessToken){
        const sql_query = 
        `
            INSERT INTO public.image_purchase VALUES ($1,$2)
        `
        return pool
            .query(sql_query, [ pic_url, userid ])
            .then((result) =>{
                console.log(result)
                if (result.rowCount === 1) {
                    console.log("!!!---------------------------------------------")
                    return { message: 'Insert successful!', accessToken: accessToken };
                }
                else{
                    return { error: 'Insert unsuccessful!', accessToken: accessToken };
                }
            })
            .catch((err) => {
                return { error: 'Insert unsuccessful!', accessToken: accessToken };
            })
    },
    updateImage: function(userId, info, accessToken){
        const sql_query = 
        `UPDATE 
            public.user 
        SET 
            pic_url=$1
        WHERE 
            user_id=$2`

        return pool
            .query(sql_query, 
                [
                    info, userId
                ]
            )

            .then((result) => {
                if (result.rowCount == 1) {
                    return { message: 'Update successful!', accessToken: accessToken };
                }
                else{
                    return { error: 'Update unsuccessful!', accessToken: accessToken };
                }
            })
            .catch((err) => {
                if (err.code === '23505') {
                    return {error: 'username or email already exists', accessToken: accessToken}
            }
            });
    },

    delete: function(userId){

        const sql_query = `DELETE FROM public.user WHERE user_id=$1`

        return pool
            .query(sql_query, [userId])
            .then((result)=>{
                if (result.rowCount == 1) {
                    return { message: 'Delete successful!'};
                }
               else
                    return { error: 'Delete unsuccessful!'};
            });
    },

    checkPassword: function(password, userId, accessToken){
        const sql_query = `SELECT password FROM public.user WHERE user_id=$1`

        return pool
            .query(sql_query, [userId])
            .then((result)=>{
                if (result.rowCount == 1) {
                    const hashed = result.rows[0].password;
                    //compare hashed pw and non-hashed pw
                    const check = hashing.compareHash(password,hashed);
                    return {check: check, accessToken: accessToken};
                }
                else
                    return {check: false, accessToken: accessToken};
            });
    },

    updateDailyRewardDate: function(userId, date){
        console.log("DHBIDHIVHI")
        console.log(date)
        const sql_query = 
        `UPDATE 
            public.user 
        SET 
            daily_reward_date=$1
        WHERE 
            user_id=$2`

        return pool
            .query(sql_query, [date, userId])
            .then((result)=>{
                if(result.rowCount == 1){
                    return{message: "update successful!"};
                }
                else
                    return {error: "update unsuccessful!"};
            })
    }
};

module.exports = Profile;
