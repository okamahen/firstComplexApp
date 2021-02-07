//Package for validating email address without regular expression
const validator = require("validator")
//Package for hashing password
const bcrypt = require("bcryptjs")
//Now that in app.js, the: db() is deleted, task to connect to db() delegated to this file 
const usersCollection = require('../connection').db().collection("users")
//Package for md5 secure hashing, mainly used for gravatar connection
const md5 = require("md5")

//Example: we use consructor function in this variable
//constructor is a function that create objects, and will be used in model

let User = function(inputData, getAvatar) {
    //Keyword "This" points toward object that calling / executing the current function
    //As "this" function called, the one calling this function is: new, from userController.js
    this.data = inputData // this.data is the object created, and inputData is the input from function
    
    //Reminder: User variable used in userController.js. The one calling this function is
    //exports.register, which router to /register form action in views home-guest.ejs. That
    //is why the user have 3 input: username, email, and password
    
    this.errors = []

    //Below will be used extensively in Post.js to get avatar
    //First we want to check if User is called without input on 2nd parameter (getAvatar), which is having undefined value
    if(getAvatar == undefined){getAvatar = false}
    if(getAvatar){this.getAvatar()} // automatically create hash based current email and generate gravatar URL
}

//mtd = method, to help differentiate with controller
User.prototype.mtdValidate = function() {
    return new Promise(async (resolve, reject) => {
        //Validation for username; using "validator" package
        //"validator" have access to isAlphanumeric method, return true or false
        if(this.data.username == "") {this.errors.push("You must provide a username")}
        if(this.data.username != "" && validator.isAlphanumeric(this.data.username) == false) {this.errors.push("Username can only contain letters and numbers")}
        if(this.data.username.length > 0 && this.data.username.length< 3) {this.errors.push("Username must be more than 12 characters")}
        if(this.data.username.length > 30) {this.errors.push("Username cannot exceed 30 characters")}
        
        //Validation for email; using "validator" package
        //"validator" have access to isEmail method, return true or false
        if(validator.isEmail(this.data.email) == false) {this.errors.push("You must provide a valid email address")}
        
        //Validation for password
        if(this.data.password == "") {this.errors.push("You must provide password")}
        if(this.data.password.length > 0 && this.data.password.length< 12) {this.errors.push("Password must be more than 12 characters")}
        //Special for password length as we used bcrypt, usually only password with maxmum 50 character
        if(this.data.password.length > 50) {this.errors.push("Password cannot exceed 50 characters")}
    
        //After pass the validation, check in db if already taken >> it is important to reduce the need to check in db to increase server performance
        if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
            //In mongodb: findOne() method is a promise, so we can use: "await", to wait execution only after first await finally executed
            //The initial prototype need to add: async, so findOne() can be elevated into async-await
            let nameExists = await usersCollection.findOne({username: this.data.username})
            if (nameExists) {this.errors.push("Username taken, try another one")}
        }
    
        //Recycle code for email
        if (validator.isEmail(this.data.email)) {
            //In mongodb: findOne() method is a promise, so we can use: "await", to wait execution only after first await finally executed
            //The initial prototype need to add: async, so findOne() can be elevated into async-await
            let emailExists = await usersCollection.findOne({email: this.data.email})
            if (emailExists) {this.errors.push("Email already registered, try another one")}
        }
        resolve()
    })
}

User.prototype.cleanUp = function() {
    //Protection from input that is not a string and fallback to empty string
    if(typeof(this.data.username) != "string" ) {this.data.username = ""}
    if(typeof(this.data.email) != "string" ) {this.data.email = ""}
    if(typeof(this.data.password) != "string" ) {this.data.password = ""}

    //If user able to access script and add new object (such as favColor: "blue"), below code will omit additional object
    //and sanitize only with username (space trimmed and to lower case), email, and password
    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    }
}

User.prototype.mtdLogin = function() {
    //Promise is Uppercase as constructor to create new promise
    //Explanation for arrow function ( => ) available at User_callbackFunctionExplained.js
    //In summary, arrow function will not modify the 'this' keyword do will not refer to global function
    return new Promise((resolve, reject) => {
        this.cleanUp()
        //Use method findOne() to read data from mongodb; create object named finduser (not "username" to avoid confusion between new object and html element "username").
        //We use promise same with userController.js
        usersCollection.findOne({username: this.data.username}).then((attemptedUser) => {
            //Usng bcrypt with argument: (1) user input password for login, and (2) hashed value form database as result to compare
            if(attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password) /*attemptedUser.password == this.data.password*/) {
                this.data = attemptedUser
                this.getAvatar()
                resolve("UID and PASS combination is correct")
            } else {
                reject("Wrong combination, please retry")
            }
        }).catch(function() {
            reject("Promise error, please try again later")
        })
    })
}

User.prototype.mtdRegister = function() {
    return new Promise(async (resolve, reject) => {
        // Step 1: Clean up and Validate user data (not empty an value make sense to each field)
        //The one calling mtdRegister function is : user, from userController.js
        //So, below is similar with : user(from userController.js).mtdValidate()
        this.cleanUp()
        await this.mtdValidate()
        
        // Step 2: Only if there are no validation errors, save data to db
        if(!this.errors.length) {
            // Hash user password
            let salt = bcrypt.genSaltSync(10)
            this.data.password = bcrypt.hashSync(this.data.password, salt)
            await usersCollection.insertOne(this.data)
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

User.prototype.getAvatar = function() {
    //This database use Gravatar as database to save our photo information. This part can be improved further to use mongodb data handling, for purpose of this lesson we keep this part as is
    //gravatar handler: https://gravatar.com/avatar/email?s=128, where email is the email address, and s is the file size in pixel
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.findByUsername = function(username) {
    return new Promise(function(resolve, reject) {
        //Check and cleanup input
        if (typeof(username) != "string") {
            reject()
            return
        }
        usersCollection.findOne({username: username}).then(function(userDoc) {
            if (userDoc) {
                userDoc = new User(userDoc, true) //'true' will automatically fech us with email details from gravatar
                userDoc = {
                    _id: userDoc.data._id,
                    username: userDoc.data.username,
                    avatar: userDoc.avatar
                }
                resolve(userDoc)
            } else {
                reject()
            }
        }).catch(function() {
            reject()
        })
    })
}

module.exports = User