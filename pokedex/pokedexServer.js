let http = require("http")
let path = require("path")
let express = require("express")
let readline = require("readline")
let bodyParser = require("body-parser")


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

require("dotenv").config({ path: path.resolve(__dirname, "credentials/.env") })

const username = process.env.MONGO_DB_USERNAME
const password = process.env.MONGO_DB_PASSWORD
const databaseAndCollection = {db: "pokedex", collection: "users"}
const {MongoClient, ServerApiVersion} = require("mongodb")

const uri = `mongodb+srv://${username}:${password}@cluster0.txqvu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function cmdLine() {
    rl.question("Type \'stop\' to shut down the server ", function(answer) {
        if (answer === "stop") {
            console.log("Goodbye <3")
            process.exit(0)
        } else {
            cmdLine()
        }
    })
}

let app = express()

app.set("views", path.resolve(__dirname, "templates"))
app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({extended:false}))


app.get("/", function(request, response) {
    response.render("index")
})

app.get("/register", function(request, response) {
    let arg = { title: "Register", path: `http://localhost:${port}/confirmRegister` }
    response.render("register", arg)
})

app.post("/confirmRegister", function(request, response) {
    let {name, password, favorites} = request.body
    let style = "style: \"border: 1px solid black\""
    var favs = ""
    let user = {
        name: name,
        password: password,
        favs: favorites.split(',')
    }
    favorites.split(',').forEach((fav) => {
        favs += `<li ${style}><a href="/">${fav}</a></li>`
    })
    let args = {
        name: user.name,
        password: user.password,
        favs: favs
    }
    try {
        insertUser(user)
    } catch (e) {
        console.error(e)
    } finally {}
    response.render("confirmRegister", args)
})

app.get("/lookup", function(request, response) {
    let arg = { path: `http://localhost:${port}/queryResults` }
    response.render("lookup", arg)
})

app.post("/queryResults", async function(request, response) {
    let {query} = request.body
    var result = null
    var args = null
    var list = ""
    try {
        result = await findUser(query)
        console.log(`NAME = ${result.name}`)
        result.favs.forEach((fav) => {
            list += `<li><a href="#">${fav}</a></li>`
        })
        args = {
            name: result.name,
            password: result.password,
            favs: list
        }
        console.log(args)
        response.render("confirmRegister", args)
    } catch (e) {
        console.error(e)
    } finally {}
    
    
})

app.get("/updateInfo", function(request, response) {
    let arg = { title: "Update Info", path: `http://localhost:${port}/confirmUpdate` }
    response.render("register", arg)
})

app.post("/confirmUpdate", async function(request, response) {
    let {name, password, favorites} = request.body
    try {
        await updateInfo(name, password, favorites.split(','))
    } catch(e) {
        console.error(e)
    } finally {}
    response.render("confirmRegister", (await findUser(name)))
})

app.get("/clear", function(request, response) {
    let arg = { path: `http://localhost:${port}/completeClear` }
    response.render("clear", arg)
})

app.post("/completeClear", async function(request, response) {
    try {
        await clearDB()
    } catch (e) {
        console.error(e)
    } finally {
        response.render("index")
    }
})

async function insertUser(user) {
    try {
        await client.connect()
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(user)
    } catch (e) {
        console.error(e)
    } finally {
        await client.close()
    }
}

async function findUser(query) {
    var result = null
    try {
        await client.connect()
        let filter = { name: query }
        result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).findOne(filter)
    } catch (e) {
        console.error(e)
    } finally {
        await client.close()
        console.log(result)
        console.log(typeof result.favs)
        return result
    }
}

async function updateInfo(username, password, newFavs) {
    var result = null
    try {
        await client.connect()
        let filter = {name: username, password: password}
        let update = {$set: {favs: newFavs}}
        result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).updateOne(filter, update)
    } catch (e) {
        console.error(e)
    } finally {
        await client.close()
        console.log(result)
        return result
    }
}

async function clearDB() {
    try {
        await client.connect()
        await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).deleteMany({})
    } catch (e) {
        console.error(e)
    } finally { }
}

// let port = parseInt(process.argv[2])
let port = 5000
http.createServer(app).listen(port)

console.log(`Server started at port ${port}`)
cmdLine()

