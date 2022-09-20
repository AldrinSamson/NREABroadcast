const cron = require("node-cron");
const express = require("express");
const fs = require("fs");

app = express();

'use-strict'

//for env file
const dotenv = require('dotenv');
dotenv.config();

//for Viber Bot App
const ViberBot  = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;
const TextMessage = require('viber-bot').Message.Text;
const PictureMessage = require('viber-bot').Message.Picture;
//const ContactMessage = require('viber-bot').Message.Contact;
const RichMediaMessage = require('viber-bot').Message.RichMedia;
const KeyboardMessage = require('viber-bot').Message.Keyboard;
const winston = require('winston');
const toYAML = require('winston-console-formatter');
var request = require('request');

//For Airtable
const airtable = require('airtable');
const base = new airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(process.env.AIRTABLE_BASE);
const recommendedBase = new airtable({apiKey: process.env.RECOMMENDED_MATCHING_API_KEY}).base(process.env.RECOMMENDED_MATCHING_BASE);
const exactBase = new airtable({apiKey: process.env.RECOMMENDED_MATCHING_API_KEY}).base(process.env.EXACT_MATCHING_BASE);

//for node-fetch
//const fetch = require('node-fetch');

//For Airtable Plus
const AirTablePlus = require('airtable-plus');

const airTableUsers = new AirTablePlus({
	baseID: process.env.AIRTABLE_BASE,
	apiKey: process.env.AIRTABLE_API_KEY,
	tableName: 'Users',
});
const airTablePRC = new AirTablePlus({
	baseID: process.env.AIRTABLE_BASE,
	apiKey: process.env.AIRTABLE_API_KEY,
	tableName: 'Brokers (PRC)',
});
const airTableHLURB = new AirTablePlus({
	baseID: process.env.AIRTABLE_BASE,
	apiKey: process.env.AIRTABLE_API_KEY,
	tableName: 'Brokers (HLURB)',
});
const airTableProperties = new AirTablePlus({
	baseID: process.env.AIRTABLE_BASE,
	apiKey: process.env.AIRTABLE_API_KEY,
	tableName: 'Properties',
	// tableName: 'Imported table',
});
const airTableCredentials = new AirTablePlus({
	baseID: process.env.AIRTABLE_BASE,
	apiKey: process.env.AIRTABLE_API_KEY,
	tableName: 'Credentials',
});
const airTableInquiries = new AirTablePlus({
	baseID: process.env.AIRTABLE_BASE,
	apiKey: process.env.AIRTABLE_API_KEY,
	tableName: 'Inquiries',
});

const airTableRecommended = new AirTablePlus({
	baseID: process.env.RECOMMENDED_MATCHING_BASE,
	apiKey: process.env.RECOMMENDED_MATCHING_API_KEY,
	tableName: 'Recommended Matches'
})

const airTableExact = new AirTablePlus({
	baseID: process.env.EXACT_MATCHING_BASE,
	apiKey: process.env.RECOMMENDED_MATCHING_API_KEY,
	tableName: 'Exact Matches'
})

//for email-verifier
const validator = require("email-validator");

function createLogger() {
    const logger = new winston.Logger({
        level: "debug" // We recommend using the debug level for development
    });

    //logger.add(winston.transports.Console, toYAML.config());
    return logger;
}

const logger = createLogger();

// Creating the bot with access token, name and avatar
const bot = new ViberBot(logger, {
    authToken: process.env.AUTH_TOKEN, // <--- Paste your token here
    name: "NREA Bot",  // <--- Your bot name here
    // name: "Adrian Bot",  // <--- Your bot name here
   	avatar: process.env.AVATAR // It is recommended to be 720x720, and no more than 100kb.
});

////////////////
// Variables ///
////////////////

// let broadcastPayload = [];
var broadcastPayload = [];
// let prcPayload = [];
var prcPayload = [];
var brokerPayload = [];
// let clientPayload = [];
var clientPayload = [];
var exactMatchesArray = [];
var recommendedMatchesArray = [];
var contactInfo = '';
var count = 0;
var isInquiryDone = false;
var isPropertyDone = false;
var brokerInquiryPayload = [];
var clientInquiryPayload = [];
var messageCounter = 0;
var isExactMatchingDone = false;
var isRecommendedMatchingDone = false;
var subscribedList = [];

const cancelKb = {
	"Type": "keyboard",
	"InputFieldState": "hidden",
	"Buttons": [{
		"Text": "<b><font color=\"#000000\">GO BACK TO MENU</font></b>",
		"ActionType": "reply",
		"ActionBody": "CANCEL2",
		"BgColor": "#FFAA88",
		"TextOpacity": 100,
		"Rows": 1,
		"Columns": 6
	}]
};
var matchesMessageArray = [];

function sleep (ms){
	return new Promise(resolve => setTimeout(resolve,ms));
}


async function broadcast(){
		try {
			// Get all validated = 1 and Broadcasted = 1

			broadcastPayload = [];
			prcPayload = [];
			brokerPayload = [];
			clientPayload = [];
			exactMatchesArray = [];
			recommendedMatchesArray = [];
			contactInfo = '';
			count = 0;
			isInquiryDone = false;
			isPropertyDone = false;
			brokerInquiryPayload = [];
			clientInquiryPayload = [];
			messageCounter = 0;

			const query = await airTableProperties.read({
				filterByFormula: `AND({Validated} = "1", {Broadcasted} = "0")`
			});
			
			broadcastPayload = query;

			//console.log(broadcastPayload);
			/*
			const query4 = await airTableHLURB.read({
				filterByFormula: `{Validated} = "Yes"`
			});

			hlurbPayload[message.trackingData.userid] = query4;

			const query3 = await airTablePRC.read();

			prcPayload[message.trackingData.userid] = query3;
			
			*/

			const query2 = await airTableUsers.read({
				filterByFormula: `{Validated} = "Yes"`
				//filterByFormula: `{Viber ID} = "GkG7dGxfDqsFsisDpMG+8g=="`
				//filterByFormula: `AND({Validated} = "Yes", {Viber ID} = "GkG7dGxfDqsFsisDpMG+8g==")`
			})
			prcPayload = query2;
			// console.log(`prcPayload: ${JSON.stringify(prcPayload)}`)
			// [prcPayload[1], prcPayload[6]] = [prcPayload[6], prcPayload[1]];
			// await sleep(500)

			if(query.length == 0){
				isPropertyDone = true;
				getInquiries();
			}

			getBroadcast();
		} catch (e) {
		    
			console.error(e);
			fs.appendFile('airtable.txt', e + "\n", function (err) {
        		if (err) throw err;
        		console.log('Error');
        	  });
			
		}
		
}

async function getInquiries() {
	// await sleep(2000)
	console.log("pumasok sa getInquiries")
	try {
		const query = await airTableInquiries.read({
			filterByFormula: `AND({Validated} = "1", {Broadcasted} = "0")`
		});

		brokerInquiryPayload = [];
		clientInquiryPayload = [];
		// isInquiryDone = true;

		let richView = {
		"ButtonsGroupColumns": 6,
		"ButtonsGroupRows": 7,
		"BgColor": "#FFFFFF",
		"Buttons": []
		};

		let richView2 = {
			"ButtonsGroupColumns": 6,
			"ButtonsGroupRows": 7,
			"BgColor": "#FFFFFF",
			"Buttons": []
		};


		cmp = function(x,y){
			return x > y ? 1 :x < y ? -1 : 0;
			// return x > y ? -1 :x < y ? 1 : 0;
		};
		
		query.sort( function(a,b){
			return cmp(
				[cmp(a.fields["Region Code"], b.fields["Region Code"]), cmp(a.fields["City/Town"], b.fields["City/Town"]), cmp(a.fields["Property Purpose"], b.fields["Property Purpose"]), cmp(a.fields["Property Type"], b.fields["Property Type"]) ],
				[cmp(b.fields["Region Code"], a.fields["Region Code"]), cmp(b.fields["City/Town"], a.fields["City/Town"]), cmp(b.fields["Property Purpose"], a.fields["Property Purpose"]), cmp(b.fields["Property Type"], a.fields["Property Type"]) ]
			);
		});


		if(query.length != 0){
			// brokerPayload.push(new TextMessage("Hi! These are new requirements that have been listed today!"));
			// clientPayload.push(new TextMessage("Hi! These are new requirements that have been listed today!"));

			for (var i = 0; i < query.length; i++) {
				var inquiriesArray = []
				var propertyPurpose = JSON.stringify(query[i].fields["Property Purpose"]).replace(/"/g,"")
				if (propertyPurpose == 'To Buy') {
					propertyPurpose = "WTB"
				} else {
					propertyPurpose = "WTL"
				}
				// console.log(`query: ${JSON.stringify(query[i])}`)
				var propertyType = JSON.stringify(query[i].fields["Property Type"]).replace(/"/g,"")
				var location = JSON.stringify(query[i].fields["Location"]).replace(/"/g,"")
				var locationName = "NONE"
				if(JSON.stringify(query[i].fields["Location Name"])){
					locationName =  JSON.stringify(query[i].fields["Location Name"]).replace(/"/g,"")
				}
				// var locationName = JSON.stringify(query[i].fields["Location Name"]).replace(/"/g,"")
				var finalLocation 
				if (locationName.toUpperCase() == "NONE") {
					finalLocation = `${propertyType}`
				} else {
					finalLocation = `${propertyType} - ${locationName}`
				}
				var numOfRooms = ""
				var city = JSON.stringify(query[i].fields["City/Town"]).replace(/"/g,"")
				var region = JSON.stringify(query[i].fields["Region/State"]).replace(/"/g,"")
				var baranggay = JSON.stringify(query[i].fields["Baranggay"]).replace(/"/g,"")
				var minFloorArea = null
				var maxFloorArea = null
				var minLotArea = null
				var maxLotArea = null
				var minBudget = null
				var maxBudget = null
				var groupType = JSON.stringify(query[i].fields["Group Type"]).replace(/"/g,"")
				var furnishing = "N/A"
				var parking = ""
				var text = "N/A"
				var inquiryText
				var address
				var areaString

				const query1 = await airTablePRC.read({
					filterByFormula: `{Viber ID} = "${query[i].fields["Viber ID"]}"`
				});

				if(query1.length != 0){
					text = query1[0].fields["Profile Summary"]
				} else {
					const query2 = await airTableHLURB.read({
						filterByFormula: `{Viber ID} = "${query[i].fields["Viber ID"]}"`
					});
					if(query2.length != 0){
						text = query2[0].fields["Profile Summary"]
					}
				}


				try {
					if (JSON.stringify(query[i].fields["Furnishing"])) {
						furnishing = JSON.stringify(query[i].fields["Furnishing"]).replace(/"/g,"")
					}
					if (JSON.stringify(query[i].fields["Parking Slots"])) {
						parking = JSON.stringify(query[i].fields["Parking Slots"]).replace(/"/g,"")
					}
					if (JSON.stringify(query[i].fields["Number of Rooms"])) {
						numOfRooms = JSON.stringify(query[i].fields["Number of Rooms"]).replace(/"/g,"")
					}
					if (JSON.stringify(query[i].fields["Floor Area Min"])) {
						if (JSON.stringify(query[i].fields["Floor Area Min"]).replace(/"/g,"") && JSON.stringify(query[i].fields["Floor Area Min"]).replace(/"/g,"")!= "None") {
							minFloorArea = JSON.stringify(query[i].fields["Floor Area Min"]).replace(/"/g,"")	
						}
					}
					if (JSON.stringify(query[i].fields["Floor Area Max"])) {
						if (JSON.stringify(query[i].fields["Floor Area Max"]).replace(/"/g,"") && JSON.stringify(query[i].fields["Floor Area Max"]).replace(/"/g,"")!= "None") {
							maxFloorArea = JSON.stringify(query[i].fields["Floor Area Max"]).replace(/"/g,"")	
						}
					}
					if (JSON.stringify(query[i].fields["Lot Area Min"])) {
						if (JSON.stringify(query[i].fields["Lot Area Min"]).replace(/"/g,"") && JSON.stringify(query[i].fields["Lot Area Min"]).replace(/"/g,"")!= "None") {
							minLotArea = JSON.stringify(query[i].fields["Lot Area Min"]).replace(/"/g,"")	
						}
					}
					if (JSON.stringify(query[i].fields["Lot Area Max"])) {
						if (JSON.stringify(query[i].fields["Lot Area Max"]).replace(/"/g,"") && JSON.stringify(query[i].fields["Lot Area Max"]).replace(/"/g,"")!= "None") {
							maxLotArea = JSON.stringify(query[i].fields["Lot Area Max"]).replace(/"/g,"")	
						}
					}
					if (JSON.stringify(query[i].fields["Minimum Budget"]).replace(/"/g,"") && JSON.stringify(query[i].fields["Minimum Budget"]).replace(/"/g,"")!= "None"){
						var minNumber = parseInt(JSON.stringify(query[i].fields["Minimum Budget"]).replace(/"/g,""))
						minBudget = abbreviateNumber(minNumber)
					}
					if (JSON.stringify(query[i].fields["Maximum Budget"]).replace(/"/g,"") && JSON.stringify(query[i].fields["Maximum Budget"]).replace(/"/g,"")!= "None"){
						var maxNumber = parseInt(JSON.stringify(query[i].fields["Maximum Budget"]).replace(/"/g,""))
						maxBudget = abbreviateNumber(maxNumber)
					}
				} catch (e) {
					console.log("Missing parameters " + e)
				}

				if (minFloorArea == null && maxFloorArea) {
					var floorArea = maxFloorArea + "sqm max FA"
				} else if (minFloorArea && maxFloorArea == null){
					var floorArea = minFloorArea + "sqm min FA"
				} else if (minFloorArea == null && maxFloorArea == null) {
					var floorArea = ""
				} else {
					var floorArea = minFloorArea + "sqm-" + maxFloorArea + "sqm FA"
				}
				if (minLotArea == null && maxLotArea) {
					var lotArea = maxLotArea + "sqm max LA"
				} else if (minLotArea && maxLotArea == null){
					var lotArea = minLotArea + "sqm min LA"
				} else if (minLotArea == null && maxLotArea == null) {
					var lotArea = ""
				} else {
					var lotArea = minLotArea + "sqm-" + maxLotArea + "sqm LA"
				}
				if (floorArea == "") {
					areaString = `${lotArea}` 
				} else if (floorArea && lotArea == "") {
					areaString = `${floorArea}`
				} else {
					areaString = `${floorArea}<br>${lotArea}`
				}
				if (!minBudget && maxBudget) {
					var budget = maxBudget + " max budget"
				} else if (minBudget && !maxBudget){
					var budget = minBudget + " min budget"
				} else if (minBudget != null && maxBudget != null){
					var budget = minBudget + "-" + maxBudget + " budget"
				} else {
					var budget = ""
				}
				if(baranggay.toUpperCase() == "UNKNOWN" || baranggay.toUpperCase() == "ANY" || baranggay.toUpperCase() == "ALL" || baranggay.toUpperCase() == "All"){
					address = `${region} - ${city}`
				} else {
					address = `${region} - ${city} - ${baranggay}`
				}

				inquiriesArray = [{"Transaction": propertyPurpose, "Property Type": propertyType, "Location": location, "Location Name": locationName, "Number of Rooms": numOfRooms, "Furnishing": furnishing, "Floor Area": floorArea, "Lot Area": lotArea, "Parking Area": parking, "Budget": budget, "Contact Information": text}]
				if(furnishing == "N/A") {
					inquiryText = `${propertyPurpose} - ${address}<br>${finalLocation}<br>${areaString}<br>${budget}`	
				} else {
					inquiryText = `${propertyPurpose} - ${address}<br>${finalLocation}<br>${areaString}<br>${furnishing}<br>${budget}`	
				}
				clientInquiriesArray = [{"Transaction": propertyPurpose, "Property Type": propertyType, "Location": location, "Location Name": locationName, "Number of Rooms": numOfRooms, "Furnishing": furnishing, "Floor Area": floorArea, "Lot Area": lotArea, "Parking Area": parking, "Budget": budget, "Contact Information": "Reach out to an NREA Broker for more details."}]
				if(furnishing == "N/A") {
					inquiryText = `${propertyPurpose} - ${address}<br>${finalLocation}<br>${areaString}<br>${budget}`	
				} else {
					inquiryText = `${propertyPurpose} - ${address}<br>${finalLocation}<br>${areaString}<br>${furnishing}<br>${budget}`	
				}
				

				textUri = `proptechph.com/display.html?payload=` + encodeURIComponent(JSON.stringify(inquiriesArray));
				clientTextUri = `proptechph.com/display.html?payload=` + encodeURIComponent(JSON.stringify(clientInquiriesArray));
				attach9 = {
						"ActionBody": textUri,
						"Text": inquiryText,
						"ActionType": "open-url",
						"OpenURLType": "internal",
						"Silent": "true",
						//"TextShouldFit": "true",
						"TextSize" : "small",
						"TextHAlign": "left",
						"TextVAlign": "top",
						"Rows": 5,
						"Columns": 6
				}

				clientattach9 = {
					"ActionBody": clientTextUri,
					"Text": inquiryText,
					"ActionType": "open-url",
					"OpenURLType": "internal",
					"Silent": "true",
					//"TextShouldFit": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"TextVAlign": "top",
					"Rows": 5,
					"Columns": 6
				}
				richView.Buttons.push(attach9);
				richView2.Buttons.push(clientattach9);

				attach10 = {
				"ActionBody": "none",
				"Text": text.replace(/\n/g, "<br>"),
				"Silent": "true",
				"TextHAlign": "left",
				"TextSize" : "small",
				"BgColor": "#C1E7E3",
				"Rows": 2,
				"Columns": 6
				}

				clientattach10 = {
					"ActionBody": "none",
					"Text": "Reach out to an NREA Broker for more details.",
					"Silent": "true",
					"TextHAlign": "left",
					"TextSize" : "small",
					"BgColor": "#C1E7E3",
					"Rows": 2,
					"Columns": 6
					}
				//console.log(text)
				richView.Buttons.push(attach10);
				richView2.Buttons.push(clientattach10);

				if(i>0 && (i+1)%4 == 0){
					// brokerPayload.push(new RichMediaMessage(richView));
					// clientPayload.push(new RichMediaMessage(richView2));
					brokerInquiryPayload.push(new RichMediaMessage(richView));
					clientInquiryPayload.push(new RichMediaMessage(richView2));

					richView = {
						"ButtonsGroupColumns": 6,
						"ButtonsGroupRows": 7,
						"BgColor": "#FFFFFF",
						"Buttons": []
					};

					richView2 = {
						"ButtonsGroupColumns": 6,
						"ButtonsGroupRows": 7,
						"BgColor": "#FFFFFF",
						"Buttons": []
					};		
				}
				const updateRes = await airTableInquiries.updateWhere(`{Record ID} = "${query[i].fields['Record ID']}"`, {
					Broadcasted: "1"
				});
				// await sleep(250);		
			}
			// brokerPayload.push(new RichMediaMessage(richView));
			// clientPayload.push(new RichMediaMessage(richView2));
			// brokerPayload.push(new TextMessage("End of listings"));
			// clientPayload.push(new TextMessage("End of listings"));
			brokerInquiryPayload.push(new RichMediaMessage(richView));
			clientInquiryPayload.push(new RichMediaMessage(richView2));
			// brokerPayload.push(new TextMessage("End of listings"));
			// clientPayload.push(new TextMessage("End of listings"));
			// console.log("natapos sa inquiries");
			sendBroadcast();
		}
	} catch(e){
		console.log(`error: ${e}`)
	}
}

async function getBroadcast(){
	
	
	//console.log(broadcastPayload)
	    let num = 0;
		let action = [];
		cmp = function(x,y){
			return x > y ? 1 :x < y ? -1 : 0;
			// return x < y ? 1 :x > y ? -1 : 0;
		};
		
		broadcastPayload.sort( function(a,b){
			return cmp(
				[cmp(a.fields["Region Code"], b.fields["Region Code"]), cmp(a.fields["City/Town"], b.fields["City/Town"]), cmp(a.fields["Property Purpose"], b.fields["Property Purpose"]), cmp(a.fields["Property Type"], b.fields["Property Type"]) ],
				[cmp(b.fields["Region Code"], a.fields["Region Code"]), cmp(b.fields["City/Town"], a.fields["City/Town"]), cmp(b.fields["Property Purpose"], a.fields["Property Purpose"]), cmp(b.fields["Property Type"], a.fields["Property Type"]) ]
			);
		});
	    
    	for(var payload of broadcastPayload){
    		action[num] = {
    			//"Property" : num+1,
    			//"Property ID": payload.fields["Suggested Property ID"],
    			//"Property Summary": payload.fields["Result Header"],
    			//"Name" : payload.fields.Name,
    			"Transaction" : payload.fields["Property Purpose"],
    			"Property Type" : payload.fields["Property Type"],
    			//"Location Name": payload.fields['Location Name'],
    			//"Location" : payload.fields['Location']
    		};
    		if(payload.fields["Property Type"] == "Commercial with Improvements"){
    			action[num]["Commercial Type"] = payload.fields['Commercial Type'];
    		}
    
    		action[num]["Location"] = payload.fields['Location'];
    
    
    		switch (payload.fields["Property Type"]) {
    			case "Residential Condo":
    				action[num]["Condo Name"] = payload.fields['Location Name'];
    				break;
    			case "Office Space":
    				action[num]["Building Name"] = payload.fields['Location Name'];	
    				break; 
    			case "Commercial with Improvements": 
    				action[num]["Building Name/Area"] = payload.fields['Location Name'];
    				break;
    			case "Residential House & Lot":
    				action[num]["Village/Area"] = payload.fields['Location Name'];
    				break;
    			case "Industrial with Improvements":
    				action[num]["Industrial Park/Area"] = payload.fields['Location Name'];	
    				break;
    			case "Residential Vacant Lot":
    				action[num]["Village/Area"] = payload.fields['Location Name'];
    				break;
    			case "Commercial Vacant Lot":
    				action[num]["Area"] = payload.fields['Location Name'];
    				break; 
    			case "Industrial Vacant Lot":
    				action[num]["Industrial Park/Area"] = payload.fields['Location Name'];
    				break;
    			case "Raw Land":
    				action[num]["Area"] = payload.fields['Location Name'];
    				break;
    		}
    		if(payload.fields['Number of Rooms'] && payload.fields['Number of Rooms'] !== 0){
    			action[num]["Number of Rooms"] = payload.fields['Number of Rooms'];
    		}
    
    		if(payload.fields.Furnishing){
    			action[num]["Furnishing"] = payload.fields['Furnishing'];
    		}
    		if(payload.fields['Lot Area'] && payload.fields['Lot Area'] !== 0){
    			action[num]["Lot Area"] = payload.fields['Lot Area'] + " sqm";
    		}
    		if(payload.fields['Floor Area'] && payload.fields['Floor Area'] !== 0){
    			action[num]["Floor Area"] = payload.fields['Floor Area'] + " sqm";
    		}
    		if(payload.fields['Parking Slots']){
    			action[num]["Parking Slots"] = payload.fields['Parking Slots'];
    		}
    		
    		action[num].Price = payload.fields.Price2;
    		
    		if(payload.fields['Property Detail']){
    			action[num]["Property Detail"] = payload.fields['Property Detail'];
    		}
    		//
    		action[num]["Enlisting Code"] = payload.fields['Enlisting Code'];
    		action[num]["Viber ID"] = payload.fields['Viber ID'];
    		action[num]["Sub Group"] = payload.fields['Sub Group'];
    		action[num]["Suggested"] = payload.fields['Suggested'];
    		// action[num]["Suggested"] = payload.fields['Suggested With Region'];
    		action[num]["Suggested Client"] = payload.fields['Suggested Client'];
    		action[num]["City/Town"] = payload.fields['City/Town'];
    		action[num]["Region/State"] = payload.fields['Region/State'];
    		//
    
    		action[num]["Images"] = []
    		if (payload.fields['Property Image1']) {
    			action[num]["Images"].push(payload.fields['Property Image1']);
    		}
    		if (payload.fields['Property Image2']) {
    			action[num]["Images"].push(payload.fields['Property Image2']);
    		}
    		if (payload.fields['Property Image3']) {
    			action[num]["Images"].push(payload.fields['Property Image3']);
    		}
    		if (payload.fields['Property Image4']) {
    			action[num]["Images"].push(payload.fields['Property Image4']);
    		}
    		if (payload.fields['Property Image5']) {
    			action[num]["Images"].push(payload.fields['Property Image5']);
    		}
			if (payload.fields['Commission Rate']) {
    			action[num]["Commission Rate"] = payload.fields['Commission Rate'];
    		}
			//Property ID
    		action[num]["Property ID"] = payload.fields["Suggested Property ID"];
    
    		num = num + 1;
    
    		
			try{
				const updateRes = await airTableProperties.updateWhere(`{Enlisting Code} = "${payload.fields['Enlisting Code']}"`, {
					Broadcasted: "1"
				});
				// await sleep(250);
			} catch (e){
				//console.error(e)
				fs.appendFile('airtable.txt', e + "\n", function (err) {
            		if (err) throw err;
            		console.log('Error');
            	  });
    				
			}
			
    		
    		
    	}
	//console.log(action)


	let msgArray = [];
	let msgArrayClient = [];
	let number = 0;
	let richView = {
		"ButtonsGroupColumns": 6,
		"ButtonsGroupRows": 7,
		"BgColor": "#FFFFFF",
		"Buttons": []
	};
	//let attach = {};

	let attachAdminBody = {};
	let attachAdminFooter = {};
	let attachAdminClientBody = {};
	let attachAdminClientFooter = {};

	let attachHLURBBody = {};
	let attachHLURBFooter = {};
	let attachHLURBClientBody = {};
	let attachHLURBClientFooter = {};

	let attachPRCBody = {};
	let attachPRCFooter = {};
	let attachPRCClientBody = {};
	let attachPRCClientFooter = {};

	let richView2 = {
		"ButtonsGroupColumns": 6,
		"ButtonsGroupRows": 7,
		"BgColor": "#FFFFFF",
		"Buttons": []
	};
	//let attach21 = {};


	let textUri = "";
	let counter = 0;
	let text = "";
	let arrayer = [];
	let textBroker = "";
	let textClient = ""; 
	// msgArray.push(new TextMessage("Hi! These are new properties that have been listed today!"));
	// msgArrayClient.push(new TextMessage("Hi! These are new properties that have been listed today!"));
	// console.log(action)
	
	for(var values of action){
		
		number = number + 1;
		counter = counter + 1;
		
		//For registered broker/salesperson
		/*
		attach = {
			"ActionBody": "none",
			"Text": "Property " + counter,
			"Silent": "true",
			"Rows": 1,
			"Columns": 6
		}
		richView.Buttons.push(attach);
		*/
		//For Clients
		/*
		attach21 = {
			"ActionBody": "none",
			"Text": "Property " + counter,
			"Silent": "true",
			"Rows": 1,
			"Columns": 6
		}
		richView2.Buttons.push(attach21);
		*/
		
		
		if(values["Sub Group"] == "Client" || values["Sub Group"] == "Admin"){
			//text = "Dee Chan, PRC 19147 \n09171727788; chan@gmail.com"
			try{
				console.log("pumasok sa if client")
				// const query = await airTableCredentials.read({
				// 	filterByFormula: `{ID} = "recq1P9ND0tU7pFjt"`
				// 	// filterByFormula: `{ID} = "rec23iYg4V4fGnX3C"`
				// });
				// await sleep(500)
				//text = query[0].fields["Summary"]
				// console.log("text1 " + text)
				delete values["Sub Group"]
				delete values["Viber ID"]
				textBroker = values["Suggested"]
				textClient = values["Suggested Client"]
				delete values["Suggested"]
				delete values["Suggested Client"]
				delete values["Enlisting Code"]
				delete values["Region/State"]
				delete values["City/Town"]
				delete values["Commission Rate"]
			    

				
				text = "Reach out to an NREA Broker for more details."
				values["Contact Information"] = text
								
				contactInfo = text
				arrayer = [values];
				textUri = `proptechph.com/display.html?payload=` + encodeURIComponent(JSON.stringify(arrayer));
				attachAdminBody   = {
					"ActionBody": textUri,
					"Text": textBroker.replace(/\n/g, "<br>"),
					"ActionType": "open-url",
					"OpenURLType": "internal",
					"Silent": "true",
					//"TextShouldFit": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"TextVAlign": "top",
					"Rows": 5,
					"Columns": 6
				}
				richView.Buttons.push(attachAdminBody);
				attachAdminFooter  = {
					"ActionBody": "none",
					"Text": text.replace(/\n/g, "<br>"),
					"Silent": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"BgColor": "#C1E7E3",
					"Rows": 2,
					"Columns": 6
				}
				//console.log(text)
				richView.Buttons.push(attachAdminFooter );
				//For Clients
				attachAdminClientBody  = {
					"ActionBody": textUri,
					"Text": textClient.replace(/\n/g, "<br>"),
					"ActionType": "open-url",
					"OpenURLType": "internal",
					"Silent": "true",
					//"TextShouldFit": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"TextVAlign": "top",
					"Rows": 5,
					"Columns": 6
				}
				richView2.Buttons.push(attachAdminClientBody );
				attachAdminClientFooter  = {
					"ActionBody": "none",
					"Text": "Reach out to an NREA Broker for more details.",
					"Silent": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"BgColor": "#C1E7E3",
					"Rows": 2,
					"Columns": 6
				}
				richView2.Buttons.push(attachAdminClientFooter );
			} catch(e){
				//console.error(e)
    			fs.appendFile('airtable.txt', e + "\n", function (err) {
            		if (err) throw err;
            		console.log('Error');
            	  });
    		}
		
		} else if(values["Sub Group"] == "HLURB"){			
			try{
				const query = await airTableHLURB.read({
					filterByFormula: `{Viber ID} = "${values["Viber ID"]}"`
				});
				// const query2 = await airTableCredentials.read({
				// 	filterByFormula: `{ID} = "recq1P9ND0tU7pFjt"`
				// 	// filterByFormula: `{ID} = "rec23iYg4V4fGnX3C"`
				// });
				// await sleep(500)

				if(query.length != 0){
					text = query[0].fields["Profile Summary"]
				} else {
					// text = query2[0].fields["Summary"]
					text = "Reach out to an NREA Broker for more details."
				}
				
				delete values["Sub Group"]
				delete values["Viber ID"]
				textBroker = values["Suggested"]
				textClient = values["Suggested Client"]
				delete values["Suggested"]
				delete values["Suggested Client"]
				delete values["Enlisting Code"]
				delete values["Region/State"]
				delete values["City/Town"]
				values["Contact Information"] = text
				contactInfo = text
				arrayer = [values];
				textUri = `proptechph.com/display.html?payload=` + encodeURIComponent(JSON.stringify(arrayer));
				attachHLURBBody  = {
					"ActionBody": textUri,
					"Text": textBroker.replace(/\n/g, "<br>"),
					"ActionType": "open-url",
					"OpenURLType": "internal",
					"Silent": "true",
					//"TextShouldFit": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"TextVAlign": "top",
					"Rows": 5,
					"Columns": 6
				}
				richView.Buttons.push(attachHLURBBody );
	
				attachHLURBFooter  = {
					"ActionBody": "none",
					"Text": text.replace(/\n/g, "<br>"),
					"Silent": "true",
					"TextHAlign": "left",
					"TextSize" : "small",
					"BgColor": "#C1E7E3",
					"Rows": 2,
					"Columns": 6
				}
				//console.log(text)
				richView.Buttons.push(attachHLURBFooter );
				//For Clients
				attachHLURBClientBody   = {
					"ActionBody": textUri,
					"Text": textClient.replace(/\n/g, "<br>"),
					"ActionType": "open-url",
					"OpenURLType": "internal",
					"Silent": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"TextVAlign": "top",
					//"TextShouldFit": "true",
					"Rows": 5,
					"Columns": 6
				}
				richView2.Buttons.push(attachHLURBClientBody  );
				attachHLURBClientFooter   = {
					"ActionBody": "none",
					"Text": "Reach out to an NREA Broker for more details.",
					"Silent": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"BgColor": "#C1E7E3",
					"Rows": 2,
					"Columns": 6
				}
				richView2.Buttons.push(attachHLURBClientFooter  );
			} catch(e){
				//console.error(e)
				fs.appendFile('airtable.txt', e + "\n", function (err) {
            		if (err) throw err;
            		console.log('Error');
            	  });
			}
			// Get all validated = 1 and Broadcasted = 1
			

		} else if(values["Sub Group"] == "PRC"){
			try{
				const query = await airTablePRC.read({
					filterByFormula: `{Viber ID} = "${values["Viber ID"]}"`
				});
				//console.log(query)
				//text = query[0].fields["Profile Summary"]
				// const query2 = await airTableCredentials.read({
				// 	filterByFormula: `{ID} = "recq1P9ND0tU7pFjt"`
				// 	// filterByFormula: `{ID} = "rec23iYg4V4fGnX3C"`
				// });
				// await sleep(500)

				if(query.length != 0){
					text = query[0].fields["Profile Summary"]
				} else {
					//text = query2[0].fields["Summary"]
					text = "Reach out to an NREA Broker for more details."
				}
		
				delete values["Sub Group"]
				textBroker = values["Suggested"]
				textClient = values["Suggested Client"]
				delete values["Viber ID"]
				delete values["Suggested"]
				delete values["Suggested Client"]
				delete values["Enlisting Code"]
				delete values["Region/State"]
				delete values["City/Town"]
				values["Contact Information"] = text
				contactInfo = text
				arrayer = [values];
				textUri = `proptechph.com/display.html?payload=` + encodeURIComponent(JSON.stringify(arrayer));
				attachPRCBody  = {
					"ActionBody": textUri,
					"Text": textBroker.replace(/\n/g, "<br>"),
					"ActionType": "open-url",
					"OpenURLType": "internal",
					"Silent": "true",
					//"TextShouldFit": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"TextVAlign": "top",
					"Rows": 5,
					"Columns": 6
				}
				richView.Buttons.push(attachPRCBody );					
				attachPRCFooter  = {
					"ActionBody": "none",
					"Text": text.replace(/\n/g, "<br>"),
					"Silent": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"BgColor": "#C1E7E3",
					"Rows": 2,
					"Columns": 6
				}
				//console.log(text)
				richView.Buttons.push(attachPRCFooter );
				
				//For Clients
				attachPRCClientBody  = {
					"ActionBody": textUri,
					"Text": textClient.replace(/\n/g, "<br>"),
					"ActionType": "open-url",
					"OpenURLType": "internal",
					"Silent": "true",
					//"TextShouldFit": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"TextVAlign": "top",
					"Rows": 5,
					"Columns": 6
				}
				richView2.Buttons.push(attachPRCClientBody );
				attachPRCClientFooter  = {
					"ActionBody": "none",
					"Text": "Reach out to an NREA Broker for more details.",
					"Silent": "true",
					"TextSize" : "small",
					"TextHAlign": "left",
					"BgColor": "#C1E7E3",
					"Rows": 2,
					"Columns": 6
				}
				richView2.Buttons.push(attachPRCClientFooter );
			} catch(e){
				//console.error(e)
				fs.appendFile('airtable.txt', e + "\n", function (err) {
            		if (err) throw err;
            		console.log('Error');
            	  });
			}
		}

			if(counter == action.length){
				msgArray.push(new RichMediaMessage(richView));
				msgArrayClient.push(new RichMediaMessage(richView2));
				
			} else if (number == 4) {
				msgArray.push(new RichMediaMessage(richView));
				msgArrayClient.push(new RichMediaMessage(richView2));
				richView = {
					"ButtonsGroupColumns": 6,
					"ButtonsGroupRows": 7,
					"BgColor": "#FFFFFF",
					"Buttons": []
				};
				//attach = {};
			
				attachAdminBody = {};
				attachAdminFooter = {};
				attachAdminClientBody = {};
				attachAdminClientFooter = {};

				attachHLURBBody = {};
				attachHLURBFooter = {};
				attachHLURBClientBody = {};
				attachHLURBClientFooter = {};

				attachPRCBody = {};
				attachPRCFooter = {};
				attachPRCClientBody = {};
				attachPRCClientFooter = {};
				richView2 = {
					"ButtonsGroupColumns": 6,
					"ButtonsGroupRows": 7,
					"BgColor": "#FFFFFF",
					"Buttons": []
				};
	
				
				number = 0;
				arrayer = [];
			}
		}
		
		if(action.length != 0){
		    const cancel2Kb = {
            	"Type": "keyboard",
            	"InputFieldState": "hidden",
            	"Buttons": [{
            		"Text": "<b><font color=\"#000000\">GO BACK TO MENU</font></b>",
            		"ActionType": "reply",
            		"ActionBody": "CANCEL2",
            		"BgColor": "#FFAA88",
            		"TextOpacity": 100,
            		"Rows": 1,
            		"Columns": 6
            	}]
            };
            // msgArray.push(new TextMessage("End of Listings",cancel2Kb,null,null,null,4));
			// msgArrayClient.push(new TextMessage("End of Listings",cancel2Kb,null,null,null,4));
			brokerPayload = msgArray;
			clientPayload = msgArrayClient;
			sendBroadcast();
		} else {
			//console.log(prcPayload)
			//console.log("No Data To Blast.")
			let nz_date_string = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
			fs.appendFile('doneTask.txt',"No Data To Blast at "+ nz_date_string + "\n", function (err) {
        		if (err) throw err;
        		console.log('Done task!');
        	  });
		}

}

var SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];

function abbreviateNumber(number){

    // what tier? (determines SI symbol)
    var tier = Math.log10(number) / 3 | 0;

    // if zero, we don't need a suffix
    if(tier == 0) return number;

    // get suffix and determine scale
    var suffix = SI_SYMBOL[tier];
    var scale = Math.pow(10, tier * 3);

    // scale the number
    var scaled = number / scale;

    // format number and add suffix
    return scaled.toFixed(0) + suffix;
}

async function sendBroadcast(){
	console.log("pumasok sa sendBroadcast")
	// const cancelKb = {
 //            	"Type": "keyboard",
 //            	"InputFieldState": "hidden",
 //            	"Buttons": [{
 //            		"Text": "<b><font color=\"#000000\">GO BACK TO MENU</font></b>",
 //            		"ActionType": "reply",
 //            		"ActionBody": "CANCEL2",
 //            		"BgColor": "#FFAA88",
 //            		"TextOpacity": 100,
 //            		"Rows": 1,
 //            		"Columns": 6
 //            	}]
 //            };

	//bot.sendMessage(response.userProfile,clientPayload,message.trackingData);
	// let keyboard = new KeyboardMessage(cancelKb,null,null,null,4)
	let keyboard = new TextMessage("End of Listings",cancelKb,null,null,null,4);
	let propertyMessage = new TextMessage("Hi! These are new properties that have been listed today!");
	let inquiryMessage = new TextMessage("Hi! These are new requirements that have been listed today!");

    // let count = 0;
    count = 0;
	for(var users of prcPayload){
		count = count + 1;
		// if((users.fields['Name'] == "Dalanon, Adrian T" && users.fields['Viber ID'] == "H9htaC9Z0hky3rhmWF5VcA==") || (users.fields["Viber ID"] == "1Hmi1ojwnWQf0K8I20FAQA==" && users.fields["Name"] == "Patron, Noel S") || (users.fields["Viber ID"] == "lp62O5O06eyRh/eZSf1K/A==" && users.fields["Name"] == "Chan, Diana M")){
		// if(users.fields['Name'] == "Dalanon, Adrian T" && users.fields['Viber ID'] == "H9htaC9Z0hky3rhmWF5VcA=="){
		// if(users.fields['Viber ID'] == "mHRV/KKG1n0vEpkwKcTmGA==" && users.fields['Name'] == "Dalanom, Adrian T"){
		// if((users.fields['Viber ID'] == "mHRV/KKG1n0vEpkwKcTmGA==" && users.fields['Name'] == "Dalanom, Adrian T") || (users.fields["Name"] == "Broker, Chan A" && users.fields["Viber ID"] == "X3S0scNABN+/Ha/66WsRlw==")){
		// if((users.fields['Viber ID'] == "mHRV/KKG1n0vEpkwKcTmGA==" && users.fields['Name'] == "Dalanom, Adrian T") || (users.fields["Name"] == "Test, test t" && users.fields["Viber ID"] == "yi/5xxlyXTOZT4UYQ/cqpA==")){	
		let broker = {};
		//array1 = brokerPayload;
		//array2 = clientPayload;
		broker.id = users.fields['Viber ID'];
		broker.name = users.fields['Name'];
		broker.preferredRegion = ["ALL"];
		if(users.fields["Preferred Region"]){
			broker.preferredRegion = users.fields["Preferred Region"];
		}
		broker.preferredCities = ["ALL"];``
		if(users.fields["Preferred Cities"]){
			broker.preferredCities = users.fields["Preferred Cities"].split(",");
		}
		broker.preferredPropertyTypes = ["ALL"];
		if(users.fields["Preferred Property Types"]){
			broker.preferredPropertyTypes = users.fields["Preferred Property Types"].split(",");
		}

		// broker.id = "XfoVs6GsW/0fuhyzHxy7Dg==";
		// broker.name = "Test, Broker 1";
		//console.log(users.fields['Viber ID'])

		// console.log("papasok sa getUserDetails")
		// await bot.getUserDetails(broker).then(userDetails => console.log(`userDetails ${JSON.stringify(userDetails)}`)).catch(err => console.log(err));
  //       console.log("natapos sa getUserDetails")

  		messageCounter = 0
		// var newMessage
		// isPropertyDone = false
		if(users.fields["Group"] == "Broker"){

        	console.log("pumasok sa broker " + brokerPayload.length)
        	var messagePayload = brokerPayload
        	// console.log(`messagePayload: ${JSON.stringify(messagePayload)}`)
        	var preferredPayload = [];
   			if(isPropertyDone == false) {
        	for(var toSendBroker of messagePayload){
				try {
					var counter3 = 0
					while (JSON.stringify(toSendBroker.richMedia.Buttons[counter3])) {
						if (counter3 % 2 == 0) {
							// console.log(JSON.stringify(toSendBroker.richMedia.Buttons[counter3].Text))
							var text = JSON.stringify(toSendBroker.richMedia.Buttons[counter3].Text);
							let nameSplit = text.split("-");
							var payloadRegion = nameSplit[1].replace(/ /g,'');
							var payloadCity = nameSplit[2].replace(/ /g,'');
							var payloadPropertyType = nameSplit[3];
							if (broker.preferredRegion != "ALL" && broker.preferredRegion == payloadRegion) {
								for (var a = 0; a < broker.preferredCities.length; a++) {
									if(broker.preferredCities[a].replace(/ /g,'') == payloadCity){
										for (var b = 0; b < broker.preferredPropertyTypes.length; b++) {
											console.log(broker.preferredPropertyTypes[b])
											if(broker.preferredPropertyTypes[b] == "Industrial with Improvements" && payloadPropertyType.includes("Warehouse") == true) {
												preferredPayload.push(toSendBroker.richMedia.Buttons[counter3]);
												preferredPayload.push(toSendBroker.richMedia.Buttons[counter3 + 1]);
											} else if(broker.preferredPropertyTypes[b] == "Residential Condo" && payloadPropertyType.includes("Condo") == true){
												preferredPayload.push(toSendBroker.richMedia.Buttons[counter3]);
												preferredPayload.push(toSendBroker.richMedia.Buttons[counter3 + 1]);
											} else if(broker.preferredPropertyTypes[b] == "Office Space" && payloadPropertyType.includes("Office Space") == true){
												preferredPayload.push(toSendBroker.richMedia.Buttons[counter3]);
												preferredPayload.push(toSendBroker.richMedia.Buttons[counter3 + 1]);
											} else if(broker.preferredPropertyTypes[b] == "Residential House & Lot" && payloadPropertyType.includes("H&L") == true){
												preferredPayload.push(toSendBroker.richMedia.Buttons[counter3]);
												preferredPayload.push(toSendBroker.richMedia.Buttons[counter3 + 1]);
											} 
											// else if(broker.preferredPropertyTypes[b] == "Commercial with Improvements" && payloadPropertyType.includes("H&L") == true){
											// 	preferredPayload.push(toSendBroker.richMedia.Buttons[counter3]);
											// 	preferredPayload.push(toSendBroker.richMedia.Buttons[counter3 + 1]);
											// }
										}
									}
								}
							}							
						}
						counter3 += 1;
					}

				} catch (err){
					console.log(`error: ${err}`)
				}
			}

			// var test = {"ButtonsGroupColumns": 6,"ButtonsGroupRows": 7,"BgColor": "#FFFFFF","Buttons": preferredPayload};
			// preferredPayload = new RichMediaMessage(test);
			// var preferredPayloadArray = [];
			// preferredPayloadArray.push(preferredPayload);
			// messagePayload = preferredPayloadArray;
			// console.log(`testing: ${JSON.stringify(preferredPayloadArray)}`)

			if (preferredPayload.length > 0) {
				console.log(`testing: ${JSON.stringify(preferredPayload)}`)	
				var test = {"ButtonsGroupColumns": 6,"ButtonsGroupRows": 7,"BgColor": "#FFFFFF","Buttons": preferredPayload};
				preferredPayload = new RichMediaMessage(test);
				var preferredPayloadArray = [];
				preferredPayloadArray.push(preferredPayload);
				messagePayload = preferredPayloadArray;
			} 
			// else {
			// 	messagePayload = [];
			// }
			
			}
        	if(isPropertyDone == false && messagePayload.length > 0){
        		console.log("pumasok sa if")
        		bot.sendMessage(broker,propertyMessage,{
					userid : users.fields['Viber ID'],
					groupType : "Broker"
				// }).then(() => console.log("natapos sa hi these are new properties"))
				}).then(() => 
					messageLoop(messagePayload,broker,users,messageCounter,keyboard)
				)
				.catch(err => console.log(`error: ${JSON.stringify(err)}`))
				// .finally(function(){
				// 	messageLoop(messagePayload,broker,users,messageCounter,keyboard)
				// })
				// .then(() => 
				// 	messageLoop(messagePayload,broker,users,messageCounter,keyboard)
				// )
        	} else if ((isPropertyDone == true && brokerInquiryPayload.length > 0) || (isPropertyDone == false && messagePayload == 0 && brokerInquiryPayload.length > 0)) {
        		console.log("pumasok sa else if")
        		isPropertyDone = true
        		messagePayload = brokerInquiryPayload;
        		// messageCounter = messageCounter + 1;
        		bot.sendMessage(broker,inquiryMessage,{
					userid : users.fields['Viber ID'],
					groupType : "Broker"
				})
				// .then(() => console.log("natapos sa hi these are new properties"))
				.then(() => 
					messageLoop(messagePayload,broker,users,messageCounter,keyboard)
				)
				.catch(err => console.log(`error: ${JSON.stringify(err)}`))
				// .finally(function(){
				// 	messageLoop(messagePayload,broker,users,messageCounter,keyboard)
				// })
				// .then(() => 
				// 	messageLoop(messagePayload,broker,users,messageCounter,keyboard)
				// )
        	}

		} else if(users.fields["Group"] == "Client"){
			
			// bot.sendMessage(broker,keyboard,{
			// 	userid : users.fields['Viber ID'],
			// 	groupType : "Broker"
			// })

			
			for(var toSendClient of clientPayload){
				try {
					// toSendClient.richMedia.Buttons[3].Text = "Interested? We would be glad to show you this property!"
					var counter2 = 0
					while (JSON.stringify(toSendClient.richMedia.Buttons[counter2])) {
						if (counter2 % 2 == 0) {
							//console.log("client payload:"+JSON.stringify(clientPayload))
							try{
								// const query2 = await airTableCredentials.read({
								// 	filterByFormula: `{ID} = "recq1P9ND0tU7pFjt"`
								// 	// filterByFormula: `{ID} = "rec23iYg4V4fGnX3C"`
								// });
								// // await sleep(500)
								// var newTest = query2[0].fields["Summary"].replace(/\n/g, " ")
								var newTest = "Reach out to an NREA Broker for more details."
								//var newTest = 'Reach out to an NREA Broker for more details.'
								var newContactInfo = encodeURIComponent(newTest)
								// console.log(`newTest2: ${encodeURIComponent(newTest)}`)
								
								var toSendClient1 = JSON.stringify(toSendClient.richMedia.Buttons[counter2].ActionBody)					
								var searchTerm = 'Contact%20Information%22%3A%22'
								var indexOfFirst = toSendClient1.indexOf(searchTerm);
								var indexOfLast = indexOfFirst + 30
								var newActionBody = toSendClient1.slice(0,indexOfLast) + newContactInfo + "%22%7D%5D"
								toSendClient.richMedia.Buttons[counter2].ActionBody = newActionBody.slice(1,newActionBody.length)	
							} catch(e){
								console.log(`error: ${e}`)
							}
						} else {
							toSendClient.richMedia.Buttons[counter2].Text = "Reach out to an NREA Broker for more details."
						}
						counter2 = counter2 + 1
					}
				} catch (e) {
					console.log("error " + JSON.stringify(e))
				}
			}

			var messageClientPayload = clientPayload

        	if(isPropertyDone == false && messageClientPayload.length > 0){
				console.log(JSON.stringify(propertyMessage))
        		bot.sendMessage(broker,propertyMessage,{
					userid : users.fields['Viber ID'],
					groupType : "Client"
				})
				// .then(() => console.log("natapos sa hi these are new properties"))
				.then(() => 
				
					messageLoop(messageClientPayload,broker,users,messageCounter,keyboard)
				)
				.catch(err => console.log(`error: ${JSON.stringify(err)}`))
				// .finally(function(){
				// 	messageLoop(messagePayload,broker,users,messageCounter,keyboard)
				// })	
				// .then(() => 
				// 	messageLoop(messagePayload,broker,users,messageCounter,keyboard)
				// )
        	} else if (isPropertyDone == true || (isPropertyDone == false && messageClientPayload == 0)) {
        		isPropertyDone = true;
        		messageInquiryClientPayload = clientInquiryPayload;
        		// messageCounter = messageCounter + 1;
        		bot.sendMessage(broker,inquiryMessage,{
					userid : users.fields['Viber ID'],
					groupType : "Client"
				})
				// .then(() => console.log("natapos sa hi these are new properties"))
				.then(() => 
					messageLoop(messageInquiryClientPayload,broker,users,messageCounter,keyboard)
				)
				.catch(err => console.log(`error: ${JSON.stringify(err)}`))
				// .finally(function(){
				// 	messageLoop(messagePayload,broker,users,messageCounter,keyboard)
				// })
				// .then(() => 
				// 	messageLoop(messagePayload,broker,users,messageCounter,keyboard)
				// )
        	}

			// }
		}
	}
	
	let nz_date_string = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
	fs.appendFile('doneTask.txt',"Done at "+ nz_date_string +"\n", function (err) {
		if (err) throw err;
		console.log('Done task!');
	});	
}	

function messageLoop(messagePayload,broker,users,messageCounter,keyboard){
	console.log("pumasok sa messageLoop")
	var newMessage
	// console.log(`messagePayload2 : ${JSON.stringify(messagePayload)}`)
	for(var toSend of messagePayload){
		newMessage = "";
		newMessage = toSend;

		try {
			// console.log("toSend: " + JSON.stringify(newMessage))
			bot.sendMessage(broker,newMessage,{
				userid : users.fields['Viber ID'],
				groupType : "Broker"
			}).then(function(){
				messageCounter = messageCounter + 1;
				// console.log(`finally2: ${messageCounter}`);
				if(messageCounter == messagePayload.length){

					bot.sendMessage(broker,keyboard,{
						userid : users.fields['Viber ID'],
						groupType : "Broker"
					})
					.then(function(){
						// console.log(`count1: ${count}`)
						if(count == prcPayload.length && isInquiryDone == false){
						// if(count == messagePayload.length && isInquiryDone == false){
							isPropertyDone = true;
							// console.log("finally4")
							isInquiryDone = true
							getInquiries()
						}
					})
					.catch(err => console.log(`error1: ${err}`))
					// .finally(function() {
					// .then(function(){
					// 	// if(count == prcPayload.length && isInquiryDone == false){
					// 	if(count == messagePayload.length && isInquiryDone == false){							
					// 		isPropertyDone = true;
					// 		console.log("finally4")
					// 		isInquiryDone = true
					// 		getInquiries()
					// 	}
					// })	
				}
			})
			// .catch(err => console.log(`error2: ${JSON.stringify(err)}`))
			.catch(function(err){
				// console.log(`error2: ${JSON.stringify(err)}`);
				messageCounter = messageCounter + 1;
				if(messageCounter == messagePayload.length){
					bot.sendMessage(broker,keyboard,{
						userid : users.fields['Viber ID'],
						groupType : "Broker"
					})
				}
			})
		} catch (error){
			console.log(`error: ${error}`)
		}
	}
}

async function getMatchFormulas(){
	console.log("pumasok sa getMatchFormulas")
	exactMatchesArray = [];
	recommendedMatchesArray = [];
	var inquiryCodeArray = [];
	var uniqeInquiryCodeArray = [];
	var uniqueInquiryFormulaArray = [];

	// const exactQuery = await airTableExact.read({
	// 	filterByFormula: `{Validated} = "1"`
	// });
	try {
		const exactQuery = await airTableInquiries.read({
			filterByFormula: `AND({Validated} = "1", {Exact Formula} != "", {Profile Summary} != "")`
		});

		if(exactQuery.length > 0){
			// console.log(`may laman exactMatchesArray: ${exactQuery.length}`)
			for (var i = 0; i < exactQuery.length; i++) {
				try {
					exactMatchesArray.push({"Requester Formula": exactQuery[i].fields["Exact Formula"], "Requester Profile Summary": exactQuery[i].fields["Profile Summary"], 
					"Requester Viber Id": exactQuery[i].fields["Viber ID"], "Inquiry": exactQuery[i].fields["Exact Inquiry"], "Inquiry Code": exactQuery[i].fields["Inquiry Code"]})
				} catch (error){
					console.log(`errorssss: ${error}`)
				}

				// for (var i = 0; i < subscribedList.length; i++) {
				// 	if(subscribedList[i] == exactQuery[i].fields["Viber ID"]){
				// 		try {
				// 			exactMatchesArray.push({"Requester Formula": exactQuery[i].fields["Exact Formula"], "Requester Profile Summary": exactQuery[i].fields["Profile Summary"], 
				// 			"Requester Viber Id": exactQuery[i].fields["Viber ID"], "Inquiry": exactQuery[i].fields["Exact Inquiry"], "Inquiry Code": exactQuery[i].fields["Inquiry Code"]})
				// 		} catch (error){
				// 			console.log(`errorssss: ${error}`)
				// 		}		
				// 	}
				// }
				
			}
			// exactMatchesArray = [...new Set(exactMatchesArray)];
			exactMatchesArray = dedupe(exactMatchesArray);
			// console.log(`exactMatchesArray: ${JSON.stringify(exactMatchesArray)}`)
		} else {
			// console.log("walang laman yung exact");
			isExactMatchingDone = true;
		}

		// const recommendedQuery = await airTableRecommended.read({
		// 	filterByFormula: `{Validated} = "1"`
		// });

		const recommendedQuery = await airTableInquiries.read({
			filterByFormula: `AND({Validated} = "1", {Recommended Formula} != "", {Profile Summary} != "")`
		});

		if(recommendedQuery.length > 0){
			for (var i = 0; i < recommendedQuery.length; i++) {
				recommendedMatchesArray.push({"Requester Formula": recommendedQuery[i].fields["Recommended Formula"], "Requester Profile Summary": recommendedQuery[i].fields["Profile Summary"], 
						"Requester Viber Id": recommendedQuery[i].fields["Viber ID"], "Inquiry": recommendedQuery[i].fields["Recommended Inquiry"], "Inquiry Code": recommendedQuery[i].fields["Inquiry Code"]})

				// for (var i = 0; i < subscribedList.length; i++) {
				// 	if(subscribedList[i] == recommendedQuery[i].fields["Viber ID"]){
				// 		recommendedMatchesArray.push({"Requester Formula": recommendedQuery[i].fields["Recommended Formula"], "Requester Profile Summary": recommendedQuery[i].fields["Profile Summary"], 
				// 		"Requester Viber Id": recommendedQuery[i].fields["Viber ID"], "Inquiry": recommendedQuery[i].fields["Recommended Inquiry"], "Inquiry Code": recommendedQuery[i].fields["Inquiry Code"]})
				// 	}
				// }
			}
			// recommendedMatchesArray = [...new Set(recommendedMatchesArray)];
			recommendedMatchesArray = dedupe(recommendedMatchesArray);
			// console.log(`recommendedMatchesArray: ${JSON.stringify(recommendedMatchesArray)}`)
		} else {
			// console.log("walang laman yung exact");
			isRecommendedMatchingDone = true;
		}
	} catch (err) {
		console.log(`err: ${err}`)
	}

	matchesMessageArray = [];
	getNewMatches(exactMatchesArray)
	.then(() => matchesToMatchesNotification(recommendedMatchesArray))
	.catch((error) => console.log(`error: ${error}`))
}

function dedupe(arr) {
	const uniq = new Set(arr.map(e => JSON.stringify(e)));
	const res = Array.from(uniq).map(e => JSON.parse(e));
	return res;
}

function matchesToMatchesNotification(recommendedMatchesArray){
	getNewMatches(recommendedMatchesArray)
	// .then(() => matchesNotificationToBroadcast())
	.then(() => checkIfSubscribed())
	.catch((err) => console.log(err))
}

function checkIfSubscribed(){
	checkSubscriptionList()
	.then(() => matchesNotificationToBroadcast())
	.catch((err) => console.log(err))
}

function matchesNotificationToBroadcast(){
	sendMatchesNotification()
	.then(() => broadcast())
	.catch((err) => console.log(err))
}

async function getNewMatches(matchesArray){
	console.log("pumasok sa getNewMatches")
	if(matchesArray.length > 0){
		for (var j = 0; j < matchesArray.length; j++) {
			// console.log(`matchesArray: ${JSON.stringify(matchesArray[j])}`)
			// console.log(`counter: ${j}`)
			var formula = '';
			formula = matchesArray[j]["Requester Formula"];
			var newFormula = `AND({Broadcasted} = "0", ${formula})`;
			// console.log(`newFormula: ${newFormula}`)

			const exactRes = await airTableProperties.read({
				filterByFormula: newFormula,
			});

			// console.log(`length: ${exactRes.length}`)

			// if(exactRes.length > 0){
			// 	for (var j = 0; j < exactRes.length; i++) {
			// 		console.log(`formula2: ${formula}`)
			// 		console.log(`newFormula: ${newFormula}`)
			// 	}			
			// }

			if(exactRes.length > 0){
				// console.log(`exact query: ${JSON.stringify(exactRes)}`)

				// if(exactRes.length > 0){
					// console.log("pumasok sa for exact matches " + exactRes[0]["fields"]["Name"])
				for (var i = 0; i < exactRes.length; i++) {
					// console.log(`length: ${exactRes.length}`)
					// console.log(`viber id: ${matchesArray[j]["Requester Viber Id"]}`)
					matchesMessageArray.push(matchesArray[j]["Requester Viber Id"]);
					var image1 = "";
					var image2 = "";
					var image3 = "";
					var image4 = "";
					var image5 = "";

					var requesterProfileSummary = matchesArray[j]["Requester Profile Summary"];

					// console.log(JSON.stringify(exactRes[i]["fields"]))
					if(exactRes[i]["fields"]["Property Image1"]){
						image1 = exactRes[i]["fields"]["Property Image1"][0]["url"]
					}
					if(exactRes[i]["fields"]["Property Image2"]){
						image2 = exactRes[i]["fields"]["Property Image2"][0]["url"]
					}
					if(exactRes[i]["fields"]["Property Image3"]){
						image3 = exactRes[i]["fields"]["Property Image3"][0]["url"]
					}
					if(exactRes[i]["fields"]["Property Image4"]){
						image4 = exactRes[i]["fields"]["Property Image4"][0]["url"]
					}
					if(exactRes[i]["fields"]["Property Image5"]){
						image5 = exactRes[i]["fields"]["Property Image5"][0]["url"]
					}

					const query = await airTablePRC.read({
						filterByFormula: `{Viber ID} = "${exactRes[i]["fields"]["Viber ID"]}"`
					});

					const query2 = await airTableHLURB.read({
						filterByFormula: `{Viber ID} = "${exactRes[i]["fields"]["Viber ID"]}"`
					});

					const query3 = await airTableCredentials.read({
						// filterByFormula: `{ID} = "rec23iYg4V4fGnX3C"`
						filterByFormula: `{ID} = "recq1P9ND0tU7pFjt"`
					});

					var profileSummary
					if(query && query.length != 0){
						profileSummary = query[0].fields["Profile Summary"]
					} else if(query2 && query2.length != 0){
						profileSummary = query2[0].fields["Profile Summary"]
					} else {
						profileSummary = query3[0].fields["Summary"]	
						
					}

					const fields = {
						"Name": exactRes[i]["fields"]["Name"],
						"Property Relation": exactRes[i]["fields"]["Property Relation"],
						"Property Purpose": exactRes[i]["fields"]["Property Purpose"],
						"Property Type": exactRes[i]["fields"]["Property Type"],
						"Commercial Type": exactRes[i]["fields"]["Commercial Type"],
						"Location": (exactRes[i]["fields"]["Location"]).toUpperCase(),
						"City/Town": (exactRes[i]["fields"]["City/Town"]).toUpperCase(),
						"Baranggay": (exactRes[i]["fields"]["Baranggay"]).toUpperCase(),
						"Region/State": (exactRes[i]["fields"]["Region/State"]).toUpperCase(),
						"Location Name": exactRes[i]["fields"]["Location Name"],
						"Number of Rooms": parseInt(exactRes[i]["fields"]["Number of Rooms"]),
						"Floor Area": parseFloat(exactRes[i]["fields"]["Floor Area"]),
						"Lot Area": parseFloat(exactRes[i]["fields"]["Lot Area"]),
						"Furnishing": exactRes[i]["fields"]["Furnishing"],
						"Parking Slots": exactRes[i]["fields"]["Parking Slots"],
						"Price": parseFloat(exactRes[i]["fields"]["Price"]),
						"Property Image1": [{"url": image1}],
						"Property Image2": [{"url": image2}],
						"Property Image3": [{"url": image3}],
						"Property Image4": [{"url": image4}],
						"Property Image5": [{"url": image5}],
						"Property Detail": exactRes[i]["fields"]["Property Detail"],
						"Group Type": exactRes[i]["fields"]["Group Type"],
						"Sub Group": exactRes[i]["fields"]["Sub Group"],
						"Commission Rate": exactRes[i]["fields"]["Commission Rate"],
						"Viber ID": exactRes[i]["fields"]["Viber ID"],
						"Validated": "1",
						"Broadcasted": "0",
						"Profile Summary": profileSummary,
						"Requester Viber Id": matchesArray[j]["Requester Viber Id"],
						"Requester Profile Summary": requesterProfileSummary,
						"Requester Formula": matchesArray[j]["Requester Formula"],
						"Inquiry": matchesArray[j]["Inquiry"],
						"Inquiry Code": matchesArray[j]["Inquiry Code"],
						"Enlisting Code": exactRes[i]["fields"]["Enlisting Code"]
					};

					if(isExactMatchingDone == false){
						exactBase(`Exact Matches`).create([
						{
							"fields": fields
						}], function(err, records) {
							if (err) {
								console.error(err);
								return;
							}
						});
						isExactMatchingDone = true;
					} else {
						recommendedBase(`Recommended Matches`).create([
						{
							"fields": fields
						}], function(err, records) {
							if (err) {
								console.error(err);
								return;
							}
						});
						isRecommendedMatchingDone = true;
					}
				}
			}
		}
	}
}

async function checkSubscriptionList(){
	console.log("pumasok sa checkSubscriptionList")
	const readRes = await airTableUsers.read({
		filterByFormula: `{Subscribed} = "1"`
	});

	for (var i = 0; i < readRes.length; i++) {
		subscribedList.push(readRes[i]["fields"]["Viber ID"]);
	}
	
}

async function sendMatchesNotification(){
	// console.log("pumasok sa sendMatchesNotification")
	if(isExactMatchingDone == true && isRecommendedMatchingDone == true){
		matchesMessageArray = [...new Set(matchesMessageArray)];
		// console.log(`matchesMessageArray: ${JSON.stringify(matchesMessageArray)}`)
		for (var m = 0; m < matchesMessageArray.length; m++) {
			for (var h = 0; h < subscribedList.length; h++) {
				// console.log(`subscribedList: ${subscribedList[i]}`)
				if(subscribedList[h] == matchesMessageArray[m]) {
					let broker2 = {};
					broker2.id = matchesMessageArray[m];
					let matchesMessage = new TextMessage("Great news! Your listing/requirement has a match. Check out the Matching Assistant in “My Account” to know more about it. Congratulations!",cancelKb,null,null,null,4);
					bot.sendMessage(broker2,matchesMessage,{
						userid : matchesMessageArray[m],
						groupType : "Broker"
					})

					// if(matchesMessageArray[m] == "mHRV/KKG1n0vEpkwKcTmGA==" || matchesMessageArray[m] == "X3S0scNABN+/Ha/66WsRlw=="){
					// if(matchesMessageArray[m] == "mHRV/KKG1n0vEpkwKcTmGA=="){
					// 	let matchesMessage = new TextMessage("Great news! Your listing/requirement has a match. Check out the Matching Assistant in “My Account” to know more about it. Congratulations!",cancelKb,null,null,null,4);
					// 	bot.sendMessage(broker2,matchesMessage,{
					// 		userid : matchesMessageArray[m],
					// 		groupType : "Broker"
					// 	})
					// }		
				}
			}

			// let broker2 = {};
			// broker2.id = matchesMessageArray[m];
			// if(matchesMessageArray[m] == "mHRV/KKG1n0vEpkwKcTmGA==" || matchesMessageArray[m] == "X3S0scNABN+/Ha/66WsRlw=="){
			// 	let matchesMessage = new TextMessage("Great news! Your listing/requirement has a match. Check out the Matching Assistant in “My Account” to know more about it. Congratulations!",cancelKb,null,null,null,4);
			// 	bot.sendMessage(broker2,matchesMessage,{
			// 		userid : matchesMessageArray[m],
			// 		groupType : "Broker"
			// 	})
			// }			
		}
	}
}

// cron.schedule("45 * * * *", function() {
// // cron.schedule("* * * * *", function() {  
// // console.log("running a task every minute");
//     let nz_date_string = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
//     fs.appendFile('diditrun.txt',"Program run at "+ nz_date_string + "\n", function (err) {
// 		if (err) throw err;
// 		console.log('Done task!');
// 	  });
// 	// broadcast();
// 	// isInquiryDone = false;
// 	updateMatches();
// });

// 0 2,18 * * *
// cron.schedule("0 1,9 * * *", function() {
cron.schedule("0 9 * * *", function() {	
    let nz_date_string = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    fs.appendFile('diditrun.txt',"Program run at "+ nz_date_string + "\n", function (err) {
		if (err) throw err;
		console.log('Done task!');
	  });

    isExactMatchingDone = false;
    isRecommendedMatchingDone = false;
    isInquiryDone = false;
    //getMatchFormulas();
    // checkSubscriptionList()
    // .then(() => getMatchFormulas())
    // .catch((err) => console.log(err))
    
    // isInquiryDone = false;
    broadcast();
});

cron.schedule("0 17 * * *", function() {	
    let nz_date_string = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    fs.appendFile('diditrun.txt',"Program run at "+ nz_date_string + "\n", function (err) {
		if (err) throw err;
		console.log('Done task!');
	  });

    isExactMatchingDone = false;
    isRecommendedMatchingDone = false;
    isInquiryDone = false;
    //getMatchFormulas();
    // checkSubscriptionList()
    // .then(() => getMatchFormulas())
    // .catch((err) => console.log(err))
    
    // isInquiryDone = false;
    broadcast();
});
