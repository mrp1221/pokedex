let readline = require("readline")
let fs = require("fs")

var food = []

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

function call() {
    rl.question("Type itemsList or stop to shut down the server: ", function(answer) {
        response(answer)
    })
}

function response(answer) {
    if (answer === "stop") {
        console.log("Shutting down the server")
        process.exit(0)
    } else if (answer === "itemsList") {
        console.log(data.itemsList())
        response("")
    } else {
        if (answer !== "") {
            console.log(`Invalid command: ${answer}`)
        }
        call()
    }
}

class Data {
    #food;
    #jsonStr;
    #items;
    constructor(jsonStr) {
        this.#jsonStr = JSON.parse(jsonStr)
        this.#items = this.#jsonStr.itemsList
    }

    itemsList() {
        return this.#items
    }

    priceOf(query) {
        let answ = -1
        this.#items.forEach((item) => {
            if (item.name === query && answ === -1) {
                answ = item.cost.toFixed(2)
            }
        })
        return answ
    }
}

class Food {
    constructor(name, price) {
        this.name = name
        this.price = price
    }
    getName() {
        return this.name
    }
    getPrice() {
        return this.price.toFixed(2)
    }
}

if (process.argv.length !== 3) {
    console.log("Usage supermarketServer.js jsonFile")
    process.exit(0)
}

let file = process.argv[2]
let data = new Data(fs.readFileSync(file, "utf-8"))

data.itemsList().forEach((item) => { food.push(new Food(item.name, item.cost)) })

console.log("Web server started and running http://localhost:5000")

module.exports = { call, data, food }