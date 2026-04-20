require('dotenv').config(); //dotenv loads environment variables from .env file into process.env.
const pg = require('pg');
const Pool = pg.Pool;
// const {Pool} = require('pg');

// create the db instance
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

/* // test db
pool.query('SELECT NOW();')
    .then((response) => {
        // console.log(response);
        console.log(response.rows[0].now); // get the current time
    })
    .finally(() => pool.end());
*/

module.exports = pool;
