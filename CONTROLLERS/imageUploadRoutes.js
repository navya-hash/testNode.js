//here we'll learn how to upload the image
const express=require('express')
const router=express.Router()
require('dotenv').config()
const cloud=require('cloudinary').v2
const multer=require('multer')
const User=require('../MODELS/userSchema')

cloud.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key:process.env.API_KEY,
    api_secret:process.env.SECRET_KEY
})

const storage=multer.memoryStorage()
const upload=multer({storage:storage})
router.post('/uploadProfilePic',upload.single('myimage'),async (req,res)=>{
    const file=req.file;
    const {userId}=req.body
    if(!file)
         return res.json({
        message:"file not found!"})
    const existingUser=await User.findById(userId)
    if(!existingUser)
        return res.json({
    message:"no user found"})
    // res.send({
    //     file
    // })


cloud.uploader.upload_stream({
    resource_type:'auto'
},
async(error,result)=>{
    if(error){
        console.error('Cloudinary Upload error')
        return res.status(500).json({
            error:"error in uploading file"
        })
        
    }
    // res.json({
    //     result
    // })
    existingUser.profilePic=result.secure_url
    await existingUser.save()
    res.json({
        imageurl:result.secure_url,
        message:"image url fetched suucessfully!"
    })

}
).end(file.buffer)
})

module.exports=router