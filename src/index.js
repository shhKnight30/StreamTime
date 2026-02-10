import dotenv from 'dotenv';
import connectDB  from './db/index.js';
import {app} from './app.js'
import http from 'http'
import websocketServices from './services/websocket.services.js';


dotenv.config({
    path:'./env'
    
})

const server = http.createServer(app)
websocketServices.initialize(server)
server.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`)
})

connectDB()
.then(()=>{
    app.on('error',(error)=>{
        console.log("found");
        throw error
    })
    
     app.listen(process.env.PORT, ()=>{
        console.log('server is running on the port :'+ process.env.PORT)
    })
    
})
.catch((error)=>{
    console.log(error)
})