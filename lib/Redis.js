'use strict';
/**
 * Engagement Lab 
 * - Learning Games Core Functionality
 * Developed by Engagement Lab, 2016-2020
 * ==============
 * Shared instance of Redis connection and related methods
 *
 * @author Johnny Richardson
 *
 * ==========
 */
const redis = require('ioredis');

class Redis {

    constructor() {

        this.connection = null;

    }

    /**
     * Initialize connection to Redis. Call when dependant server boots.
     *
     * @name Init
     * @class Redis
     */
    Init(callback) {

        const redisClient = redis.createClient(),
            {
                promisify
            } = require('util');

        this.getAsync = promisify(redisClient.get).bind(redisClient);

        redisClient.on('connect', () => {
            this.connection = redisClient;

            if (callback) callback();
        });
        redisClient.on('error', (err) => {
            if (callback) callback(err);
            throw new Error('Redis error! Make sure redis is running.', err);
        });

    }

    Get(key) {

        this.getAsync(key).then((res) => {
            console.log(res)
        });

    }

    async GetHashAll(key) {
        let res = await this.connection.hgetall(key);

        // Parse all vals
        for (let i = 0, keys = Object.keys(res); i < keys.length; i++)
            res[keys[i]] = JSON.parse(res[keys[i]]);

        return res;
    }

    async GetHash(key, id) {
        let res = await this.connection.hget(key, id);
        return JSON.parse(res);
    }

    async GetHashLength(key) {
        let res = await this.connection.hkeys(key);
        return res.length;
    }

    Set(key, value) {
        this.connection.set(key, value);
    }

    SetHash(key, id, value) {
        this.connection.hset(key, id, JSON.stringify(value));

        console.log('REDIS', key, id, value)

    }

    async DeleteHash(key) {

        let res = await this.connection.del(key);
        return res;

    }

}

module.exports = new Redis();