const Post = require('../models/Post')

exports.viewCreateScreen = function(req, res) {
    //This render is initially also consist of object (, {avatar: req.session.userVisit.avatar, viewUserName: req.session.userVisit.username})
    res.render('create-post')
}

exports.create = function(req, res) {
    let post = new Post(req.body, req.session.userVisit._id)
    post.create().then(function() {
        res.send("New Post created")
    }).catch(function(errors) {
        res.send(errors)
    })
}

exports.viewSingle = async function(req, res) {
    try {
        //before we use : let post = new Post(), but since we do not create new post, we use another approach
        let post = await Post.findSingleById(req.params.id, req.visitorId) //params is express object, stand for parameter, and id correspond with :id in the router
        res.render('single-post-screen', {viewPost: post}) //new object 'viewPost' will contain data 'let post' from previous line code that we want pass into template
    } catch {
        res.render('404')
    }
}

exports.viewEditScreen = async function (req,res) {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId) //params is express object, stand for parameter, and id correspond with :id in the router
        res.render("edit-post", {editPost: post})
    } catch {
        res.render("404")
    }
}

exports.editPost = function(req, res) {
    let post = new Post(req.body, req.visitorId, req.params.id)
    post.update().then((status) => {
        //the post was successfully updated in the database
        //or user have permission but validation on post shows errors
        if(status == "success") {
            //post will be updated in db, with green success message
            req.flash("success", "post successfully updated")
            req.session.save(function() {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        } else {
            post.errors.forEach(function(postError) {
                req.flash("errors", postError)
            })
            req.session.save(function() {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    }).catch(() => {
        //a post with requested id doesnt exist OR visitor is not owner of the post
        //return to home page
        req.flash("errors", "You are not the post owner, action denied")
        req.session.save(function() {
            res.redirect("/")
        })
    })
}