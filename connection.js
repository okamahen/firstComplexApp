const dotenv = require('dotenv')
dotenv.config()

const mongodb = require('mongodb')

// connection string here replaced with the one in .env file

mongodb.connect(process.env.CONNECTIONSTRING, {useNewUrlParser: true, useUnifiedTopology: true}, function(err, client) {
    //parameter "client" and use method: db(), to find actual databse collection and proceed crud operation 
    //using module.exports, so when we require this file from another file, it will return the database that we worked with 
    //initially, it is: module.exports = client.db(), but db() is deleted and set to model, so this file only export mongodb client 
    module.exports = client
    const app = require('./app')
    app.listen(process.env.PORT)
})