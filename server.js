import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";
import listEndpoints from "express-list-endpoints";



const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1/storyCreator";
mongoose.connect (mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true});
mongoose.Promisr = Promise;

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

// Start defining your routes here
app.get("/", (req, res) => {
  res.send(listEndpoints(app));
});

//Schema and Model for the database
const UserSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
});

const User = mongoose.model("User", UserSchema);
//create a user account
app.post("/register", async(req, res) => {
  const { firstname, lastname, email, password} = req.body
  try {
    const salt = bcrypt.genSaltSync();
    const newUser = await new User({
      firstname: firstname,
      lastname:lastname,
      email: email,
      password: bcrypt.hashSync(password, salt)
    }).save()
    res.status(201).json({
      sucess: true,
      response: {
        firstname: newUser.firstname,
        lastname: newUser.lastname,
        email: newUser.email,
        id: newUser._id,
        accessToken: newUser.accessToken
      }
    })
  } catch (e){
    res.status(400).json({
      success: false,
      response: e
    })
  }
})
//user login
app.post("/login", async(req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({email})
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        success: true,
        response: {
          email: user.email,
          id: user._id,
          accessToken: user.accessToken
        }
      })
    } else {
        res.status(400).json({
          success: false,
          response: "Credentials do not match"
        })
      }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    })
  }
})

//Create a story
const StorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  story: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
})

const Story = mongoose.model("Story",StorySchema)

//Authenticate the user
const authenticateUser = async (req, res, next) => {
  const accessToken = req.header("Authorization");
  try {
    const user = await User.findOne({accessToken: accessToken});
    if (user) {
      next();
    } else {
      res.status(401).json({
        success: false,
        response: "PLease log in"
      })
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    });
  }
}
app.get("/story", authenticateUser);
app.get("/story", async (req, res) => {
  const accessToken = req.header("Authorization");
  const user = await User.findOne({accessToken: accessToken});
  const story = await Story.find({user: user._id})
  res.status(200).json({success: true, response: story})
});
app.post("/story",authenticateUser);
app.post("/story", async (req, res) => {
  const { message } = req.body;
  const accessToken = req.header("Authorization");
  const user = await User.findOne({accessToken: accessToken});
  const story = await new Thought({message: message, user: user._id}).save();
  res.status(200).json({ success: true, response: story})
});









// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

