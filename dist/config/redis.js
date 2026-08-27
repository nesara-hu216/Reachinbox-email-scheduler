"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
exports.redisConnection = new ioredis_1.default(env_1.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
    },
});
exports.redisConnection.on('connect', () => {
    logger_1.logger.info('📡 Connected to Redis successfully');
});
exports.redisConnection.on('error', (err) => {
    logger_1.logger.error({ err }, '❌ Redis connection error');
});
