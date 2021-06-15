const fs = require('fs')
const chalk = require('chalk')
const Web3 = require('web3')
const contractABI = require('./contractABI.json')
const config = getConfig()
const web3 = new Web3(new Web3.providers.HttpProvider(config.rpcUrl))
const wallet = getAccount()
const schedule = require('node-schedule')
function getAccount(){
    if(!fs.existsSync('botWallet.json')){
        account = web3.eth.accounts.create()
        console.log(`${chalk.bgBlue.bold(" Info ")} ${chalk.bold("Generated wallet")} ${account.address}`)
        data = JSON.stringify({address: account.address, privateKey: account.privateKey}, null , 3)
        fs.writeFile('botWallet.json', data, 'utf8', function(err){
            if(err){
                console.log(`${chalk.bgRed.bold(" Error ")} ${chalk.red.bold.underline("Erorr saving generated wallet:" + err)}`)
                throw new Error('Could not save wallet private key')
            }
            else{
                console.log(`${chalk.bgBlue.bold(" Info ")} Saved private key to botWallet.json`)
            }
        })
        
    }
    else{
        fileJson = JSON.parse(fs.readFileSync('botWallet.json'))
        account = web3.eth.accounts.privateKeyToAccount(fileJson.privateKey)
    }
    console.log(`${chalk.bgBlue.bold(" Info ")} ${chalk.bold("using wallet ") + account.address}`)
    bal = web3.eth.getBalance(account.address).then(function(bal){
        if(bal==0){
            console.log(`${chalk.bgYellow.red.bold(" WARN ")} ${chalk.bold("balance of bot is 0!")} Please send a small amount of matic to the bot address`)
        }
    })
    return account

}

function getConfig(){
    if(!fs.existsSync('config.json')){
        data = JSON.stringify({
            "farms": [
                "your farm contract here",
                "you can delete these or add more"
            ],
            "schedule": "0 0 * * *",
            "rpcUrl": "https://rpc-mainnet.maticvigil.com/",
            "gasPrice": 1,
            "gasLimit": 1000000
        }, null, 3)
        console.log(`${chalk.bgBlue.bold(" Info ")} creating config file`)
        fs.writeFileSync('config.json', data, 'utf8')
        process.exit()
    }
    else{
        cfg = require('./config.json')
        if(cfg.farms[0] == "your farm contract here"){
            console.log(`${chalk.bgRed.bold(" Error ")} ${chalk.red.bold.underline("Fill out the config file!")}`)
            process.exit()
        }
        return cfg
    }
}

async function compound(contractAddress){
    contract = new web3.eth.Contract(contractABI, contractAddress)
    tx = {
        to: contractAddress,
        data: contract.methods.compound().encodeABI(),
        gasPrice: web3.utils.toWei(config.gasPrice.toString(), 'gwei'),
        gas: config.gasLimit
    }
    signed = await web3.eth.accounts.signTransaction(tx, wallet.privateKey)
    try{
        console.log(`${chalk.bgBlue.bold(" Info ")} ${chalk.bold("Sending Transaction")} Hash: ${signed.transactionHash}`)
        receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction)
        console.log(`${chalk.bgGreen.bold(" Transaction confirmed ")} ${chalk.bold("Compounded farm")} ${contractAddress} ${chalk.bold("at tx")} ${receipt.blockHash}`)
    }
    catch(error){
        console.log(`${chalk.bgRed.bold(" Error ")} ${chalk.red.bold.underline(error.message)}`)
    }
   
}
function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function compoundAll(){
    for(i in config.farms){
        await compound(config.farms[i])
        await sleep(5000)
    }
}
const job = schedule.scheduleJob(config.schedule, function(){
    console.log(`${chalk.bgBlue.bold(" Info ")} ${chalk.bold("Compounding now!")}`)
    compoundAll()
})
