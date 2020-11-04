/**
*	@filename	Party.js
*	@author		Adpist
*	@desc		Party management and syncro
*	@credits	Adpist, JeanMax / SiC-666 / Dark-f, Alogwe, Imba, Kolton, Larryw, Noah, QQValpen, Sam, YGM
*/

var Party = {
	lowestAct: 0,
	
	init: function() {
		this.lowestAct = 0;
	},
	
	wholeTeamInGame: function (stayInGame) { // Counts all the players in game. If the number of players is below TeamSize either return false or quit game depending on input.
		var i, player,
			count = 0;

		if (stayInGame === undefined) {
			stayInGame = false;
		}

		for (i = 0 ; i < 30 ; i += 1) { // Try 30 times because getParty(); can fail once in a while.
			player = getParty();

			if (player) {
				do {
					count += 1;
				} while (player.getNext());

				break;
			}

			delay(250);
		}

		if (count < HordeSystem.teamSize) {
			return stayInGame ? false : quit(); // Return false if stayInGame is true, otherwise leave game.
		}

		return true;
	},
	
	waitWholeTeamJoined: function() {
		var tick = getTickCount();
	
		while (!Party.wholeTeamInGame(true)) { // Wait for the Horde Team to join.
			delay(1000);

			if (getTickCount() - tick > HordeSettings.maxWaitTimeMinutes * 60 * 1000) { // Leave the game after x minutes of waiting.
				HordeDebug.logCriticalError("Party", "Team didn't join the game within " + HordeSettings.maxWaitTimeMinutes + " minutes.");
				quit();
			}
		}
	},
	
	hasReachedLevel: function (level) {
		if (!level) {
			level = me.charlvl;
		}

		var i, player;

		for (i = 0 ; i < 30 ; i += 1) { // Try 30 times because getParty(); can fail once in a while.
			player = getParty();

			if (player) {
				do {
					if (player.level < level) { // Player is not ready.
						return false;
					}
				} while (player.getNext());

				return true;
			}

			delay(250);
		}

		return false;
	},
	
	getLowestAct: function () { // Cycles thru getParty() and returns the lowest Act (i.e., 1-5) the partied characters are in. Quits if noone is partied. Returns false is someone isn't in a Town.
		var i, j, player, myPartyID, area,
			lowestAct = 5;

		// Dark-f ->
		if (HordeSystem.teamSize === 1) {
			lowestAct = [-1, 1, 40, 75, 103, 109].indexOf(me.area);
			return lowestAct;
		}
		// <- Dark-f

		for (i = 0 ; i < 30 ; i += 1) { // Try 30 times because getParty(); can fail once in a while.
			player = getParty();

			if (player) {
				myPartyID = player.partyid;

				if (myPartyID === 65535) { // Noone in my Party. Probably a good idea to quit. . .
					for (j = 0 ; j < 60 ; j += 1)
					{
						myPartyID = player.partyid;
						if (myPartyID !== 65535)
						{
							break;
						}
					}
					if (j === 60)
					{
						throw new Error("HordeSystem.partyAct: Noone in my Party.");
						quit();
					}
				}

				while (player.getNext()) {
					if (player.partyid === myPartyID) { // Only check characters in a Party with me.
						area = [-1, 1, 40, 75, 103, 109].indexOf(player.area);

						if (area === -1) { // Player isn't in a Town.
							return false;
						}

						if (area < lowestAct) {
							lowestAct = area;
						}
					}
				}

				break;
			}

			delay(250);
		}

		return lowestAct;
	},
	
	allPlayersInArea: function (area) {
		if (!area) {
			area = me.area;
		}

		var count = 1,
			party = getParty(); //this is actually counting in game players(you included), not in party

		if (party) {
			do {
				if ( party.area === area ) { //counting players rdy
					count += 1;
				}
			} while (party.getNext());
		}

		if (count < HordeSystem.teamSize) {
			return false;
		}

		return true;
	},
	
	waitForMembers: function (area, nextArea) {
		var tick = getTickCount(),
			orgx = me.x,
			orgy = me.y;

		if (HordeSystem.teamSize === 1) {
			return;
		}
		
		print("Waiting for Party Members.");

		if (arguments.length < 1) {
			area = me.area;
		}
		if (arguments.length < 2){
			nextArea = area;
		}

		if (!this.secureWaitSynchro("secure_area_" + area, HordeSettings.maxWaitTimeMinutes * 60 * 1000, area)) {
			quit();
		}
	},
	
	waitForMembersByWaypoint: function () {
		var tick = getTickCount();
	
		if (HordeSystem.teamSize === 1) {
			return;
		}
		
		if (!this.secureWaitSynchro("secure_waypoint")) {
			quit();
		}
	},
	
	secureWaitSynchro: function(synchroType, timeout, area) {
		var tick = getTickCount(), success = false, clearResult = false, sentReady = false,
				orgx = 0,
				orgy = 0;
		
		if (area === undefined) {
			area = me.area;
		}
		
		if(me.area != area){
			Pather.journeyTo(area);
		}
		
		if (HordeSystem.teamSize == 1) {
			return true;
		}
		
		if (timeout === undefined) {
			timeout = HordeSettings.maxWaitTimeMinutes * 60 * 1000;
		}
		
		orgx = me.x;
		orgy = me.y;
		
		delay(me.ping*2 + 250);
		
		if (HordeSettings.Debug.Verbose.synchro) {
			print("start secure wait team ready " + synchroType + " (timeout : " + (timeout / 1000) + "s)");
		}
		
		if (me.inTown) {
			clearResult = true;
		}
		
		while(!Communication.Synchro.isTeamReady(synchroType) && getTickCount() - tick <= timeout) {
			if (!me.inTown) {
				clearResult = Attack.clear(15);

				if(me.area != area){
					Pather.journeyTo(area);
				}
				
				Pather.moveTo(orgx, orgy, 1, true);
			}
			
			if (clearResult && !sentReady) {
				Communication.Synchro.sayReady(synchroType);
				sentReady = true;
			}
			
			Communication.Synchro.askMissingReady(synchroType);
			delay(me.ping*2 + 250);
		}
		
		success = getTickCount() - tick <= timeout;
		
		if (success) {
			delay(me.ping*2 + 500);
		}
		
		Communication.Synchro.flushTeamReady(synchroType);
		
		if (HordeSettings.Debug.Verbose.synchro) {
			if (success) {
				print("team secured & is ready for " + synchroType);
			} else {
				HordeDebug.logScriptError("Synchro", "team synchro " + synchroType + " failed");
			}
		}
		
		return success;
	},
	
	waitSynchro: function(synchroType, timeout) {
		var tick = getTickCount(), success = false;
		
		if (timeout === undefined) {
			timeout = HordeSettings.maxWaitTimeMinutes * 60 * 1000;
		}
		
		if (HordeSystem.teamSize == 1) {
			return true;
		}
		
		if (HordeSettings.Debug.Verbose.synchro) {
			print("wait team ready " + synchroType + " timeout : " + (timeout / 1000) + "s");
		}
		
		Communication.Synchro.sayReady(synchroType);
		
		while(!Communication.Synchro.isTeamReady(synchroType) && getTickCount() - tick <= timeout) {
			Communication.Synchro.askMissingReady(synchroType);
			delay(me.ping*2 + 250);
		}
		
		success = getTickCount() - tick <= timeout;
		
		if (success) {
			delay(me.ping*2 + 500);
		}
		
		Communication.Synchro.flushTeamReady(synchroType);
		
		if (HordeSettings.Debug.Verbose.synchro) {
			if (success) {
				print("team is ready for " + synchroType);
			} else {
				HordeDebug.logScriptError("Synchro", "team synchro " + synchroType + " failed");
			}
		}
		
		return success;
	},
	
	initialSynchro: function() {
		var timeout = HordeSettings.maxWaitTimeMinutes * 60 * 1000;
		
		if (!this.waitSynchro("init")) {
			HordeDebug.logCriticalError("prerun", "Initial synchro failed : Team wasn't ready within " + (timeout/1000) + " seconds");
			quit();
		}

		delay(me.ping*2 + 250);
		
		while (!this.lowestAct) { // Wait for everyone to get back to their Town, then record the lowest Town.
			this.lowestAct = Party.getLowestAct();

			delay(250);
		}

		print("lowestAct: " + this.lowestAct);
	}
};