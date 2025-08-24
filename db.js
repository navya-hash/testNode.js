const mongoose=require('mongoose')
require('dotenv').config()
mongoose.connect(process.env.MONGO_URL,{
    dbname:process.env.DB_NAME
}).then(()=>{
    console.log("server connected successfully!")
})
.catch((err)=>{
    console.log("error in connecting database")
})