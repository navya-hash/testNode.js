const express=require('express') 
const cors=require('cors')
const bodyParser=require('body-parser')
require('dotenv').config()
const port=8000
require('./db')
const bcrypt = require('bcryptjs');
const jwt=require('jsonwebtoken')
const cookieParser = require("cookie-parser");
const User= require('./MODELS/userSchema')
const imageUploadRoutes=require('./CONTROLLERS/imageUploadRoutes')

const app=express()
app.use(cors())
app.use(cookieParser());
app.use(bodyParser.json())
app.use('/imageUpload',imageUploadRoutes)


//this is used when we need to get the profile of user
function authenticateToken(req,res,next){
    const token=req.header('Authorization')//sent by client side(front end)
    
    if(!token){
        // res.status(401).json({
        //     message:"No token found"
        // })
        const error=new Error('token is invalid')//error generate
        next(error)
    }
    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET_KEY)//jwt.verify basically 
        //checks whether the token is real and valid(not expired) and if no error comes,
        //it passes its id to req.id
        req.id=decoded.id
        next()
    }
    catch(err){
        next(err)
    }

}

app.get('/',(req,res)=>{
    res.json({
       message: "working"
})
})

app.post('/register', async (req,res)=>{
    try{
        const{name,password,email,age,gender}=req.body
        const existingUser=await User.findOne({email})
        if(existingUser){
            return res.status(404).json({
                message:"email already registered"
            })
        }
        const salt=await bcrypt.genSalt(10)
        const hashedPassword=await bcrypt.hash(password,salt)
        const newUser=new User({//creating a new object of UserSchema
            name,
            password:hashedPassword,
            email,
            age,
            gender
        })
        await newUser.save()//saved in mongodb Atlas
        res.json({
            message:'user registered successfully',
            newuser:newUser
        })

        


    }
    catch(err){
        res.status(500).json({//server side error
            message:err.message
        })
    }
})


app.post('/login',async (req,res,next)=>{
    try{
        const {email,password}=req.body
        const existingUser=await User.findOne({email})
        if(!existingUser){
            // return res.status(404).json({
            //     message:"no such user found"
            // })

            //using error middleware
            const error=new Error('User does not exist')//created the error
            return next(error);
        }
        const isPasswordCorrect=await bcrypt.compare(password,existingUser.password)
        if(!isPasswordCorrect){
            return res.status(404).json({
                message:"Incorrect Password"
            })
        }
        //if password is correct generate the token
        const accesstoken=jwt.sign({id:existingUser._id},process.env.JWT_SECRET_KEY,{
            expiresIn:'1h'
        })
        const refreshToken=jwt.sign({id:existingUser._id},process.env.JWT_REFRESH_SECRET_KEY)
        existingUser.refreshToken=refreshToken
        await existingUser.save()//saves in mongodb Atlas
        res.cookie('refreshToken',refreshToken,{httpOnly:true,path:'/refresh_token'})


        res.status(200).json({
            accesstoken,
            refreshToken,
            message:"login done successfully!"
        })



    }
    catch(err){
       next(err)
    }
})
app.get('/getmyprofile',authenticateToken, async (req,res)=>{
    
    const user=await User.findById(req.id)//here attaches req.id from token
    user.password=undefined//it hides the password
    res.status(200).json({user})

})




app.get('/refresh_token',async(req,res,next)=>{
    const token=req.cookies.refreshToken
    // res.send(token)
    if(!token){
        const error=new Error('token not found')
        next(error)
    }
    // decoded will store the payload of the JWT
    jwt.verify(token,process.env.JWT_REFRESH_SECRET_KEY,async(err,decoded)=>{
        if(err){
            const error=new Error('Invalid token')
            next(error)
        }
        const id=decoded.id;
        const existingUser=await User.findById(id)
        if(!existingUser || token!==existingUser.refreshToken){
            const err=new Error("user not found")
            next(err)
        }
        //if token exists and it matches with existing user
        //generate a new access token(not verify) that's why sign is used not verify
        const accesstoken=jwt.sign({id:existingUser._id},process.env.JWT_SECRET_KEY,{
            expiresIn:'1h'
        })
        const refreshToken=jwt.sign({id:existingUser._id},process.env.JWT_REFRESH_SECRET_KEY)
        existingUser.refreshToken=refreshToken
        await existingUser.save()//saves in mongodb Atlas
        res.cookie('refreshToken',refreshToken,{httpOnly:true,path:'/refresh_token'})
        res.status(200).json({
            accesstoken,
            refreshToken,
            message:"login done successfully!"
        })

    })
})
//error handling middleware
//ususally kept before app.listen
app.use((err,req,res,next)=>{
    console.log("error middleware called",err);
    res.status(500).json({
        message:err.message
    })
})

//get the users by their gender
app.post('/getByGender',async(req,res)=>{
    const {gender}=req.body;
    const users=await User.find({gender:gender})
    res.json({
        users
    })

    
})

//sort the users by their name(either asc or desc)
app.post('/sortUsers',async (req,res)=>{
    const {sortby,order}=req.body;
    //creating sort object dynamically
    const sort={
        [sortby]:order
    }
    console.log(sort)
    const users=await User.find().sort(sort)
    res.json({
        users
    })
})


app.listen(port,()=>{
    console.log("server is running")
})

