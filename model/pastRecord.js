const pool = require('../controller/database_connection'); //db

let Records = {
    getPastRecord: function (userId) {
        return pool
            .query(
                `SELECT A.score, A.timestamp date from public.attempts A, public.user U where A.fk_user_id = U.user_Id AND A.fk_user_id = ${userId}`
            )
            .then((result) => {
                console.log('Here is the past records:' + result);
                console.log(result.rows[0]);
                if (result.rowCount != 0) {
                    let returnResult = [];
                    for (let i = 0; i < result.rowCount; i++) {
                        returnResult.push({
                            score: result.rows[i].score,
                            date: result.rows[i].date.toLocaleDateString(),
                        });
                    }
                    return returnResult;
                } else {
                    return null;
                }
            });
    },
};

module.exports = Records;
