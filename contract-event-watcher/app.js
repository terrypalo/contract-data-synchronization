/**
 * @Author Terry Palomares
 *
 * Synchronizes data for AWS DynamoDB with contract events
 * by using web3 to look at past completed block events
*/

const Web3 = require('web3');
const AWS = require('aws-sdk');
const fs = require('fs')

// Set up Web3 and contract connection
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545/'));
const abi = [{"constant":true,"inputs":[],"name":"getAdopters","outputs":[{"name":"","type":"address[16]"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"adopters","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"petId","type":"uint256"}],"name":"adopt","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"anonymous":false,"inputs":[{"indexed":false,"name":"petId","type":"uint256"},{"indexed":false,"name":"owner","type":"address"}],"name":"Adopted","type":"event"}]
const contract = new web3.eth.Contract(abi, '0x345ca3e014aaf5dca488057592ee47305d9b3e10');

// Set up AWS DDB 
AWS.config.update({region: 'us-west-2'});
const docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2018-02-08'});

let lastBlockNumber = parseInt(fs.readFileSync('LastBlock.txt', 'utf8'));;

startWatching()

/**
 * startWatching() is the top level function to begin
 * the contract event watching
 */
async function startWatching() {
	let watching = true;

	while (watching) {
		await watchEvents();
		wait(5000);
	}
}

/**
 * watchEvents() Provides top level logic to decide whether or 
 * not to update lastBlockNumber depending on the currentBlockNumber
 */
async function watchEvents() {
	let currBlockNumber = await getCurrBlockNumber();
	let latestCompleteBlock = currBlockNumber - 1;

	if (lastBlockNumber < latestCompleteBlock) {
		console.log("Getting events from: " + lastBlockNumber + " to " + latestCompleteBlock);

		let events = await checkBetweenBlocks(lastBlockNumber, latestCompleteBlock);
		lastBlockNumber = currBlockNumber;
		updateDDBFromEvents(events);

	} else {
		console.log("No new blocks.")
	}
}

/**
 * updateDDBFromEvents() wil update DDB given event objects
 *
 * @param events {Array of Objects} Events to sync ddb with
 */
function updateDDBFromEvents(events) {
	let counter = 0;
	let petShopTable = 'pet-shop'

	for (let i=0; i<events.length; i++) {
		let eventObj = events[i];

		let params = {
		  TableName: petShopTable,
		  Key: {
		    'id': parseInt(eventObj.returnValues.petId),
		  },
		  UpdateExpression: 'set ownerAddress = :o',
		  ExpressionAttributeValues: {
		    ':o' : eventObj.returnValues.owner.toString()
		  }
		};

		docClient.update(params, function(err, data) {
		  if (err) {
		    console.log("Error", err);
		  }
		});

		counter++;
	}

	console.log("Made " + counter + " update(s) from " + events.length + " event(s)");
}

/**
 * getCurrBlockNumber() uses web3 to fetch the latest 
 * block number
 *
 * @return {Int} Current Ethereum block number
 */
function getCurrBlockNumber() {
	let currBlockNumber = web3.eth.getBlockNumber(function(error, result) {
		return result;
	});

	return currBlockNumber;
}

/**
 * checkBetweenBlocks() looks for events between two blocks and
 * returns them
 *
 * @param fromBlock {Int} Beginning block 
 * @param toBlock {Int} End block 
 * @return {Array of Objects} All found events 
 */
function checkBetweenBlocks(fromBlock, toBlock) {
	fs.writeFile('LastBlock.txt', fromBlock, (err) => {
	  if (err) throw err;
	});

	let events = contract.getPastEvents('Adopted', {
			fromBlock: fromBlock,
			toBlock: toBlock
			}, function (error, events) {
				console.log("Checked between blocks");
				return events;
			});

	return events;
}
	
/**
 * wait() will consecutively wait corresponding time given
 * rather than putting the code to sleep
 *
 * @param ms {Int} Amount of ms to wait
 */
function wait(ms){
  	var start = new Date().getTime();
   	var end = start;

   	while(end < start + ms) {
    	end = new Date().getTime();
  	}
}
