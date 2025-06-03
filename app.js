const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const apiRoutes = require('./routes/api');
const createError = require('http-errors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

/**
 * Express application instance
 * @type {express.Application}
 */
const app = express();

/**
 * Configure view engine and application settings
 */
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('json spaces', 2);

/**
 * Configure middleware stack
 */
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Initialize database connection
 */
// Connect to MongoDB
connectDB();

/**
 * Configure CORS middleware
 */
// Validation
app.use(cors());

/**
 * Configure application routes
 */
// Routes
app.use('/api', apiRoutes);
app.use('/', indexRouter);
app.use('/users', usersRouter);

/**
 * Error handling middleware - catches 404 errors and forwards to error handler
 *
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

/**
 * Global error handler middleware
 * Handles all application errors and renders error page
 *
 * @param {Error} err - Error object
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

/**
 * Export the configured Express application
 * @type {express.Application}
 */
module.exports = app;