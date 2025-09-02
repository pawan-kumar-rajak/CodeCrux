import mongoose from "mongoose";



const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${process.env.DB_NAME}` )
        // const connectionInstance = await mongoose.connect(`mongodb://localhost:27017/CodeCrux?replicaSet=rs0`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)     //note: or we can redirect user to Server is not responding webpage
    }
}

export default connectDB