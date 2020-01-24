'use strict';
/**
 * Engagement Lab 
 * - Learning Games Core Functionality
 * Developed by Engagement Lab, 2016-2017
 * ==============
 * Common functionality game controller for the Lab's socket-based learning games
 *
 * @author Johnny Richardson, Erica Salling
 *
 * ==========
 */
class Core {

    constructor() {

        // Duration to wait for player to refresh client before timing her out (TODO: config value)
        this._player_timeout_duration = 10000,

            this.Templates,
            this.Session = require('./SessionManager'),

            // Redis instance
            this.Redis = require('./Redis'),

            this.events = require('events'),
            this.eventEmitter = new this.events.EventEmitter(),

            this._current_players = {},
            this._current_player_index = 0,
            this._game_session,
            this._game_timeout,
            this._game_in_session,
            this._config,

            this._current_submissions = {},
            this._players_submitted = [],

            this._countdown,
            this._countdown_duration,
            this._countdown_paused,
            this._event_countdown_done,
            this._current_round,
            this._showing_results = false,

            this._votes = 0,

            // Stores last event sent and its data
            this._objLastTemplate,
            this._strLastEventId,

            this._current_player_cap,

            // Identifies targets for socket events
            this.players_id,
            this.group_id,

            this._group_socket,

            // Flag for if session is being restarted
            this._session_restarting;

    }

    /**
     * Initialize this game's session.
     *
     * @param {Object} gameSession Player socket ID
     * @param {Function} callback Function to fire after session initialized
     * @class Core
     * @name Initialize
     */
    Initialize(gameSession, keystone, appRoot, callback) {

        this.keystone = keystone;
        this.appRoot = appRoot;

        this._game_in_session = false;

        var GameConfig = this.keystone.list('GameConfig').model;

        this._countdown_paused = false;
        this._session_restarting = false;

        // Init session
        this._game_session = gameSession;

        // Init template loader with current game type
        var TemplateLoader = require('./TemplateLoader');
        this.Templates = new TemplateLoader(gameSession.gameType, this.keystone, this.appRoot);

        // Identify targets for socket events
        this.players_id = gameSession.accessCode,
            this.group_id = gameSession.accessCode + '-group';

        // Get config for game
        var queryConfig = GameConfig.findOne({
            gameType: new RegExp('^' + gameSession.gameType + '$', "i")
        }, {}, {});

        // If no gametype, get singular config
        if (!gameSession.gameType)
            queryConfig = GameConfig.findOne({});

        queryConfig.exec((err, resultConfig) => {
            this._config = resultConfig;
            callback(this._config);
        });

    }

    /**
     * Gets a player's object given their socket ID
     *
     * @param {String} Player socket ID
     * @class Core
     * @name GetPlayerById
     * @return {Boolean} Player object, if found
     */
    GetPlayerById(id) {

        let player = _.findWhere(this._current_players, {
            socket_id: id
        });

        if (!player) {
            console.log('Could not find player with socket id %s', id);
            return null;
        }

        return player;

    }

    /**
     * Gets a player's object given their unique user ID
     *
     * @param {String} Player unique user ID
     * @class Core
     * @name GetPlayerByUserId
     * @return {Object} Player object, if found
     */
    async GetPlayerByUserId(uid) {

        const player = await this.Redis.GetHash(this._game_session.accessCode, uid);

        if (!player) {
            console.log('Could not find player with uid %s', uid);
            return null;
        }

        return player;

    }

    /**
     * Gets the game's type
     *
     * @class Core
     * @name GetGameType
     * @return {String} Game's Type
     */
    GetGameType() {

        return this._game_session.gameType;

    }

    /**
     * Gets if session is resetting
     *
     * @class Core
     * @name IsRestarting
     * @return {Boolean} Is session restarting?
     */
    IsRestarting() {

        return this._session_restarting;

    }

    /**
     * Gets if game is full of players
     *
     * @class Core
     * @name IsFull
     * @return {Boolean} Is game entirely full?
     */
    IsFull() {

        return (Object.keys(this._current_players).length === 8);

    }

    /**
     * Is username a player entered available?
     *
     * @param {String} name Username
     * @class Core
     * @name UsernameAvailable
     * @return {Boolean} Is username available?
     */
    UsernameAvailable(name) {

        return (_.where(this._current_players, {
            username: name
        }).length === 0);

    }

    /**
     * Is player whose UID is provided still active?
     *
     * @param {String} Player UID
     * @class Core
     * @name PlayerIsActive
     * @return {Boolean} Is player active?
     */
    async PlayerIsActive(uid) {

        const active = await this.GetPlayerByUserId[uid] !== undefined;
        return active;

    }

    /**
     * Get if session is currently active.
     *
     * @class Core
     * @name GameInSession
     * @return {Boolean} _game_in_session Is session active?
     */
    GameInSession() {

        return this._game_in_session;

    }

    /**
     * Flag the session as in restarting state
     *
     * @class Core
     * @name SetToRestarting
     */
    SetToRestarting() {

        this._session_restarting = true;

    }

    /**
     * Reset session's state to default
     *
     * @class Core
     * @name Reset
     */
    async Reset() {

        // Stop countdown
        clearInterval(this._countdown);
        this._countdown = undefined;
        this._countdown_paused = false;

        this._current_submissions = {};
        this._players_submitted = [];

        this._current_player_index = 0;

        this._game_in_session = false;

        // Reset redis store for session
        let delRes = await this.Redis.DeleteHash(this._game_session.accessCode);

        console.info('Game "' + this._game_session.accessCode + '" ended! ');


    }

    /**
     * Begin the game's tutorial.
     * @param {Object} Group moderator socket
     * @class Core
     * @name StartTutorial
     */
    StartTutorial(socket) {

        // If there are (somehow) more than 8 players when START button is pressed, kick them out!
        if (this._current_players.length >= 8) {
            // TO DO: Kick out extra players
        }

        this.Templates.Load('partials/group/tutorial', undefined, (html) => {

            socket.to(this.group_id).emit('game:tutorial', html);

        });

    }

    /**
     * Begin a cooldown clock for the session
     *
     * @param {Object} Group moderator socket
     * @param {Object} Data object w/ duration, name of countdown
     * @param {Boolean} Is countdown for players as well as group?
     * @class Core
     * @name Countdown
     */
    Countdown(socket, data, forPlayers) {

        if (this._countdown)
            clearInterval(this._countdown);

        // Use provided time limit if defined
        if (data && data.timeLimit)
            this._countdown_duration = data.timeLimit;
        else
            this._countdown_duration = this._config.timeLimit;

        let halfway = this._countdown_duration / 2;
        let quarterway = halfway / 2;

        // Dispatch time to group view
        let socketInfo = {
            duration: this._countdown_duration
        }

        if (data && data.countdownName)
            socketInfo.name = data.countdownName;

        if (forPlayers)
            socket.to(this.players_id).emit('game:countdown', socketInfo);
        else
            socket.to(this.group_id).emit('game:countdown', socketInfo);

        // Start countdown
        this._countdown = setInterval(() => {

            if (this._countdown_paused)
                return;

            this._countdown_duration--;

            if (this._countdown_duration === 0) {

                // Tell the players time is up
                if (forPlayers)
                    this._group_socket.to(this.players_id).emit('game:countdown_end', data.countdownName);
                else
                    this._group_socket.to(this.group_id).emit('game:countdown_end', data.countdownName);

                // Send the countdownEnded event to the game script
                this.eventEmitter.emit('countdownEnded', data, socket);

                // Clear the countdown
                this.StopCountdown();

            }
            // TODO: This needs to be its own timeout given use of this method for a lot of game events
            else if (this._countdown_duration === 15) {

                // Dispatch countdown when running out of time for player
                this.Templates.Load('partials/player/timerunningout', undefined, (html) => {
                    socket.to(this.players_id).emit('game:countdown_ending', {
                        html: html,
                        socket: this.players_id
                    });
                });

            }

        }, 1000);

    }

    /**
     * Pause or resume session's current cooldown clock. For debug purposes only and disabled for production.
     *
     * @class Core
     * @name PauseResumeCooldown
     */
    PauseResumeCooldown() {

        if (process.env.NODE_ENV === 'production')
            return;

        this._countdown_paused = !this._countdown_paused;
        this._group_socket.to(this.group_id).emit('debug:pause');

    }

    /**
     * Stop session's current cooldown clock.
     *
     * @class Core
     * @name StopCountdown
     */
    StopCountdown() {

        clearInterval(this._countdown);

        this.eventEmitter.removeAllListeners('countdownEnded');

    }

    /**
     * Signaled when group moderator joins/re-joins session, setting up group socket and resuming game (if applicable)
     *
     * @param {Object} Group moderator's socket
     * @class Core
     * @name ModeratorJoin
     */
    ModeratorJoin(socket) {

        clearInterval(this._game_timeout);

        // Setup group socket (used for some methods dispatched from emitter)
        this._group_socket = socket;

        // End restarting state
        this._session_restarting = false;

        // Inform players of resumed game (if applicable)
        socket.to(this.PLAYERS_ID).emit('game:resumed');

    }

    /**
     * Reset and delete this session, and force all players to disconnect. Optionally, wait a bit to end game in case moderator re-connects. 
     *
     * @param {Object} Socket for group
     * @param {Boolean} Wait xx seconds before ending game?
     * @class Core
     * @name End
     */
    async End(socket, noTimeout) {

        if (!noTimeout) {

            var timeoutTime = 30;

            console.info('Game "' + this._game_session.accessCode + '" is timing out! ');

            this._game_timeout = setInterval(async () => {

                timeoutTime--;

                if (timeoutTime === 0) {

                    clearInterval(this._game_timeout);

                    await this.Reset();
                    this.Session.Delete(this.players_id);

                    this.Templates.Load('partials/player/gameended', undefined, (html) => {

                        socket.to(this.players_id).emit('game:ended', html);

                        this._objLastTemplate = html;
                        this._strLastEventId = 'game:ended';

                        // Force all players to disconnect
                        for (let player in this._current_players)
                            socket.sockets.sockets[player.socket_id].disconnect(true);

                    });

                } else {

                    // Dispatch countdown for game timeout
                    this.Templates.Load('partials/player/gameending', {
                        time: timeoutTime
                    }, (html) => {
                        socket.to(this.players_id).emit('game:ending', html);

                        this._objLastTemplate = html;
                        this._strLastEventId = 'game:ending';
                    });

                }

            }, 1000);

            this._game_in_session = false;

        } else {

            await this.Reset();
            this.Session.Delete(this.players_id);

            // Dispatch countdown for game timeout
            this.Templates.Load('partials/player/gameended', {
                time: timeoutTime
            }, (html) => {

                socket.to(this.players_id).emit('game:ended', html);
                socket.to(this.group_id).emit('game:ended', html);

                this._objLastTemplate = html;
                this._strLastEventId = 'game:ended';

                // Force all players to disconnect
                for (let socketId in socket.nsp.sockets)
                    socket.nsp.sockets[socketId].disconnect(true);

            });

        }

    }

    /**
     * Join player to session, or re-connect them and sync s/he to session.
     *
     * @param {Object} The player object
     * @param {Object} The player's socket
     * @class Core
     * @name PlayerReady
     */
    PlayerReady(player, socket) {

        if (this._current_player_cap >= 8) {
            socket.to(player.socket_id).emit('game:error', "Uh oh, looks like this game is full! Removing you from the game...");
            return;
        }

        // If player is re-connecting, set them back to connected, and re-broadcast the last update
        if (!player.connected) {

            player.connected = true;
            player.socket_id = socket.id || player.socket_id;

            logger.info(player.username + ' has re-joined the game and has uid ' + player.uid);

            // Update player in store
            this.Redis.SetHash(this._game_session.accessCode, player.uid, player);

            socket.emit(this._strLastEventId, {
                waitForLoad: true,
                html: this._objLastTemplate
            });

        } else {
            let playerData = {
                username: player.username,
                socket_id: player.socket_id,
                uid: player.uid,
                index: this._current_player_index,
                submitted: false,
                connected: true
            };

            // Cache player in store under session ID 
            this.Redis.SetHash(this._game_session.accessCode, player.uid, playerData);

            logger.info(player.username + ' has joined the game and has uid ' + player.uid, '(' + this._game_session.accessCode + ')');

            this._current_player_index++;

            socket.to(this.group_id).emit('players:update', {
                players: _.sortBy(this._current_players, function (player) {
                    return player.index
                }),
                state: 'gained_player'
            });

        }

        // Get current # of players
        // TODO: Use redis call
        // this._current_player_cap = Object.keys(this._current_players).length;

        return player;
    }

    /**
     * Deactivate player for now and start cooldown for them to re-join within, after which they're removed from session.
     *
     * @param {String} The player's socket ID
     * @class Core
     * @name PlayerLost
     */
    PlayerLost(playerSocketId) {

        let thisPlayer = this.GetPlayerById(playerSocketId)

        if (!thisPlayer)
            return;

        thisPlayer.connected = false;

        // Decrease current # of players
        this._current_player_cap--;

        // If game is currently in session, give player 10s to refresh before booting them...
        if (this._game_in_session) {

            setTimeout(() => {

                this.PlayerRemove(thisPlayer);

            }, this._player_timeout_duration);

        }
        // ...otherwise, kick 'em out now
        else
            this.PlayerRemove(thisPlayer);

    }

    /**
     * Remove the given player from the game and broadcast new player list. 
     *
     * @param {Object} The player
     * @class Core
     * @name PlayerRemove
     */
    PlayerRemove(player) {

        // If player has not managed to re-connect...
        if (!player.connected) {

            delete this._current_players[player.uid];

            this._group_socket.to(this.group_id).emit(
                'players:update', {
                    players: _.sortBy(this._current_players, function (player) {
                        return player.index
                    }),
                    state: 'lost_player'
                }
            );

            // If only one player left, end the game now
            if (Object.keys(this._current_players).length <= 1 && this._game_in_session) {
                if (this._showing_results && (this._current_round === this._config.roundNumber - 1)) {
                    return;
                }

                this.End(this._group_socket, true);


            }

        }

    }

    /**
     * Advance session's round while saving its data to DB.
     *
     * @class Core
     * @name AdvanceRound
     */
    AdvanceRound(socket) {

        this._showing_results = false;

        // Reset players state for next round
        _.each(this._current_players, (playerId, index) => {

            this._current_players[index] = _.omit(this._current_players[index], 'score');
            this._current_players[index].submitted = false;

        });

        this.SaveSession();

        socket.emit('game:advance');

        // Advance round
        this._current_round++;

    }

    /**
     * Display survey for all players, if one if enabled for this game.
     *
     * @class Core
     * @name DisplaySurvey
     */
    DisplaySurvey(socket) {

        if (this._config.survey)
            socket.to(this.players_id).emit('game:survey');

    }

    /**
     * Calculate/tally player's current round and total score. 
     *
     * @param {Object} The player
     * @param {Boolean} Current points value
     * @class Core
     * @name CalcPlayerScore
     */
    CalcPlayerScore(currentPlayer, points) {

        if (currentPlayer.socket_id === this.realId)
            return;

        // Set points for this round
        if (!currentPlayer.score)
            currentPlayer.score = points;
        else
            currentPlayer.score += points;

        // Set total points
        if (!currentPlayer.score_total)
            currentPlayer.score_total = points;
        else
            currentPlayer.score_total += points;

        logger.info(currentPlayer.username + ' points this round are ' + currentPlayer.score);

        logger.info(currentPlayer.username + ' score is now ' + currentPlayer.score_total);

        return points;

    }

    /**
     * Save the current 'state' of all players. When a player re-joins, we retrieve this state for them.
     *
     * @param {String} Event ID
     * @param {Object} The event's rendered template
     * @class Core
     * @name SaveState
     */
    SaveState(strEventId, objTemplate) {

        this._strLastEventId = strEventId;
        this._objLastTemplate = objTemplate;

        // Save debug data?
        if (process.env.NODE_ENV !== 'production') {
            if (!this._game_session.debugData)
                this._game_session.debugData = {};

            this._game_session.debugData[strEventId] = objTemplate;
            this.SaveSession();
        }

    }

    /**
     * Save the session's current data to Mongo
     *
     * @class Core
     * @name SaveSession
     */
    SaveSession() {

        this.Session.Save(this._game_session);

    }


}

module.exports.Core = Core,
    module.exports.SessionManager = require('./SessionManager'),
    module.exports.TemplateLoader = require('./TemplateLoader'),
    module.exports.ShuffleUtil = require('./ShuffleUtil'),
    module.exports.Redis = require('./Redis');