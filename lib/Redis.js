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

    }

    Get(key) {

        this.getAsync(key).then((res) => {
            console.log(res)
        });

    }

    async GetHashAll(key) {
        let res = await this.connection.hgetall(key);
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
    }

}

module.exports = new Redis();