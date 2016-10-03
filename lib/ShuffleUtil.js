'use strict';
/**
 * Engagement Lab 
 * - Learning Games Core Array Shuffler
 * Developed by Engagement Lab, 2016
 * ==============
 * Common functionality util to shuffle an array
 *
 * @author Johnny Richardson
 *
 * ==========
 */
module.exports = function(array) {

  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;

};