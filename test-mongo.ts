import mongoose from "mongoose";

const uri = "mongodb+srv://abhirupkumar001_db_user:0Fv95vI2DgIVn5GI@vizvaconsultancyteams.qsdwqwb.mongodb.net/bedrock";

async function run() {
  try {
    await mongoose.connect(uri, { family: 4 });
    console.log("Connected successfully!");
  } catch (err) {
    console.error("Connection error:", err);
  } finally {
    mongoose.disconnect();
  }
}

run();
