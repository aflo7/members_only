const express = require("express")
const path = require("path")
const session = require("express-session")
const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy
require('dotenv').config()
var cors = require('cors')

app.use(cors({
  origin: 'https://app2.memberssonly.xyz'
}));


const users = [
  {
    username: "aflo7",
    name: "Andres Flores",
    password: "pass",
    admin: true,
    id: 1
  },
  {
    username: "pabs1339",
    name: "Pablo Arredondo",
    password: "pass",
    admin: false,
    id: 2
  },
  {
    username: "csand",
    name: "Carlos Sandoval",
    password: "pass",
    admin: false,
    id: 3
  }
]

// Inside the clubhouse, members can see who the author of a post is, but outside they can only see the story and wonder who wrote it
// if not logged in, display "anonymous" for the author
// if logged in, display author info
const posts = [
  {
    author: "Andres Flores",
    title: "First post",
    timestamp: new Date(),
    content:
      "Hi hope you like reading this blog. Did u watch the last world cup game?"
  },
  {
    author: "Andres Flores",
    title: "It must suck",
    timestamp: new Date(),
    content: "It must suck not to be apart of the clubhouse"
  },
  {
    author: "Carlos Sandoval",
    title: "Its 557 pm playing smash bros",
    timestamp: new Date(),
    content: "I enjoy playing as mario!"
  },
  {
    author: "Carlos Sandoval",
    title: "Its 558 pm im playing smash bros",
    timestamp: new Date(),
    content: "I like playing as pacman sometimes aswell"
  }
]

const app = express()
app.set("views", __dirname)
app.set("view engine", "ejs")
app.set('trust_proxy', 1)

passport.use(
  new LocalStrategy((username, password, done) => {
    let userExists = false
    let foundUser = null

    for (let i = 0; i < users.length; i++) {
      if (users[i].username == username) {
        userExists = true
        foundUser = { ...users[i] }
        break
      }
    }

    if (userExists) {
      if (password == foundUser.password) {
        return done(null, foundUser)
      } else {
        return done(null, false, { message: "Incorrect password" })
      }
    } else {
      return done(null, false, { message: "Incorrect username" })
    }
  })
)

passport.serializeUser(function (user, done) {
  done(null, user.id)
})

passport.deserializeUser(function (id, done) {
  let foundUser = null

  for (let i = 0; i < users.length; i++) {
    if (users[i].id == id) {
      userExists = true
      foundUser = { ...users[i] }
      break
    }
  }

  if (foundUser) {
    return done(null, foundUser)
  }
  return done("error deserializing", false)
})

const isAuthenticated = function (req, res, next) {
  if (req.user) return next()
  else
    return res.status(401).json({
      error: "User not authenticated"
    })
}

const isAdmin = function (req, res, next) {
  if (req.user.admin) return next()
  else
    return res.status(401).json({
      error: "User does not have admin priveleges"
    })
}

app.use(session({ secret: "cats", resave: false, saveUninitialized: true }))
app.use(passport.initialize())
app.use(passport.session())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(__dirname))

app.use(function (req, res, next) {
  res.locals.currentUser = req.user
  next()
})

app.get("/hello", (req,res) => {

  return res.json({hello: 'world'})
})
app.get("/", (req, res) => {
  let output = ""

  if (req.user && req.user.admin) {
    // posts with author name (authenticated, admin privelege to delete posts)
    posts.forEach(
      (post, i) =>
        (output += `<div class="post-wrapper">
                      <div>
                        <div>${post.title}</div>
                        <div>${post.content}</div>
                        <div> - ${post.author} ${post.timestamp}</div>
                      </div>
                      <div>
                        <form action="/posts/delete/${i}" method="post">
                          <input type="submit" value="Delete">
                        </form>
                      </div>
                    </div>`)
    )
  } else if (req.user && !req.user.admin) {
    // posts with author name (authenticated, no admin privelege)
    posts.forEach(
      (post) =>
        (output += `<div class="post-wrapper">
                        <div>${post.title}</div>
                        <div>${post.content}</div>
                        <div> - ${post.author} ${post.timestamp}</div>
                    </div>`)
    )
  } else {
    // posts without author name
    posts.forEach(
      (post) =>
        (output += `<div class="post-wrapper">
                  <div>
                    <div>${post.title}</div>
                    <div>${post.content}</div>
                    <div> - Anonymous</div>
                  </div>
                </div>`)
    )
  }

  res.render("index", { posts: output })
})

app.get("/sign-up", (req, res) =>
  res.render("sign-up-form", { errorMessage: "" })
)

app.post("/sign-up", (req, res, next) => {
  const username = req.body.username
  const password = req.body.password
  const name = req.body.name
  const adminKey = req.body.adminKey
  let admin = false
  console.log(adminKey)
  console.log(process.env.ADMIN_KEY)

  if (adminKey == process.env.ADMIN_KEY) {
    admin = true
  }

  for (let i = 0; i < users.length; i++) {
    if (users[i].username == username) {
      return res.redirect("/sign-up", { errorMessage: "User already exists" })
    }
  }

  
  const newUser = {
    username: username,
    name: name,
    password: password,
    admin: admin,
    id: users.length + 1
  }

  users.push(newUser)
  console.log(users)
  res.redirect("/sign-up-success")
})

app.get("/sign-up-success", (req, res, next) => {
  res.render("sign-up-success")
})

app.get("/log-in", (req, res) => {
  res.render("login-form")
})

app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/log-in"
  })
)

app.get("/log-out", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err)
    }
    res.redirect("/")
  })
})

// app.get("/protected-resources", isAuthenticated, (req, res, next) => {
//   res.render("home", { secretFiles: secretFiles })
// })

app.get("/new-post", function (req, res, next) {
  res.render("new-post-form")
})

app.post("/new-post", isAuthenticated, function (req, res, next) {
  // <!-- {
  //   author: "Andres Flores",
  //   title: "First post",
  //   timestamp: new Date(),
  //   content:
  //     "Hi hope you like reading this blog. Did u watch the last world cup game?"
  // } -->

  const newPost = {
    author: req.user.name,
    title: req.body.title,
    timestamp: new Date(),
    content: req.body.content
  }
  posts.push(newPost)
  res.redirect("/")
})

app.post(
  "/posts/delete/:id",
  isAuthenticated,
  isAdmin,
  function (req, res, next) {
    const postID = req.params.id

    delete posts[postID]

    res.redirect("/")
  }
)
const PORT = process.env.PORT || 4000

app.listen(PORT, () => console.log(`App listening on port ${PORT}!`))
