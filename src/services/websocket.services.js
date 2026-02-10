import { Server } from "socket.io";

class WebSocketService{
    constructor(){
        this.io = null
        this.activeStreams = new Map()
    }
    initialize(server){
        this.io = new Server(server,{
            cors:{origin:"*"}
        })
        
        this.io.on('connection',(socket)=>{
            console.log('User connected: ',socket.id)
            socket.on('join-stream',(streamId)=>{
                socket.join(streamId)
                console.log(`User ${socket.id} has joined the strea ${streamId}`)
            })
            
            socket.on('leave-stream',(streamId)=>{
                socket.leave(streamId)
                console.log(`User ${socket.id} left stream ${streamId}`)
            })
        })
    }
    broadcastToStream(streamId,event,data){
        this.io.to(streamId).emit(event,data)
    }
}

export default new WebSocketService()