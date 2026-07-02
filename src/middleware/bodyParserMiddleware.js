const express = require('express');

const bodyParserMiddleware = [
  express.json({ limit: '10kb' }),
  express.urlencoded({ extended: true, limit: '10kb' })
];

module.exports = bodyParserMiddleware;
