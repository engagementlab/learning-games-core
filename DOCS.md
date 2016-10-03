

<!-- Start lib/Core.js -->

## Core

Engagement Lab 
- Learning Games Core Functionality
Developed by Engagement Lab, 2016
==============
Common functionality game controller for the Lab's socket-based learning games

Author: Johnny Richardson, Erica Salling 
==========

## Initialize

Initialize this game's session.

### Params:

* **Object** *gameSession* Player socket ID
* **Function** *callback* Function to fire after session initialized

## GetPlayerById

Gets a player's object given their socket ID

### Params:

* **String** *Player* socket ID

### Return:

* **Boolean** Player object, if found

## GetGameType

Gets the game's type

### Return:

* **String** Game's Type

## IsRestarting

Gets if session is resetting

### Return:

* **Boolean** Is session restarting?

## IsFull

Gets if game is full of players

### Return:

* **Boolean** Is game entirely full?

## UsernameAvailable

Is username a player entered available?

### Params:

* **String** *name* Username

### Return:

* **Boolean** Is username available?

## PlayerIsActive

Is player whose UID is provided still active?

### Params:

* **String** *Player* UID

### Return:

* **Boolean** Is player active?

## GameInSession

Get if session is currently active.

### Return:

* **Boolean** _game_in_session Is session active?

## SetToRestarting

Flag the session as in restarting state

## Reset

Reset session's state to default0

## StartTutorial

Begin the game's tutorial.

### Params:

* **Object** *Group* moderator socket

## Countdown

Begin a cooldown clock for the session

### Params:

* **Object** *Group* moderator socket
* **Object** *Data* object w/ duration, name of countdown

## PauseResumeCooldown

Pause or resume session's current cooldown clock. For debug purposes only and disabled for production.

## StopCountdown

Stop session's current cooldown clock.

## ModeratorJoin

Signaled when group moderator joins/re-joins session, setting up group socket and resuming game (if applicable)

### Params:

* **Object** *Group* moderator's socket

## End

Reset and delete this session, and force all players to disconnect. Optionally, wait a bit to end game in case moderator re-connects. 

### Params:

* **Object** *Socket* for group
* **Boolean** *Wait* xx seconds before ending game?

## PlayerReady

Join player to session, or re-connect them and sync s/he to session.

### Params:

* **Object** *The* player object
* **Object** *The* player's socket

## PlayerLost

Deactivate player for now and start cooldown for them to re-join within, after which they're removed from session.

### Params:

* **String** *The* player's socket ID

## PlayerRemove

Remove the given player from the game and broadcast new player list. 

### Params:

* **Object** *The* player

## AdvanceRound

Advance session's round while saving its data to DB.

## CalcPlayerScore

Calculate/tally player's current round and total score. 

### Params:

* **Object** *The* player
* **Boolean** *Current* points value

## SaveState

Save the current 'state' of all players. When a player re-joins, we retrieve this state for them.

### Params:

* **String** *Event* ID
* **Object** *The* event's rendered template

## SaveSession

Save the session's current data to Mongo

<!-- End lib/Core.js -->

