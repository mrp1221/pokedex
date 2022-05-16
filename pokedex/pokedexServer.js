let http = require("http")
let http2 = require("https")
let path = require("path")
let express = require("express")
let readline = require("readline")
let bodyParser = require("body-parser")
let axios = require("axios")

const fetch = require("node-fetch")

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

require("dotenv").config({ path: path.resolve(__dirname, "../credentials/.env") })

const username = process.env.MONGO_DB_USERNAME
const password = process.env.MONGO_DB_PASSWORD
const databaseAndCollection = {db: "pokedex", collection: "users"}
const {MongoClient, ServerApiVersion} = require("mongodb")
const { https } = require("follow-redirects")

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
app.use(express.static(path.join(__dirname, 'templates')));
app.use(bodyParser.urlencoded({extended:false}))


app.get("/", function(request, response) {
    response.render("index")
})

app.get("/register", function(request, response) {
    let arg = { title: "Register", path: `https://limitless-gorge-32733.herokuapp.com/confirmRegister` }
    // let arg= {title: "Register", path: `http://localhost:5000/confirmRegister`}
    response.render("register", arg)
})

app.post("/confirmRegister", function(request, response) {
    let {name, password, favorites} = request.body
    let style = "style: \"border: 1px solid black\""
    var favs = ""
    let user = {
        name: name,
        password: password,
        favs: favorites.replace(/\s/g,'').split(',')
    }
    favorites.replace(/\s/g,'').split(',').forEach((fav) => {
        favs += `<li ${style}><a href="/pokemon/${fav}">${fav}</a></li>`
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
    let arg = { path: `https://limitless-gorge-32733.herokuapp.com/queryResults` }
    // let arg = {path: `http://localhost:5000/queryResults`}
    response.render("lookup", arg)
})

app.post("/queryResults", async function(request, response) {
    let {query} = request.body
    var result = null
    var args = null
    var list = ""
    try {
        if (await findUser(query) === null) {
            response.render("lookup", {path: "http://localhost:5000/queryResults"})
        } else {
            result = await findUser(query)
            // console.log(`NAME = ${result.name}`)
            result.favs.forEach((fav) => {
                list += `<li><a href="/pokemon/${fav}">${fav}</a></li>`
            })
            args = {
                name: result.name,
                password: "that's illegal",
                favs: list
            }
            // console.log(args)
            response.render("confirmRegister", args)
        }
    } catch (e) {
        console.error(e)
    } finally {}
})

app.get("/updateInfo", function(request, response) {
    let arg = { title: "Update Info", path: `https://limitless-gorge-32733.herokuapp.com/confirmUpdate` }
    // let arg = {title: "Update Info", path: `http://localhost:5000/confirmUpdate`}
    response.render("register", arg)
})

app.post("/confirmUpdate", async function(request, response) {
    let {name, password, favorites} = request.body
    try {
        if (await findUser(name) === null || await loginUser(name, password) === null) {
            response.render("register", {title:"Update Info", path: "http://localhost:5000/confirmUpdate"})
        } else {
            await updateInfo(name, password, favorites.replace(/\s/g,'').split(','))
            let user = await findUser(name)
            let newFavs = ""
            user.favs.forEach((fav) => {
                newFavs += `<li><a href=/pokemon/${fav}>${fav}</a></li>`
            })
            let args = {
                name: user.name,
                password: user.password,
                favs: newFavs
            }
            response.render("confirmRegister", args)
        }
    } catch(e) {
        console.error(e)
        /* need to reroute user to register page instead */
    } finally {}
})

app.get("/clear", function(request, response) {
    let arg = { path: `https://limitless-gorge-32733.herokuapp.com/completeClear` }
    // let arg = {path: `http://localhost:5000/completeClear`}
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

app.get("/pokemon/:guy", async function(request, response) {
    try {
        const guy = request.params.guy
        let url = `https://pokeapi.co/api/v2/pokemon/${guy}`
        var result;
        // await axios.get(url).then(res => result = res.data).catch(error => {
        //     console.error(error)
        // })

        result = await query(url)
        console.log(result)

        let name = request.params.guy
        var types = []
        result.types.forEach((type) => {
            types.push(type.type.name)
        })
        var stats = ""
        result.stats.forEach((stat) => {
            stats += `<li>${stat.stat.name} (${stat.base_stat} base)</li>`
        })
        var abilities = ""
        result.abilities.forEach((ability) => {
            abilities += `<li>${ability.ability.name}</li>`
        })
        let args = {
            guy: name,
            types: types,
            stats: stats,
            abilities: abilities
        }
        response.render("lilGuy", args)
    } catch (e) {
        console.error(e)
    }
})

async function query(url) {
    try {
        var result
        await fetch(url).then(res => res.json()).then(json => {result = json}).catch(err => {console.error(`ERROR: ${err}`)})
        return result
    } catch (e) {
        console.error(e)
    }
}

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
        // console.log(result)
        // console.log(typeof result.favs)
        return result
    }
}

async function loginUser(username, password) {
    var result = null
    try {
        await client.connect()
        let filter = { name: query, password: password }
        result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).findOne(filter)
    } catch (e) {
        console.error(e)
    } finally {
        await client.close()
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
        // console.log(result)
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

let port = parseInt(process.argv[2])
let port = process.env.PORT;
if (port == null || port == "") {
    port = 8000;
}
app.listen(port);

// let port = 5000
// http.createServer(app).listen(port)
//
// console.log("The server is running at http://localhost:5000/")

cmdLine()

