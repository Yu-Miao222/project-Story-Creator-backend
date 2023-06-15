import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";
import listEndpoints from "express-list-endpoints";



const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1/storyCreator";
mongoose.connect (mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true});
mongoose.Promise = Promise;

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

// ---------- SCHEMAS-----------
//creat User schema
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  },
  likedStory: {
    type: [],
  }
 
});

const User = mongoose.model("User", UserSchema);

//Authenticate the user
const authenticateUser = async (req, res, next) => {
  console.log('authorizing')
  const accessToken = req.header("Authorization");
  console.log(accessToken)
  // console.log(req)
  // console.log(res)
  // console.log(next)
  try {
    const user = await User.findOne({accessToken: accessToken});
    console.log(user)
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

// creat Story schema
const StoryDetails = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  storyContent: {
    type: String,
    required: true,
    minlength: 5,
    trim: true
  },
  storyImg: {
    type: String,
    required: false
  },
  tags: {
    type: [String],
    required: false
  },
})

const StorySchema = new mongoose.Schema({
  story: {
    type: StoryDetails
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  }, 
  likes: {
    type: Number,
    default: 0
  },
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  isComplete: {
    type: Boolean,
    default: false,
  }
})

const Story = mongoose.model("Story",StorySchema)



// ------- ROUTES---------------

// Register new user
app.post("/register", async(req, res) => {
  const { username, password} = req.body
  try {
    const salt = bcrypt.genSaltSync();
    console.log(bcrypt.hashSync(password, salt))
    const newUser = await new User({
      username: username,
      password: bcrypt.hashSync(password, salt)
    })
    res.status(201).json(
      {
      sucess: true,
      response: {
        username: newUser.username,
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
  const { username, password } = req.body;
  try {
    const user = await User.findOne({username})

    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        success: true,
        response: {
          username: user.username,
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
  console.log(res)
})


// Shows story when logged in 
app.get("/stories", authenticateUser)
app.get("/stories", async(req, res) => {
  console.log("test")
  const { tags } = req.query
  if(tags) {
    const filteredStories = await Story.find({'story.tags':tags})
    res.status(200).json({
      sucess: true,
      response: filteredStories
    })
  } else {
    try {
      const stories = await Story.find().sort({createdAt:'desc'})
      res.status(200).json({
        success: true,
        response: stories
      })
    } catch (e) {
      res.status(400).json({
        sucess: false,
        response:e
      })
    }
  }
})

// get single story based on ID
app.get("/stories/:storyId", authenticateUser)
app.get("/stories/:storyId", async(req, res) => {
  const { storyId } = req.params;
  try {
    const singleStroy = await Story.find ({ _id:storyId }).sort({createdAt:'desc'})
    res.status(200).json({
      success: true,
      response: singleStroy
    })
  } catch (e) {
    res.status(400).json({
      sucess: false,
      response:e
    })
  }
})

// List all users
app.get("/users", authenticateUser)
app.get("/users", async (req, res) => {
  try {
    const users = await User.find()
    res.status(200).json({
     success: true,
     response: users
    })
  } catch (e) {
     res.status(400).json({
      success: false,
       response: e
    });
   }
})
//show data from a specific user
app.get("/users/:userId", authenticateUser)
app.get("/users/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const userData = await User.findById({_id: userId})
    res.status(200).json({
     success: true,
     response: userData
    })
  } catch (e) {
     res.status(400).json({
      success: false,
      response: e
    });
   }
})
//show stories from a specific user
app.get("/users/:userId/posts", authenticateUser)
app.get("/users/:userId/posts", async (req, res) => {
  const { userId } = req.params;
  try {
    const usersStories = await Recipe.find({userId: userId}).sort({createdAt: 'desc'})
    const user = await User.findById({_id: userId})
    res.status(200).json({
     success: true,
     response: usersStories, user
    })
  } catch (e) {
     res.status(400).json({
      success: false,
      response: e
    });
   }
})
//show liked stories from a specific user
app.get("/users/:userId/likedposts", authenticateUser)
app.get("/users/:userId/likedposts", async (req, res) => {
  try {
    const usersStories = await Recipe.find({_id: {
      $in: req.body
  }}).sort({createdAt: 'desc'})
    res.status(200).json({
     success: true,
     response: usersStories
    })
  } catch (error) {
     res.status(400).json({
      success: false,
      response: error
    });
   }
})
// post new story 
app.post("/stories", authenticateUser)
app.post("/stories", async (req, res) => {
  const { story } = req.body
  const accessToken = req.header("Authorization")
  const user = await User.findOne({accessToken: accessToken})
  console.log("post stories")
  try {
    console.log(user)
    console.log(story)
    const newStory = await new Story({story, userId: user._id, username: user.username}).save()
    console.log(newStory)
    res.status(201).json({
      success: true,
      response: newStory
    })
  } catch (e) {
    console.log(e)
    res.status(400).json({
      success: false,
      response: e
    })
  }
})

// Delete story
app.delete("/stories/:storyId", async (req, res) => {
  const { storyId } = req.params
  try {
    const storyToDelete = await Story.findByIdAndRemove({_id: storyId})
    res.status(200).json({
      success: true,
      response: "Story deleted", storyToDelete
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      response: error
    })
  }
})
// Like story & add the story to user DB
app.patch("/stories/:storyId", authenticateUser)
app.patch("/stories/:storyId", async (req, res) => {
  const { storyId } = req.params
  const accessToken = req.header("Authorization")
  const user = await User.findOne({accessToken: accessToken})

  try {
    const likedStory = await Story.findByIdAndUpdate({_id: storyId}, {$inc: {likes: 1}})
      const addLikedStory = await User.findByIdAndUpdate({ _id: user._id}, { 
      $push: {likedStory: likedStory}
    })
      res.status(200).json({
      response: "Story liked and added to user profile",
      data: likedStory, addLikedStory
    })

  } catch (error) {
    res.status(400).json({
      success: false,
      response: error
    })
  }
})
















// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

