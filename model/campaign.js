const pool = require('../controller/database_connection'); //db

let Campaign = {
    // details needed for player info bar
    getCampaignDataByUser: function (userId) {
        const sql_query = `
        select stage_level, obj_one, obj_two, obj_three from public.campaign where fk_user_id=$1 order by stage_level
        `;
        return pool
            .query(sql_query, [userId])

            .then((result) => {
                console.log(result)
                return result.rows;
            });
    },

    verifyCampaignDataByUser: function (userId, stage_level) {
        const sql_query = `
        select stage_level, obj_one, obj_two, obj_three, completed from public.campaign where fk_user_id=$1 AND stage_level=$2
        `;
        return pool
            .query(sql_query, [userId, stage_level])

            .then((result) => {
                if (result.rowCount == 1) {
                    return result.rows[0];
                } else {
                    return { locked: 'Player has not unlocked stage yet!' };
                }
            });
    },

    addNewStage: function (userId, stage_level) {
        const sql_query = `
        insert into public.campaign (fk_user_id, stage_level) values($1, $2)
        `;
        return pool
            .query(sql_query, [userId, stage_level])

            .then((result) => {
                if (result.rowCount == 1) {
                    return { message: 'New stage unlocked' };
                }
                else
                    return { message: 'Unknown error while adding new stage!'};
            });
    },

    updateStageCompletion: function (userId, stageData){
        const sql_query = `
        update public.campaign set obj_one = $3, obj_two = $4, obj_three = $5, completed = '1' where fk_user_id=$1 and stage_level = $2
        `;

        return pool
            .query(sql_query, [userId, stageData.stage, stageData.obj_one, stageData.obj_two, stageData.obj_three])

            .then((result) => {
                console.log(result)
                if (result.rowCount == 1) {
                    return { message: 'Stage completed!' };
                }
                else
                    return { message: 'Unknown error while updating stage completion!'};
            });
    },

    updateStageObjectives: function (userId, stageData){
        const sql_query = `
        update public.campaign set obj_one = $3, obj_two = $4, obj_three = $5 where fk_user_id=$1 and stage_level = $2
        `;

        return pool
            .query(sql_query, [userId, stageData.stage, stageData.obj_one, stageData.obj_two, stageData.obj_three])

            .then((result) => {
                console.log(result)
                if (result.rowCount == 1) {
                    return { message: 'Stage objectives updated!' };
                }
                else
                    return { message: 'Unknown error while updating stage objectives!'};
            });
    },

    getCampaignStageDataByStage: function (stage){

        const sql_query = `
        select * from public."campaignStages" where stage_id = $1
        `
        return pool
            .query(sql_query, [stage])
            .then((result) => {
                // will always be one since it maintained only by creators
                console.log(result.rows[0]);
                return result.rows[0];
            });
    },

    getAllCampaignStageData: function (){
        return pool
            .query(`select * from public."campaignStages" order by stage_id`)
            .then((result) => {
                console.log(result);
                return result.rows;
            });
    },

    getTotalNumOfStages: function (){
        return pool
            .query(`SELECT count(*) FROM public."campaignStages"`)
            .then((result) => {
                console.log(result);
                return result.rows[0];
            });
    }
};

module.exports = Campaign;