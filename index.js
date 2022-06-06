const fs = require('fs');
const express = require('express')
const app = express()
const port = +process.argv[2] || 3000

const client = require('redis').createClient()
client.on('error', (err) => console.log('Redis Client Error', err));

client.on('ready', () => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Example app listening at http://0.0.0.0:${port}`)
    })
})

const cardsData = fs.readFileSync('./cards.json');
const cards = JSON.parse(cardsData);
const defaultCard = { id: "ALL CARDS" };

async function getNextCardIndex(key) {
    const result = await client.zRange(key, -1, -1);
    const [lastSeenCardIndex] = result;

    if (!lastSeenCardIndex) {
        return 0
    }

    return parseInt(lastSeenCardIndex) + 1;
}

async function getNextCard(key) {
    let result, nextIndex;
    do {
        nextIndex = await getNextCardIndex(key);
        if (nextIndex === cards.length) {
            return defaultCard;
        }
        result = await client.ZADD(key, { score: nextIndex, value: nextIndex.toString()}, 'NX');
    } while (!result);

    return cards[nextIndex];
}

app.get('/card_add', async (req, res) => {
    const  key = 'user_id:' + req.query.id
    res.send(await getNextCard(key));
})

app.get('/ready', async (req, res) => {
    res.send({ready: true})
})

client.connect();