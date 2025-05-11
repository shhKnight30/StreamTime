// // import express from 'express';
// // const App = express()

// // const port = 3000
// import mongoose from 'mongoose'
// import {DB_NAME} from './constants';

// App.get

// // App.get('/',(req,res)=>{
// //     res.send("hello everyoned  ")
// // })
// // App.listen(port,()=>{
// //     console.log("app shuru ho gaya hai aa jao")
// // })
// console.log(process.env.MONGODB_URI)
// function connectDB(){
//     try {
//         mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         App
        
//     } catch (error) {
//         console.log(error);
//         throw new Error(error);
//     }

// }

// connectDB()


// import mongoose from 'mongoose'
// import {DB_NAME} from './constants.js';
// import express from 'express' 
// import dotenv from 'dotenv';
// dotenv.config();

// const App = express()


// // App.get('/',(req,res)=>{
// //     res.send("hello everyoned  ")
// // })
// // App.listen(port,()=>{
// //     console.log("app shuru ho gaya hai aa jao")
// // })
// console.log(process.env.MONGODB_URI)
// ; async function connectDB(){
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         
//         App.listen(process.env.PORT|| 4000 ,()=>{
//             console.log(`App listening on port ${process.env.PORT} `);
            
//         })
//     }catch(error){
//         console.log("catched");
//         throw error
        
//     }

// }

// connectDB()

// App.get('/',(req,res)=>{
//     res.send('res. is sending')
// })


import dotenv from 'dotenv';
import connectDB  from './db/index.js';
import {app} from './app.js'

dotenv.config({
    path:'./env'

})

connectDB()
.then(()=>{
    app.on('error',(error)=>{
                    console.log("found");
                    throw error
                })

app.listen(process.env.PORT || 4000 , ()=>{
    console.log('server is running on the port :'+ process.env.PORT)
})
                
            })
            .catch((error)=>{
                console.log(error)
            })
            
            

