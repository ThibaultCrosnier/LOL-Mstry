var express     =   require('express'),
    riot        =   require('lol-riot-api-module'),
    mongoose    =   require('mongoose'),
    util        =   require('util');

var models   =   require('../models')(mongoose);

var test = require("../data-test.json");

var api = new riot({
    key: test.API_KEY,
    region: test.region
});

var all_regions = ["BR", "EUNE", "EUW", "JP", "KR", "LAN", "LAS", "NA", "OCE", "RU", "TR"];

var router = express.Router();

/*
 *  Method: GET
 *  URL: /data/champion-mastery/all
 *  Params:
 *      ->  summonerId    | ID of the summoner
 *      ->  region        | Region of the summoner
 *  Sample request: /data/champion-mastery/all?summonerId=36522458&region=EUW
 *  Desc.: Returns all champion masteries earned by a summoner based on his ID and his region
 */
router.get('/champion-mastery/all', function(req, res, next) {
    var summonerId = req.query.summonerId;
    var region = req.query.region;

    req.checkQuery('summonerId', 'Summoner ID must contain only numbers').isNumeric();

    req.query.region = req.query.region.toUpperCase();
    req.checkQuery('region', 'Region is invalid').notEmpty().isAlpha().isIn(all_regions);

    var errors = req.validationErrors();
    if (errors) {
        res.status(400).send(util.inspect(errors));
    } else {

        var params = {
            "id": req.query.summonerId,
            "region": req.query.region
        };

        api.getChampionMastery(params, function (err, data) {
            if(err) {
                res.status(err.error).send(err);
                return;
            }

            var out = data;
			
			var nbChampionsQueried = 0;
			function getChamp(index, callback) {
				var query = { "id": out[index].championId };
				models.Champion.find(query, function(err, data) {
					out[index].champion = data[0];
					
					var query = { id: out[index].championId };
					models.Score.find(query, function(err, data){
						var score_data = JSON.parse(JSON.stringify(data));
					
						// We need update
						if (score_data != undefined && score_data.length > 0 && out[index].championPoints > score_data[0].score)
						{
							var parameters = {
								"ids": req.query.summonerId,
								"region": req.query.region
							};
							api.getSummonersByIds(parameters, function (err, data) {
            				
								models.Score.update(query, {
									"summonerName": data[req.query.summonerId].name,
									"region": req.query.region,
									"score": out[index].championPoints
								}, {
									upsert: true
								}, function(err) {
									
								});
								
								nbChampionsQueried++;
						
								if (nbChampionsQueried == out.length)
									callback();	
								
							});
					  	} else if (score_data == undefined || score_data.length == 0) {
							
							var parameters = {
								"ids": req.query.summonerId,
								"region": req.query.region
							};
							api.getSummonersByIds(parameters, function (err, data) {
            												
								models.Score.create({
									"id"				: out[index].championId,
									"summonerName"		: data[req.query.summonerId].name,
									"region"			: req.query.region,
									"score"				: out[index].championPoints
								}, function(err) {
									
								});
								
								nbChampionsQueried++;
						
								if (nbChampionsQueried == out.length)
									callback();	
								
							});
							
						} else {
							
							nbChampionsQueried++;
						
							if (nbChampionsQueried == out.length)
								callback();	
						}
            		});
				});
				
			}
			
			var callback = (function() {
				res.status(200).send(out);
			});
		
			if (out.length == 0) {
				callback();	
			} else { 
				for (var i = 0; i < out.length; i++) {		
					getChamp(i, callback);		
				}
			}			
		
        });
    }
});

/*
 *  Method: GET
 *  URL: /data/ranked-stats
 *  Params:
 *      ->  summonerId    | ID of the summoner
 *      ->  region        | Region of the summoner
 *  Sample request: /data/ranked-stats?summonerId=36522458&region=EUW
 *  Desc.: Returns all ranked stats about a summoner based on his id and his region
 */
router.get('/ranked-stats', function(req, res, next) {

    var summonerId = req.query.summonerId;
    var region = req.query.region;

    req.checkQuery('summonerId', 'Summoner ID must contain only numbers').isNumeric();

    req.query.region = req.query.region.toUpperCase();
    req.checkQuery('region', 'Region is invalid').notEmpty().isAlpha().isIn(all_regions);

    var errors = req.validationErrors();
    if (errors) {
        res.status(400).send(util.inspect(errors));
    } else {
        var params = {
            "id": req.query.summonerId,
            "region": req.query.region
        };

		// Get champions stats
        api.getRankedStatsBySummonerId(params, function (err, data) {
            if (err) {
                res.status(err.error).send(err);
                return;
            }

            var out = data;
			
			params = {
            	"ids": req.query.summonerId,
            	"region": req.query.region
			};
			
			// Get league
			api.getLeagueEntryBySummonerIds(params, function(err, data) {
				if (err) {
                	res.status(err.error).send(err);
                	return;
            	}
				
				out.leagues = data[req.query.summonerId];
				res.status(200).send(out);
				
			});
            
        });
    }
});

/*
 *  Method: GET
 *  URL: /leaderboard-champions
 *  Desc.: Returns leaderboard
 */
router.get('/leaderboard-champions', function(req, res, next) {
	
	models.Score.find({}, function(err, data) {
		
		// fuck this shit, cause to mongoose
		var out = JSON.parse(JSON.stringify(data));
		
		var nbChampionsQueried = 0;
		function getChamp(index, callback) {
			var query = { "id": out[index].id };
			models.Champion.find(query, function(err, champData) {
				
				out[index].champion = champData[0];
				nbChampionsQueried++;
						
				if (nbChampionsQueried == out.length)
					callback();	
			});
		}

		var callback = (function() {
			res.status(200).send(out);
		});

		if (out.length == 0) {
			callback();	
		} else { 
			for (var i = 0, iLen; i < out.length; i++) {
				getChamp(i, callback);		
			}
		}	
		
	});
	
});

router.get('/update/champions-list', function(req, res, next) {
    var params= {
        champData: 'tags'
    };

    api.getChampionData(params).then(function (data) {
        data = data.data;
        var champion = null;
   
        for (key in data) {
            champion = data[key];
            models.Champion.create({
                id: champion.id,
                key: champion.key,
                name: champion.name,
                title: champion.title,
                tags: champion.tags
            }, function (err, data) {
                if (err) {
                    if (err.code != 11000) {
                        console.log(err);
                    }
                }
                champion = null;
            });
        }

        updateChampionStatus();
    });
});

function updateChampionStatus(){
    api.getChampions().then(function (data){
        data = data.champions;
        var champion = null;
        var query = null;

        for (var i = 0, iLen = data.length; i < iLen ; i++) {
            champion = data[i];
            query = { id: champion.id };

            models.Champion.update(query, {
                status: {
                    rankedPlayEnabled: champion.rankedPlayEnabled,
                    botEnabled: champion.botEnabled,
                    active: champion.active,
                    freeToPlay: champion.freeToPlay,
                    botMmEnabled: champion.botMmEnabled
                }
            },function (err, data) {
                if (err) {
                   console.log(err);
                }
                champion = null;
                query = null;
            })
        }
    });
}

module.exports = router;