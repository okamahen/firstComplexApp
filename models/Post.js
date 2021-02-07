const postCollection = require('../connection').db().collection("post")

//mongoDB has special way of treating id value, so we use mongodb and only specific method 'objectID'; we can pass string and return special objectID type
//and store it in variable called objectID, so we can use it as our tool
const objectID = require('mongodb').ObjectID

const User = require('./User')

let Post = function(postInput, userId, requestedPostId) {
    //variable in this lecture is adjusted; consist of "title" and "content", see create-post.ejs
    this.data = postInput
    this.errors = []
    this.id = userId
    this.postId = requestedPostId
}

Post.prototype.mtdPCleanUp = function() {
    if(typeof(this.data.title) != "string") {this.data.title = ""}
    if(typeof(this.data.content) != "string") {this.data.content = ""}

    // Remove bogus properties
    this.data = {
        title: this.data.title.trim(), //method trim() is to remove space in the beginning and the end of the post
        content: this.data.content.trim(),
        createdDate: new Date(), //function Date() is default from JS
        author: objectID(this.id)
    }
}

Post.prototype.mtdPValidate = function() {
    if(this.data.title == "") {this.errors.push("Title must be filled")}
    if(this.data.content == "") {this.errors.push("Content cannot left blank")}
} 

Post.prototype.create = function() {
    return new Promise((resolve, reject) => {
        this.mtdPCleanUp()
        this.mtdPValidate()
        if(this.errors.length == false) {
            //save post to db; insertOne() return a promise, so we can use then-catch or async-await
            postCollection.insertOne(this.data).then(() => {
                resolve()
            }).catch(() => {
                this.errors.push("Please try again later.")
                reject(this.errors)
            })
        } else {
            //retun error message
            reject(this.errors)
        }
    })
}

Post.prototype.update = function() {
    return new Promise(async (resolve, reject) => {
        //find relevant post document in update
        try {
            //As function declaration below, 'findSingleById' will return a promise, so we need
            //to set async-await, to wait until operation is completed
            let post = await Post.findSingleById(this.postId, this.id)
            if(post.isVisitorOwner) {
                //actually update the db
                let status = await this.checkCompleteAndUpdate()
                resolve(status)
            } else {
                reject() //not the owner of the post
            }         
        } catch {
            reject()
        }
    })    
}

Post.prototype.checkCompleteAndUpdate = function() {
    return new Promise(async (resolve, reject) => {
        this.mtdPCleanUp()
        this.mtdPValidate()
        if(!this.errors.length) {
            //2 argument on 'findOneAndUpdate' : Which post, and what to update
            await postCollection.findOneAndUpdate({_id: new objectID(this.postId)}, {$set: {title: this.data.title, content: this.data.content}})
            resolve("succes")
        } else {
            resolve("failure")
        }
    })
}

//Reuseable code for query
//showing post doesn't need object oriented approach, so instead of using 'prototype', we can use Post o call simple function
//Post is a function (constructor function), so how can we add function into function? As explained, funcion is an object jus like any other object
//so we can just create new function just by adding '.', just like any other objects
Post.postQuery = function(unOps, visitorId) { //unOps stands for unique Operations
    return new Promise(async function(resolve, reject) {
        let aggregateOperation = unOps.concat([
            //$lookup is to find from database collection, return an array
            //from: 'users' is database collection that we want to check; 'localField' what properties in current collection (in this case, we are in 'post' collection)
            //'localField' is also the field we want to lookup for; 'foreignField' is the field that we want to check from 'users'
            //'as' is the result variable to store the result
            {$lookup: {from: "users", localField: "author", foreignField: "_id", as: "authorDocument"}},
            
            //$project is for spill out what fields we want the resulting object to have
            //value 1 means "true"
            {$project: {
                title: 1,
                content: 1,
                createdDate: 1,
                authorId: "$author", //in mongodb, when we include $ inside quote, it refers to mongodb field not actual literal string
                author: {$arrayElemAt: ["$authorDocument", 0]} // $authorDocument will return array, and since we interested in only 1 array, we use 0 to fetch the content of array into object to be used later
            }}
        ])

        //Initially we use method: findOne({_id: new objectID(id)}), but as we want to pick value from gravatar, we use aggregate()
        //this method is usefull for multiple operation
        //method: toArray() will create array, usefull for multiple and good for single search. we might use toArray() [0]
        //but since connecting to db takes time, best if we use async-await
        let multiPost = await postCollection.aggregate(aggregateOperation).toArray()

        // clean up author property in each post object
        // the idea is we want to only display username and the avatar detail and remove the email and password object, by making new aray using map() from multiPost array, and then manipulate it
        multiPost = multiPost.map(function(post) {
            post.isVisitorOwner = post.authorId.equals(visitorId)
            
            //As explained in readme file, the curent console.log wiil result in all data to be posted
            //We only need the 'author' data, so we only post author and save into an object
            post.author={
                username: post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post
        })

        resolve(multiPost)
    })
}

//Adding visitorId to catch the value of
//this function consist of 3 action : Check if the post exist, clean malicious input, and check if page visitor is also the creator
//2 argument required: 'id' is the post creator id, and 'visitorId' is the post visitor id 
Post.findSingleById = function(id, visitorId) {
    return new Promise(async function(resolve, reject) {
        if (typeof(id) != "string" || objectID.isValid(id) == false) {
            reject()
            return
        }

        let multiPostResult = await Post.postQuery([
            {$match: {_id: new objectID(id)}}
        ], visitorId)

        if (multiPostResult.length) {
            console.log(multiPostResult[0])
            resolve(multiPostResult[0])
        } else {
            reject()
        }

    })
}

Post.findByAuthorId = function(authorId) {
    return Post.postQuery([
        {$match: {author: authorId}},
        {$sort: {createdDate: -1}} //1 = ascending, -1=descending
    ])
}

module.exports = Post