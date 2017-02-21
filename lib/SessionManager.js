'use strict';
/**
 * Engagement Lab 
 * - Learning Games Core Session Manager
 * Developed by Engagement Lab, 2016-2017
 * ==============
 * Common functionality game session manager
 *
 * @author Johnny Richardson
 *
 * ==========
 */
var logger = require('winston'),
    colors = require('colors');

var	_GAME_SESSIONS = {};

var SessionManager = {

	Create: function(id, session) {
		logger.log('CREATE_SESSION: '.green, id);

		_GAME_SESSIONS[id] = session;

	},

	Delete: function(id) {

		if(!id) {
			logger.warn('Session id undefined!'.red);
			return;
		}

		var sesh = _GAME_SESSIONS[id];

		if(!sesh) {
			logger.warn("SessionManager.Delete", "Game with id '".red + id + "' not found!".red);
			return;
		}

		if(sesh.IsRestarting()) {
			logger.warn("SessionManager.Delete", "Game with id '".yellow + id + "' is restarting, won't delete.".yellow);
			return;			
		}

		logger.log('DELETE_SESSION: ', id);

		delete _GAME_SESSIONS[id];
	},

	Get: function(id) {

		if(!id) {
			logger.warn('Session id undefined!'.red);
			return;
		}

		// ID can be from group but stored w/o that affix
		var sessionId = id.replace('-group', '');
		var sesh = _GAME_SESSIONS[sessionId];

		if(!sesh) {
			logger.warn("SessionManager.Get", "Game with id '".red + id + "' not found!".red);
			return;
		}

		return sesh;
	},

	Save: function(sessionData) {

		// TODO: Use this for something...someday
		return;

	  sessionData.save(function(err) {
	      
	      if (err) 
	      	throw new Error('error', err);
	      
	  });


	},

	GroupView: function(id, groupId) {

		if(groupId === undefined)
			logger.warn('Moderator id undefined!'.red);
		else if(id === undefined)
			logger.warn('Session id undefined!'.red);

		// ID can be from mod but stored w/o that affix
		var sessionId = id.replace('-group', '');
		var sesh = _GAME_SESSIONS[sessionId];

		if(!sesh) {
			logger.warn("SessionManager.GroupView", "Game with id '".red + id + "' not found!".red);
			return;
		}

		sesh.groupModerator = groupId;

		logger.log("Game Session '" + sessionId + "' group moderator is ", groupId); 

	}

};

module.exports = SessionManager;