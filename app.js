//jshint esversion:6
require('dotenv').config()

const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");

const app=express();

const encrypt=require("mongoose-encryption");
const mongoose=require("mongoose");


// const md5=require("md5");

const session = require('express-session');
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate");
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
  }));


  app.use(passport.initialize());
  app.use(passport.session());


mongoose.connect("mongodb://127.0.0.1:27017/userDB");


const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});



userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


// using hashing
// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});   


const User=mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.use(express.static("public"));
app.set("view engine",'ejs');
app.use( bodyParser.urlencoded({extended:true}));



app.get("/",function(req,res){
    res.render("home");
})

app.get("/login",function(req,res){
    res.render("login");
})

app.get("/register",function(req,res){
    res.render("register");
})

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));


  app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });



app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else{
        res.redirect("/login");
    }
})

app.post("/submit",function(req,res){
   
    User.findById(req.user.id).then((foundUser)=>{
        foundUser.secret=req.body.secret;
        foundUser.save();
        console.log(foundUser.secret);
        res.redirect("/secrets");
      })

  
});

app.get("/secrets",function(req,res){
   User.find({"secret":{$ne: null}}).then((foundUser)=>{
    if(foundUser){
        res.render("secrets",{userWithSecrets:foundUser});
    }
   })
})

app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/");
        }
    });
 
})

// USING PASSPORT 
  
app.post("/register",function(req,res){

    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })
})


app.post("/login",function(req,res){
    const name=req.body.username;
    const pass=req.body.password;
    const user=new User({
        username:name,
        password:pass
    })
    req.login(user,function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
            
                    res.redirect("/secrets");
                
            })
        }
    })
})





























// USING NORMAL APPROACH TO SAVE THE DATA IN DATABASE

// app.post("/register",function(req,res){
//     const userEmail=req.body.username;
                    //  using md5 to encrypt the password
//     const userPass=md5(req.body.password);

//     const user=new User({
//         email:userEmail,
//         password:userPass
//     });

//     user.save();
//     res.render("secrets");
// })




// app.post("/login",function(req,res){
//     const userEmail=req.body.username;
//     const userPass=req.body.password;
//     User.findOne({email:userEmail}).then((foundItems)=>{
//     if(foundItems){
//         if(foundItems.password===userPass){
//             res.render("secrets");
//         }
//         else{
//             console.log("wrong password");
//         }
//     }
//     }).catch((error)=>{
//         console.log(error);
//     });
    
// })









app.listen("3000",function(){
    console.log("server succcesfully running on port 3000");
});