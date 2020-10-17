/**
*	@filename	HordeSystem.js
*	@author		Adpist
*	@desc		general stuff
*	@credits	Adpist, JeanMax / SiC-666 / Dark-f, Alogwe, Imba, Kolton, Larryw, Noah, QQValpen, Sam, YGM
*/

var HordeSystem = {
	team: {},
	build: {},
	teamSize: 0,
	teleProfile: "",
	boProfile: "",
	followerProfiles: [],
	allTeamProfiles: [],
	allTeamCharacters: [],
	hasSummoner: false,
	
	init: function() {
		print("Init horde");
		
		this.team = {};
		this.build = {};
		this.teamSize = 0;
		this.teleProfile = "";
		this.boProfile = "";
		this.followerProfiles = [];
		this.allTeamProfiles = [];
		this.allTeamCharacters = [];
		this.hasSummoner = false;
	},
	
	setupBuild: function(buildName) {
		var className = ["Amazon", "Sorceress", "Necromancer", "Paladin", "Barbarian", "Druid", "Assassin"][me.classid];
		
		if (!include("horde/builds/"+className+"/"+buildName+".js")) {
			throw new Error("Failed to find build: "+ buildName + " for class " + className);
		}
		
		if (!include("horde/builds/templates/stats/"+className+".js")){
			throw new Error("Failed to find stats build templates for class " + className);
		}
		
		if (!include("horde/builds/templates/skills/"+className+".js")){
			throw new Error("Failed to find skills build templates for class " + className);
		}
		
		this.build = HordeBuild;
		
		var statBuild = StatsBuilds[this.build.statsBuild],
			skillsBuild = SkillsBuilds[this.build.skillsBuild];
			
		if (statBuild === undefined) {
			throw new Error("invalid stats build " + this.build.statsBuild + " for class " + className);
		}
		
		if (skillsBuild === undefined) {
			throw new Error("invalid skills build " + this.build.skillsBuild + " for class " + className);
		}
		
		//Stats
		Config.AutoStat.Enabled = true;
		Config.AutoStat.Save = 0;
		Config.AutoStat.BlockChance = 0;
		Config.AutoStat.UseBulk = false;
		Config.AutoStat.Build = statBuild;
		
		//Skills
		Config.AutoSkill.Enabled = true;
		Config.AutoSkill.Save = 0;
		Config.AutoSkill.Build = skillsBuild;
		
		//AutoBuild
		Config.AutoBuild.Enabled = true;
		Config.AutoBuild.Template = HordeBuild.autoBuildTemplate;
		
		//Debugging
		Config.AutoBuild.Verbose = true;			//	Allows script to print messages in console
		Config.AutoBuild.DebugMode = true;			//	Debug mode prints a little more information to console and
		
		//Auto Equip
		Config.AutoEquip = true;
		HordeBuild.pickits.forEach(function(pickit) {
			Config.PickitFiles.push(pickit);
		});
	},
	
	setupConfig: function(teamName) {
		
		print("setup config " + me.profile + "[" + teamName + "]");
		
		var isTeleportChar = false;
		this.team = Teams[teamName];
		
		if (this.team === undefined){
			D2Bot.printToConsole(me.profile + " isn't in " + teamName + " team", 6);
			throw new Error("Couldn't find horde team : " + teamName);
		}
		
		var profiles = Object.keys(this.team.profiles);
		
		if (this.team.profiles[me.profile] === undefined){
			D2Bot.printToConsole(me.profile + " isn't in " + teamName + " team", 6);
			throw new Error(me.profile + " isn't in " + teamName + " team");
		}
		//parse each team member
		profiles.forEach(function(profile) {
			var profileData = HordeSystem.team.profiles[profile];
			switch(profileData.role) {
				case "teleport":
					HordeSystem.teleProfile = profile;
					break;
					
				case "bo":
					HordeSystem.boProfile = profile;
					break;
					
				case "follower":
					HordeSystem.followerProfiles.push(profile);
					break;
					
				case "summoner":
					HordeSystem.followerProfiles.push(profile);
					HordeSystem.hasSummoner = true;
					break;
					
				default:
					D2Bot.printToConsole("unhandled role : " + profile.role + " => using follower");
					HordeSystem.followerProfiles.push(profile);
					break;
			}
			HordeSystem.allTeamProfiles.push(profile);
			HordeSystem.allTeamCharacters.push(profileData.character);
			HordeSystem.teamSize += 1;
		});
		
		isTeleportChar = this.teleProfile === me.profile;
		
		if(this.team.manualPlay){
			Scripts.Horde = false;
			if (isTeleportChar) {
				Scripts.UserAddon = true;
			}
			else {
				Scripts.Follower = true;
				Config.Leader = this.team.profiles[this.teleProfile].character;
			}
			
			Config.MinGameTime = this.team.minGameTime;
			Config.MaxGameTime = 0;
			
			//NOT HARDCORE FRIENDLY
			Config.LifeChicken = 0; //Disable chicken in manual
			Config.TownCheck = 0;
		}
		else {
			Scripts.Horde = true;
			
			//For now party leader is teleporter
			Config.PublicMode = (isTeleportChar) ? 1 : 2;
			
			Config.MinGameTime = this.team.minGameTime;
			Config.MaxGameTIme = this.team.maxGameTime;
			
			Config.ItemInfo = true;//Debug purposes
		}
		
		if (this.team.quitList) {
			Config.QuitList = this.allTeamCharacters;
			Config.QuitListMode = 0;
			Config.QuitListDelay = [2,10];
		}
		else {
			Config.QuitList = [];
		}
		
		this.setupBuild(this.team.profiles[me.profile].build);
		
		return true;
	},
	
	runSequence: function(sequence, mfRun) {
		var sequenceInclude = "horde/sequences/"+sequence+".js";
		if (!isIncluded(sequenceInclude)){
			if (!include(sequenceInclude)){
				throw new Error("Couldn't find sequence " + sequence);
			}
		}
		
		return global[sequence](mfRun);
	}
	
}