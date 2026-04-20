const pool = require('../controller/database_connection'); //db
const hashing = require('./hash.js');

let User = {
    register: function (registerData) {
        registerData.pass = hashing.generateHash(registerData.pass);
        const sql_query = `INSERT INTO public.user (username, password, email, country) VALUES ($1, $2, $3, $4)`;
        return pool
            .query(sql_query, [
                registerData.user,
                registerData.pass,
                registerData.email,
                registerData.country,
            ])
            .then((result) => {
                console.log(result);
                if (result.rowCount == 1) {
                    return { result: 'Register successfully' };
                }
                // handle the cannot insert
            })
            .catch((error) => {
                console.log(error.code);
                console.log('type of err code:' + typeof error.code);
                console.log('The db err:' + error);
                if (error.code == '23505')
                    return {
                        errMsg: 'Username or email already exists! Please login.',
                    };
            });
    },

    verifyMail: function (email) {
        const sql_query = `SELECT * FROM public.user WHERE email = $1`;

        return pool.query(sql_query, [email]).then((result) => {
            console.log(result);
            if (result.rowCount == 1) {
                return result;
            } else {
                return null;
            }
        });
    },

    resetPass: function (resetData) {
        const sql_query = `UPDATE public.user SET password = $1 WHERE email = $2`;

        return pool
            .query(sql_query, [
                hashing.generateHash(resetData.password),
                resetData.email,
            ])
            .then((result) => {
                return result.rowCount;
            });
    },
};

module.exports = User;
