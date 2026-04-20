const bcrypt = require('bcrypt');

let hashing = {
    generateHash: function(password){
        const salt = bcrypt.genSaltSync(12);
        const hash = bcrypt.hashSync(password, salt);
        return hash;
    },
    compareHash: function(password, hashed){
        return bcrypt.compareSync(password,hashed);
    }
}

module.exports=hashing