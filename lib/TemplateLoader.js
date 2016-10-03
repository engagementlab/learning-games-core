'use strict';
/**
 * Engagement Lab 
 * - Learning Games Core Template Loader
 * Developed by Engagement Lab, 2016
 * ==============
 * Common functionality template (partial) loader
 *
 * @author Johnny Richardson
 *
 * ==========
 */
var fs = require('fs');
var handlebars = require('keystone').get('handlebars');
var rootDir = require('app-root-path');

class TemplateLoader {

    constructor(gameType) {
        
        this.gameType = gameType;
    }

    Load(filePath, data, callback) {

        if(!data) 
            data = {};

        // Apply game type to all template input data
        data.gameType = this.gameType;

        logger.info('TemplateLoader', 'Loading ' + rootDir + '/templates/' + filePath + '.hbs');

        handlebars
        .render(rootDir + '/templates/' + filePath + '.hbs', data)
        .then(function(res) {
          
            callback(res);

        })
        .catch(function(err) {

            console.error("TemplateLoader ERROR:", {
                                                    error: err, 
                                                    file: rootDir + '/templates/' + filePath + '.hbs'
                                                   });

        });

    }


}

module.exports = TemplateLoader;