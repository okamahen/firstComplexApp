//use const if we want constant variable and cannot be changed in he future
const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const flash = require('connect-flash')
const app = express()

let sessionOptions = session({
    secret: "Hello World~!",
    store: new MongoStore({client: require('./connection')}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true} //1 day in milisecond
})

//For test: console.log(router), returns "exports of he router.js files" result good

//the first app.set() need 2 arguments: (a) express option ,(b) folder to set, it is coincidence both having same name
app.set('views','views')

app.use(sessionOptions)
app.use(flash())

app.use(express.urlencoded({extended: false}))
app.use(express.json())

//use static location folder 'public' to catch .css formatting
app.use(express.static('public'))

//
app.use(function(req, res, next) {
    //make all error and success flash messages accessible from another location
    res.locals.errors = req.flash("error")
    res.locals.success = req.flash("success")
    
    //make current user id available on the req object
    if(req.session.userVisit) {req.visitorId = req.session.userVisit._id} else {req.visitorId = 0}
    
    //method: locals, will make us work with an object available in our .ejs template
    //now we can access property 'user' that contains user session data from any .ejs templates
    res.locals.user = req.session.userVisit
    next()
})

//the second app.set(): (a) express engine option, (b) which template engine to be used such as handlebars or ejs (for this case we use ejs)
app.set('view engine', 'ejs')

//Note on require() in node: It execute the code inside the file required, and return whatever he code exports (in module.exports)
//module.export in router.js can also expor number, tags, and objects
const router = require('./router')

//Initially we use app.get('/', function(req, res) {res.render...}), now moved using router file
app.use('/', router)

//initially we use: app.listen(3000), but we want to access the file through db.js so we use module exports on this file
module.exports = app