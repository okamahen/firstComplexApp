//First we need to learn in node how each js file can share the code from one file to another
//Example on execution: console.log("Execute instructions from router.js files")
//Example on exports: module.exports = "Export of the router.js file"
const express = require('express')
const router = express.Router()

//Use controller to get the js file to control interaction
const userController = require('./controllers/userController')
const postController = require('./controllers/postController')

//To use the HTML template on ejs, use render and input the ejs file (not necessary with extension .ejs)
//Initially we use: function (req, res) {res.render('home-guest')}, now moved to controllers folder and call the userController.js
//Now we use controller to process the rendering, by calling the function and the method created

//Router to get user to homepage
router.get('/', userController.home)

//Router for user registration and login
router.post('/register', userController.register)
router.post('/login', userController.login)
router.post('/logout', userController.logout)

//Router for profile
router.get('/profile/:username', userController.ifUserExists, userController.profilePostScreen)

//Router for user posting 
router.get('/create-post', userController.mustBeLoggedIn, postController.viewCreateScreen)
router.post('/create-post', userController.mustBeLoggedIn, postController.create)
router.get('/post/:id', postController.viewSingle) //does not include 'mustBeLoggedIn', so this post not only able to be seen by valid curret user, but also to another user (think as blogging platform!)
router.get('/post/:id/edit', postController.viewEditScreen)
router.post('/post/:id/edit', postController.editPost)

module.exports = router